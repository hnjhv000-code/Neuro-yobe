import React, { useState, useMemo } from 'react';
import {
  Bell,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Trash2,
  Film,
  MessageSquare,
  Sparkles,
  Heart,
  HelpCircle,
  AlertTriangle,
  Clock,
  Play,
  CheckCheck,
  Inbox,
  Filter,
  Eye,
  RefreshCw,
  Search,
  User
} from 'lucide-react';
import { getTranslation } from '../services/translations';
import {
  deleteNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../services/firebase';
import type { Language, NotificationItem, VideoItem, UserProfile } from '../types';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  allVideos: VideoItem[];
  language: Language;
  currentUser: UserProfile | null;
  onNavigateBack: () => void;
  onSelectVideo: (video: VideoItem) => void;
  onOpenNotificationDetail: (notif: NotificationItem) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  allVideos,
  language,
  currentUser,
  onNavigateBack,
  onSelectVideo,
  onOpenNotificationDetail
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'videos' | 'comments' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isClearingAll, setIsClearingAll] = useState(false);

  const t = (key: string, fallback?: string) => getTranslation(language, key, fallback);
  const isRtl = language === 'ar';

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Filter and search logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Filter tab
      if (activeFilter === 'unread' && notif.isRead) return false;
      if (activeFilter === 'videos' && notif.type !== 'new_video') return false;
      if (activeFilter === 'comments' && !['comment', 'reply', 'comment_reply'].includes(notif.type)) return false;
      if (activeFilter === 'system' && !['system', 'support_reply', 'video_deleted'].includes(notif.type)) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (notif.title || '').toLowerCase().includes(query);
        const bodyMatch = (notif.body || notif.message || '').toLowerCase().includes(query);
        const senderMatch = (notif.senderName || '').toLowerCase().includes(query);
        if (!titleMatch && !bodyMatch && !senderMatch) return false;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAllNotificationsAsRead(currentUser.uid, unreadIds);
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    if (!window.confirm(language === 'ar' ? 'هل تريد بالتأكيد حذف جميع الإشعارات؟' : 'Are you sure you want to delete all notifications?')) {
      return;
    }
    setIsClearingAll(true);
    try {
      for (const notif of notifications) {
        await deleteNotification(notif.id);
      }
    } catch (e) {
      console.error('Error clearing notifications:', e);
    } finally {
      setIsClearingAll(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'new_video':
        return {
          icon: <Film className="w-3.5 h-3.5 text-cyan-400" />,
          label: t('notificationTypeNewVideo', 'فيديو جديد'),
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
        };
      case 'comment_reply':
      case 'reply':
        return {
          icon: <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />,
          label: t('notificationTypeReply', 'رد على تعليق'),
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
        };
      case 'comment':
        return {
          icon: <MessageSquare className="w-3.5 h-3.5 text-sky-400" />,
          label: t('notificationTypeComment', 'تعليق جديد'),
          bg: 'bg-sky-500/10 border-sky-500/30 text-sky-300'
        };
      case 'like':
        return {
          icon: <Heart className="w-3.5 h-3.5 text-rose-400" />,
          label: t('notificationTypeLike', 'تفاعل وإعجاب'),
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        };
      case 'support_reply':
        return {
          icon: <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />,
          label: t('notificationTypeSupport', 'رد من الدعم الفني'),
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        };
      case 'video_deleted':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          label: t('notificationTypeAdmin', 'تنبيه إداري'),
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        };
      case 'system':
      default:
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
          label: t('notificationTypeSystem', 'إشعار نظامي'),
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-300'
        };
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (mins < 1) return t('justNow', 'الآن');
    if (mins < 60) return `${mins} ${language === 'ar' ? 'دقيقة' : 'm ago'}`;
    if (hours < 24) return `${hours} ${language === 'ar' ? 'ساعة' : 'h ago'}`;
    return `${days} ${language === 'ar' ? 'يوم' : 'd ago'}`;
  };

  return (
    <div className="w-full min-h-screen bg-[#050b14] text-slate-100 flex flex-col animate-in slide-in-from-top-2 duration-300">
      {/* Top Banner / Breadcrumb & Actions Bar */}
      <div className="sticky top-0 z-30 bg-[#070e1c]/95 backdrop-blur-xl border-b border-cyan-950/80 px-4 sm:px-8 py-4 shadow-lg shadow-black/40">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Back Button & Title */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={onNavigateBack}
              className="p-2.5 rounded-2xl bg-[#091224] hover:bg-cyan-950/80 border border-cyan-900/40 text-cyan-400 hover:text-cyan-300 active:scale-95 transition-all flex items-center justify-center shadow-md"
              title={t('back', 'رجوع')}
            >
              {isRtl ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>{t('mobileNotificationsTitle', 'صندوق الإشعارات')}</span>
                  {unreadCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                      {unreadCount} {t('new', 'جديد')}
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {notifications.length > 0
                    ? `${notifications.length} ${t('notificationsCount', 'إشعار في صندوقك')}`
                    : t('allCaughtUp', 'أنت مطلع على كل الإشعارات')}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-3.5 py-2 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-md"
              >
                <CheckCheck className="w-4 h-4 text-cyan-400" />
                <span>{t('markAllRead', 'تحديد الكل كمقروء')}</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={isClearingAll}
                className="px-3 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/50 text-rose-300 text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                title={t('clearAllNotifications', 'مسح الكل')}
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline">{t('clearAll', 'مسح الكل')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#070e1c]/60 border-b border-cyan-950/60 px-4 sm:px-8 py-3">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'all'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                  : 'bg-[#091224] text-slate-300 border border-slate-800 hover:border-cyan-800'
              }`}
            >
              {t('filterAll', 'الكل')} ({notifications.length})
            </button>

            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === 'unread'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                  : 'bg-[#091224] text-slate-300 border border-slate-800 hover:border-cyan-800'
              }`}
            >
              <span>{t('filterUnread', 'غير المقروءة')}</span>
              {unreadCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeFilter === 'unread' ? 'bg-slate-950 text-cyan-300' : 'bg-rose-500 text-white'
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveFilter('videos')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === 'videos'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                  : 'bg-[#091224] text-slate-300 border border-slate-800 hover:border-cyan-800'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>{t('videosTab', 'فيديوهات')}</span>
            </button>

            <button
              onClick={() => setActiveFilter('comments')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === 'comments'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                  : 'bg-[#091224] text-slate-300 border border-slate-800 hover:border-cyan-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t('commentsTab', 'الردود')}</span>
            </button>

            <button
              onClick={() => setActiveFilter('system')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeFilter === 'system'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                  : 'bg-[#091224] text-slate-300 border border-slate-800 hover:border-cyan-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('systemTab', 'النظام والدعم')}</span>
            </button>
          </div>

          {/* Search in notifications */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchNotifications', 'بحث في الإشعارات...')}
              className="w-full bg-[#091224] border border-cyan-950 focus:border-cyan-500 rounded-xl ps-9 pe-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Notifications Main Feed List */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="py-24 px-6 text-center space-y-4 flex flex-col items-center justify-center bg-[#070e1c]/40 rounded-3xl border border-cyan-950/60">
            <div className="w-20 h-20 rounded-3xl bg-cyan-950/40 border border-cyan-900/30 text-cyan-400/50 flex items-center justify-center shadow-xl">
              <Inbox className="w-10 h-10" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-200">
              {activeFilter === 'unread'
                ? t('noUnreadNotifications', 'لا توجد إشعارات غير مقروءة حالياً')
                : t('noNotifications', 'لا توجد إشعارات')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
              {t('notificationsNoticeText', 'ستظهر هنا التنبيهات الخاصة بالفيديوهات الجديدة، والردود على تعليقاتك، وتحديثات قناتك فور وصولها.')}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const linkedVideo = notif.videoId
              ? allVideos.find((v) => v.id === notif.videoId)
              : undefined;
            const badge = getTypeBadge(notif.type);

            return (
              <div
                key={notif.id}
                onClick={async () => {
                  await markNotificationAsRead(notif.id);
                  onOpenNotificationDetail(notif);
                }}
                className={`group relative p-4 sm:p-5 rounded-3xl transition-all cursor-pointer border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl hover:border-cyan-500/60 active:scale-[0.99] ${
                  !notif.isRead
                    ? 'bg-gradient-to-r from-[#0d1e3d] via-[#09152b] to-[#070f1e] border-cyan-500/40 shadow-cyan-950/30'
                    : 'bg-[#091224]/80 border-cyan-950/80 text-slate-300'
                }`}
              >
                {/* Left Side: Thumbnail / Avatar + Details */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Media Thumbnail or Type Icon */}
                  <div className="relative shrink-0">
                    {notif.thumbnail || linkedVideo?.thumbnailDataUrl ? (
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-cyan-900/60 bg-black shadow-md">
                        <img
                          src={notif.thumbnail || linkedVideo?.thumbnailDataUrl}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {linkedVideo && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/90 text-slate-950 flex items-center justify-center shadow-md">
                              <Play className="w-3 h-3 fill-current ml-0.5" />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-cyan-950/90 border border-cyan-800/50 flex items-center justify-center text-cyan-300 shadow-md">
                        {badge.icon}
                      </div>
                    )}

                    {!notif.isRead && (
                      <span className="absolute -top-1 -start-1 w-3.5 h-3.5 rounded-full bg-cyan-400 ring-4 ring-[#070e1c] shadow-[0_0_10px_#22d3ee]" />
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold flex items-center gap-1 ${badge.bg}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>

                      <span className="text-[11px] text-cyan-400/80 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 inline" />
                        <span>{getTimeAgo(notif.createdAt)}</span>
                      </span>
                    </div>

                    <h3 className={`text-sm sm:text-base font-bold leading-snug ${
                      !notif.isRead ? 'text-white' : 'text-slate-200'
                    }`}>
                      {notif.title || t('notifications')}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
                      {notif.body || notif.message}
                    </p>

                    {notif.senderName && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                        <User className="w-3 h-3 text-cyan-400" />
                        <span>{t('sender', 'المرسل:')} <strong className="text-slate-200">{notif.senderName}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Quick Action Buttons */}
                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end border-t sm:border-t-0 border-cyan-950/60">
                  {linkedVideo && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectVideo(linkedVideo);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{t('watchVideoNow', 'مشاهدة')}</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNotificationDetail(notif);
                    }}
                    className="px-3 py-2 rounded-xl bg-[#0b162c] hover:bg-cyan-950/80 border border-cyan-900/50 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t('details', 'التفاصيل')}</span>
                  </button>

                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await deleteNotification(notif.id);
                      } catch {}
                    }}
                    className="p-2 rounded-xl bg-slate-900/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 transition-colors"
                    title={t('deleteNotification', 'حذف')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
