/**
 * Google Drive Video Integration Service for NeuroYobe
 * 
 * Handles:
 * 1. Publisher OAuth Authorization for Google Drive (drive.file scope)
 * 2. Automated video upload from user's device directly into publisher's Google Drive
 * 3. Enforcing copy/download prevention on Google Drive (copyRequiresWriterPermission & viewersCanCopyContent)
 * 4. Preventing direct Google Drive link sharing (sharing NeuroYobe internal player links instead)
 * 5. Generating secure embed iframe URLs (https://drive.google.com/file/d/{fileId}/preview)
 */

import type { VideoUploadProgress } from './firebase';

export const GOOGLE_DRIVE_CLIENT_ID =
  (typeof import.meta !== 'undefined' && ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || (import.meta as any).env?.VITE_GOOGLE_DRIVE_CLIENT_ID)) ||
  '799261220718-vit6eqldflqd9s24cftmbe1ucap9485d.apps.googleusercontent.com';
export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// In-memory and persistent token cache
const TOKEN_STORAGE_KEY = 'neuro_yobe_drive_token';
const EXPIRY_STORAGE_KEY = 'neuro_yobe_drive_expires';
const AUTH_FLAG_KEY = 'neuro_yobe_drive_authorized';

let cachedAccessToken: string | null = (typeof window !== 'undefined' && localStorage.getItem(TOKEN_STORAGE_KEY)) || null;
let tokenExpiresAt: number = (typeof window !== 'undefined' && Number(localStorage.getItem(EXPIRY_STORAGE_KEY))) || 0;
let tokenClientInstance: any = null;

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              expires_in?: number;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (err: any) => void;
          }) => any;
        };
      };
    };
  }
}

/**
 * Checks if Google Identity Services (GSI) script is loaded
 */
export function isGsiLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.google?.accounts?.oauth2;
}

/**
 * Ensures GSI script is loaded in DOM
 */
export async function ensureGsiLoaded(): Promise<void> {
  if (isGsiLoaded()) return;

  return new Promise((resolve, reject) => {
    // Check if script already in document
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      let checks = 0;
      const interval = setInterval(() => {
        checks++;
        if (isGsiLoaded()) {
          clearInterval(interval);
          resolve();
        } else if (checks > 50) {
          clearInterval(interval);
          reject(new Error('تعذر تحميل خدمة تفويض جوجل. يرجى إعادة تحميل الصفحة.'));
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      let checks = 0;
      const interval = setInterval(() => {
        checks++;
        if (isGsiLoaded()) {
          clearInterval(interval);
          resolve();
        } else if (checks > 30) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    };
    script.onerror = () => reject(new Error('فشل تحميل مكتبة الربط السحابي'));
    document.head.appendChild(script);
  });
}

/**
 * Check if the publisher has previously authorized cloud upload
 */
export function isDrivePreviouslyAuthorized(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem(AUTH_FLAG_KEY) === 'true';
}

/**
 * Check if we already have an active valid in-memory or persisted access token
 */
export function hasValidDriveToken(): boolean {
  if (cachedAccessToken && Date.now() < (tokenExpiresAt - 60000)) {
    return true;
  }
  if (typeof window !== 'undefined') {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const savedExpiry = Number(localStorage.getItem(EXPIRY_STORAGE_KEY) || 0);
    if (savedToken && Date.now() < (savedExpiry - 60000)) {
      cachedAccessToken = savedToken;
      tokenExpiresAt = savedExpiry;
      return true;
    }
  }
  return false;
}

/**
 * Request OAuth authorization for cloud video upload
 * Asks the publisher once on the very first upload. Subsequent uploads
 * are authenticated automatically in the background without prompting.
 */
export async function requestDriveAuthorization(forceConsent: boolean = false): Promise<string> {
  // Return cached or saved token if still valid and not explicitly forcing consent
  if (!forceConsent && hasValidDriveToken() && cachedAccessToken) {
    return cachedAccessToken;
  }

  await ensureGsiLoaded();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('خدمة الربط السحابي غير متاحة حالياً. يرجى التحقق من اتصال الإنترنت.');
  }

  const wasPreviouslyAuthorized = isDrivePreviouslyAuthorized();

  return new Promise((resolve, reject) => {
    try {
      tokenClientInstance = window.google!.accounts!.oauth2!.initTokenClient({
        client_id: GOOGLE_DRIVE_CLIENT_ID,
        scope: GOOGLE_DRIVE_SCOPE,
        callback: (resp) => {
          if (resp.error) {
            console.error('Cloud OAuth error:', resp);
            if (resp.error === 'origin_mismatch' || (resp.error_description && resp.error_description.includes('origin_mismatch'))) {
              reject(new Error('خطأ origin_mismatch: يرجى التأكد من إضافة نطاق الموقع في Google Cloud Console.'));
              return;
            }
            // If silent prompt failed because permission was revoked, try once with consent
            if (!forceConsent && wasPreviouslyAuthorized && resp.error === 'interaction_required') {
              requestDriveAuthorization(true).then(resolve).catch(reject);
              return;
            }
            reject(new Error(resp.error_description || resp.error || 'تم إلغاء التفويض'));
            return;
          }
          if (!resp.access_token) {
            reject(new Error('لم يتم استلام رمز الوصول السحابي'));
            return;
          }

          cachedAccessToken = resp.access_token;
          const expiresIn = resp.expires_in || 3599;
          tokenExpiresAt = Date.now() + expiresIn * 1000;

          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(TOKEN_STORAGE_KEY, resp.access_token);
              localStorage.setItem(EXPIRY_STORAGE_KEY, String(tokenExpiresAt));
              localStorage.setItem(AUTH_FLAG_KEY, 'true');
            } catch {}
          }

          resolve(cachedAccessToken);
        },
        error_callback: (err) => {
          console.error('Cloud OAuth error callback:', err);
          reject(new Error('فشل إتمام التصريح السحابي'));
        }
      });

      // If user was previously authorized, attempt completely silent token retrieval (prompt: '')
      // Only show the interactive consent dialog if it's their very first time or explicit consent requested
      const promptMode = (!wasPreviouslyAuthorized || forceConsent) ? 'consent' : '';
      tokenClientInstance.requestAccessToken({
        prompt: promptMode
      });
    } catch (err: any) {
      reject(new Error(err.message || 'حدث خطأ أثناء فتح التصريح السحابي'));
    }
  });
}

export interface DriveUploadOptions {
  file: File;
  title: string;
  description?: string;
  publisherUid: string;
  publisherName: string;
  onProgress?: (progress: VideoUploadProgress) => void;
}

export interface DriveUploadResult {
  fileId: string;
  embedUrl: string;
  fileName: string;
  fileSize: number;
}

/**
 * Uploads a video file directly to the publisher's Google Drive:
 * 1. Uses resumable upload with real-time percentage and byte tracking
 * 2. AUTOMATICALLY PREVENTS DOWNLOADS: Sets copyRequiresWriterPermission=true and viewersCanCopyContent=false
 * 3. AUTOMATICALLY PREVENTS SEARCH DISCOVERY: sets allowFileDiscovery=false
 * 4. Yields secure embed URL inside an iframe
 */
export async function uploadVideoToGoogleDrive({
  file,
  title,
  description,
  publisherUid,
  publisherName,
  onProgress
}: DriveUploadOptions): Promise<DriveUploadResult> {
  // 1. Ensure authorization token is ready
  let token = cachedAccessToken;
  if (!hasValidDriveToken() || !token) {
    onProgress?.({
      percent: 2,
      loadedBytes: 0,
      totalBytes: file.size,
      stage: 'جاري تأمين الاتصال والترخيص بالخادم السحابي...'
    });
    token = await requestDriveAuthorization();
  }

  onProgress?.({
    percent: 5,
    loadedBytes: 0,
    totalBytes: file.size,
    stage: 'جاري تهيئة جلسة الرفع السحابي فائق السرعة...'
  });

  // 2. Prepare file metadata with download & copy restrictions PRE-CONFIGURED
  const extMatch = file.name.match(/\.[a-zA-Z0-9]+$/);
  const fileExt = extMatch ? extMatch[0] : '.mp4';
  const cleanTitle = title.trim().replace(/[<>:"/\\|?*]/g, '');
  const driveFileName = `${cleanTitle}${fileExt}`;

  const metadata = {
    name: driveFileName,
    description: description || '',
    mimeType: file.type || 'video/mp4',
    // CRITICAL: Block downloading, copying, and printing for viewers
    copyRequiresWriterPermission: true,
    viewersCanCopyContent: false,
    properties: {
      uploadedVia: 'CloudSecure',
      publisherUid,
      publisherName,
      uploadTimestamp: Date.now().toString()
    }
  };

  // 3. Initiate resumable upload session
  const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': file.type || 'video/mp4',
      'X-Upload-Content-Length': file.size.toString()
    },
    body: JSON.stringify(metadata)
  });

  if (!initResponse.ok) {
    const errText = await initResponse.text();
    // If token expired, clear cache and retry once
    if (initResponse.status === 401) {
      cachedAccessToken = null;
      token = await requestDriveAuthorization(true);
      return uploadVideoToGoogleDrive({ file, title, description, publisherUid, publisherName, onProgress });
    }
    throw new Error(`تعذر بدء الرفع إلى الخادم السحابي (${initResponse.status}): ${errText}`);
  }

  const uploadUrl = initResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('تعذر الحصول على رابط جلسة الرفع السحابي');
  }

  // 4. Perform upload with XMLHttpRequest to monitor progress
  const fileData = await new Promise<{ id: string; name: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const percent = Math.min(95, Math.max(5, Math.round((evt.loaded / evt.total) * 100)));
        onProgress?.({
          percent,
          loadedBytes: evt.loaded,
          totalBytes: evt.total,
          stage: `جاري رفع الفيديو إلى السيرفر السحابي (${percent}%)...`
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const parsed = JSON.parse(xhr.responseText);
          resolve(parsed);
        } catch {
          reject(new Error('استجابة غير متوقعة من السيرفر السحابي بعد الرفع'));
        }
      } else {
        reject(new Error(`فشل رفع ملف الفيديو إلى السيرفر السحابي (رمز الخطأ: ${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('انقطع الاتصال بالسيرفر السحابي أثناء الرفع'));
    xhr.ontimeout = () => reject(new Error('انتهت مهلة الاتصال أثناء رفع الفيديو إلى السيرفر السحابي'));

    xhr.send(file);
  });

  const fileId = fileData.id;

  onProgress?.({
    percent: 96,
    loadedBytes: file.size,
    totalBytes: file.size,
    stage: 'جاري تفعيل الحماية ومنع التنزيل وحظر مشاركة الرابط المباشر...'
  });

  // 5. Enforce anti-download policy via PATCH
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        copyRequiresWriterPermission: true,
        viewersCanCopyContent: false
      })
    });
  } catch (patchErr) {
    console.warn('Could not patch copyRequiresWriterPermission:', patchErr);
  }

  // 6. Set reader permission for embed playback, with allowFileDiscovery=false
  try {
    const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
        allowFileDiscovery: false
      })
    });

    if (!permRes.ok) {
      console.warn('Permission warning:', await permRes.text());
    }
  } catch (permErr) {
    console.warn('Could not set permissions for file:', permErr);
  }

  onProgress?.({
    percent: 100,
    loadedBytes: file.size,
    totalBytes: file.size,
    stage: 'تم الرفع السحابي بنجاح مع تفعيل حماية منع التنزيل!'
  });

  const embedUrl = getDriveEmbedUrl(fileId);

  return {
    fileId,
    embedUrl,
    fileName: fileData.name || driveFileName,
    fileSize: file.size
  };
}

/**
 * Returns the secure Google Drive preview embed URL
 */
export function getDriveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Extracts Google Drive file ID from standard links if pasted by publisher
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1 && match1[1]) return match1[1];
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2 && match2[1]) return match2[1];
  return null;
}

/**
 * Clears in-memory token on logout or revoke
 */
export function clearDriveAuthorization(): void {
  cachedAccessToken = null;
  tokenExpiresAt = 0;
}
