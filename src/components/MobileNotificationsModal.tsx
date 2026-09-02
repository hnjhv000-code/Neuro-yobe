import React, { useState } from 'react';
import {
  X,
  Bell,
  CheckCircle,
  Film,
  MessageSquare,
  Sparkles,
  Heart,
  HelpCircle,
  AlertTriangle,
  Trash2,
  Inbox,
  Clock,
  Eye
} from 'lucide-react';
import { getTranslation } from '../services/translations';
import { deleteNotification, markNotificationAsRead } from '../services/firebase';
import type { Language, NotificationItem, VideoItem } from '../types';

interface MobileNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  language: Language;
  onSelectNotification: (notif: NotificationItem) => void;
  onMarkAllRead: () => void;
  onDeleteNotification?: (notifId: string) => void;
  allVideos?: VideoItem[];
}

export const MobileNotificationsModal: React.FC<MobileNotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  language,
  onSelectNotification,
  onMarkAllRead,
  onDeleteNotification,
  allVideos = []
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!isOpen) return null;

  const t = (key: string, fallback?: string) => getTranslation(language, key, fallback);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'new_video':
        return <Film className="w-4 h-4 text-cyan-400" />;
      case 'comment_reply':
      case 'reply':
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-sky-400" />;
      case 'like':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'support_reply':
        return <HelpCircle className="w-4 h-4 text-emerald-400" />;
      case 'video_deleted':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'system':
      default:
        return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (mins < 1) return t('justNow', 'الآن');
    if (mins < 60) return `${mins} ${language === 'ar' ? 'د' : 'm'}`;
    if (hours < 24) return `${hours} ${language === 'ar' ? 'س' : 'h'}`;
    return `${days} ${language === 'ar' ? 'ي' : 'd'}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 sm:hidden bg-black/80 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full h-[90vh] max-h-[90vh] bg-[#070e1c] border-t border-cyan-500/40 rounded-t-3xl flex flex-col shadow-2xl shadow-black overflow-hidden animate-in slide-in-from-bottom duration-300"
      >
        {/* Top Drag Handle Indicator */}
        <div className="w-full flex items-center justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-slate-700/80" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-cyan-950/80 flex items-center justify-between shrink-0 bg-[#091224]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {t('mobileNotificationsTitle', 'صندوق الإشعارات')}
              </h3>
              <p className="text-[11px] text-cyan-400/80">
                {unreadCount > 0
                  ? `${unreadCount} ${t('unreadNotifCount', 'إشعار غير مقروء')}`
                  : t('allCaughtUp', 'أنت مطلع على كل الإشعارات')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="px-2.5 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                title={t('markAllRead', 'تحديد الكل كمقروء')}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="text-[11px]">{t('markAllRead', 'تحديد الكل')}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2.5 border-b border-cyan-950/60 bg-[#070e1c] flex items-center gap-2 shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-300 border border-slate-800'
            }`}
          >
            {t('filterAll', 'الكل')} ({notifications.length})
          </button>

          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              filter === 'unread'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-300 border border-slate-800'
            }`}
          >
            <span>{t('filterUnread', 'غير المقروءة')}</span>
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filter === 'unread' ? 'bg-slate-950 text-cyan-300' : 'bg-rose-500 text-white'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notification Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-cyan-950/40 p-2">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 px-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-900/30 text-cyan-400/40 flex items-center justify-center mx-auto">
                <Inbox className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-300">
                {filter === 'unread'
                  ? t('noUnreadNotifications', 'لا توجد إشعارات غير مقروءة حالياً')
                  : t('noNotifications', 'لا توجد إشعارات حالياً')}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {t('notificationsNoticeText', 'ستظهر هنا التنبيهات الخاصة بالفيديوهات الجديدة، والردود على تعليقاتك، وتحديثات قناتك.')}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const linkedVideo = notif.videoId
                ? allVideos.find((v) => v.id === notif.videoId)
                : undefined;

              return (
                <div
                  key={notif.id}
                  onClick={async () => {
                    await markNotificationAsRead(notif.id);
                    onSelectNotification(notif);
                  }}
                  className={`p-3.5 rounded-2xl mb-1.5 transition-all cursor-pointer flex items-start gap-3 active:scale-[0.99] ${
                    !notif.isRead
                      ? 'bg-gradient-to-r from-cyan-950/40 via-[#0b162c] to-[#070e1c] border border-cyan-500/30'
                      : 'bg-[#091224]/50 border border-slate-800/60 text-slate-400'
                  }`}
                >
                  {/* Thumbnail / Avatar / Type Icon */}
                  <div className="relative shrink-0">
                    {notif.thumbnail || linkedVideo?.thumbnailDataUrl ? (
                      <img
                        src={notif.thumbnail || linkedVideo?.thumbnailDataUrl}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover border border-cyan-900/60 bg-black"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800/40 flex items-center justify-center text-cyan-300">
                        {getTypeIcon(notif.type)}
                      </div>
                    )}

                    {!notif.isRead && (
                      <span className="absolute -top-1 -start-1 w-3 h-3 rounded-full bg-cyan-400 ring-2 ring-[#070e1c] shadow-[0_0_8px_#22d3ee]" />
                    )}
                  </div>

                  {/* Content Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className={`text-xs font-bold leading-snug line-clamp-1 ${
                        !notif.isRead ? 'text-white' : 'text-slate-300'
                      }`}>
                        {notif.title || t('notifications')}
                      </h4>
                      <span className="text-[10px] text-cyan-400/70 shrink-0 flex items-center gap-0.5">
                        <Clock className="w-3 h-3 inline" />
                        {getTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.body || notif.message}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] text-cyan-300/80 font-medium">
                        <Eye className="w-3 h-3" />
                        <span>{t('tapToViewFull', 'اضغط لعرض التفاصيل')}</span>
                      </span>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await deleteNotification(notif.id);
                            if (onDeleteNotification) onDeleteNotification(notif.id);
                          } catch {}
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title={t('deleteNotification', 'حذف')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
