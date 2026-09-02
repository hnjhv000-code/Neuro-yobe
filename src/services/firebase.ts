import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  equalTo,
  serverTimestamp,
  DatabaseReference
} from 'firebase/database';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  reload,
  User,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';

import type {
  UserProfile,
  VideoItem,
  CommentItem,
  SubscriptionItem,
  HistoryItem,
  LikedItem,
  SavedItem,
  DownloadedItem,
  PlaylistItem,
  PostItem,
  NotificationItem,
  SupportTicket,
  ActivityLogItem,
  DeveloperSettings,
  VisitorRecord,
  VisitorStats,
  ComplaintReport,
  BlacklistRecord
} from '../types';
import { STARTER_VIDEOS, STARTER_POSTS, saveCachedVideos, saveCachedPosts } from './sampleData';

// Provided exact Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAl4q3kJ1UFp406flser2xcqxCgBhMz_14",
  authDomain: "hnahalak.firebaseapp.com",
  databaseURL: "https://hnahalak-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hnahalak",
  storageBucket: "hnahalak.firebasestorage.app",
  messagingSenderId: "1082843860070",
  appId: "1:1082843860070:web:87b1ec90dd3b2c140531a7",
  measurementId: "G-K486T3J2TH"
};

// Initialize Firebase once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

export { onAuthStateChanged };

/**
 * Deep sanitizer to remove `undefined` values before sending to Firebase Realtime Database.
 * Realtime Database throws fatal errors if any property is undefined.
 */
export function sanitizeForFirebase<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirebase(item)) as any;
  }
  if (typeof data === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const key of Object.keys(data as any)) {
      const val = (data as any)[key];
      if (val !== undefined) {
        cleanObj[key] = sanitizeForFirebase(val);
      }
    }
    return cleanObj as T;
  }
  return data;
}

/**
 * Friendly Arabic error translator for Firebase errors
 */
export function getFriendlyAuthErrorMessage(err: any): string {
  const code = err?.code || '';
  const msg = err?.message || '';

  if (code === 'auth/email-already-in-use') {
    return 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استخدام بريد آخر.';
  }
  if (code === 'auth/weak-password') {
    return 'كلمة المرور ضعيفة جداً. يجب ألا تقل عن 6 أحرف أو أرقام.';
  }
  if (code === 'auth/invalid-email') {
    return 'صيغة البريد الإلكتروني غير صالحة. يرجى التأكد من كتابته بشكل صحيح.';
  }
  if (
    code === 'auth/user-not-found' ||
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-credential'
  ) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  }
  if (code === 'auth/too-many-requests') {
    return 'تم حظر المحاولات مؤقتاً لحماية الحساب بسبب كثرة الطلبات. يرجى الانتظار دقيقة ثم المحاولة ثانية.';
  }
  if (code === 'auth/network-request-failed') {
    return 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'تم إغلاق نافذة تسجيل الدخول بحساب Google قبل إتمام العملية.';
  }
  if (code === 'auth/popup-blocked') {
    return 'تم حظر النافذة المنبثقة من قِبل المتصفح. يرجى السماح بالنوافذ المنبثقة لإتمام تسجيل الدخول بحساب Google.';
  }
  if (code === 'auth/user-disabled') {
    return 'تم تعطيل هذا الحساب من قِبل الإدارة.';
  }
  if (code === 'auth/invalid-phone-number') {
    return 'رقم الهاتف غير صالح. يرجى إدخال الرقم متضمناً مفتاح الدولة (مثل: +966501234567 أو 0501234567).';
  }
  if (code === 'auth/missing-phone-number') {
    return 'يرجى إدخال رقم الهاتف أولاً.';
  }
  if (code === 'auth/quota-exceeded') {
    return 'تم استهلاك رصيد رسائل الـ SMS المتاح في Firebase حالياً.';
  }
  if (code === 'auth/captcha-check-failed') {
    return 'فشل التحقق الأمني من كابتشا (reCAPTCHA). يرجى المحاولة مرة أخرى.';
  }
  if (code === 'auth/invalid-verification-code') {
    return 'كود التحقق المرسل في رسالة SMS غير صحيح. يرجى التأكد وإعادة المحاولة.';
  }
  if (code === 'auth/code-expired') {
    return 'انتهت صلاحية كود التحقق. يرجى طلب إرسال رسالة SMS جديدة.';
  }
  return msg || 'حدث خطأ أثناء المصادقة.';
}

export function safeFirebaseKey(key: string): string {
  return key.replace(/[.$#[\]/]/g, '_');
}

/* =========================================================================
   EMAIL AUTH & STRICT VERIFICATION
   ========================================================================= */

export async function signInWithEmail(
  email: string,
  pass: string
): Promise<{ uid: string; email: string; displayName?: string; photoURL?: string; emailVerified: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    return {
      uid: cred.user.uid,
      email: cred.user.email || cleanEmail,
      displayName: cred.user.displayName || undefined,
      photoURL: cred.user.photoURL || undefined,
      emailVerified: Boolean(cred.user.emailVerified)
    };
  } catch (err: any) {
    console.warn('Firebase signInWithEmail notice:', err?.code, err?.message);
    const friendly = getFriendlyAuthErrorMessage(err);
    const customErr: any = new Error(friendly);
    customErr.code = err?.code;
    throw customErr;
  }
}

export async function signUpWithEmail(
  email: string,
  pass: string,
  username?: string,
  avatarUrl?: string
): Promise<{ uid: string; email: string; displayName?: string; photoURL?: string; emailVerified: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    if (username || avatarUrl) {
      try {
        await updateProfile(cred.user, {
          displayName: username,
          photoURL: avatarUrl
        });
      } catch (profErr) {
        console.warn('updateProfile error:', profErr);
      }
    }

    return {
      uid: cred.user.uid,
      email: cred.user.email || cleanEmail,
      displayName: username || cred.user.displayName || undefined,
      photoURL: avatarUrl || cred.user.photoURL || undefined,
      emailVerified: true
    };
  } catch (err: any) {
    console.warn('signUpWithEmail notice:', err?.code, err?.message);
    const friendly = getFriendlyAuthErrorMessage(err);
    const customErr: any = new Error(friendly);
    customErr.code = err?.code;
    throw customErr;
  }
}

export async function sendPasswordReset(email: string) {
  try {
    return await sendPasswordResetEmail(auth, email.trim());
  } catch (err: any) {
    const friendly = getFriendlyAuthErrorMessage(err);
    const customErr: any = new Error(friendly);
    customErr.code = err?.code;
    throw customErr;
  }
}

/**
 * Real Firebase Email Verification
 */
export async function sendUserEmailVerification(): Promise<{ success: boolean; message: string }> {
  if (!auth.currentUser) {
    throw new Error('لا يوجد مستخدم مسجل حالياً لإرسال رسالة التحقق إليه.');
  }
  try {
    await sendEmailVerification(auth.currentUser, {
      url: window.location.href,
      handleCodeInApp: false
    });
    return {
      success: true,
      message: `تم إرسال رابط تأكيد وتفعيل الحساب بنجاح إلى البريد: ${auth.currentUser.email}. يرجى التحقق من صندوق الوارد والرسائل غير المرغوب فيها (Spam).`
    };
  } catch (err: any) {
    console.warn('sendEmailVerification notice:', err?.code, err?.message);
    const friendly = getFriendlyAuthErrorMessage(err);
    const customErr: any = new Error(friendly);
    customErr.code = err?.code;
    throw customErr;
  }
}

/**
 * Real reload and check verification status
 */
export async function checkAndReloadEmailVerification(): Promise<{ verified: boolean; email?: string }> {
  if (!auth.currentUser) {
    return { verified: false };
  }
  try {
    await reload(auth.currentUser);
    const isVerified = Boolean(auth.currentUser.emailVerified);
    if (isVerified) {
      await updateUserProfileFields(auth.currentUser.uid, { emailVerified: true });
    }
    return {
      verified: isVerified,
      email: auth.currentUser.email || undefined
    };
  } catch (err: any) {
    console.warn('checkAndReloadEmailVerification notice:', err?.code, err?.message);
    const friendly = getFriendlyAuthErrorMessage(err);
    const customErr: any = new Error(friendly);
    customErr.code = err?.code;
    throw customErr;
  }
}

/**
 * Generate 6-Digit Email Verification Code
 */
export async function sendEmailVerificationCode(email: string): Promise<{ code: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const safeKey = safeFirebaseKey(cleanEmail);

  try {
    const codeRef = ref(db, `email_verifications/${safeKey}`);
    await set(codeRef, {
      code,
      email: cleanEmail,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000
    });
  } catch (e) {
    console.warn('Database save email code error:', e);
  }

  localStorage.setItem(`email_otp_${cleanEmail}`, JSON.stringify({
    code,
    expiresAt: Date.now() + 15 * 60 * 1000
  }));

  if (auth.currentUser) {
    try {
      await sendEmailVerification(auth.currentUser);
    } catch {}
  }

  return { code };
}

/**
 * Verify 6-Digit Email Verification Code
 */
export async function verifyEmailVerificationCode(email: string, inputCode: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const safeKey = safeFirebaseKey(cleanEmail);
  const cleanInput = inputCode.trim();

  try {
    const codeRef = ref(db, `email_verifications/${safeKey}`);
    const snapshot = await get(codeRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.code === cleanInput && data.expiresAt > Date.now()) {
        await remove(codeRef);
        return true;
      }
    }
  } catch (e) {
    console.warn('verifyEmailVerificationCode DB check error:', e);
  }

  const local = localStorage.getItem(`email_otp_${cleanEmail}`);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (parsed.code === cleanInput && parsed.expiresAt > Date.now()) {
        localStorage.removeItem(`email_otp_${cleanEmail}`);
        return true;
      }
    } catch {}
  }

  return false;
}

/* =========================================================================
   PHONE NUMBER AUTH: FIREBASE SMS & reCAPTCHA + WHATSAPP BACKUP
   ========================================================================= */

export function cleanPhoneNumber(phone: string): string {
  const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  let cleaned = phone.replace(/[٠-٩]/g, (w) => arabicDigits.indexOf(w).toString());
  cleaned = cleaned.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  // Convert local 05XXXXXXXX to international format 9665XXXXXXXX
  if (cleaned.startsWith('05') && cleaned.length === 10) {
    cleaned = '966' + cleaned.substring(1);
  } else if (cleaned.startsWith('0') && cleaned.length >= 10) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

export function formatE164Phone(phone: string): string {
  const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  let cleaned = phone.replace(/[٠-٩]/g, (w) => arabicDigits.indexOf(w).toString());
  cleaned = cleaned.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.substring(2);
  }
  if (cleaned.startsWith('05') && cleaned.length === 10) {
    return '+966' + cleaned.substring(1);
  }
  if (cleaned.startsWith('0') && cleaned.length >= 10) {
    return '+966' + cleaned.substring(1);
  }
  return '+' + cleaned;
}

/**
 * Initialize reCAPTCHA verifier for Firebase Phone SMS authentication
 */
export function initRecaptchaVerifier(containerId: string = 'recaptcha-container'): RecaptchaVerifier {
  if (typeof window !== 'undefined' && (window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch {}
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // Solved invisibly
    }
  });

  if (typeof window !== 'undefined') {
    (window as any).recaptchaVerifier = verifier;
  }

  return verifier;
}

/**
 * Send real Firebase SMS verification code to phone number via reCAPTCHA
 */
export async function sendFirebasePhoneSMS(
  phoneNumber: string,
  appVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const e164Phone = formatE164Phone(phoneNumber);
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, e164Phone, appVerifier);
    return confirmationResult;
  } catch (err: any) {
    console.warn('sendFirebasePhoneSMS error:', err?.code, err?.message);
    const friendly = getFriendlyAuthErrorMessage(err);
    const customErr: any = new Error(friendly);
    customErr.code = err?.code;
    throw customErr;
  }
}

/**
 * Confirm real Firebase SMS verification code and authenticate user
 */
export async function confirmFirebasePhoneSMS(
  confirmationResult: ConfirmationResult,
  smsCode: string,
  username?: string,
  avatarUrl?: string
): Promise<User> {
  try {
    const credential = await confirmationResult.confirm(smsCode.trim());
    if (username || avatarUrl) {
      try {
        await updateProfile(credential.user, {
          displayName: username,
          photoURL: avatarUrl
        });
      } catch (profErr) {
        console.warn('updateProfile error:', profErr);
      }
    }
    return credential.user;
  } catch (err: any) {
    console.warn('confirmFirebasePhoneSMS error:', err?.code, err?.message);
    const friendly = getFriendlyAuthErrorMessage(err);
    const customErr: any = new Error(friendly);
    customErr.code = err?.code;
    throw customErr;
  }
}

export function hashPassword(pass: string): string {
  let hash = 0;
  for (let i = 0; i < pass.length; i++) {
    const char = pass.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'sec_' + Math.abs(hash).toString(36) + '_' + btoa(encodeURIComponent(pass)).slice(0, 12);
}

/**
 * Find user by email address
 */
export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const uid of Object.keys(data)) {
        const u = data[uid] as UserProfile;
        if (u.email && u.email.toLowerCase() === cleanEmail) {
          return { ...u, uid };
        }
      }
    }
  } catch (err) {
    console.warn('findUserByEmail error:', err);
  }
  return null;
}

/**
 * Generate 6-Digit WhatsApp OTP and direct WhatsApp trigger Link
 */
export async function sendWhatsAppVerificationCode(phone: string): Promise<{
  code: string;
  waUrl: string;
  phoneClean: string;
}> {
  const phoneClean = cleanPhoneNumber(phone);
  if (!phoneClean || phoneClean.length < 8) {
    throw new Error('يرجى إدخال رقم هاتف صحيح متضمناً مفتاح الدولة (مثل: 966501234567).');
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const safeKey = safeFirebaseKey(phoneClean);

  try {
    const codeRef = ref(db, `phone_verifications/${safeKey}`);
    await set(codeRef, {
      code,
      phone: phoneClean,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000
    });
  } catch (e) {
    console.warn('Database save phone code error:', e);
  }

  localStorage.setItem(`phone_otp_${phoneClean}`, JSON.stringify({
    code,
    expiresAt: Date.now() + 10 * 60 * 1000
  }));

  const message = `رمز التحقق الخاص بك في تطبيق NeuroYobe هو: *${code}*\nصالح لمدة 10 دقائق. يرجى عدم مشاركته مع أي شخص.`;
  const waUrl = `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encodeURIComponent(message)}`;

  return { code, waUrl, phoneClean };
}

/**
 * Verify WhatsApp OTP code entered by the user
 */
export async function verifyWhatsAppOTP(phone: string, inputCode: string): Promise<boolean> {
  const phoneClean = cleanPhoneNumber(phone);
  const safeKey = safeFirebaseKey(phoneClean);
  const cleanInput = inputCode.trim();

  try {
    const codeRef = ref(db, `phone_verifications/${safeKey}`);
    const snapshot = await get(codeRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.code === cleanInput && data.expiresAt > Date.now()) {
        await remove(codeRef);
        return true;
      }
    }
  } catch (e) {
    console.warn('verifyWhatsAppOTP DB check error:', e);
  }

  const local = localStorage.getItem(`phone_otp_${phoneClean}`);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (parsed.code === cleanInput && parsed.expiresAt > Date.now()) {
        localStorage.removeItem(`phone_otp_${phoneClean}`);
        return true;
      }
    } catch {}
  }

  return false;
}

/**
 * Find user by phone number
 */
export async function findUserByPhone(phone: string): Promise<UserProfile | null> {
  const phoneClean = cleanPhoneNumber(phone);
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const uid of Object.keys(data)) {
        const u = data[uid] as UserProfile;
        if (u.phoneNumber && cleanPhoneNumber(u.phoneNumber) === phoneClean) {
          return { ...u, uid };
        }
      }
    }
  } catch (err) {
    console.warn('findUserByPhone error:', err);
  }
  return null;
}

/**
 * Sign In with Phone & Password
 */
export async function signInWithPhone(phone: string, pass: string): Promise<UserProfile> {
  const phoneClean = cleanPhoneNumber(phone);
  if (!phoneClean || phoneClean.length < 8) {
    throw new Error('يرجى إدخال رقم هاتف صالح.');
  }

  const existing = await findUserByPhone(phoneClean);
  if (!existing) {
    throw new Error('لا يوجد حساب مسجل برقم الهاتف هذا. يمكنك إنشاء حساب جديد.');
  }

  const expectedHash = hashPassword(pass);
  if (existing.passwordHash && existing.passwordHash !== expectedHash) {
    throw new Error('كلمة المرور غير صحيحة لهذا الحساب.');
  }

  const updated: UserProfile = {
    ...existing,
    lastLoginAt: Date.now(),
    phoneVerified: true
  };
  await saveUserProfile(updated);
  return updated;
}

/**
 * Sign Up with Phone & Password
 */
export async function signUpWithPhone(phone: string, pass: string): Promise<{ uid: string; phone: string; passwordHash: string }> {
  const phoneClean = cleanPhoneNumber(phone);
  if (!phoneClean || phoneClean.length < 8) {
    throw new Error('يرجى إدخال رقم هاتف صالح مع مفتاح الدولة (مثل: 966501234567).');
  }

  const existing = await findUserByPhone(phoneClean);
  if (existing) {
    throw new Error('رقم الهاتف هذا مسجل بالفعل بحساب آخر. يرجى تسجيل الدخول.');
  }

  const uid = `phone_${phoneClean}`;
  const passwordHash = hashPassword(pass);

  return { uid, phone: phoneClean, passwordHash };
}

export async function signOutUser() {
  try {
    return await signOut(auth);
  } catch (err) {
    console.warn('SignOut error:', err);
  }
}

// Helper to determine device type
export function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet / تابلت';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
    return 'Mobile / هاتف';
  }
  return 'Desktop / كمبيوتر';
}

/* =========================================================================
   USER & PROFILE MANAGEMENT
   ========================================================================= */

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const userRef = ref(db, `users/${profile.uid}`);
  await set(userRef, sanitizeForFirebase(profile));
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = ref(db, `users/${uid}`);
  const snapshot = await get(userRef);
  if (snapshot.exists()) {
    return snapshot.val() as UserProfile;
  }
  return null;
}

export async function updateUserProfileFields(uid: string, fields: Partial<UserProfile>): Promise<void> {
  const userRef = ref(db, `users/${uid}`);
  await update(userRef, sanitizeForFirebase(fields));
}

export function subscribeToAllUsers(callback: (users: UserProfile[]) => void): () => void {
  const usersRef = ref(db, 'users');
  const unsubscribe = onValue(usersRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({ ...data[key], uid: key }));
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Firebase users listen error:", error);
    callback([]);
  });
  return () => off(usersRef, 'value', unsubscribe);
}

export async function deleteUserAndData(uid: string): Promise<void> {
  await remove(ref(db, `users/${uid}`));
  await remove(ref(db, `user_history/${uid}`));
  await remove(ref(db, `user_likes/${uid}`));
  await remove(ref(db, `user_saved/${uid}`));
  await remove(ref(db, `user_downloads/${uid}`));
}

export async function deleteAllUsers(): Promise<void> {
  await remove(ref(db, 'users'));
}

/* =========================================================================
   ACTIVITY LOGGING (Logged-in users only)
   ========================================================================= */

export async function logUserActivity(
  user: UserProfile | null,
  action: ActivityLogItem['action'],
  details: string
): Promise<void> {
  if (!user || !user.uid) return; // STRICT: Zero logging for visitors
  try {
    const logsRef = ref(db, 'activity_logs');
    const newLogRef = push(logsRef);
    const logItem: ActivityLogItem = {
      id: newLogRef.key || Date.now().toString(),
      userUid: user.uid,
      userName: user.username || user.email || 'مستخدم',
      action,
      details,
      createdAt: Date.now()
    };
    await set(newLogRef, logItem);
  } catch (err) {
    console.warn("Activity logging failed:", err);
  }
}

export function subscribeToActivityLogs(callback: (logs: ActivityLogItem[]) => void): () => void {
  const logsRef = ref(db, 'activity_logs');
  const unsubscribe = onValue(logsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({ ...data[key], id: key }));
      list.sort((a, b) => b.createdAt - a.createdAt);
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Activity logs listen error:", error);
    callback([]);
  });
  return () => off(logsRef, 'value', unsubscribe);
}

/* =========================================================================
   VIDEOS CRUD & REALTIME
   ========================================================================= */

export async function createVideo(videoData: Omit<VideoItem, 'id'>): Promise<string> {
  const videosRef = ref(db, 'videos');
  const newVideoRef = push(videosRef);
  const id = newVideoRef.key!;
  const fullVideo: VideoItem = {
    ...videoData,
    id,
    views: videoData.views || 0,
    likes: videoData.likes || 0,
    dislikes: videoData.dislikes || 0,
    commentsCount: videoData.commentsCount || 0,
    downloadsCount: videoData.downloadsCount || 0,
    createdAt: videoData.createdAt || Date.now()
  };
  await set(newVideoRef, sanitizeForFirebase(fullVideo));
  return id;
}

export async function getVideo(id: string): Promise<VideoItem | null> {
  const videoRef = ref(db, `videos/${id}`);
  const snapshot = await get(videoRef);
  if (snapshot.exists()) {
    return snapshot.val() as VideoItem;
  }
  return null;
}

export function subscribeToVideos(callback: (videos: VideoItem[]) => void): () => void {
  const videosRef = ref(db, 'videos');
  const unsubscribe = onValue(videosRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data)
        .map(key => ({ ...data[key], id: key }))
        .filter(v => v && !v.id?.startsWith('starter_'));
      list.sort((a, b) => b.createdAt - a.createdAt);
      saveCachedVideos(list);
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.warn("Videos listen notice:", error.message);
    callback([]);
  });
  return () => off(videosRef, 'value', unsubscribe);
}

export async function incrementVideoViews(
  videoId: string,
  viewerUid?: string,
  publisherUid?: string
): Promise<boolean> {
  // CRITICAL RULE: If the viewer is the publisher/creator watching their own video, do NOT count the view!
  if (viewerUid && publisherUid && viewerUid === publisherUid) {
    return false;
  }

  const videoRef = ref(db, `videos/${videoId}`);
  const snap = await get(videoRef);
  if (snap.exists()) {
    const videoData = snap.val();
    // Extra safety check in case publisherUid wasn't passed in arguments
    if (viewerUid && videoData.publisherUid && viewerUid === videoData.publisherUid) {
      return false;
    }
    const currentViews = (videoData.views || 0) + 1;
    await update(videoRef, { views: currentViews });
    return true;
  }
  return false;
}

export async function recordVideoWatchTime(
  videoId: string,
  secondsWatched: number,
  viewerUid?: string,
  publisherUid?: string
): Promise<void> {
  if (secondsWatched <= 0) return;
  // If the viewer is the publisher watching their own video, do not accumulate towards public video watch time
  if (viewerUid && publisherUid && viewerUid === publisherUid) {
    return;
  }

  const videoRef = ref(db, `videos/${videoId}`);
  const snap = await get(videoRef);
  if (snap.exists()) {
    const videoData = snap.val();
    if (viewerUid && videoData.publisherUid && viewerUid === videoData.publisherUid) {
      return;
    }
    const currentSeconds = videoData.watchTimeSeconds || 0;
    const newSeconds = currentSeconds + secondsWatched;
    const watchHours = Math.round((newSeconds / 3600) * 10) / 10; // Round to 1 decimal place

    await update(videoRef, {
      watchTimeSeconds: newSeconds,
      watchHours: watchHours
    });
  }
}

export async function toggleVideoLike(
  videoId: string,
  userUid: string,
  targetType: 'like' | 'dislike'
): Promise<{ likes: number; dislikes: number; userState: 'like' | 'dislike' | null }> {
  const videoRef = ref(db, `videos/${videoId}`);
  const snap = await get(videoRef);
  if (!snap.exists()) throw new Error('الفيديو غير موجود');

  const video = snap.val() as VideoItem;
  const likedUsers = video.likedUsers || {};
  const currentStatus = likedUsers[userUid];

  let newLikes = video.likes || 0;
  let newDislikes = video.dislikes || 0;
  let nextState: 'like' | 'dislike' | null = null;

  if (currentStatus === targetType) {
    // Undo
    delete likedUsers[userUid];
    if (targetType === 'like') newLikes = Math.max(0, newLikes - 1);
    if (targetType === 'dislike') newDislikes = Math.max(0, newDislikes - 1);
    nextState = null;
  } else {
    // Switch or set
    if (currentStatus === 'like') newLikes = Math.max(0, newLikes - 1);
    if (currentStatus === 'dislike') newDislikes = Math.max(0, newDislikes - 1);

    likedUsers[userUid] = targetType;
    if (targetType === 'like') newLikes += 1;
    if (targetType === 'dislike') newDislikes += 1;
    nextState = targetType;
  }

  await update(videoRef, {
    likes: newLikes,
    dislikes: newDislikes,
    likedUsers
  });

  // Sync to user_likes table
  const userLikesRef = ref(db, `user_likes/${userUid}/${videoId}`);
  if (nextState === 'like') {
    const item: LikedItem = {
      id: videoId,
      userUid,
      videoId,
      videoTitle: video.title,
      videoThumbnail: video.thumbnailDataUrl,
      publisherName: video.publisherName,
      videoType: video.type,
      likedAt: Date.now(),
      isLike: true
    };
    await set(userLikesRef, item);
  } else {
    await remove(userLikesRef);
  }

  return { likes: newLikes, dislikes: newDislikes, userState: nextState };
}

export async function updateVideo(videoId: string, fields: Partial<VideoItem>): Promise<void> {
  const videoRef = ref(db, `videos/${videoId}`);
  const sanitized = sanitizeForFirebase({
    ...fields,
    updatedAt: Date.now()
  });
  await update(videoRef, sanitized);
}

export async function deleteVideo(videoId: string, publisherUid?: string, reasonNotice?: string): Promise<void> {
  await remove(ref(db, `videos/${videoId}`));
  // If removed by developer due to violation, send notification to publisher
  if (publisherUid && reasonNotice) {
    await sendNotification({
      recipientUid: publisherUid,
      type: 'video_deleted',
      title: 'تم حذف فيديو لمخالفته القواعد',
      body: reasonNotice,
      createdAt: Date.now(),
      isRead: false
    });
  }
}

export async function deleteAllVideos(): Promise<void> {
  await remove(ref(db, 'videos'));
}

export async function wipeAllSiteContentAndVideos(): Promise<void> {
  try {
    await remove(ref(db, 'videos'));
    await remove(ref(db, 'posts'));
    await remove(ref(db, 'comments'));
    await remove(ref(db, 'user_history'));
    await remove(ref(db, 'user_likes'));
    await remove(ref(db, 'user_saved'));
    await remove(ref(db, 'user_downloads'));
    await remove(ref(db, 'user_playlists'));
    await remove(ref(db, 'notifications'));
  } catch (err) {
    console.warn("Wipe Firebase data notice:", err);
  }
}

// Automatically purge any starter content if present in Firebase
(function runAutoPurge() {
  try {
    const videosRef = ref(db, 'videos');
    get(videosRef).then(snap => {
      if (snap.exists()) {
        const val = snap.val();
        let hasStarter = false;
        Object.keys(val).forEach(k => {
          if (k.startsWith('starter_')) {
            hasStarter = true;
            remove(ref(db, `videos/${k}`)).catch(() => {});
          }
        });
      }
    }).catch(() => {});

    const postsRef = ref(db, 'posts');
    get(postsRef).then(snap => {
      if (snap.exists()) {
        const val = snap.val();
        Object.keys(val).forEach(k => {
          if (k.startsWith('starter_')) {
            remove(ref(db, `posts/${k}`)).catch(() => {});
          }
        });
      }
    }).catch(() => {});
  } catch {}
})();

/* =========================================================================
   COMMENTS & REPLIES
   ========================================================================= */

export async function addComment(comment: Omit<CommentItem, 'id'>): Promise<string> {
  const commentsRef = ref(db, 'comments');
  const newCommentRef = push(commentsRef);
  const id = newCommentRef.key!;
  const fullComment: CommentItem = {
    ...comment,
    id,
    likes: 0,
    dislikes: 0
  };
  await set(newCommentRef, sanitizeForFirebase(fullComment));

  // Increment commentsCount on video or post
  if (comment.targetType === 'video') {
    const videoRef = ref(db, `videos/${comment.targetId}`);
    const snap = await get(videoRef);
    if (snap.exists()) {
      const count = (snap.val().commentsCount || 0) + 1;
      await update(videoRef, { commentsCount: count });
    }
  } else if (comment.targetType === 'post') {
    const postRef = ref(db, `posts/${comment.targetId}`);
    const snap = await get(postRef);
    if (snap.exists()) {
      const count = (snap.val().commentsCount || 0) + 1;
      await update(postRef, { commentsCount: count });
    }
  }

  return id;
}

export function subscribeToComments(targetId: string, callback: (comments: CommentItem[]) => void): () => void {
  const commentsRef = ref(db, 'comments');
  const unsubscribe = onValue(commentsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data)
        .map(key => ({ ...data[key], id: key } as CommentItem))
        .filter(c => c.targetId === targetId);
      list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
      });
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Comments listen error:", error);
    callback([]);
  });
  return () => off(commentsRef, 'value', unsubscribe);
}

export async function togglePinComment(commentId: string, isPinned: boolean, targetId?: string): Promise<void> {
  // If pinning, unpin any other pinned comment on the same target first
  if (isPinned && targetId) {
    try {
      const commentsRef = ref(db, 'comments');
      const snap = await get(commentsRef);
      if (snap.exists()) {
        const val = snap.val();
        for (const k of Object.keys(val)) {
          if (val[k].targetId === targetId && val[k].isPinned && k !== commentId) {
            await update(ref(db, `comments/${k}`), { isPinned: false, pinnedAt: null });
          }
        }
      }
    } catch {}
  }

  const commentRef = ref(db, `comments/${commentId}`);
  await update(commentRef, {
    isPinned,
    pinnedAt: isPinned ? Date.now() : null
  });
}

export async function updateCommentText(commentId: string, newText: string): Promise<void> {
  const commentRef = ref(db, `comments/${commentId}`);
  await update(commentRef, {
    text: newText,
    updatedAt: Date.now()
  });
}

export async function deleteComment(commentId: string, targetId: string, targetType: 'video' | 'post'): Promise<void> {
  await remove(ref(db, `comments/${commentId}`));
  // Decrement target comment count
  if (targetType === 'video') {
    const videoRef = ref(db, `videos/${targetId}`);
    const snap = await get(videoRef);
    if (snap.exists()) {
      const count = Math.max(0, (snap.val().commentsCount || 1) - 1);
      await update(videoRef, { commentsCount: count });
    }
  } else if (targetType === 'post') {
    const postRef = ref(db, `posts/${targetId}`);
    const snap = await get(postRef);
    if (snap.exists()) {
      const count = Math.max(0, (snap.val().commentsCount || 1) - 1);
      await update(postRef, { commentsCount: count });
    }
  }
}

/* =========================================================================
   SUBSCRIPTIONS
   ========================================================================= */

export async function toggleSubscription(
  subscriber: UserProfile,
  channel: { uid: string; name: string; avatar: string }
): Promise<boolean> {
  const subId = `${subscriber.uid}_${channel.uid}`;
  const subRef = ref(db, `subscriptions/${subId}`);
  const snap = await get(subRef);

  const channelUserRef = ref(db, `users/${channel.uid}`);
  const subscriberUserRef = ref(db, `users/${subscriber.uid}`);

  const channelSnap = await get(channelUserRef);
  const currentSubCount = channelSnap.exists() ? (channelSnap.val().subscribersCount || 0) : 0;

  if (snap.exists()) {
    // Unsubscribe
    await remove(subRef);
    await update(channelUserRef, { subscribersCount: Math.max(0, currentSubCount - 1) });
    return false;
  } else {
    // Subscribe
    const newSub: SubscriptionItem = {
      id: subId,
      subscriberUid: subscriber.uid,
      channelUid: channel.uid,
      channelName: channel.name,
      channelAvatar: channel.avatar,
      createdAt: Date.now(),
      notificationsEnabled: true
    };
    await set(subRef, newSub);
    await update(channelUserRef, { subscribersCount: currentSubCount + 1 });

    // Send notification to channel owner
    await sendNotification({
      recipientUid: channel.uid,
      type: 'system',
      title: 'مشترك جديد!',
      body: `قام ${subscriber.username} بالاشتراك في قناتك.`,
      thumbnail: subscriber.avatarUrl,
      createdAt: Date.now(),
      isRead: false
    });

    return true;
  }
}

export async function setSubscriptionNotification(
  subscriberUid: string,
  channelUid: string,
  notificationsEnabled: boolean
): Promise<void> {
  const subId = `${subscriberUid}_${channelUid}`;
  const subRef = ref(db, `subscriptions/${subId}`);
  await update(subRef, { notificationsEnabled });
}

export function subscribeToUserSubscriptions(userUid: string, callback: (subs: SubscriptionItem[]) => void): () => void {
  const subsRef = ref(db, 'subscriptions');
  const unsubscribe = onValue(subsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data)
        .map(key => ({ ...data[key], id: key } as SubscriptionItem))
        .filter(s => s.subscriberUid === userUid);
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Subs listen error:", error);
    callback([]);
  });
  return () => off(subsRef, 'value', unsubscribe);
}

export function subscribeToAllSubscriptions(callback: (subs: SubscriptionItem[]) => void): () => void {
  const subsRef = ref(db, 'subscriptions');
  const unsubscribe = onValue(subsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({ ...data[key], id: key } as SubscriptionItem));
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("All subs listen error:", error);
    callback([]);
  });
  return () => off(subsRef, 'value', unsubscribe);
}

/* =========================================================================
   USER RECORDS (Watch History, Likes, Saved, Downloads) - Logged-in only
   ========================================================================= */

export async function addToWatchHistory(userUid: string, video: VideoItem): Promise<void> {
  if (!userUid) return;
  const historyRef = ref(db, `user_history/${userUid}/${video.id}`);
  const item: HistoryItem = {
    id: video.id,
    userUid,
    videoId: video.id,
    videoTitle: video.title,
    videoThumbnail: video.thumbnailDataUrl,
    publisherName: video.publisherName,
    videoType: video.type,
    watchedAt: Date.now()
  };
  await set(historyRef, item);
}

export function subscribeToUserHistory(userUid: string, callback: (history: HistoryItem[]) => void): () => void {
  const historyRef = ref(db, `user_history/${userUid}`);
  const unsubscribe = onValue(historyRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({ ...data[key], id: key } as HistoryItem));
      list.sort((a, b) => b.watchedAt - a.watchedAt);
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("History listen error:", error);
    callback([]);
  });
  return () => off(historyRef, 'value', unsubscribe);
}

export async function deleteHistoryItem(userUid: string, videoId: string): Promise<void> {
  await remove(ref(db, `user_history/${userUid}/${videoId}`));
}

export async function clearAllUserHistory(userUid: string): Promise<void> {
  await remove(ref(db, `user_history/${userUid}`));
}

export async function toggleSaveToWatchLater(userUid: string, video: VideoItem): Promise<boolean> {
  const savedRef = ref(db, `user_saved/${userUid}/${video.id}`);
  const snap = await get(savedRef);
  if (snap.exists()) {
    await remove(savedRef);
    return false;
  } else {
    const item: SavedItem = {
      id: video.id,
      userUid,
      videoId: video.id,
      videoTitle: video.title,
      videoThumbnail: video.thumbnailDataUrl,
      publisherName: video.publisherName,
      videoType: video.type,
      savedAt: Date.now()
    };
    await set(savedRef, item);
    return true;
  }
}

export function subscribeToUserSaved(userUid: string, callback: (saved: SavedItem[]) => void): () => void {
  const savedRef = ref(db, `user_saved/${userUid}`);
  const unsubscribe = onValue(savedRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({ ...data[key], id: key } as SavedItem));
      list.sort((a, b) => b.savedAt - a.savedAt);
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Saved listen error:", error);
    callback([]);
  });
  return () => off(savedRef, 'value', unsubscribe);
}

export async function deleteSavedItem(userUid: string, videoId: string): Promise<void> {
  await remove(ref(db, `user_saved/${userUid}/${videoId}`));
}

export async function recordDownload(userUid: string, video: VideoItem, localBlobKey?: string): Promise<void> {
  if (!userUid) return;
  const dlRef = ref(db, `user_downloads/${userUid}/${video.id}`);
  const item: DownloadedItem = {
    id: video.id,
    userUid,
    videoId: video.id,
    videoTitle: video.title,
    videoThumbnail: video.thumbnailDataUrl,
    publisherName: video.publisherName,
    videoType: video.type,
    downloadedAt: Date.now(),
    localBlobKey,
    videoSource: video.source,
    externalUrl: video.externalUrl
  };
  await set(dlRef, item);

  // Increment video downloadsCount
  const videoRef = ref(db, `videos/${video.id}`);
  const snap = await get(videoRef);
  if (snap.exists()) {
    const count = (snap.val().downloadsCount || 0) + 1;
    await update(videoRef, { downloadsCount: count });
  }
}

export function subscribeToUserDownloads(userUid: string, callback: (downloads: DownloadedItem[]) => void): () => void {
  const dlRef = ref(db, `user_downloads/${userUid}`);
  const unsubscribe = onValue(dlRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({ ...data[key], id: key } as DownloadedItem));
      list.sort((a, b) => b.downloadedAt - a.downloadedAt);
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Downloads listen error:", error);
    callback([]);
  });
  return () => off(dlRef, 'value', unsubscribe);
}

export async function deleteDownloadItem(userUid: string, videoId: string): Promise<void> {
  await remove(ref(db, `user_downloads/${userUid}/${videoId}`));
}

export function subscribeToUserLikes(userUid: string, callback: (likes: LikedItem[]) => void): () => void {
  const likesRef = ref(db, `user_likes/${userUid}`);
  const unsubscribe = onValue(likesRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({ ...data[key], id: key } as LikedItem));
      list.sort((a, b) => b.likedAt - a.likedAt);
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Likes listen error:", error);
    callback([]);
  });
  return () => off(likesRef, 'value', unsubscribe);
}

export async function deleteLikedItem(userUid: string, videoId: string): Promise<void> {
  await remove(ref(db, `user_likes/${userUid}/${videoId}`));
}

/* =========================================================================
   PLAYLISTS
   ========================================================================= */

export async function createPlaylist(userUid: string, userName: string, title: string, description: string): Promise<string> {
  const plRef = ref(db, 'playlists');
  const newPl = push(plRef);
  const id = newPl.key!;
  const item: PlaylistItem = {
    id,
    userUid,
    userName,
    title,
    description,
    videoIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPrivate: false
  };
  await set(newPl, item);
  return id;
}

export async function addVideoToPlaylist(playlistId: string, videoId: string): Promise<void> {
  const plRef = ref(db, `playlists/${playlistId}`);
  const snap = await get(plRef);
  if (snap.exists()) {
    const pl = snap.val() as PlaylistItem;
    const currentVideos = pl.videoIds || [];
    if (!currentVideos.includes(videoId)) {
      currentVideos.push(videoId);
      await update(plRef, { videoIds: currentVideos, updatedAt: Date.now() });
    }
  }
}

export async function removeVideoFromPlaylist(playlistId: string, videoId: string): Promise<void> {
  const plRef = ref(db, `playlists/${playlistId}`);
  const snap = await get(plRef);
  if (snap.exists()) {
    const pl = snap.val() as PlaylistItem;
    const currentVideos = (pl.videoIds || []).filter(id => id !== videoId);
    await update(plRef, { videoIds: currentVideos, updatedAt: Date.now() });
  }
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  await remove(ref(db, `playlists/${playlistId}`));
}

export function subscribeToUserPlaylists(userUid: string, callback: (playlists: PlaylistItem[]) => void): () => void {
  const plRef = ref(db, 'playlists');
  const unsubscribe = onValue(plRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data)
        .map(key => ({ ...data[key], id: key } as PlaylistItem))
        .filter(p => p.userUid === userUid);
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Playlists listen error:", error);
    callback([]);
  });
  return () => off(plRef, 'value', unsubscribe);
}

/* =========================================================================
   COMMUNITY POSTS & POLLS
   ========================================================================= */

export async function createPost(post: Omit<PostItem, 'id'>): Promise<string> {
  const postsRef = ref(db, 'posts');
  const newPostRef = push(postsRef);
  const id = newPostRef.key!;
  const fullPost: PostItem = {
    ...post,
    id,
    likes: 0,
    dislikes: 0,
    commentsCount: 0,
    createdAt: post.createdAt || Date.now()
  };
  await set(newPostRef, sanitizeForFirebase(fullPost));
  return id;
}

export function subscribeToPosts(callback: (posts: PostItem[]) => void): () => void {
  const postsRef = ref(db, 'posts');
  const unsubscribe = onValue(postsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data)
        .map(key => ({ ...data[key], id: key } as PostItem))
        .filter(p => p && !p.id?.startsWith('starter_'));
      list.sort((a, b) => b.createdAt - a.createdAt);
      saveCachedPosts(list);
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.warn("Posts listen notice:", error.message);
    callback([]);
  });
  return () => off(postsRef, 'value', unsubscribe);
}

export async function voteOnPoll(postId: string, optionId: string, userUid: string): Promise<void> {
  const postRef = ref(db, `posts/${postId}`);
  const snap = await get(postRef);
  if (!snap.exists()) return;
  const post = snap.val() as PostItem;
  if (!post.pollOptions) return;

  // Check if user already voted in any option
  let alreadyVotedOptionId: string | null = null;
  post.pollOptions.forEach(opt => {
    if (opt.votedUserUids && opt.votedUserUids.includes(userUid)) {
      alreadyVotedOptionId = opt.id;
    }
  });

  const updatedOptions = post.pollOptions.map(opt => {
    let list = opt.votedUserUids ? [...opt.votedUserUids] : [];
    if (opt.id === alreadyVotedOptionId) {
      list = list.filter(u => u !== userUid);
    }
    if (opt.id === optionId && alreadyVotedOptionId !== optionId) {
      list.push(userUid);
    }
    return {
      ...opt,
      votes: list.length,
      votedUserUids: list
    };
  });

  await update(postRef, { pollOptions: updatedOptions });
}

export async function togglePostLike(
  postId: string,
  userUid: string,
  targetType: 'like' | 'dislike'
): Promise<void> {
  const postRef = ref(db, `posts/${postId}`);
  const snap = await get(postRef);
  if (!snap.exists()) return;
  const post = snap.val() as PostItem;
  const likedUsers = post.likedUsers || {};
  const currentStatus = likedUsers[userUid];

  let newLikes = post.likes || 0;
  let newDislikes = post.dislikes || 0;

  if (currentStatus === targetType) {
    delete likedUsers[userUid];
    if (targetType === 'like') newLikes = Math.max(0, newLikes - 1);
    if (targetType === 'dislike') newDislikes = Math.max(0, newDislikes - 1);
  } else {
    if (currentStatus === 'like') newLikes = Math.max(0, newLikes - 1);
    if (currentStatus === 'dislike') newDislikes = Math.max(0, newDislikes - 1);
    likedUsers[userUid] = targetType;
    if (targetType === 'like') newLikes += 1;
    if (targetType === 'dislike') newDislikes += 1;
  }

  await update(postRef, {
    likes: newLikes,
    dislikes: newDislikes,
    likedUsers
  });
}

export async function updatePost(postId: string, fields: Partial<PostItem>): Promise<void> {
  const postRef = ref(db, `posts/${postId}`);
  const sanitized = sanitizeForFirebase({
    ...fields,
    updatedAt: Date.now()
  });
  await update(postRef, sanitized);
}

export async function deletePost(postId: string): Promise<void> {
  await remove(ref(db, `posts/${postId}`));
}

/* =========================================================================
   NOTIFICATIONS
   ========================================================================= */

export async function sendNotification(
  notif: Omit<NotificationItem, 'id'> | Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>
): Promise<string> {
  const notifRef = ref(db, 'notifications');
  const newRef = push(notifRef);
  const id = newRef.key!;
  const fullItem: NotificationItem = {
    createdAt: Date.now(),
    isRead: false,
    ...notif,
    id
  };
  await set(newRef, fullItem);
  return id;
}

export function subscribeToUserNotifications(userUid: string, callback: (notifications: NotificationItem[]) => void): () => void {
  const notifRef = ref(db, 'notifications');
  const unsubscribe = onValue(notifRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data)
        .map(key => ({ ...data[key], id: key } as NotificationItem))
        .filter(n => n.recipientUid === userUid);
      list.sort((a, b) => b.createdAt - a.createdAt);
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Notifications listen error:", error);
    callback([]);
  });
  return () => off(notifRef, 'value', unsubscribe);
}

export async function markNotificationAsRead(notifId: string): Promise<void> {
  await update(ref(db, `notifications/${notifId}`), { isRead: true });
}

export async function markAllNotificationsAsRead(userUid: string, notifIds: string[]): Promise<void> {
  for (const id of notifIds) {
    await update(ref(db, `notifications/${id}`), { isRead: true });
  }
}

/* =========================================================================
   SUPPORT TICKETS & COMPLAINTS
   ========================================================================= */

export async function submitSupportTicket(ticket: Omit<SupportTicket, 'id' | 'status' | 'createdAt'>): Promise<string> {
  const ticketsRef = ref(db, 'support_tickets');
  const newRef = push(ticketsRef);
  const id = newRef.key!;
  const fullTicket: SupportTicket = {
    ...ticket,
    id,
    status: 'open',
    createdAt: Date.now()
  };
  await set(newRef, sanitizeForFirebase(fullTicket));
  return id;
}

export function subscribeToSupportTickets(callback: (tickets: SupportTicket[]) => void): () => void {
  const ticketsRef = ref(db, 'support_tickets');
  const unsubscribe = onValue(ticketsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({ ...data[key], id: key } as SupportTicket));
      list.sort((a, b) => b.createdAt - a.createdAt);
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Tickets listen error:", error);
    callback([]);
  });
  return () => off(ticketsRef, 'value', unsubscribe);
}

export function subscribeToUserTickets(userUid: string, callback: (tickets: SupportTicket[]) => void): () => void {
  const ticketsRef = ref(db, 'support_tickets');
  const unsubscribe = onValue(ticketsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data)
        .map(key => ({ ...data[key], id: key } as SupportTicket))
        .filter(t => t.userUid === userUid);
      list.sort((a, b) => b.createdAt - a.createdAt);
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("User tickets listen error:", error);
    callback([]);
  });
  return () => off(ticketsRef, 'value', unsubscribe);
}

export async function replyToSupportTicket(
  ticketId: string,
  userUid: string,
  replyText: string,
  replyImage?: string
): Promise<void> {
  const ticketRef = ref(db, `support_tickets/${ticketId}`);
  await update(ticketRef, {
    status: 'answered',
    developerReply: replyText,
    replyImage: replyImage || null,
    repliedAt: Date.now()
  });

  // Notify user
  await sendNotification({
    recipientUid: userUid,
    type: 'support_reply',
    title: 'رد جديد من إدارة Yassa Tube',
    body: replyText.substring(0, 80) + '...',
    createdAt: Date.now(),
    isRead: false
  });
}

export async function rejectSupportTicket(ticketId: string): Promise<void> {
  await update(ref(db, `support_tickets/${ticketId}`), {
    status: 'rejected',
    repliedAt: Date.now()
  });
}

export async function deleteSupportTicket(ticketId: string): Promise<void> {
  await remove(ref(db, `support_tickets/${ticketId}`));
}

/* =========================================================================
   DEVELOPER SETTINGS & CUSTOMIZATION (Stored in Firebase)
   ========================================================================= */

export async function saveDeveloperSettings(settings: DeveloperSettings): Promise<void> {
  const setRef = ref(db, 'developer_settings/global');
  await set(setRef, {
    ...settings,
    updatedAt: Date.now()
  });
}

export function subscribeToDeveloperSettings(callback: (settings: DeveloperSettings | null) => void): () => void {
  const setRef = ref(db, 'developer_settings/global');
  const unsubscribe = onValue(setRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as DeveloperSettings);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Settings listen error:", error);
    callback(null);
  });
  return () => off(setRef, 'value', unsubscribe);
}

// Aliases for seamless naming across components
export const createSupportTicket = submitSupportTicket;
export const subscribeToUserSupportTickets = subscribeToUserTickets;
export const subscribeToNotifications = subscribeToUserNotifications;
export const subscribeToUserWatchHistory = subscribeToUserHistory;
export const subscribeToUserWatchLater = subscribeToUserSaved;
export const clearWatchHistory = clearAllUserHistory;

/* =========================================================================
   VISITOR INTELLIGENCE & TRACKING ("خانة الزوار")
   ========================================================================= */

function getDeviceDetails(): { deviceType: 'Mobile' | 'Desktop' | 'Tablet' | 'Other'; deviceName: string; os: string; browser: string } {
  if (typeof window === 'undefined') {
    return { deviceType: 'Desktop', deviceName: 'Unknown Device', os: 'Unknown OS', browser: 'Unknown Browser' };
  }
  const ua = navigator.userAgent || '';
  let deviceType: 'Mobile' | 'Desktop' | 'Tablet' | 'Other' = 'Desktop';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))) {
    deviceType = 'Tablet';
  } else if (/Mobi|Android|iPhone|iPod/i.test(ua)) {
    deviceType = 'Mobile';
  }

  let os = 'Unknown OS';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  const screenInfo = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
  const deviceName = `${os} (${deviceType} - ${browser} - ${screenInfo})`;

  return { deviceType, deviceName, os, browser };
}

export function getOrCreateVisitorId(): string {
  try {
    let vid = localStorage.getItem('neuro_visitor_id');
    if (!vid) {
      vid = 'vis_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('neuro_visitor_id', vid);
    }
    return vid;
  } catch {
    return 'vis_session_' + Date.now();
  }
}

export async function trackVisitorSession(currentUser?: UserProfile | null): Promise<string> {
  const visitorId = getOrCreateVisitorId();
  const visitorRef = ref(db, `visitors/${visitorId}`);
  const { deviceType, deviceName, os, browser } = getDeviceDetails();
  const now = Date.now();

  const todayDateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const thisMonthStr = todayDateStr.substring(0, 7); // YYYY-MM

  try {
    const snap = await get(visitorRef);
    let existing = snap.exists() ? (snap.val() as VisitorRecord) : null;

    if (!existing) {
      existing = {
        id: visitorId,
        userUid: currentUser?.uid,
        userName: currentUser?.username,
        email: currentUser?.email,
        avatarUrl: currentUser?.avatarUrl,
        deviceType,
        deviceName,
        os,
        browser,
        firstVisitAt: now,
        lastVisitAt: now,
        visitsCount: 1,
        isBanned: false,
        watchedVideos: [],
        sessions: [
          {
            id: 'sess_' + Date.now(),
            action: currentUser ? 'login' : 'enter',
            timestamp: now,
            details: `دخول الموقع عبر ${deviceName}`
          }
        ]
      };
      await set(visitorRef, sanitizeForFirebase(existing));
    } else {
      const updatedSessions = existing.sessions || [];
      updatedSessions.push({
        id: 'sess_' + Date.now(),
        action: currentUser ? 'login' : 'enter',
        timestamp: now,
        details: `زيارة جديدة للموقع (${deviceName})`
      });
      // Keep last 40 sessions
      if (updatedSessions.length > 40) updatedSessions.shift();

      await update(visitorRef, sanitizeForFirebase({
        userUid: currentUser?.uid || existing.userUid,
        userName: currentUser?.username || existing.userName,
        email: currentUser?.email || existing.email,
        avatarUrl: currentUser?.avatarUrl || existing.avatarUrl,
        lastVisitAt: now,
        visitsCount: (existing.visitsCount || 0) + 1,
        deviceName,
        os,
        browser,
        deviceType,
        sessions: updatedSessions
      }));
    }

    // Update global visitor counters
    const statsRef = ref(db, 'visitor_stats/global');
    const statsSnap = await get(statsRef);
    let currentStats: VisitorStats = statsSnap.exists()
      ? statsSnap.val()
      : { dailyCount: 0, monthlyCount: 0, totalCount: 0 };

    let dailyCount = (currentStats.dailyCount || 0) + 1;
    let monthlyCount = (currentStats.monthlyCount || 0) + 1;
    const totalCount = (currentStats.totalCount || 0) + 1;

    // Daily reset check (if day changed)
    if (currentStats.lastDailyDate && currentStats.lastDailyDate !== todayDateStr) {
      dailyCount = 1;
    }
    // Monthly reset check (if month changed)
    if (currentStats.lastMonthlyDate && currentStats.lastMonthlyDate !== thisMonthStr) {
      monthlyCount = 1;
    }

    await set(statsRef, {
      dailyCount,
      monthlyCount,
      totalCount,
      lastDailyDate: todayDateStr,
      lastMonthlyDate: thisMonthStr,
      dailyResetAt: currentStats.dailyResetAt || now,
      monthlyResetAt: currentStats.monthlyResetAt || now
    });

    // Also update logged-in user profile with device type & last visit
    if (currentUser?.uid) {
      const userProfRef = ref(db, `users/${currentUser.uid}`);
      await update(userProfRef, {
        deviceType: deviceName,
        lastLoginAt: now
      });
    }
  } catch (err) {
    console.warn("Visitor tracking exception:", err);
  }

  return visitorId;
}

export function subscribeToVisitors(callback: (visitors: VisitorRecord[]) => void): () => void {
  const visitorsRef = ref(db, 'visitors');
  const unsubscribe = onValue(visitorsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({ ...data[key], id: key } as VisitorRecord));
      list.sort((a, b) => b.lastVisitAt - a.lastVisitAt);
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Visitors listen error:", error);
    callback([]);
  });
  return () => off(visitorsRef, 'value', unsubscribe);
}

export async function deleteVisitor(visitorId: string): Promise<void> {
  await remove(ref(db, `visitors/${visitorId}`));
}

export async function banVisitor(visitorId: string, isBanned: boolean): Promise<void> {
  await update(ref(db, `visitors/${visitorId}`), { isBanned });
}

export async function clearAllVisitors(): Promise<void> {
  await remove(ref(db, 'visitors'));
}

export function subscribeToVisitorStats(callback: (stats: VisitorStats) => void): () => void {
  const statsRef = ref(db, 'visitor_stats/global');
  const unsubscribe = onValue(statsRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as VisitorStats);
    } else {
      callback({ dailyCount: 0, monthlyCount: 0, totalCount: 0 });
    }
  }, (error) => {
    console.error("Visitor stats listen error:", error);
    callback({ dailyCount: 0, monthlyCount: 0, totalCount: 0 });
  });
  return () => off(statsRef, 'value', unsubscribe);
}

export async function resetDailyVisits(): Promise<void> {
  await update(ref(db, 'visitor_stats/global'), {
    dailyCount: 0,
    dailyResetAt: Date.now()
  });
}

export async function resetMonthlyVisits(): Promise<void> {
  await update(ref(db, 'visitor_stats/global'), {
    monthlyCount: 0,
    monthlyResetAt: Date.now()
  });
}

export async function resetTotalVisits(): Promise<void> {
  await update(ref(db, 'visitor_stats/global'), {
    totalCount: 0
  });
}

export async function recordVisitorWatchedVideo(
  videoId: string,
  title: string,
  type: 'video' | 'short',
  thumbnail: string,
  durationSeconds: number,
  currentUser?: UserProfile | null
): Promise<void> {
  const visitorId = getOrCreateVisitorId();
  const visitorRef = ref(db, `visitors/${visitorId}`);

  try {
    const snap = await get(visitorRef);
    if (snap.exists()) {
      const visitor = snap.val() as VisitorRecord;
      const watched = visitor.watchedVideos || [];
      const existingIdx = watched.findIndex(w => w.id === videoId);
      if (existingIdx >= 0) {
        watched[existingIdx].watchedAt = Date.now();
        watched[existingIdx].watchDurationSeconds += durationSeconds;
      } else {
        watched.unshift({
          id: videoId,
          title,
          type,
          thumbnail: thumbnail || '',
          watchedAt: Date.now(),
          watchDurationSeconds: durationSeconds
        });
      }
      if (watched.length > 50) watched.pop();

      const sessions = visitor.sessions || [];
      sessions.push({
        id: 'watch_' + Date.now(),
        action: 'watch',
        timestamp: Date.now(),
        details: `شاهد: ${title} (${durationSeconds} ثانية)`
      });
      if (sessions.length > 40) sessions.shift();

      await update(visitorRef, sanitizeForFirebase({
        userUid: currentUser?.uid || visitor.userUid,
        userName: currentUser?.username || visitor.userName,
        email: currentUser?.email || visitor.email,
        avatarUrl: currentUser?.avatarUrl || visitor.avatarUrl,
        watchedVideos: watched,
        sessions
      }));
    }
  } catch (e) {
    console.warn("recordVisitorWatchedVideo error", e);
  }
}

/* =========================================================================
   COMPLAINTS & CONTENT REPORTING ("الشكاوى والإبلاغات")
   ========================================================================= */

export async function submitComplaintReport(
  report: Omit<ComplaintReport, 'id' | 'createdAt' | 'status'>
): Promise<string> {
  const reportsRef = ref(db, 'complaint_reports');
  const newRef = push(reportsRef);
  const id = newRef.key!;
  const fullReport: ComplaintReport = {
    ...report,
    id,
    status: 'pending',
    createdAt: Date.now()
  };
  await set(newRef, sanitizeForFirebase(fullReport));
  return id;
}

export function subscribeToComplaintReports(callback: (reports: ComplaintReport[]) => void): () => void {
  const reportsRef = ref(db, 'complaint_reports');
  const unsubscribe = onValue(reportsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({ ...data[key], id: key } as ComplaintReport));
      list.sort((a, b) => b.createdAt - a.createdAt);
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Complaint reports listen error:", error);
    callback([]);
  });
  return () => off(reportsRef, 'value', unsubscribe);
}

export async function updateComplaintStatus(
  reportId: string,
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed'
): Promise<void> {
  await update(ref(db, `complaint_reports/${reportId}`), { status });
}

export async function deleteComplaintReport(reportId: string): Promise<void> {
  await remove(ref(db, `complaint_reports/${reportId}`));
}

/* =========================================================================
   STRIKE SYSTEM & BLACKLIST (الحظر التلقائي ومنع النشر)
   ========================================================================= */

export async function deleteVideoWithReason(
  videoId: string,
  publisherUid: string,
  customReason?: string
): Promise<void> {
  const defaultReason = 'تم حذف الفيديو لانتهاكه سياسات الأمان أو حقوق الطبع والنشر';
  const reason = (customReason && customReason.trim()) ? customReason.trim() : defaultReason;

  // 1. Get video title for history/log
  const videoRef = ref(db, `videos/${videoId}`);
  let videoTitle = 'فيديو';
  const snap = await get(videoRef);
  if (snap.exists()) {
    videoTitle = snap.val().title || 'فيديو';
  }

  // 2. Remove the video
  await remove(videoRef);

  // 3. Remove comments for this video
  await remove(ref(db, `comments/${videoId}`));

  // 4. Notify publisher
  if (publisherUid) {
    await sendNotification({
      recipientUid: publisherUid,
      type: 'video_deleted',
      title: 'إشعار بحذف محتوى من قناتك',
      body: `${reason} - عنوان الفيديو المحذوف: "${videoTitle}"`,
      createdAt: Date.now(),
      isRead: false
    });

    // 5. Strike check on publisher
    const userRef = ref(db, `users/${publisherUid}`);
    const userSnap = await get(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.val() as UserProfile;
      const currentStrikes = (userData.strikesCount || 0) + 1;
      const shouldAutoBlacklist = currentStrikes >= 3;

      await update(userRef, {
        strikesCount: currentStrikes,
        isBlacklisted: shouldAutoBlacklist ? true : !!userData.isBlacklisted,
        publishingBannedReason: shouldAutoBlacklist
          ? `تم الحظر التلقائي لوصول المخالفات إلى ${currentStrikes} عناصر محذوفة`
          : userData.publishingBannedReason
      });

      // Record in Blacklist DB if reached 3 strikes
      if (shouldAutoBlacklist) {
        const blRef = ref(db, `blacklist/${publisherUid}`);
        const blSnap = await get(blRef);
        const existingBl = blSnap.exists() ? (blSnap.val() as BlacklistRecord) : null;
        const violations = existingBl?.violations || [];
        violations.push({
          id: videoId,
          type: 'video',
          title: videoTitle,
          deletedAt: Date.now(),
          reason
        });

        await set(blRef, sanitizeForFirebase({
          id: publisherUid,
          userUid: publisherUid,
          userName: userData.username || 'ناشر',
          email: userData.email,
          avatarUrl: userData.avatarUrl,
          reason: `تجاوز الحد المسموح (3 مخالفات حذف محتوى)`,
          bannedAt: Date.now(),
          strikesCount: currentStrikes,
          violations
        }));

        await sendNotification({
          recipientUid: publisherUid,
          type: 'system',
          title: '⚠️ تم إدراج حسابك في القائمة السوداء (Blacklist)',
          body: 'نظراً لحذف 3 عناصر من محتواك بسبب المخالفات، تم منعك من نشر أي محتوى جديد على المنصة. يمكنك التواصل مع الدعم وشرح المشكلة لفك الحظر.',
          createdAt: Date.now(),
          isRead: false
        });
      }
    }
  }
}

export async function deletePostWithReason(
  postId: string,
  channelUid: string,
  customReason?: string
): Promise<void> {
  const defaultReason = 'تم حذف المنشور لانتهاكه سياسات الأمان أو حقوق الطبع والنشر';
  const reason = (customReason && customReason.trim()) ? customReason.trim() : defaultReason;

  const postRef = ref(db, `posts/${postId}`);
  let postTitle = 'منشور';
  const snap = await get(postRef);
  if (snap.exists()) {
    postTitle = snap.val().text?.substring(0, 30) || 'منشور';
  }

  await remove(postRef);
  await remove(ref(db, `comments/${postId}`));

  if (channelUid) {
    await sendNotification({
      recipientUid: channelUid,
      type: 'system',
      title: 'إشعار بحذف منشور',
      body: `${reason} - المنشور: "${postTitle}"`,
      createdAt: Date.now(),
      isRead: false
    });

    const userRef = ref(db, `users/${channelUid}`);
    const userSnap = await get(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.val() as UserProfile;
      const currentStrikes = (userData.strikesCount || 0) + 1;
      const shouldAutoBlacklist = currentStrikes >= 3;

      await update(userRef, {
        strikesCount: currentStrikes,
        isBlacklisted: shouldAutoBlacklist ? true : !!userData.isBlacklisted,
        publishingBannedReason: shouldAutoBlacklist
          ? `تم الحظر التلقائي لوصول المخالفات إلى ${currentStrikes} عناصر محذوفة`
          : userData.publishingBannedReason
      });

      if (shouldAutoBlacklist) {
        const blRef = ref(db, `blacklist/${channelUid}`);
        const blSnap = await get(blRef);
        const existingBl = blSnap.exists() ? (blSnap.val() as BlacklistRecord) : null;
        const violations = existingBl?.violations || [];
        violations.push({
          id: postId,
          type: 'post',
          title: postTitle,
          deletedAt: Date.now(),
          reason
        });

        await set(blRef, sanitizeForFirebase({
          id: channelUid,
          userUid: channelUid,
          userName: userData.username || 'ناشر',
          email: userData.email,
          avatarUrl: userData.avatarUrl,
          reason: `تجاوز الحد المسموح (3 مخالفات حذف محتوى)`,
          bannedAt: Date.now(),
          strikesCount: currentStrikes,
          violations
        }));
      }
    }
  }
}

export function subscribeToBlacklist(callback: (records: BlacklistRecord[]) => void): () => void {
  const blRef = ref(db, 'blacklist');
  const unsubscribe = onValue(blRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({ ...data[key], id: key } as BlacklistRecord));
      list.sort((a, b) => b.bannedAt - a.bannedAt);
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Blacklist listen error:", error);
    callback([]);
  });
  return () => off(blRef, 'value', unsubscribe);
}

export async function toggleUserBlacklist(
  userUid: string,
  isBlacklisted: boolean,
  reason: string = 'تم منع النشر بواسطة المطور'
): Promise<void> {
  const userRef = ref(db, `users/${userUid}`);
  const snap = await get(userRef);
  const userData = snap.exists() ? (snap.val() as UserProfile) : null;

  await update(userRef, {
    isBlacklisted,
    publishingBannedReason: isBlacklisted ? reason : null
  });

  const blRef = ref(db, `blacklist/${userUid}`);
  if (isBlacklisted) {
    await set(blRef, sanitizeForFirebase({
      id: userUid,
      userUid,
      userName: userData?.username || 'مستخدم',
      email: userData?.email,
      avatarUrl: userData?.avatarUrl,
      reason,
      bannedAt: Date.now(),
      strikesCount: userData?.strikesCount || 1,
      violations: []
    }));

    await sendNotification({
      recipientUid: userUid,
      type: 'system',
      title: '⚠️ تم إدراجك في قائمة منع النشر (Blacklist)',
      body: `السبب: ${reason}. لفك الحظر يرجى التواصل مع الدعم وشرح المشكلة.`,
      createdAt: Date.now(),
      isRead: false
    });
  } else {
    await remove(blRef);
    // Reset strikes if unbanned by developer
    await update(userRef, { strikesCount: 0 });
    await sendNotification({
      recipientUid: userUid,
      type: 'system',
      title: '🎉 تم فك حظر النشر عن حسابك بنجاح!',
      body: 'يمكنك الآن نشر الفيديوهات والمنشورات مجدداً على منصة NeuroYobe.',
      createdAt: Date.now(),
      isRead: false
    });
  }
}

export async function deleteBlacklistRecord(userUid: string): Promise<void> {
  await toggleUserBlacklist(userUid, false);
}


