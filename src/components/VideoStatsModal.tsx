import React from 'react';
import {
  X,
  BarChart3,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  DownloadCloud,
  Calendar,
  Lock,
  Globe,
  Clock,
  Share2,
  Edit,
  Trash2,
  Play
} from 'lucide-react';
import { copyToClipboard, getShareUrl } from '../services/shareHelper';
import { getTranslation } from '../services/translations';
import { useToast } from './Toast';
import type { VideoItem, Language } from '../types';

interface VideoStatsModalProps {
  video: VideoItem;
  language: Language;
  onClose: () => void;
  onEdit?: (video: VideoItem) => void;
  onDelete?: (videoId: string) => void;
  onPlay?: (video: VideoItem) => void;
}

export const VideoStatsModal: React.FC<VideoStatsModalProps> = ({
  video,
  language,
  onClose,
  onEdit,
  onDelete,
  onPlay
}) => {
  const { showToast } = useToast();
  const t = (key: string) => getTranslation(language, key);

  const handleCopyLink = async () => {
    const url = getShareUrl('v', video.id);
    await copyToClipboard(url);
    showToast(t('copiedLink'), 'success');
  };

  const totalInteractions = (video.likes || 0) + (video.dislikes || 0) + (video.commentsCount || 0);
  const engagementRate = video.views > 0
    ? Math.min(100, Math.round((totalInteractions / video.views) * 100))
    : 0;

  const isScheduled = video.visibility === 'scheduled';
  const isPrivate = video.visibility === 'private';
  const isPublic = !video.visibility || video.visibility === 'public';

  const scheduledDateString = video.scheduledAt
    ? new Date(video.scheduledAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : null;

  const isSchedulePassed = video.scheduledAt ? Date.now() >= video.scheduledAt : false;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#070e1c] border border-cyan-900/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-6 bg-[#091224]/90 border-b border-cyan-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-100">{t('videoStatsTitle')}</h2>
              <span className="text-[11px] text-cyan-400 font-medium truncate block max-w-xs sm:max-w-md">
                {video.title}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top Video Preview Banner */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-[#091224]/60 border border-cyan-950/80">
            <div className="relative w-full sm:w-44 aspect-video rounded-xl overflow-hidden bg-slate-900 shrink-0">
              <img
                src={video.thumbnailDataUrl}
                alt={video.title}
                className="w-full h-full object-cover"
              />
              {video.type === 'short' && (
                <span className="absolute bottom-1 end-1 px-1.5 py-0.5 rounded bg-rose-600 text-[9px] font-bold text-white">
                  Shorts
                </span>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 line-clamp-2 leading-relaxed">
                  {video.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {video.description || t('noDescription')}
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {isPublic && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800">
                    <Globe className="w-3 h-3" />
                    <span>{t('publicVisibility')}</span>
                  </span>
                )}
                {isPrivate && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-950/70 text-rose-300 border border-rose-800">
                    <Lock className="w-3 h-3" />
                    <span>{t('privateVisibility')}</span>
                  </span>
                )}
                {isScheduled && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    isSchedulePassed
                      ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950/70 text-amber-300 border border-amber-800'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>
                      {isSchedulePassed ? t('publishedStatus') : `${t('scheduledVisibility')}: ${scheduledDateString}`}
                    </span>
                  </span>
                )}

                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              {t('keyMetricsTitle')}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Views */}
              <div className="p-3.5 rounded-2xl bg-[#091224] border border-cyan-950 flex flex-col gap-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-semibold">{t('views')}</span>
                  <Eye className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-lg font-black text-slate-100">{video.views || 0}</span>
                <span className="text-[10px] text-cyan-400/80">{t('views')}</span>
              </div>

              {/* Likes */}
              <div className="p-3.5 rounded-2xl bg-[#091224] border border-cyan-950 flex flex-col gap-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-semibold">{t('likes')}</span>
                  <ThumbsUp className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-lg font-black text-slate-100">{video.likes || 0}</span>
                <span className="text-[10px] text-emerald-400/80">{t('likes')}</span>
              </div>

              {/* Dislikes */}
              <div className="p-3.5 rounded-2xl bg-[#091224] border border-cyan-950 flex flex-col gap-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-semibold">{t('dislikes')}</span>
                  <ThumbsDown className="w-4 h-4 text-rose-400" />
                </div>
                <span className="text-lg font-black text-slate-100">{video.dislikes || 0}</span>
                <span className="text-[10px] text-rose-400/80">{t('dislikes')}</span>
              </div>

              {/* Comments */}
              <div className="p-3.5 rounded-2xl bg-[#091224] border border-cyan-950 flex flex-col gap-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-semibold">{t('comments')}</span>
                  <MessageSquare className="w-4 h-4 text-sky-400" />
                </div>
                <span className="text-lg font-black text-slate-100">{video.commentsCount || 0}</span>
                <span className="text-[10px] text-sky-400/80">{t('comments')}</span>
              </div>

              {/* Downloads */}
              <div className="p-3.5 rounded-2xl bg-[#091224] border border-cyan-950 flex flex-col gap-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-semibold">{t('downloads')}</span>
                  <DownloadCloud className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-lg font-black text-slate-100">{video.downloadsCount || 0}</span>
                <span className="text-[10px] text-purple-400/80">{t('downloads')}</span>
              </div>

              {/* Engagement Rate */}
              <div className="p-3.5 rounded-2xl bg-[#091224] border border-cyan-950 flex flex-col gap-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-semibold">{t('engagementRate')}</span>
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-lg font-black text-slate-100">{engagementRate}%</span>
                <span className="text-[10px] text-amber-400/80">{t('engagementRate')}</span>
              </div>
            </div>
          </div>

          {/* Privacy and Link Sharing Box */}
          <div className="p-4 rounded-2xl bg-[#091224]/80 border border-cyan-950 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('shareVideoLink')}</span>
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={getShareUrl('v', video.id)}
                className="flex-1 bg-[#070e1c] border border-cyan-950 rounded-xl px-3 py-2 text-xs text-cyan-300 select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{t('copyLink')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 px-6 bg-[#091224]/90 border-t border-cyan-950/80">
          <div className="flex items-center gap-2">
            {onPlay && (
              <button
                onClick={() => {
                  onPlay(video);
                  onClose();
                }}
                className="px-4 py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('watchVideo')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => {
                  onEdit(video);
                  onClose();
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Edit className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('editVideo')}</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(video.id);
                  onClose();
                }}
                className="px-4 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('delete')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

