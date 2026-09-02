import React from 'react';
import {
  X,
  Bell,
  Play,
  Calendar,
  Clock,
  Trash2,
  CheckCircle,
  Film,
  MessageSquare,
  Sparkles,
  Heart,
  HelpCircle,
  AlertTriangle,
  Shield,
  ArrowRight,
  ArrowLeft,
  User,
  ExternalLink
} from 'lucide-react';
import { getTranslation } from '../services/translations';
import { deleteNotification, markNotificationAsRead } from '../services/firebase';
import type { Language, NotificationItem, VideoItem } from '../types';

interface NotificationDetailModalProps {
  notification: NotificationItem | null;
  onClose: () => void;
  language: Language;
  onSelectVideo?: (video: VideoItem) => void;
  allVideos?: VideoItem[];
  onDeleteNotification?: (notifId: string) => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  onClose,
  language,
  onSelectVideo,
  allVideos = [],
  onDeleteNotification
}) => {
  if (!notification) return null;

  const t = (key: string, fallback?: string) => getTranslation(language, key, fallback);
  const isRtl = language === 'ar';

  // Find linked video if available
  const linkedVideo = notification.videoId
    ? allVideos.find((v) => v.id === notification.videoId)
    : undefined;

  // Type badge helper
  const getTypeBadge = () => {
    switch (notification.type) {
      case 'new_video':
        return {
          icon: <Film className="w-4 h-4 text-cyan-400" />,
          label: t('notificationTypeNewVideo', 'فيديو جديد'),
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
        };
      case 'comment_reply':
      case 'reply':
        return {
          icon: <MessageSquare className="w-4 h-4 text-indigo-400" />,
          label: t('notificationTypeReply', 'رد على تعليق'),
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
        };
      case 'comment':
        return {
          icon: <MessageSquare className="w-4 h-4 text-sky-400" />,
          label: t('notificationTypeComment', 'تعليق جديد'),
          bg: 'bg-sky-500/10 border-sky-500/30 text-sky-300'
        };
      case 'like':
        return {
          icon: <Heart className="w-4 h-4 text-rose-400" />,
          label: t('notificationTypeLike', 'تفاعل وإعجاب'),
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        };
      case 'support_reply':
        return {
          icon: <HelpCircle className="w-4 h-4 text-emerald-400" />,
          label: t('notificationTypeSupport', 'رد من الدعم الفني'),
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        };
      case 'video_deleted':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          label: t('notificationTypeAdmin', 'تنبيه إداري'),
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        };
      case 'system':
      default:
        return {
          icon: <Sparkles className="w-4 h-4 text-purple-400" />,
          label: t('notificationTypeSystem', 'إشعار نظامي'),
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-300'
        };
    }
  };

  const badge = getTypeBadge();

  // Format date and time
  const dateObj = new Date(notification.createdAt);
  const formattedDate = dateObj.toLocaleDateString(
    language === 'ar' ? 'ar-EG' : language === 'ja' ? 'ja-JP' : language === 'fr' ? 'fr-FR' : language === 'zh' ? 'zh-CN' : 'en-US',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
  );
  const formattedTime = dateObj.toLocaleTimeString(
    language === 'ar' ? 'ar-EG' : 'en-US',
    {
      hour: '2-digit',
      minute: '2-digit'
    }
  );

  const handleWatchVideo = () => {
    if (linkedVideo && onSelectVideo) {
      onSelectVideo(linkedVideo);
      onClose();
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNotification(notification.id);
      if (onDeleteNotification) {
        onDeleteNotification(notification.id);
      }
      onClose();
    } catch (e) {
      console.error('Delete notification error:', e);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#091224] border border-cyan-500/30 rounded-3xl shadow-2xl shadow-black/90 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background accents */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="relative z-10 flex items-center justify-between p-4 sm:p-5 border-b border-cyan-950/80 bg-[#070e1c]/80">
          <div className="flex items-center gap-2.5">
            <div className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 ${badge.bg}`}>
              {badge.icon}
              <span>{badge.label}</span>
            </div>
            {!notification.isRead && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
                {t('new', 'جديد')}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Notification Title */}
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
              {notification.title || t('notificationDetails', 'تفاصيل الإشعار')}
            </h2>
          </div>

          {/* Sender & Timestamp Info */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-[#0b162c] border border-cyan-950/60 text-xs text-slate-300">
            {notification.senderName ? (
              <div className="flex items-center gap-2">
                {notification.senderAvatar ? (
                  <img
                    src={notification.senderAvatar}
                    alt={notification.senderName}
                    className="w-7 h-7 rounded-full object-cover border border-cyan-500/40"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
                <div>
                  <span className="text-slate-400 text-[10px] block">{t('sender', 'المرسل:')}</span>
                  <span className="font-bold text-slate-200">{notification.senderName}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">{t('sender', 'المرسل:')}</span>
                  <span className="font-bold text-slate-200">NeuroYobe</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-cyan-400/80" />
              <span>{formattedDate} - {formattedTime}</span>
            </div>
          </div>

          {/* Full Notification Content / Message Body */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
            {notification.body || notification.message || t('noDescriptionAdded', 'لا يوجد نص إضافي.')}
          </div>

          {/* Linked Video Card Preview (if exists) */}
          {linkedVideo ? (
            <div className="rounded-2xl bg-gradient-to-b from-[#0b172e] to-[#070e1c] border border-cyan-500/30 p-3.5 space-y-3 shadow-lg">
              <div className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                <span>{t('linkedVideoPreview', 'المحتوى المرتبط بهذا الإشعار:')}</span>
              </div>

              <div className="flex gap-3 items-center">
                <div className="relative w-28 h-16 sm:w-36 sm:h-20 rounded-xl overflow-hidden bg-black shrink-0 border border-cyan-900/60 group">
                  <img
                    src={linkedVideo.thumbnailDataUrl}
                    alt={linkedVideo.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/90 text-slate-950 flex items-center justify-center shadow-md">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight">
                    {linkedVideo.title}
                  </h4>
                  <p className="text-[11px] text-cyan-400 font-medium truncate">
                    {linkedVideo.publisherName}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {linkedVideo.views || 0} {t('viewsMetric', 'مشاهدة')}
                  </p>
                </div>
              </div>

              <button
                onClick={handleWatchVideo}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{t('watchVideoNow', 'مشاهدة الفيديو الآن')}</span>
              </button>
            </div>
          ) : notification.thumbnail ? (
            <div className="rounded-2xl overflow-hidden border border-cyan-900/50 bg-black/60 max-h-52 flex items-center justify-center">
              <img
                src={notification.thumbnail}
                alt="Notification media preview"
                className="w-full max-h-52 object-contain"
              />
            </div>
          ) : null}
        </div>

        {/* Modal Actions Footer */}
        <div className="relative z-10 p-4 border-t border-cyan-950/80 bg-[#070e1c]/90 flex items-center justify-between gap-3">
          <button
            onClick={handleDelete}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5"
            title={t('deleteNotification', 'حذف الإشعار')}
          >
            <Trash2 className="w-4 h-4" />
            <span>{t('delete', 'حذف')}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            {t('close', 'إغلاق')}
          </button>
        </div>
      </div>
    </div>
  );
};
