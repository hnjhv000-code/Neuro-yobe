import React, { useState } from 'react';
import {
  Film,
  Compass,
  Users2,
  Info,
  Camera,
  Edit3,
  Bell,
  BellRing,
  Calendar,
  Eye,
  CheckCircle,
  Sparkles,
  Share2,
  Trash2,
  MessageSquare,
  ThumbsUp,
  BarChart3,
  Globe,
  Lock,
  Clock,
  DownloadCloud,
  Layers,
  Edit,
  Play,
  TrendingUp,
  Check,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { compressDeviceImage } from '../services/mediaStorage';
import {
  updateUserProfileFields,
  toggleSubscription,
  setSubscriptionNotification,
  deletePost,
  deleteVideo,
  updateVideo,
  togglePostLike
} from '../services/firebase';
import { getTranslation } from '../services/translations';
import { getShareUrl, copyToClipboard } from '../services/shareHelper';
import { VideoStatsModal } from './VideoStatsModal';
import { EditVideoModal } from './EditVideoModal';
import { EditPostModal } from './EditPostModal';
import { useToast } from './Toast';
import type { UserProfile, VideoItem, PostItem, Language, SubscriptionItem, VideoVisibility } from '../types';

interface ChannelViewProps {
  channelUser: UserProfile;
  currentUser: UserProfile | null;
  allVideos: VideoItem[];
  allPosts: PostItem[];
  subscriptions: SubscriptionItem[];
  language: Language;
  onSelectVideo: (video: VideoItem) => void;
  onOpenAuth: () => void;
  onOpenUpload: () => void;
  onOpenCreatePost: () => void;
}

export const ChannelView: React.FC<ChannelViewProps> = ({
  channelUser,
  currentUser,
  allVideos,
  allPosts,
  subscriptions,
  language,
  onSelectVideo,
  onOpenAuth,
  onOpenUpload,
  onOpenCreatePost
}) => {
  const [activeTab, setActiveTab] = useState<'videos' | 'shorts' | 'community' | 'analytics' | 'about'>('videos');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private' | 'scheduled'>('all');
  
  // Modals for editing & stats
  const [selectedStatsVideo, setSelectedStatsVideo] = useState<VideoItem | null>(null);
  const [selectedEditVideo, setSelectedEditVideo] = useState<VideoItem | null>(null);
  const [selectedEditPost, setSelectedEditPost] = useState<PostItem | null>(null);

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(channelUser.bio || '');

  const { showToast } = useToast();
  const t = (key: string) => getTranslation(language, key);

  const isOwner = currentUser?.uid === channelUser.uid;
  const isSubscribed = subscriptions.some((s) => s.channelUid === channelUser.uid);
  const currentSub = subscriptions.find((s) => s.channelUid === channelUser.uid);
  const notificationsOn = currentSub?.notificationsEnabled ?? true;

  // Filter videos belonging to this channel
  const rawChannelVideos = allVideos.filter((v) => v.publisherUid === channelUser.uid);
  const rawChannelLongVideos = rawChannelVideos.filter((v) => v.type === 'video');
  const rawChannelShorts = rawChannelVideos.filter((v) => v.type === 'short');
  const rawChannelPosts = allPosts.filter((p) => p.channelUid === channelUser.uid);

  // Helper to filter by visibility
  const filterByVisibility = (items: VideoItem[]) => {
    return items.filter((v) => {
      const isSched = v.visibility === 'scheduled';
      const isPriv = v.visibility === 'private';
      const isPub = !v.visibility || v.visibility === 'public';
      const isSchedPassed = isSched && v.scheduledAt && v.scheduledAt <= Date.now();

      // If viewing other user's channel: only public and passed scheduled videos are visible
      if (!isOwner) {
        return isPub || isSchedPassed;
      }

      // If owner: apply the visibility sub-filter
      if (visibilityFilter === 'all') return true;
      if (visibilityFilter === 'public') return isPub || isSchedPassed;
      if (visibilityFilter === 'private') return isPriv;
      if (visibilityFilter === 'scheduled') return isSched && (!v.scheduledAt || v.scheduledAt > Date.now());
      return true;
    });
  };

  const channelVideos = filterByVisibility(rawChannelLongVideos);
  const channelShorts = filterByVisibility(rawChannelShorts);
  const channelPosts = rawChannelPosts.filter((p) => {
    if (!isOwner) return !p.visibility || p.visibility === 'public';
    if (visibilityFilter === 'all') return true;
    if (visibilityFilter === 'public') return !p.visibility || p.visibility === 'public';
    if (visibilityFilter === 'private') return p.visibility === 'private';
    return true;
  });

  // Channel Analytics Totals
  const totalViews = rawChannelVideos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalLikes = rawChannelVideos.reduce((sum, v) => sum + (v.likes || 0), 0);
  const totalDislikes = rawChannelVideos.reduce((sum, v) => sum + (v.dislikes || 0), 0);
  const totalComments = rawChannelVideos.reduce((sum, v) => sum + (v.commentsCount || 0), 0);
  const totalDownloads = rawChannelVideos.reduce((sum, v) => sum + (v.downloadsCount || 0), 0);
  const totalVideosCount = rawChannelLongVideos.length;
  const totalShortsCount = rawChannelShorts.length;
  const totalSubscribers = channelUser.subscribersCount || 0;

  const publicVideosCount = rawChannelVideos.filter((v) => !v.visibility || v.visibility === 'public' || (v.visibility === 'scheduled' && v.scheduledAt && v.scheduledAt <= Date.now())).length;
  const privateVideosCount = rawChannelVideos.filter((v) => v.visibility === 'private').length;
  const scheduledVideosCount = rawChannelVideos.filter((v) => v.visibility === 'scheduled' && (!v.scheduledAt || v.scheduledAt > Date.now())).length;

  const overallEngagement = totalViews > 0
    ? Math.min(100, Math.round(((totalLikes + totalComments) / totalViews) * 100))
    : 0;

  // Banner change (device only)
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast('جاري معالجة غلاف القناة...', 'info');
      const compressed = await compressDeviceImage(file, 1920, 480, 0.8);
      await updateUserProfileFields(channelUser.uid, { bannerUrl: compressed });
      showToast('تم تحديث غلاف القناة بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل رفع الغلاف', 'error');
    }
  };

  // Avatar change (device only)
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast('جاري معالجة الصورة الشخصية...', 'info');
      const compressed = await compressDeviceImage(file, 256, 256, 0.85);
      await updateUserProfileFields(channelUser.uid, { avatarUrl: compressed });
      showToast('تم تحديث صورة القناة بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل رفع الصورة', 'error');
    }
  };

  const handleSaveBio = async () => {
    await updateUserProfileFields(channelUser.uid, { bio: bioText.trim() });
    setIsEditingBio(false);
    showToast('تم حفظ نبذة القناة بنجاح', 'success');
  };

  const handleSubscribeToggle = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (isOwner) {
      showToast('لا يمكنك الاشتراك في قناتك الخاصة', 'info');
      return;
    }
    await toggleSubscription(currentUser, {
      uid: channelUser.uid,
      name: channelUser.username,
      avatar: channelUser.avatarUrl
    });
  };

  const handleToggleBell = async () => {
    if (!currentUser || !isSubscribed) return;
    const newState = !notificationsOn;
    await setSubscriptionNotification(currentUser.uid, channelUser.uid, newState);
    showToast(newState ? 'تم تفعيل جميع الإشعارات' : 'تم إيقاف الإشعارات', 'info');
  };

  const handleShareChannel = async () => {
    const url = getShareUrl('c', channelUser.uid);
    await copyToClipboard(url);
    showToast(t('copiedLink'), 'success');
  };

  const handlePostLike = async (post: PostItem) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    await togglePostLike(post.id, currentUser.uid, 'like');
  };

  const handleDeleteVideoConfirm = async (videoId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفيديو نهائياً من قناتك؟')) {
      try {
        await deleteVideo(videoId);
        showToast('تم حذف الفيديو بنجاح', 'success');
      } catch (err: any) {
        showToast('فشل حذف الفيديو: ' + err.message, 'error');
      }
    }
  };

  const handleDeletePostConfirm = async (postId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنشور من المجتمع؟')) {
      try {
        await deletePost(postId);
        showToast('تم حذف المنشور بنجاح', 'success');
      } catch (err: any) {
        showToast('فشل حذف المنشور: ' + err.message, 'error');
      }
    }
  };

  const handleQuickVisibilityChange = async (video: VideoItem, nextVis: VideoVisibility) => {
    try {
      await updateVideo(video.id, { visibility: nextVis });
      showToast(`تم تغيير خصوصية الفيديو إلى: ${nextVis === 'public' ? 'علني' : nextVis === 'private' ? 'خاص' : 'مجدول'}`, 'success');
    } catch (err: any) {
      showToast('فشل تعديل الخصوصية: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Channel Banner */}
      <div className="relative h-44 sm:h-64 w-full rounded-3xl overflow-hidden bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border border-cyan-900/40 shadow-2xl">
        {channelUser.bannerUrl ? (
          <img src={channelUser.bannerUrl} alt="Channel Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/40 via-[#070e1c] to-black">
            <span className="text-sm font-bold text-cyan-400/40 uppercase tracking-widest">
              Yassa Tube Creator Channel
            </span>
          </div>
        )}

        {/* Change Banner Button (for owner) */}
        {isOwner && (
          <label className="absolute top-4 end-4 p-2.5 rounded-full bg-black/60 hover:bg-cyan-950 text-white backdrop-blur-xl border border-white/20 cursor-pointer transition-all">
            <Camera className="w-4 h-4 text-cyan-300" />
            <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
          </label>
        )}
      </div>

      {/* Channel Header Information */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <img
              src={channelUser.avatarUrl}
              alt={channelUser.username}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-[#070e1c] shadow-2xl ring-2 ring-cyan-400"
            />
            {isOwner && (
              <label className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                <Camera className="w-6 h-6 text-cyan-300" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-100">{channelUser.username}</h1>
              <CheckCircle className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
              {channelUser.emailVerified ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-[10px] font-bold text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>{channelUser.provider === 'google' ? 'Google موثق' : 'حساب موثق ومفعل'}</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 text-[10px] font-bold text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  <span>بانتظار تأكيد البريد</span>
                </span>
              )}
              {isOwner && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-[10px] font-bold text-cyan-300 border border-cyan-500/40">
                  قناتك الخاصة
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {totalSubscribers} {t('subscribers')} • {rawChannelVideos.length} مقطع منشور • {totalViews} مشاهدة إجمالية
            </p>
            {channelUser.bio && (
              <p className="text-xs text-slate-300 mt-1.5 max-w-xl line-clamp-2">{channelUser.bio}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isOwner ? (
            <>
              <button
                onClick={onOpenUpload}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full text-xs font-bold shadow-lg shadow-cyan-950 transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('upload')}</span>
              </button>
              <button
                onClick={onOpenCreatePost}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-xs font-bold transition-colors"
              >
                {t('createPost')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSubscribeToggle}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-full text-xs font-bold shadow-lg transition-all ${
                  isSubscribed
                    ? 'bg-slate-800 text-slate-200 hover:bg-rose-950 hover:text-rose-300'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-900/50'
                }`}
              >
                {isSubscribed ? t('subscribed') : t('subscribe')}
              </button>

              {isSubscribed && (
                <button
                  onClick={handleToggleBell}
                  className={`p-2.5 rounded-full border transition-colors ${
                    notificationsOn
                      ? 'text-cyan-300 border-cyan-500/50 bg-cyan-950/40'
                      : 'text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title={notificationsOn ? t('allNotifications') : t('noNotifications')}
                >
                  {notificationsOn ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </button>
              )}
            </>
          )}

          <button
            onClick={handleShareChannel}
            className="p-2.5 rounded-full bg-[#091224] border border-cyan-900/50 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950 transition-colors"
            title={t('share')}
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Tabs Navbar */}
      <div className="flex border-b border-cyan-950/80 gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
        {[
          { id: 'videos', label: t('videos'), icon: Film, count: rawChannelLongVideos.length },
          { id: 'shorts', label: t('shorts'), icon: Compass, count: rawChannelShorts.length },
          { id: 'community', label: t('community'), icon: Users2, count: rawChannelPosts.length },
          { id: 'analytics', label: t('analytics'), icon: BarChart3, highlight: isOwner },
          { id: 'about', label: t('about'), icon: Info },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-950/60 text-cyan-400">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Owner Privacy & Scheduling Filter Sub-Bar */}
      {isOwner && (activeTab === 'videos' || activeTab === 'shorts' || activeTab === 'community') && (
        <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#091224]/80 border border-cyan-950/80 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 px-2 shrink-0">{t('filterByVisibility')}:</span>
          
          <button
            onClick={() => setVisibilityFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              visibilityFilter === 'all'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-[#070e1c] text-slate-300 hover:bg-cyan-950/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('all')} ({rawChannelVideos.length})</span>
          </button>

          <button
            onClick={() => setVisibilityFilter('public')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              visibilityFilter === 'public'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-[#070e1c] text-emerald-300 hover:bg-emerald-950/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t('public')} ({publicVideosCount})</span>
          </button>

          <button
            onClick={() => setVisibilityFilter('private')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              visibilityFilter === 'private'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-[#070e1c] text-rose-300 hover:bg-rose-950/60'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{t('private')} ({privateVideosCount})</span>
          </button>

          <button
            onClick={() => setVisibilityFilter('scheduled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              visibilityFilter === 'scheduled'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-[#070e1c] text-amber-300 hover:bg-amber-950/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('scheduled')} ({scheduledVideosCount})</span>
          </button>
        </div>
      )}

      {/* TAB CONTENT 1: Videos */}
      {activeTab === 'videos' && (
        <div className="space-y-4">
          {channelVideos.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs bg-[#091224]/30 rounded-3xl border border-cyan-950">
              {t('noVideosFound')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {channelVideos.map((video) => {
                const isSched = video.visibility === 'scheduled';
                const isPriv = video.visibility === 'private';
                const isPub = !video.visibility || video.visibility === 'public';

                return (
                  <div key={video.id} className="group flex flex-col bg-[#091224]/60 border border-cyan-950/80 rounded-2xl overflow-hidden hover:border-cyan-500/40 transition-all">
                    {/* Video Thumbnail */}
                    <div
                      onClick={() => onSelectVideo(video)}
                      className="relative aspect-video w-full bg-slate-900 cursor-pointer overflow-hidden"
                    >
                      <img
                        src={video.thumbnailDataUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      
                      {/* Visibility tag on thumbnail */}
                      <div className="absolute top-2 start-2 flex items-center gap-1">
                        {isPub && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 flex items-center gap-1 backdrop-blur-md">
                            <Globe className="w-2.5 h-2.5" />
                            <span>{t('public')}</span>
                          </span>
                        )}
                        {isPriv && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-950/90 text-rose-300 border border-rose-700/60 flex items-center gap-1 backdrop-blur-md">
                            <Lock className="w-2.5 h-2.5" />
                            <span>{t('private')}</span>
                          </span>
                        )}
                        {isSched && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/90 text-amber-300 border border-amber-700/60 flex items-center gap-1 backdrop-blur-md">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{t('scheduled')}</span>
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-2 end-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                        {video.views || 0} {t('views')}
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                      <div>
                        <h3
                          onClick={() => onSelectVideo(video)}
                          className="text-xs font-bold text-slate-100 line-clamp-2 hover:text-cyan-300 cursor-pointer leading-snug"
                        >
                          {video.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1.5">
                          <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className="text-cyan-400">{video.likes || 0} {t('likes')}</span>
                          <span>•</span>
                          <span>{video.commentsCount || 0} {t('comments')}</span>
                        </div>
                      </div>

                      {/* Creator Studio Actions Bar */}
                      {isOwner && (
                        <div className="pt-2 border-t border-cyan-950 flex items-center justify-between gap-1">
                          <button
                            onClick={() => setSelectedStatsVideo(video)}
                            className="flex-1 py-1.5 px-2 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                            title={t('analytics')}
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>{t('stats')}</span>
                          </button>

                          <button
                            onClick={() => setSelectedEditVideo(video)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                            title={t('edit')}
                          >
                            <Edit className="w-3.5 h-3.5 text-cyan-400" />
                          </button>

                          <button
                            onClick={() => handleDeleteVideoConfirm(video.id)}
                            className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg transition-colors"
                            title={t('delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: Shorts */}
      {activeTab === 'shorts' && (
        <div className="space-y-4">
          {channelShorts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs bg-[#091224]/30 rounded-3xl border border-cyan-950">
              {t('noVideosFound')}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {channelShorts.map((short) => (
                <div
                  key={short.id}
                  className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 border border-cyan-950/60 hover:border-cyan-500/60 transition-all flex flex-col justify-end"
                >
                  <img
                    src={short.thumbnailDataUrl}
                    alt=""
                    onClick={() => onSelectVideo(short)}
                    className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                  />

                  {/* Gradient Overlay & Info */}
                  <div className="relative z-10 p-3 bg-gradient-to-t from-black/95 via-black/50 to-transparent space-y-1">
                    <span
                      onClick={() => onSelectVideo(short)}
                      className="text-xs font-bold text-white line-clamp-2 cursor-pointer leading-snug"
                    >
                      {short.title}
                    </span>
                    <div className="flex items-center justify-between text-[10px] text-cyan-300">
                      <span>{short.views || 0} {t('views')}</span>
                      <span>{short.likes || 0} 👍</span>
                    </div>

                    {/* Owner controls */}
                    {isOwner && (
                      <div className="pt-2 flex items-center justify-between gap-1 border-t border-white/10">
                        <button
                          onClick={() => setSelectedStatsVideo(short)}
                          className="p-1.5 rounded-lg bg-cyan-950/90 text-cyan-300 hover:bg-cyan-900 text-[10px] font-bold flex items-center gap-1"
                        >
                          <BarChart3 className="w-3 h-3" />
                          <span>{t('stats')}</span>
                        </button>
                        <button
                          onClick={() => setSelectedEditVideo(short)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
                        >
                          <Edit className="w-3 h-3 text-cyan-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteVideoConfirm(short.id)}
                          className="p-1.5 rounded-lg bg-rose-950/90 text-rose-300 hover:bg-rose-900"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: Community */}
      {activeTab === 'community' && (
        <div className="max-w-2xl mx-auto space-y-4">
          {channelPosts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs bg-[#091224]/30 rounded-3xl border border-cyan-950">
              {t('noPostsFound')}
            </div>
          ) : (
            channelPosts.map((post) => {
              const isLiked = currentUser && post.likedUsers ? post.likedUsers[currentUser.uid] : false;
              return (
                <div key={post.id} className="p-5 rounded-3xl bg-[#091224]/80 border border-cyan-950/80 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={post.channelAvatar} alt="" className="w-10 h-10 rounded-full object-cover border border-cyan-400/60" />
                      <div>
                        <span className="font-bold text-xs text-slate-100">{post.channelName}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          {post.visibility === 'private' && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 text-[10px]">{t('private')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Owner Post Actions */}
                    {isOwner && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedEditPost(post)}
                          className="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg"
                          title={t('edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePostConfirm(post.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                    {post.text}
                  </p>

                  {/* Attached images */}
                  {post.images && post.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
                      {post.images.map((img, idx) => (
                        <img key={idx} src={img} alt="" className="w-full aspect-video object-cover" />
                      ))}
                    </div>
                  )}

                  {/* Interactions */}
                  <div className="flex items-center justify-between pt-2 border-t border-cyan-950/60 text-xs">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handlePostLike(post)}
                        className={`flex items-center gap-1.5 font-bold transition-colors ${
                          isLiked ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                        <span>{post.likes || 0}</span>
                      </button>

                      <div className="flex items-center gap-1 text-slate-400">
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.commentsCount || 0} {t('comments')}</span>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-500">{t('community')}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB CONTENT 4: Analytics Dashboard */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Overview Metric Cards */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>{t('analytics')}</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Total Views */}
              <div className="p-4 rounded-2xl bg-[#091224] border border-cyan-950 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold">{t('views')}</span>
                  <Eye className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-xl font-black text-slate-100 block">{totalViews}</span>
                <span className="text-[10px] text-cyan-400/80 block">{t('totalViews')}</span>
              </div>

              {/* Total Subscribers */}
              <div className="p-4 rounded-2xl bg-[#091224] border border-cyan-950 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold">{t('subscribers')}</span>
                  <Users2 className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="text-xl font-black text-slate-100 block">{totalSubscribers}</span>
                <span className="text-[10px] text-indigo-400/80 block">{t('subscribers')}</span>
              </div>

              {/* Total Likes */}
              <div className="p-4 rounded-2xl bg-[#091224] border border-cyan-950 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold">{t('likes')}</span>
                  <ThumbsUp className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-xl font-black text-slate-100 block">{totalLikes}</span>
                <span className="text-[10px] text-emerald-400/80 block">{t('totalLikes')}</span>
              </div>

              {/* Total Comments */}
              <div className="p-4 rounded-2xl bg-[#091224] border border-cyan-950 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold">{t('comments')}</span>
                  <MessageSquare className="w-4 h-4 text-sky-400" />
                </div>
                <span className="text-xl font-black text-slate-100 block">{totalComments}</span>
                <span className="text-[10px] text-sky-400/80 block">{t('totalComments')}</span>
              </div>

              {/* Total Downloads */}
              <div className="p-4 rounded-2xl bg-[#091224] border border-cyan-950 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold">{t('downloads')}</span>
                  <DownloadCloud className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-xl font-black text-slate-100 block">{totalDownloads}</span>
                <span className="text-[10px] text-purple-400/80 block">{t('totalDownloads')}</span>
              </div>

              {/* Engagement Rate */}
              <div className="p-4 rounded-2xl bg-[#091224] border border-cyan-950 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold">{t('engagementRate')}</span>
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-xl font-black text-slate-100 block">{overallEngagement}%</span>
                <span className="text-[10px] text-amber-400/80 block">{t('engagementRate')}</span>
              </div>
            </div>
          </div>

          {/* Videos Breakdown List */}
          <div className="p-5 rounded-3xl bg-[#091224]/80 border border-cyan-950 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-200">
                {t('stats')}
              </h4>
              <span className="text-xs text-cyan-400 font-semibold">{rawChannelVideos.length} {t('videos')}</span>
            </div>

            {rawChannelVideos.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                {t('noVideosFound')}
              </div>
            ) : (
              <div className="space-y-2.5">
                {rawChannelVideos.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedStatsVideo(item)}
                    className="p-3 rounded-2xl bg-[#070e1c] hover:bg-cyan-950/40 border border-cyan-950 hover:border-cyan-500/40 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.thumbnailDataUrl}
                        alt=""
                        className="w-16 aspect-video rounded-lg object-cover border border-cyan-900 shrink-0"
                      />
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors truncate">
                          {item.title}
                        </h5>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                          <span>{item.type === 'short' ? 'Shorts' : t('videos')}</span>
                          <span>•</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className={item.visibility === 'private' ? 'text-rose-400' : item.visibility === 'scheduled' ? 'text-amber-400' : 'text-emerald-400'}>
                            {item.visibility === 'private' ? t('private') : item.visibility === 'scheduled' ? t('scheduled') : t('public')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats metrics */}
                    <div className="flex items-center gap-4 text-xs shrink-0 self-end sm:self-auto">
                      <div className="text-center">
                        <span className="font-bold text-slate-200 block">{item.views || 0}</span>
                        <span className="text-[9px] text-slate-500">{t('views')}</span>
                      </div>
                      <div className="text-center">
                        <span className="font-bold text-emerald-400 block">{item.likes || 0}</span>
                        <span className="text-[9px] text-slate-500">{t('likes')}</span>
                      </div>
                      <div className="text-center">
                        <span className="font-bold text-sky-400 block">{item.commentsCount || 0}</span>
                        <span className="text-[9px] text-slate-500">{t('comments')}</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStatsVideo(item);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold group-hover:bg-cyan-600 group-hover:text-white transition-colors"
                      >
                        {t('details')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: About */}
      {activeTab === 'about' && (
        <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-[#091224]/80 border border-cyan-950/80 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-100">{t('about')}</h3>
            {isOwner && !isEditingBio && (
              <button
                onClick={() => setIsEditingBio(true)}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-bold"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t('edit')}</span>
              </button>
            )}
          </div>

          {isEditingBio ? (
            <div className="space-y-3">
              <textarea
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                rows={4}
                placeholder={t('descriptionPlaceholder')}
                className="w-full bg-[#070e1c] border border-cyan-950 focus:border-cyan-400 rounded-2xl p-3 text-xs text-slate-100"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveBio}
                  className="px-4 py-1.5 bg-cyan-600 text-white rounded-xl text-xs font-bold"
                >
                  {t('save')}
                </button>
                <button
                  onClick={() => setIsEditingBio(false)}
                  className="px-4 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {channelUser.bio || (language === 'ar' ? 'لم يتم إضافة وصف بعد لهذه القناة.' : 'No description added yet for this channel.')}
            </p>
          )}

          <hr className="border-cyan-950" />

          {/* Channel Stats */}
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>{t('joinedDate')}: {new Date(channelUser.registeredAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>{t('totalViews')}: {totalViews} {t('views')}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Film className="w-4 h-4 text-cyan-400" />
              <span>{t('videos')}: {rawChannelVideos.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Video Analytics Modal */}
      {selectedStatsVideo && (
        <VideoStatsModal
          video={selectedStatsVideo}
          language={language}
          onClose={() => setSelectedStatsVideo(null)}
          onEdit={(v) => {
            setSelectedStatsVideo(null);
            setSelectedEditVideo(v);
          }}
          onDelete={(id) => {
            handleDeleteVideoConfirm(id);
            setSelectedStatsVideo(null);
          }}
          onPlay={(v) => onSelectVideo(v)}
        />
      )}

      {/* Video Edit Modal */}
      {selectedEditVideo && currentUser && (
        <EditVideoModal
          video={selectedEditVideo}
          currentUser={currentUser}
          language={language}
          onClose={() => setSelectedEditVideo(null)}
          onSuccess={() => {
            setSelectedEditVideo(null);
          }}
        />
      )}

      {/* Post Edit Modal */}
      {selectedEditPost && currentUser && (
        <EditPostModal
          post={selectedEditPost}
          currentUser={currentUser}
          language={language}
          onClose={() => setSelectedEditPost(null)}
          onSuccess={() => {
            setSelectedEditPost(null);
          }}
        />
      )}
    </div>
  );
};
