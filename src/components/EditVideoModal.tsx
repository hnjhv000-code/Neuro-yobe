import React, { useState } from 'react';
import {
  X,
  Edit,
  Globe,
  Lock,
  Clock,
  CheckCircle,
  Sparkles,
  Layers,
  FileText
} from 'lucide-react';
import { updateVideo, logUserActivity } from '../services/firebase';
import { getTranslation } from '../services/translations';
import { useToast } from './Toast';
import type { VideoItem, VideoVisibility, UserProfile, Language } from '../types';

interface EditVideoModalProps {
  video: VideoItem;
  currentUser: UserProfile;
  language: Language;
  onClose: () => void;
  onSuccess: (updatedVideo: Partial<VideoItem>) => void;
}

export const EditVideoModal: React.FC<EditVideoModalProps> = ({
  video,
  currentUser,
  language,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState(video.title || '');
  const [description, setDescription] = useState(video.description || '');
  const [category, setCategory] = useState(video.category || 'all');
  const [visibility, setVisibility] = useState<VideoVisibility>(video.visibility || 'public');

  const t = (key: string) => getTranslation(language, key);

  // Scheduled date format for <input type="datetime-local">
  const getInitialScheduledString = () => {
    if (video.scheduledAt) {
      const d = new Date(video.scheduledAt);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
      return localISOTime;
    }
    // Default to 1 day from now
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
  };

  const [scheduledDateTime, setScheduledDateTime] = useState<string>(getInitialScheduledString());

  // Settings
  const [allowDownload, setAllowDownload] = useState(video.allowDownload ?? true);
  const [allowComments, setAllowComments] = useState(video.allowComments ?? true);
  const [showLikesCount, setShowLikesCount] = useState(video.showLikesCount ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const categories = [
    { id: 'all', label: t('catAll') },
    { id: 'gaming', label: t('catGaming') },
    { id: 'tech', label: t('catTech') },
    { id: 'education', label: t('catEducation') },
    { id: 'entertainment', label: t('catEntertainment') },
    { id: 'music', label: t('catMusic') },
    { id: 'news', label: t('catNews') }
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast(t('enterVideoTitle'), 'error');
      return;
    }

    let scheduledAtTimestamp: number | undefined = undefined;
    if (visibility === 'scheduled') {
      if (!scheduledDateTime) {
        showToast(t('scheduleDateInvalid'), 'error');
        return;
      }
      const parsedTime = new Date(scheduledDateTime).getTime();
      if (isNaN(parsedTime)) {
        showToast(t('scheduleDateInvalid'), 'error');
        return;
      }
      scheduledAtTimestamp = parsedTime;
    }

    setIsSaving(true);
    try {
      const updateData: Partial<VideoItem> = {
        title: title.trim(),
        description: description.trim(),
        category,
        visibility,
        scheduledAt: visibility === 'scheduled' ? scheduledAtTimestamp : undefined,
        allowDownload,
        allowComments,
        showLikesCount
      };

      await updateVideo(video.id, updateData);
      await logUserActivity(currentUser, 'edit_video', `تعديل بيانات الفيديو: ${title.trim()}`);

      showToast(t('videoSavedSuccess'), 'success');
      onSuccess(updateData);
      onClose();
    } catch (err: any) {
      showToast(t('authGeneralError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#070e1c] border border-cyan-900/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 bg-[#091224]/90 border-b border-cyan-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-100">{t('editVideo')}</h2>
              <span className="text-[11px] text-cyan-400">{t('editVideoSubtitle')}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Thumbnail preview */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#091224]/50 border border-cyan-950">
            <img
              src={video.thumbnailDataUrl}
              alt=""
              className="w-20 aspect-video rounded-lg object-cover border border-cyan-900"
            />
            <div className="text-xs text-slate-300 min-w-0 flex-1">
              <span className="font-bold block truncate">{video.title}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {video.type === 'short' ? t('shorts') : t('videosTab')} • {t('views')}: {video.views || 0}
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('videoTitle')}</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('videoTitlePlaceholder')}
              className="w-full bg-[#091224] border border-cyan-950 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">{t('description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t('videoDescPlaceholder')}
              className="w-full bg-[#091224] border border-cyan-950 focus:border-cyan-400 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('category')}</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#091224] border border-cyan-950 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-[#070e1c] text-slate-200">
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Visibility and Scheduling (KEY REQUIREMENT) */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#091224]/80 border border-cyan-950">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>{t('visibility')}</span>
              </label>
            </div>

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
                <span>{t('publicVisibility')}</span>
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
                <span>{t('privateVisibility')}</span>
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
                <span>{t('scheduledVisibility')}</span>
              </button>
            </div>

            {/* Scheduled Datetime picker when 'scheduled' is active */}
            {visibility === 'scheduled' && (
              <div className="pt-2 space-y-1.5 animate-in fade-in duration-200">
                <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t('selectScheduleTime')}</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full bg-[#070e1c] border border-amber-800/80 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs text-amber-100 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400">
                  * {t('scheduleNotice')}
                </p>
              </div>
            )}
          </div>

          {/* Interaction Switches */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#091224]/50 border border-cyan-950 cursor-pointer">
              <span className="text-xs text-slate-200">{t('allowDownloadLabel')}</span>
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

          {/* Submit */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              {t('cancel')}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-lg shadow-cyan-950/60 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSaving ? t('uploadProgress') : t('saveChanges')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

