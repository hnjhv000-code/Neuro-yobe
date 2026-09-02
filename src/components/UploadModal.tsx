import React, { useState } from 'react';
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
  Layers
} from 'lucide-react';
import { compressDeviceImage, storeVideoBlob } from '../services/mediaStorage';
import { createVideo, logUserActivity } from '../services/firebase';
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
  const [source, setSource] = useState<VideoSource>('file');
  const [externalUrl, setExternalUrl] = useState('');
  const [visibility, setVisibility] = useState<VideoVisibility>('public');

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

  // Handle Video File from Device
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showToast('يرجى اختيار ملف فيديو صالح', 'error');
      return;
    }

    setVideoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVideoDataUrl(objectUrl);
    showToast(`تم اختيار الفيديو: ${file.name}`, 'success');
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

    if (source === 'file' && !videoFile) {
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
      let fileBlobKey: string | undefined = undefined;

      // If user uploaded a device video file, store it locally in IndexedDB
      if (source === 'file' && videoFile) {
        const generatedKey = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await storeVideoBlob(generatedKey, videoFile, videoFile.name);
        fileBlobKey = generatedKey;
      }

      let scheduledAtTimestamp: number | undefined = undefined;
      if (visibility === 'scheduled' && scheduledDateTime) {
        scheduledAtTimestamp = new Date(scheduledDateTime).getTime();
      }

      // Save complete metadata to Firebase Realtime Database
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
        fileBlobKey,
        videoDataUrl: source === 'file' ? videoDataUrl || undefined : undefined,
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

      // Log activity
      await logUserActivity(currentUser, 'upload_video', `نشر ${type === 'short' ? 'شورت' : 'فيديو'}: ${title.trim()} (${visibility})`);

      showToast('تم نشر الفيديو بنجاح على Yassa Tube!', 'success');
      onSuccess(videoId);
    } catch (err: any) {
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
            className="p-1.5 text-slate-400 hover:text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handlePrePublish} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Format Selector: Short vs Long Video */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">{t('videoFormat')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('video')}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  type === 'video'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-950/40'
                    : 'bg-[#091224]/60 border-cyan-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>{t('standardVideo')}</span>
              </button>

              <button
                type="button"
                onClick={() => setType('short')}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  type === 'short'
                    ? 'bg-gradient-to-r from-rose-500/20 to-orange-500/20 border-rose-400 text-rose-200 shadow-md shadow-rose-950/40'
                    : 'bg-[#091224]/60 border-cyan-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>{t('shortVideo')}</span>
              </button>
            </div>
          </div>

          {/* Video Source Selector: Device File vs External Embed URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">{t('sourceType')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSource('file')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  source === 'file'
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                    : 'bg-[#091224]/40 border-cyan-950 text-slate-400'
                }`}
              >
                <FileVideo className="w-4 h-4" />
                <span>{t('deviceFile')}</span>
              </button>

              <button
                type="button"
                onClick={() => setSource('external')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  source === 'external'
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                    : 'bg-[#091224]/40 border-cyan-950 text-slate-400'
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span>{t('externalLink')}</span>
              </button>
            </div>
          </div>

          {/* Device Video File Picker */}
          {source === 'file' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">{t('chooseVideoFile')}</label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-cyan-900/60 hover:border-cyan-400/80 rounded-2xl p-4 sm:p-6 bg-[#091224]/40 cursor-pointer transition-colors group">
                <FileVideo className="w-8 h-8 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-200">
                  {videoFile ? videoFile.name : t('selectVideoFromDevice')}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">MP4, WebM, MOV من ذاكرة جهازك</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  className="hidden"
                />
              </label>
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
                <span>التصنيف / الفئة</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#091224] border border-cyan-950 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-[#070e1c] text-slate-200">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Visibility and Scheduling (KEY USER REQUIREMENT) */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#091224]/80 border border-cyan-950">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>إعدادات الخصوصية والجدولة</span>
            </label>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Public */}
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                  visibility === 'public'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md'
                    : 'bg-[#070e1c] border-cyan-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>علني (Public)</span>
                <span className="text-[9px] font-normal text-slate-400 text-center">متاح للجميع والبحث</span>
              </button>

              {/* Private */}
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                  visibility === 'private'
                    ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-md'
                    : 'bg-[#070e1c] border-cyan-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>خاص (Private)</span>
                <span className="text-[9px] font-normal text-slate-400 text-center">أنت ورابط الفيديو فقط</span>
              </button>

              {/* Scheduled */}
              <button
                type="button"
                onClick={() => setVisibility('scheduled')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                  visibility === 'scheduled'
                    ? 'bg-amber-950/60 border-amber-500 text-amber-300 shadow-md'
                    : 'bg-[#070e1c] border-cyan-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>مجدول (Scheduled)</span>
                <span className="text-[9px] font-normal text-slate-400 text-center">نشر في وقت محدد</span>
              </button>
            </div>

            {/* Scheduled Datetime picker when 'scheduled' is active */}
            {visibility === 'scheduled' && (
              <div className="pt-2 space-y-1.5 animate-in fade-in duration-200">
                <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>حدد تاريخ ووقت النشر العلني التلقائي:</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full bg-[#070e1c] border border-amber-800/80 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs text-amber-100 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400">
                  * سيظل الفيديو خاصاً في خانة "مجدول" بقناتك حتى يحين الموعد، ويتحول بعدها علنياً للجميع تلقائياً.
                </p>
              </div>
            )}
          </div>

          {/* Privacy & Interactions Toggles */}
          <div className="space-y-2.5 pt-2 border-t border-cyan-950/60">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#091224]/50 border border-cyan-950 cursor-pointer">
              <span className="text-xs text-slate-200">{t('allowDownloadsLabel')}</span>
              <input
                type="checkbox"
                checked={allowDownload}
                onChange={(e) => setAllowDownload(e.target.checked)}
                className="rounded text-cyan-500 focus:ring-cyan-400"
              />
            </label>

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
        {showCopyrightModal && (
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
                  {isPublishing ? (
                    <span>جاري النشر...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>{t('publish')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
