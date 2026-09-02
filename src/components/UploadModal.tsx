import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Link2,
  FileVideo,
  Image as ImageIcon,
  CheckCircle,
  ShieldCheck,
  Compass,
  Film,
  Sparkles,
  AlertCircle,
  Globe,
  Lock,
  Clock,
  Layers,
  Check,
  HardDrive,
  Key
} from 'lucide-react';
import { compressDeviceImage } from '../services/mediaStorage';
import {
  createVideo,
  logUserActivity,
  uploadVideoDataToFirebase,
  VideoUploadProgress
} from '../services/firebase';
import {
  uploadVideoToGoogleDrive,
  requestDriveAuthorization,
  hasValidDriveToken
} from '../services/googleDrive';
import {
  inspectDeviceVideo,
  formatBytes,
  VideoInspectionReport
} from '../services/videoInspection';
import { getTranslation } from '../services/translations';
import { useToast } from './Toast';
import type { UserProfile, Language, VideoType, VideoSource, VideoVisibility } from '../types';

interface UploadModalProps {
  currentUser: UserProfile;
  language: Language;
  onClose: () => void;
  onSuccess: (videoId: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  currentUser,
  language,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState<VideoType>('video');
  const [source, setSource] = useState<VideoSource>('google_drive');
  const [externalUrl, setExternalUrl] = useState('');
  const [visibility, setVisibility] = useState<VideoVisibility>('public');

  // Google Drive Authorization State
  const [isDriveAuthorized, setIsDriveAuthorized] = useState<boolean>(hasValidDriveToken());
  const [isAuthorizingDrive, setIsAuthorizingDrive] = useState<boolean>(false);

  useEffect(() => {
    setIsDriveAuthorized(hasValidDriveToken());
  }, []);

  const getDefaultScheduledTime = () => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
  };
  const [scheduledDateTime, setScheduledDateTime] = useState<string>(getDefaultScheduledTime());

  // Device Files
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDataUrl, setVideoDataUrl] = useState<string | null>(null);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);

  // Video Inspection & Upload Progress
  const [inspectionReport, setInspectionReport] = useState<VideoInspectionReport | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<VideoUploadProgress | null>(null);

  // Settings
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [showLikesCount, setShowLikesCount] = useState(true);

  // Copyright confirmation stage
  const [showCopyrightModal, setShowCopyrightModal] = useState(false);
  const [hasAgreedCopyright, setHasAgreedCopyright] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const { showToast } = useToast();
  const t = (key: string) => getTranslation(language, key);

  const categories = [
    { id: 'all', label: 'عام / منوعات' },
    { id: 'gaming', label: 'ألعاب (Gaming)' },
    { id: 'tech', label: 'تقنية وبرمجة' },
    { id: 'education', label: 'تعليم ومعرفة' },
    { id: 'entertainment', label: 'ترفيه وكوميديا' },
    { id: 'music', label: 'موسيقى وصوتيات' },
    { id: 'news', label: 'أخبار وتحليلات' }
  ];

  // Publisher Google Drive Authorization Handler
  const handleAuthorizeDrive = async () => {
    setIsAuthorizingDrive(true);
    try {
      showToast('جاري فتح نافذة تفويض جوجل درايف للناشر...', 'info');
      await requestDriveAuthorization(true);
      setIsDriveAuthorized(true);
      showToast('✅ تم تفويض حساب Google Drive بنجاح، يمكنك الآن رفع الفيديو أوتوماتيكياً!', 'success');
    } catch (err: any) {
      console.error('Google Drive auth error:', err);
      showToast(err.message || 'تعذر إتمام تفويض حساب جوجل درايف', 'error');
    } finally {
      setIsAuthorizingDrive(false);
    }
  };

  // Handle Thumbnail Upload from Device (MANDATORY DEVICE ONLY)
  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast('جاري معالجة وضغط الصورة من جهازك...', 'info');
      const compressed = await compressDeviceImage(file, 1280, 720, 0.8);
      setThumbnailDataUrl(compressed);
      showToast('تم اختيار الصورة المصغرة بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل تحميل الصورة من الجهاز', 'error');
    }
  };

  // Handle Video File from Device with Comprehensive Inspection
  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|avi|webm|mkv|3gp)$/i)) {
      showToast('يرجى اختيار ملف فيديو صالح', 'error');
      return;
    }

    setVideoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVideoDataUrl(objectUrl);

    // Auto-populate title from filename if empty
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setTitle(cleanName);
    }

    setIsInspecting(true);
    try {
      showToast('جاري فحص وتحليل مواصفات الفيديو...', 'info');
      const report = await inspectDeviceVideo(file);
      setInspectionReport(report);

      // If it's a vertical video and not already a short, recommend or adjust
      if (report.isVertical && type !== 'short') {
        setType('short');
        showToast('تم ضبط نوع الفيديو تلقائياً إلى Shorts (مقطع عمودي)', 'info');
      } else {
        showToast(`تم فحص الفيديو بنجاح (${report.qualityLabel} - ${report.fileSizeFormatted})`, 'success');
      }
    } catch (err: any) {
      console.warn("Video inspection error:", err);
      showToast('تم اختيار الفيديو، جاهز للرفع السحابي', 'info');
    } finally {
      setIsInspecting(false);
    }
  };

  const handlePrePublish = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('يرجى إدخال عنوان للفيديو', 'error');
      return;
    }

    if (!thumbnailDataUrl) {
      showToast('الصورة المصغرة مطلوبة من جهازك حصراً', 'error');
      return;
    }

    if ((source === 'file' || source === 'google_drive') && !videoFile) {
      showToast('يرجى اختيار ملف فيديو من جهازك', 'error');
      return;
    }

    if (source === 'external' && !externalUrl.trim()) {
      showToast('يرجى إدخال رابط الفيديو الخارجي', 'error');
      return;
    }

    if (visibility === 'scheduled') {
      if (!scheduledDateTime) {
        showToast('يرجى تحديد تاريخ ووقت الجدولة', 'error');
        return;
      }
      const parsed = new Date(scheduledDateTime).getTime();
      if (isNaN(parsed) || parsed <= Date.now()) {
        showToast('يرجى تحديد تاريخ ووقت مستقبلي للجدولة', 'error');
        return;
      }
    }

    // Open Copyright declaration modal
    setShowCopyrightModal(true);
  };

  const handleFinalPublish = async () => {
    if (!hasAgreedCopyright) {
      showToast('يجب الموافقة على إقرار حقوق الطبع والنشر أولاً', 'error');
      return;
    }

    setIsPublishing(true);

    try {
      let scheduledAtTimestamp: number | undefined = undefined;
      if (visibility === 'scheduled' && scheduledDateTime) {
        scheduledAtTimestamp = new Date(scheduledDateTime).getTime();
      }

      // ==========================================
      // GOOGLE DRIVE DIRECT AUTOMATED UPLOAD FLOW
      // ==========================================
      if (source === 'google_drive' && videoFile) {
        setUploadProgress({
          percent: 2,
          loadedBytes: 0,
          totalBytes: videoFile.size,
          stage: 'جاري طلب تفويض جوجل درايف للناشر...'
        });

        const driveResult = await uploadVideoToGoogleDrive({
          file: videoFile,
          title: title.trim(),
          description: description.trim(),
          publisherUid: currentUser.uid,
          publisherName: currentUser.username,
          onProgress: (prog) => {
            setUploadProgress(prog);
          }
        });

        setIsDriveAuthorized(true);

        setUploadProgress({
          percent: 98,
          loadedBytes: videoFile.size,
          totalBytes: videoFile.size,
          stage: 'جاري تسجيل الفيديو وحمايته داخل مشغل الموقع...'
        });

        // 1. Create video record with driveFileId, embedUrl, and allowDownload = false
        const videoId = await createVideo({
          title: title.trim(),
          description: description.trim(),
          category,
          publisherUid: currentUser.uid,
          publisherName: currentUser.username,
          publisherAvatar: currentUser.avatarUrl,
          type,
          source: 'google_drive',
          visibility,
          scheduledAt: scheduledAtTimestamp,
          driveFileId: driveResult.fileId,
          externalUrl: driveResult.embedUrl,
          thumbnailDataUrl,
          views: 0,
          likes: 0,
          dislikes: 0,
          commentsCount: 0,
          downloadsCount: 0,
          createdAt: Date.now(),
          allowDownload: false, // Strictly false: protected against download
          allowComments,
          showLikesCount
        });

        // 2. Log user activity
        await logUserActivity(
          currentUser,
          'upload_video',
          `نشر ${type === 'short' ? 'شورت' : 'فيديو'}: ${title.trim()} (${visibility}) - تم الرفع أوتوماتيكياً إلى Google Drive مع منع التنزيل وحظر مشاركة الرابط`
        );

        showToast('تم رفع الفيديو إلى Google Drive الخاص بك بنجاح مع تفعيل حظر التنزيل والمشاركة!', 'success');
        onSuccess(videoId);
        return;
      }

      // ==========================================
      // STANDARD CLOUD DATABASE OR EXTERNAL EMBED
      // ==========================================
      setUploadProgress({
        percent: 5,
        loadedBytes: 0,
        totalBytes: videoFile ? videoFile.size : 100,
        stage: 'جاري إنشاء سجل الفيديو في قاعدة البيانات السحابية...'
      });

      // 1. Create video metadata record in Firebase Realtime Database
      const videoId = await createVideo({
        title: title.trim(),
        description: description.trim(),
        category,
        publisherUid: currentUser.uid,
        publisherName: currentUser.username,
        publisherAvatar: currentUser.avatarUrl,
        type,
        source,
        visibility,
        scheduledAt: scheduledAtTimestamp,
        externalUrl: source === 'external' ? externalUrl.trim() : undefined,
        thumbnailDataUrl,
        views: 0,
        likes: 0,
        dislikes: 0,
        commentsCount: 0,
        downloadsCount: 0,
        createdAt: Date.now(),
        allowDownload,
        allowComments,
        showLikesCount
      });

      // 2. Upload video file directly to Firebase as cloud data (NO local storage / NO Firebase Storage)
      if (source === 'file' && videoFile) {
        await uploadVideoDataToFirebase(videoId, videoFile, (progress) => {
          setUploadProgress(progress);
        });
      }

      // 3. Log user activity
      await logUserActivity(
        currentUser,
        'upload_video',
        `نشر ${type === 'short' ? 'شورت' : 'فيديو'}: ${title.trim()} (${visibility}) - تم الحفظ سحابياً في فايربيس`
      );

      showToast('تم رفع الفيديو وتخزينه في فايربيس بنجاح!', 'success');
      onSuccess(videoId);
    } catch (err: any) {
      console.error("Video upload failed:", err);
      showToast('فشل نشر الفيديو: ' + (err.message || 'خطأ غير متوقع'), 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-2xl flex justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#070e1c] border border-cyan-900/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 bg-[#091224]/80 border-b border-cyan-950/80">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">{t('upload')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-cyan-950/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePrePublish} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Video Type Selector: Standard Video vs Short */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">{t('chooseVideoType')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('video')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  type === 'video'
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-950/50'
                    : 'bg-[#091224]/40 border-cyan-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>{t('standardVideo')}</span>
              </button>

              <button
                type="button"
                onClick={() => setType('short')}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  type === 'short'
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-950/50'
                    : 'bg-[#091224]/40 border-cyan-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{t('shortVideo')} (Shorts)</span>
              </button>
            </div>
          </div>

          {/* Video Source Selector: Google Drive vs Device Firebase vs External Embed URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">{t('sourceType')}</label>
              <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                حماية تلقائية للمحتوى
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSource('google_drive');
                  setAllowDownload(false);
                }}
                className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${
                  source === 'google_drive'
                    ? 'bg-gradient-to-b from-cyan-950 to-[#071328] border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-950/80 ring-1 ring-cyan-400'
                    : 'bg-[#091224]/40 border-cyan-950 text-slate-400 hover:text-slate-200 hover:border-cyan-900/60'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-cyan-300">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>جوجل درايف</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">رفع إلى مساحتك الخاصة</span>
                <span className="mt-1 px-2 py-0.5 rounded-full bg-cyan-900/60 text-[9px] text-cyan-300 font-bold border border-cyan-500/40">
                  موصى به - محمي
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSource('file')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${
                  source === 'file'
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-950/80 ring-1 ring-cyan-400'
                    : 'bg-[#091224]/40 border-cyan-950 text-slate-400 hover:text-slate-200 hover:border-cyan-900/60'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <FileVideo className="w-4 h-4" />
                  <span>تخزين فايربيس</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">قاعدة بيانات سحابية</span>
              </button>

              <button
                type="button"
                onClick={() => setSource('external')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${
                  source === 'external'
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-950/80 ring-1 ring-cyan-400'
                    : 'bg-[#091224]/40 border-cyan-950 text-slate-400 hover:text-slate-200 hover:border-cyan-900/60'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Link2 className="w-4 h-4" />
                  <span>{t('externalLink')}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">يوتيوب / منصات ويب</span>
              </button>
            </div>
          </div>

          {/* Google Drive Status & Protection Card */}
          {source === 'google_drive' && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#09152b] to-[#071020] border border-cyan-500/40 space-y-3 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-100 flex items-center gap-1.5">
                      <span>تفويض ورفع Google Drive للناشر</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      يتم رفع الفيديو مباشرة إلى جوجل درايف الخاص بك بحجم غير محدود
                    </p>
                  </div>
                </div>

                {isDriveAuthorized ? (
                  <span className="px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    تم التفويض بنجاح
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleAuthorizeDrive}
                    disabled={isAuthorizingDrive}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#050a14] text-xs font-black flex items-center gap-1.5 shadow-md shadow-cyan-950 transition-all disabled:opacity-50 shrink-0"
                  >
                    {isAuthorizingDrive ? (
                      <div className="w-3.5 h-3.5 border-2 border-[#050a14] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Key className="w-3.5 h-3.5" />
                    )}
                    <span>تفويض جوجل درايف الآن</span>
                  </button>
                )}
              </div>

              {/* Automatic Protections Checklist */}
              <div className="p-3 rounded-xl bg-[#060c18]/90 border border-cyan-900/60 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>سيتم تطبيق معايير الأمان والحماية التلقائية:</span>
                </div>
                <ul className="space-y-1 text-slate-300 ps-5 list-disc text-[10px]">
                  <li>
                    <strong className="text-emerald-300">منع التنزيل أوتوماتيكياً:</strong> تفعيل قفل الحماية السحابي في درايف لمنع المشاهدين من تنزيل أو طباعة الفيديو.
                  </li>
                  <li>
                    <strong className="text-emerald-300">منع مشاركة رابط درايف:</strong> يتم تشغيل الفيديو داخل إطار محمي (Iframe) وتقتصر المشاركة على رابط الموقع فقط لحماية خصوصية حسابك.
                  </li>
                  <li>
                    <strong className="text-emerald-300">طلب التفويض التلقائي:</strong> في حال عدم التفويض المسبق، سيظهر إذن التفويض الرسمي من جوجل تلقائياً عند النقر على نشر.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Device Video File Picker (for Google Drive or Firebase file) */}
          {(source === 'file' || source === 'google_drive') ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">
                {source === 'google_drive' ? 'اختر ملف الفيديو من جهازك للرفع إلى درايف' : t('chooseVideoFile')}
              </label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-cyan-900/60 hover:border-cyan-400/80 rounded-2xl p-4 sm:p-6 bg-[#091224]/40 cursor-pointer transition-colors group">
                <FileVideo className="w-8 h-8 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-200">
                  {videoFile ? videoFile.name : t('selectVideoFromDevice')}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  {source === 'google_drive' ? 'MP4, WebM, MOV من جهازك - سيتم نقله مباشرة إلى درايف الخاص بك' : 'MP4, WebM, MOV من ذاكرة جهازك'}
                </span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  className="hidden"
                />
              </label>

              {/* Video Inspection Report Card */}
              {isInspecting && (
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 flex items-center gap-2 text-xs text-cyan-300">
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>جاري فحص جميع بيانات وملفات الفيديو المرفوع بدقة...</span>
                </div>
              )}

              {inspectionReport && !isInspecting && (
                <div className="p-3.5 rounded-2xl bg-[#09152b]/80 border border-cyan-500/40 space-y-2.5 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-cyan-900/50 pb-2">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>تقرير فحص مواصفات الفيديو المرفوع:</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3 text-cyan-300" />
                      <span>سليم وجاهز للبث السحابي</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-[#070e1c] border border-cyan-950/60">
                      <span className="text-slate-400 block text-[10px]">حجم الملف</span>
                      <span className="font-bold text-slate-100">{inspectionReport.fileSizeFormatted}</span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#070e1c] border border-cyan-950/60">
                      <span className="text-slate-400 block text-[10px]">المدة الزمنية</span>
                      <span className="font-bold text-cyan-300">{inspectionReport.durationFormatted}</span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#070e1c] border border-cyan-950/60">
                      <span className="text-slate-400 block text-[10px]">الدقة والجودة</span>
                      <span className="font-bold text-slate-100">{inspectionReport.qualityLabel} ({inspectionReport.resolution})</span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#070e1c] border border-cyan-950/60">
                      <span className="text-slate-400 block text-[10px]">الأبعاد والصوت</span>
                      <span className="font-bold text-slate-100">
                        {inspectionReport.aspectRatio.split(' ')[0]} {inspectionReport.hasAudio ? '🔊 صوت متوفر' : '🔇 صامت'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-cyan-400/90 pt-0.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{inspectionReport.recommendation}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* External URL Input */
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">{t('externalVideoUrl')}</label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                className="w-full bg-[#091224] border border-cyan-950 focus:border-cyan-400/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          )}

          {/* Mandatory Device Thumbnail */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>{t('thumbnailLabel')}</span>
              <span className="text-[10px] text-rose-400 font-normal">({t('deviceRequiredNotice')})</span>
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-900 bg-[#091224] hover:bg-cyan-950/60 text-cyan-300 text-xs font-semibold cursor-pointer transition-all">
                <ImageIcon className="w-4 h-4" />
                <span>{thumbnailDataUrl ? t('changeThumbnail') : t('selectThumbnailFromDevice')}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="hidden"
                />
              </label>

              {thumbnailDataUrl && (
                <div className="relative w-20 aspect-video rounded-lg overflow-hidden border border-cyan-500/50 shadow-md">
                  <img src={thumbnailDataUrl} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Video Metadata Inputs */}
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">{t('videoTitle')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('videoTitlePlaceholder')}
                className="w-full bg-[#091224] border border-cyan-950 focus:border-cyan-400/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">{t('videoDesc')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="اكتب وصفاً تفصيلياً مع الهاشتاجات..."
                className="w-full bg-[#091224] border border-cyan-950 focus:border-cyan-400/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none"
              />
            </div>

            {/* Category selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('category')}</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#091224] border border-cyan-950 focus:border-cyan-400/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#091224] text-slate-100">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Visibility Settings: Public vs Unlisted vs Private vs Scheduled */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('visibility')}</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                    visibility === 'public'
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-md'
                      : 'bg-[#091224]/40 border-cyan-950 text-slate-400'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{t('public')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility('unlisted')}
                  className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                    visibility === 'unlisted'
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-md'
                      : 'bg-[#091224]/40 border-cyan-950 text-slate-400'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{t('unlisted')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                    visibility === 'private'
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-md'
                      : 'bg-[#091224]/40 border-cyan-950 text-slate-400'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{t('private')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility('scheduled')}
                  className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                    visibility === 'scheduled'
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-md'
                      : 'bg-[#091224]/40 border-cyan-950 text-slate-400'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t('scheduled')}</span>
                </button>
              </div>

              {/* Scheduled Date/Time picker */}
              {visibility === 'scheduled' && (
                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-900/60 space-y-1.5 mt-2 animate-in fade-in duration-200">
                  <label className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('scheduledTime')}</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full bg-[#091224] border border-cyan-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Interactive Publisher Permissions & Flags */}
          <div className="space-y-2 pt-2 border-t border-cyan-950/80">
            {source === 'google_drive' ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#091224]/50 border border-cyan-950 select-none">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-200">{t('allowDownloadLabel')}</span>
                  <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-800/40">
                    <Lock className="w-3 h-3" />
                    معطل أوتوماتيكياً لحماية درايف
                  </span>
                </div>
                <input
                  type="checkbox"
                  disabled
                  checked={false}
                  className="rounded text-cyan-500 opacity-40 cursor-not-allowed"
                />
              </div>
            ) : (
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#091224]/50 border border-cyan-950 cursor-pointer">
                <span className="text-xs text-slate-200">{t('allowDownloadLabel')}</span>
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-cyan-400"
                />
              </label>
            )}

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#091224]/50 border border-cyan-950 cursor-pointer">
              <span className="text-xs text-slate-200">{t('allowCommentsLabel')}</span>
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                className="rounded text-cyan-500 focus:ring-cyan-400"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#091224]/50 border border-cyan-950 cursor-pointer">
              <span className="text-xs text-slate-200">{t('showLikesLabel')}</span>
              <input
                type="checkbox"
                checked={showLikesCount}
                onChange={(e) => setShowLikesCount(e.target.checked)}
                className="rounded text-cyan-500 focus:ring-cyan-400"
              />
            </label>
          </div>

          {/* Submit Button to trigger Copyright Review */}
          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-cyan-950/60 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>متابعة ونشر المحتوى</span>
            </button>
          </div>
        </form>

        {/* Copyright Declaration Modal (MANDATORY REQUIREMENT) */}
        {showCopyrightModal && !isPublishing && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl z-30 p-6 flex flex-col justify-center animate-in zoom-in-95 duration-200">
            <div className="max-w-md mx-auto flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-cyan-950 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-xl shadow-cyan-950/80">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <h3 className="text-base font-black text-slate-100">{t('copyrightTitle')}</h3>

              <p className="text-xs text-slate-300 leading-relaxed bg-[#091224] p-4 rounded-2xl border border-cyan-950/80 text-start">
                {t('copyrightText')}
              </p>

              <label className="flex items-center gap-3 cursor-pointer select-none text-start p-2">
                <input
                  type="checkbox"
                  checked={hasAgreedCopyright}
                  onChange={(e) => setHasAgreedCopyright(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-xs font-semibold text-cyan-200">
                  أقر بموافقتي الكاملة وتحملي المسؤولية عن هذا الفيديو
                </span>
              </label>

              <div className="flex gap-3 w-full pt-2">
                <button
                  type="button"
                  onClick={() => setShowCopyrightModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  {t('cancel')}
                </button>

                <button
                  type="button"
                  onClick={handleFinalPublish}
                  disabled={!hasAgreedCopyright || isPublishing}
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-lg shadow-cyan-900/50 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{t('publish')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress Modal / Overlay (REQUIRED BY USER) */}
        {isPublishing && (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#070e1c] border border-cyan-500/60 rounded-3xl p-6 shadow-2xl shadow-cyan-950/80 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-cyan-950 border border-cyan-500/40 text-cyan-400 animate-pulse">
                    {source === 'google_drive' ? <HardDrive className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-100">
                      {source === 'google_drive' ? 'شريط الرفع إلى Google Drive' : 'شريط رفع الفيديو السحابي'}
                    </h3>
                    <p className="text-[11px] text-cyan-400">
                      {source === 'google_drive'
                        ? 'رفع مباشر لمساحة درايف الخاصة بك مع تفعيل حظر التنزيل وحظر الرابط'
                        : 'تخزين في فايربيس كبيانات سحابية بدون تخزين محلي'}
                    </p>
                  </div>
                </div>
                <span className="text-xl font-black text-cyan-300 font-mono">
                  {uploadProgress ? `${uploadProgress.percent}%` : '0%'}
                </span>
              </div>

              {/* Real-time Animated Progress Bar */}
              <div className="space-y-2">
                <div className="w-full h-3.5 bg-[#091224] rounded-full overflow-hidden border border-cyan-950 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-sky-500 to-teal-400 rounded-full transition-all duration-300 relative shadow-[0_0_15px_#06b6d4]"
                    style={{ width: `${uploadProgress ? uploadProgress.percent : 10}%` }}
                  >
                    <div className="absolute inset-0 bg-white/25 animate-pulse rounded-full" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="truncate max-w-[260px]">
                    {uploadProgress?.stage || 'جاري معالجة بيانات الفيديو...'}
                  </span>
                  {uploadProgress && uploadProgress.totalBytes > 0 && (
                    <span className="font-mono text-cyan-400 font-bold shrink-0">
                      {formatBytes(uploadProgress.loadedBytes)} / {formatBytes(uploadProgress.totalBytes)}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-900/40 text-[11px] text-slate-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  يتم تخزين الفيديو كبيانات في خوادم فايربيس مباشرة لضمان وصول جميع المستخدمين إليه دون الاعتماد على مساحة التخزين بجهازك أو جهاز المشاهد.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
