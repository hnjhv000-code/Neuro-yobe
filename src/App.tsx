import React, { useState, useEffect } from 'react';
import {
  Navbar
} from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { VideoCard } from './components/VideoCard';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { ShortsViewer } from './components/ShortsViewer';
import { UploadModal } from './components/UploadModal';
import { CreatePostModal } from './components/CreatePostModal';
import { AuthModal } from './components/AuthModal';
import { DeveloperPanel } from './components/DeveloperPanel';
import { ChannelView } from './components/ChannelView';
import { SupportModal } from './components/SupportModal';
import { PlaylistsModal } from './components/PlaylistsModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AboutUsView } from './components/AboutUsView';
import { PrivacyView } from './components/PrivacyView';
import { ToastProvider, useToast } from './components/Toast';

import {
  auth,
  onAuthStateChanged,
  signOutUser,
  getUserProfile,
  subscribeToVideos,
  subscribeToPosts,
  subscribeToNotifications,
  subscribeToUserSubscriptions,
  subscribeToDeveloperSettings,
  subscribeToUserWatchHistory,
  subscribeToUserWatchLater,
  subscribeToUserDownloads,
  subscribeToUserPlaylists,
  updateUserProfileFields,
  logUserActivity,
  clearWatchHistory
} from './services/firebase';
import { getTranslation } from './services/translations';
import { getCachedVideos, getCachedPosts, clearAllLocalCachedContent } from './services/sampleData';

import type {
  UserProfile,
  VideoItem,
  PostItem,
  NotificationItem,
  SubscriptionItem,
  DeveloperSettings,
  Language,
  PlaylistItem,
  HistoryItem,
  SavedItem,
  DownloadedItem
} from './types';

import {
  Compass,
  Film,
  Sparkles,
  Search,
  Filter,
  Flame,
  Clock,
  ThumbsUp,
  DownloadCloud,
  ListMusic,
  Users2,
  HelpCircle,
  Info,
  ShieldCheck,
  Megaphone,
  Trash2,
  User,
  Camera,
  CheckCircle,
  PlaySquare,
  Sun,
  Moon
} from 'lucide-react';
import { compressDeviceImage } from './services/mediaStorage';

export const AppContent: React.FC = () => {
  // Authentication & Profile
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App State & Preferences (Language auto-detected from browser or saved in localStorage)
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('yassa_language') || localStorage.getItem('neuroyobe_language');
      if (saved && ['ar', 'en', 'fr', 'ja', 'zh'].includes(saved)) {
        return saved as Language;
      }
      // Auto-detect from browser locale
      const browserLangs = navigator.languages ? [...navigator.languages] : [navigator.language || ''];
      for (const rawLang of browserLangs) {
        const code = (rawLang || '').toLowerCase();
        if (code.startsWith('ar')) return 'ar';
        if (code.startsWith('en')) return 'en';
        if (code.startsWith('fr')) return 'fr';
        if (code.startsWith('ja')) return 'ja';
        if (code.startsWith('zh')) return 'zh';
      }
    } catch {}
    return 'ar';
  });

  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('yassa_theme');
      if (saved !== null) {
        return saved === 'dark';
      }
    } catch {}
    return true;
  });
  const [currentRoute, setCurrentRoute] = useState<string>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sync language with DOM, localStorage, and dynamic Google SEO Meta tags
  useEffect(() => {
    try {
      localStorage.setItem('yassa_language', language);
      localStorage.setItem('neuroyobe_language', language);
    } catch {}

    // HTML tag lang and direction
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';

    // Dynamic SEO Title & Description for Google across 5 languages
    const dynamicTitle = getTranslation(language, 'metaTitle');
    const dynamicDesc = getTranslation(language, 'metaDesc');

    document.title = dynamicTitle;

    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', dynamicDesc);
    }
    const ogTitleMeta = document.querySelector('meta[property="og:title"]');
    if (ogTitleMeta) {
      ogTitleMeta.setAttribute('content', dynamicTitle);
    }
    const ogDescMeta = document.querySelector('meta[property="og:description"]');
    if (ogDescMeta) {
      ogDescMeta.setAttribute('content', dynamicDesc);
    }
    const twitterTitleMeta = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitleMeta) {
      twitterTitleMeta.setAttribute('content', dynamicTitle);
    }
    const twitterDescMeta = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescMeta) {
      twitterDescMeta.setAttribute('content', dynamicDesc);
    }
  }, [language]);

  // Sync theme with DOM and localStorage

  // Sync theme with DOM and localStorage
  useEffect(() => {
    try {
      localStorage.setItem('yassa_theme', isDarkTheme ? 'dark' : 'light');
      if (isDarkTheme) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.body.classList.add('dark');
        document.body.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
        document.body.classList.add('light');
        document.body.classList.remove('dark');
      }
    } catch {}
  }, [isDarkTheme]);

  // Selected Channel Profile
  const [selectedChannelUid, setSelectedChannelUid] = useState<string | null>(null);
  const [selectedChannelUser, setSelectedChannelUser] = useState<UserProfile | null>(null);

  // Active Video for Playback
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [playlistVideoToAdd, setPlaylistVideoToAdd] = useState<VideoItem | null>(null);

  // Modals visibility
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDeveloperPanel, setShowDeveloperPanel] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showPlaylistsModal, setShowPlaylistsModal] = useState(false);

  // Real-time Firebase data collections (instantly loaded from cache/starters)
  const [allVideos, setAllVideos] = useState<VideoItem[]>(() => getCachedVideos());
  const [allPosts, setAllPosts] = useState<PostItem[]>(() => getCachedPosts());
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [developerSettings, setDeveloperSettings] = useState<DeveloperSettings | null>(null);

  // User private library collections
  const [userHistoryItems, setUserHistoryItems] = useState<HistoryItem[]>([]);
  const [userSavedItems, setUserSavedItems] = useState<SavedItem[]>([]);
  const [userDownloadedItems, setUserDownloadedItems] = useState<DownloadedItem[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<PlaylistItem[]>([]);

  // Account Settings state
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');

  const { showToast } = useToast();
  const t = (key: string) => getTranslation(language, key);

  // Firebase Auth State Listener & Phone Session Loader
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let profile = await getUserProfile(user.uid);
        if (profile) {
          if (profile.emailVerified !== user.emailVerified) {
            profile = { ...profile, emailVerified: user.emailVerified };
            try {
              await updateUserProfileFields(user.uid, { emailVerified: user.emailVerified });
            } catch {}
          }
          setCurrentUser(profile);
          setEditUsername(profile.username);
          setEditBio(profile.bio || '');
        } else {
          // Auto-generate profile for signed-in user if not in DB yet
          const fallbackProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            username: user.displayName || (user.email ? user.email.split('@')[0] : 'مستخدم NeuroYobe'),
            avatarUrl: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            registeredAt: Date.now(),
            lastLoginAt: Date.now(),
            subscribersCount: 0,
            totalViews: 0,
            deviceType: 'Desktop / كمبيوتر',
            emailVerified: user.emailVerified,
            provider: 'password',
            isBlocked: false
          };
          try {
            await updateUserProfileFields(user.uid, fallbackProfile);
          } catch {}
          setCurrentUser(fallbackProfile);
          setEditUsername(fallbackProfile.username);
          setEditBio(fallbackProfile.bio || '');
        }
        setAuthLoading(false);
      } else {
        // Check phone login session in localStorage
        const savedPhoneUid = localStorage.getItem('yassa_phone_user_uid');
        if (savedPhoneUid) {
          try {
            const phoneProfile = await getUserProfile(savedPhoneUid);
            if (phoneProfile) {
              setCurrentUser(phoneProfile);
              setEditUsername(phoneProfile.username);
              setEditBio(phoneProfile.bio || '');
            } else {
              setCurrentUser(null);
            }
          } catch {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Global Subscriptions (Videos, Posts, Settings)
  useEffect(() => {
    clearAllLocalCachedContent();
    const unsubVideos = subscribeToVideos(setAllVideos);
    const unsubPosts = subscribeToPosts(setAllPosts);
    const unsubDev = subscribeToDeveloperSettings(setDeveloperSettings);

    return () => {
      unsubVideos();
      unsubPosts();
      unsubDev();
    };
  }, []);

  // User-specific Subscriptions
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setSubscriptions([]);
      setUserHistoryItems([]);
      setUserSavedItems([]);
      setUserDownloadedItems([]);
      setUserPlaylists([]);
      return;
    }

    const unsubNotifs = subscribeToNotifications(currentUser.uid, setNotifications);
    const unsubSubs = subscribeToUserSubscriptions(currentUser.uid, setSubscriptions);
    const unsubHistory = subscribeToUserWatchHistory(currentUser.uid, setUserHistoryItems);
    const unsubLater = subscribeToUserWatchLater(currentUser.uid, setUserSavedItems);
    const unsubDown = subscribeToUserDownloads(currentUser.uid, setUserDownloadedItems);
    const unsubPlay = subscribeToUserPlaylists(currentUser.uid, setUserPlaylists);

    return () => {
      unsubNotifs();
      unsubSubs();
      unsubHistory();
      unsubLater();
      unsubDown();
      unsubPlay();
    };
  }, [currentUser?.uid]);

  // Load Channel details when selected
  useEffect(() => {
    if (!selectedChannelUid) {
      setSelectedChannelUser(null);
      return;
    }
    getUserProfile(selectedChannelUid).then((profile) => {
      if (profile) {
        setSelectedChannelUser(profile);
      }
    });
  }, [selectedChannelUid]);

  // Deep linking for video ?v=ID or channel ?c=UID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get('v');
    const channelId = params.get('c');

    if (videoId && allVideos.length > 0) {
      const found = allVideos.find((v) => v.id === videoId);
      if (found) setActiveVideo(found);
    }

    if (channelId) {
      setSelectedChannelUid(channelId);
      setCurrentRoute('channel');
    }
  }, [allVideos]);

  const handleLogout = async () => {
    localStorage.removeItem('yassa_phone_user_uid');
    await signOutUser();
    setCurrentUser(null);
    showToast('تم تسجيل الخروج بنجاح', 'info');
  };

  const handleSelectChannel = (channelUid: string) => {
    setSelectedChannelUid(channelUid);
    setCurrentRoute('channel');
  };

  const handleOpenMyChannel = () => {
    if (currentUser) {
      setSelectedChannelUid(currentUser.uid);
      setSelectedChannelUser(currentUser);
      setCurrentRoute('channel');
    }
  };

  // Filtered Videos based on search, category, and visibility
  const isVideoVisibleToUser = (v: VideoItem) => {
    const isSched = v.visibility === 'scheduled';
    const isPriv = v.visibility === 'private';
    const isPub = !v.visibility || v.visibility === 'public';
    const isSchedPassed = isSched && v.scheduledAt && v.scheduledAt <= Date.now();

    // Publisher can always see their own videos
    if (currentUser && v.publisherUid === currentUser.uid) {
      return true;
    }
    // Otherwise only public and reached scheduled time
    return isPub || isSchedPassed;
  };

  const filteredVideos = allVideos
    .filter(isVideoVisibleToUser)
    .filter((v) => {
      const matchesSearch =
        !searchQuery.trim() ||
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.publisherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'shorts' && v.type === 'short') ||
        (selectedCategory === 'videos' && v.type === 'video') ||
        v.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

  const shortsVideos = allVideos.filter(isVideoVisibleToUser).filter((v) => v.type === 'short');
  const longVideos = filteredVideos.filter((v) => v.type === 'video');
  const likedVideos = allVideos.filter(
    (v) => currentUser && v.likedUsers && v.likedUsers[currentUser.uid] === 'like'
  );
  const subscribedVideos = allVideos
    .filter(isVideoVisibleToUser)
    .filter((v) =>
      subscriptions.some((s) => s.channelUid === v.publisherUid)
    );

  // Map history, saved, and downloads to full VideoItem objects if available
  const watchHistory: VideoItem[] = userHistoryItems
    .map((h) => allVideos.find((v) => v.id === h.videoId))
    .filter((v): v is VideoItem => Boolean(v));

  const watchLaterVideos: VideoItem[] = userSavedItems
    .map((s) => allVideos.find((v) => v.id === s.videoId))
    .filter((v): v is VideoItem => Boolean(v));

  const downloadedVideos: VideoItem[] = userDownloadedItems
    .map((d) => allVideos.find((v) => v.id === d.videoId))
    .filter((v): v is VideoItem => Boolean(v));

  // Background style based on Developer Settings
  const bgStyle: React.CSSProperties = developerSettings?.customBgUrl
    ? {
        backgroundImage: `url(${developerSettings.customBgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }
    : {};

  const categories = [
    { id: 'all', label: 'الكل (All)' },
    { id: 'videos', label: 'الفيديوهات (Videos)' },
    { id: 'shorts', label: 'شورتس (Shorts)' },
    { id: 'gaming', label: 'ألعاب (Gaming)' },
    { id: 'music', label: 'موسيقى وصوتيات' },
    { id: 'tech', label: 'تقنية وبرمجة' },
    { id: 'education', label: 'تعليم ومعرفة' },
    { id: 'podcasts', label: 'بودكاست' },
  ];

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDarkTheme
          ? 'dark-theme bg-[#050a14] text-slate-100'
          : 'light-theme bg-[#f8fafc] text-slate-900'
      } ${developerSettings?.bgAnimation === 'nebula' && isDarkTheme ? 'nebula-bg' : ''}`}
      style={bgStyle}
    >
      {/* Top Global Notice / Announcement if configured by Developer */}
      {developerSettings?.siteNotice && (
        <div className="bg-gradient-to-r from-cyan-900/90 via-blue-900/90 to-indigo-900/90 border-b border-cyan-500/40 text-cyan-100 px-4 py-2 text-xs text-center flex items-center justify-center gap-2 font-semibold shadow-md">
          <Megaphone className="w-4 h-4 text-cyan-300 animate-pulse shrink-0" />
          <span>{developerSettings.siteNotice}</span>
        </div>
      )}

      {/* Main Cosmic Navbar */}
      <Navbar
        currentUser={currentUser}
        language={language}
        onLanguageChange={setLanguage}
        isDarkTheme={isDarkTheme}
        onThemeToggle={() => setIsDarkTheme(!isDarkTheme)}
        onOpenUpload={() => {
          if (!currentUser) setShowAuthModal(true);
          else setShowUploadModal(true);
        }}
        onOpenCreatePost={() => {
          if (!currentUser) setShowAuthModal(true);
          else setShowCreatePostModal(true);
        }}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onOpenDeveloper={() => setShowDeveloperPanel(true)}
        onOpenMyChannel={handleOpenMyChannel}
        onOpenSettings={() => setCurrentRoute('settings')}
        onOpenSupport={() => {
          if (!currentUser) setShowAuthModal(true);
          else setShowSupportModal(true);
        }}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        notifications={notifications}
        allVideos={allVideos}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={(q) => {
          setSearchQuery(q);
          setCurrentRoute('home');
        }}
        onSelectVideo={(v) => setActiveVideo(v)}
        developerSettings={developerSettings}
        onNavigate={(r) => {
          setCurrentRoute(r);
          setSelectedChannelUid(null);
        }}
      />

      {/* Body Layout: Sidebar + Main Content */}
      <div className="flex-1 flex pt-0">
        {/* Sidebar */}
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={(r) => {
            setCurrentRoute(r);
            setSelectedChannelUid(null);
          }}
          language={language}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          currentUser={currentUser}
          onOpenAuth={() => setShowAuthModal(true)}
          onOpenDeveloper={() => setShowDeveloperPanel(true)}
          isDarkTheme={isDarkTheme}
          onThemeToggle={() => setIsDarkTheme(!isDarkTheme)}
        />

        {/* Content Area */}
        <main
          className={`flex-1 transition-all duration-300 p-3 sm:p-6 pb-24 sm:pb-8 overflow-y-auto ${
            isSidebarOpen ? 'sm:ms-64' : 'sm:ms-20'
          }`}
        >
          {/* VIEW: HOME (الرئيسية) */}
          {currentRoute === 'home' && (
            <div className="space-y-6">
              {/* Category Pills Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                      selectedCategory === cat.id
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/60'
                        : 'bg-[#091224]/80 text-slate-300 hover:bg-cyan-950/60 hover:text-white border border-cyan-950/60'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Shorts Highlights Horizontal Carousel */}
              {shortsVideos.length > 0 && selectedCategory === 'all' && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Compass className="w-5 h-5 text-rose-500" />
                      <h2 className="text-base font-extrabold text-slate-100">شورتس (Shorts)</h2>
                    </div>
                    <button
                      onClick={() => setCurrentRoute('shorts')}
                      className="text-xs text-cyan-400 hover:underline font-bold"
                    >
                      عرض الكل
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {shortsVideos.slice(0, 6).map((short) => (
                      <div
                        key={short.id}
                        onClick={() => setActiveVideo(short)}
                        className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 border border-cyan-950/60 hover:border-rose-500/60 cursor-pointer shadow-lg transition-all hover:scale-105"
                      >
                        <img
                          src={short.thumbnailDataUrl}
                          alt={short.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent p-3 flex flex-col justify-end">
                          <span className="text-xs font-bold text-white line-clamp-2 leading-snug">
                            {short.title}
                          </span>
                          <span className="text-[10px] text-cyan-300 mt-1">
                            {short.views || 0} {t('views')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Standard Long Videos Grid */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-base font-extrabold text-slate-100">فيديوهات مقترحة</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">{filteredVideos.length} فيديو</span>
                </div>

                {filteredVideos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-16 text-center bg-[#091224]/40 rounded-3xl border border-cyan-950/60">
                    <Film className="w-12 h-12 text-cyan-400/40 mb-3" />
                    <h3 className="font-bold text-slate-200">{t('noVideosYet')}</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      {t('beFirstToUpload')}
                    </p>
                    <button
                      onClick={() => {
                        if (!currentUser) setShowAuthModal(true);
                        else setShowUploadModal(true);
                      }}
                      className="mt-4 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full text-xs font-bold shadow-lg"
                    >
                      {t('upload')}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredVideos.map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        language={language}
                        currentUser={currentUser}
                        onSelect={(v) => setActiveVideo(v)}
                        onSaveToWatchLater={() => {
                          showToast(t('savedSuccess'), 'success');
                        }}
                        onAddToPlaylist={(v) => {
                          setPlaylistVideoToAdd(v);
                          setShowPlaylistsModal(true);
                        }}
                        onDownload={(v) => {
                          showToast(t('downloadSuccess'), 'info');
                        }}
                        onOpenAuth={() => setShowAuthModal(true)}
                        onSelectChannel={handleSelectChannel}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: SHORTS (شورتس) */}
          {currentRoute === 'shorts' && (
            <ShortsViewer
              shorts={shortsVideos}
              currentUser={currentUser}
              language={language}
              subscriptions={subscriptions}
              onOpenAuth={() => setShowAuthModal(true)}
              onSelectChannel={handleSelectChannel}
            />
          )}

          {/* VIEW: SUBSCRIPTIONS (الاشتراكات) */}
          {currentRoute === 'subscriptions' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <PlaySquare className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-extrabold text-slate-100">{t('subscribedVideos')}</h2>
              </div>

              {subscribedVideos.length === 0 ? (
                <div className="p-16 text-center text-slate-500 text-xs bg-[#091224]/30 rounded-3xl border border-cyan-950">
                  {t('noSubscribedVideos')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {subscribedVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      language={language}
                      currentUser={currentUser}
                      onSelect={(v) => setActiveVideo(v)}
                      onOpenAuth={() => setShowAuthModal(true)}
                      onSelectChannel={handleSelectChannel}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: WATCH HISTORY (سجل المشاهدة) */}
          {currentRoute === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base font-extrabold text-slate-100">{t('history')}</h2>
                </div>
                {currentUser && watchHistory.length > 0 && (
                  <button
                    onClick={async () => {
                      await clearWatchHistory(currentUser.uid);
                      showToast(t('historyCleared'), 'info');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('clearHistory')}</span>
                  </button>
                )}
              </div>

              {!currentUser ? (
                <div className="p-12 text-center bg-[#091224]/50 rounded-3xl border border-cyan-950/80 flex flex-col items-center justify-center gap-3">
                  <Clock className="w-12 h-12 text-cyan-400/40" />
                  <h3 className="text-sm font-bold text-slate-200">{t('guestHistoryNoticeTitle')}</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {t('guestHistoryNoticeDesc')}
                  </p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="mt-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full text-xs font-bold shadow-lg"
                  >
                    {t('login')}
                  </button>
                </div>
              ) : watchHistory.length === 0 ? (
                <div className="p-16 text-center text-slate-500 text-xs bg-[#091224]/30 rounded-3xl border border-cyan-950">
                  {t('emptyHistoryDesc')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {watchHistory.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      language={language}
                      currentUser={currentUser}
                      onSelect={(v) => setActiveVideo(v)}
                      onOpenAuth={() => setShowAuthModal(true)}
                      onSelectChannel={handleSelectChannel}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: LIKED VIDEOS (المعجب بها) */}
          {currentRoute === 'liked' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-extrabold text-slate-100">{t('likedVideos')}</h2>
              </div>

              {!currentUser ? (
                <div className="p-12 text-center bg-[#091224]/50 rounded-3xl border border-cyan-950/80 flex flex-col items-center justify-center gap-3">
                  <ThumbsUp className="w-12 h-12 text-cyan-400/40" />
                  <h3 className="text-sm font-bold text-slate-200">{t('guestLikedNoticeTitle')}</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {t('guestLikedNoticeDesc')}
                  </p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="mt-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full text-xs font-bold shadow-lg"
                  >
                    {t('login')}
                  </button>
                </div>
              ) : likedVideos.length === 0 ? (
                <div className="p-16 text-center text-slate-500 text-xs bg-[#091224]/30 rounded-3xl border border-cyan-950">
                  {t('emptyLikesDesc')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {likedVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      language={language}
                      currentUser={currentUser}
                      onSelect={(v) => setActiveVideo(v)}
                      onOpenAuth={() => setShowAuthModal(true)}
                      onSelectChannel={handleSelectChannel}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: SAVED / WATCH LATER (المحفوظات) */}
          {currentRoute === 'saved' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-extrabold text-slate-100">{t('watchLater')}</h2>
              </div>

              {!currentUser ? (
                <div className="p-12 text-center bg-[#091224]/50 rounded-3xl border border-cyan-950/80 flex flex-col items-center justify-center gap-3">
                  <Clock className="w-12 h-12 text-cyan-400/40" />
                  <h3 className="text-sm font-bold text-slate-200">{t('guestWatchLaterNoticeTitle')}</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {t('guestWatchLaterNoticeDesc')}
                  </p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="mt-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full text-xs font-bold shadow-lg"
                  >
                    {t('login')}
                  </button>
                </div>
              ) : watchLaterVideos.length === 0 ? (
                <div className="p-16 text-center text-slate-500 text-xs bg-[#091224]/30 rounded-3xl border border-cyan-950">
                  {t('emptyWatchLaterDesc')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {watchLaterVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      language={language}
                      currentUser={currentUser}
                      onSelect={(v) => setActiveVideo(v)}
                      onOpenAuth={() => setShowAuthModal(true)}
                      onSelectChannel={handleSelectChannel}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: DOWNLOADS (التنزيلات والأوفلاين) */}
          {currentRoute === 'downloads' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <DownloadCloud className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-extrabold text-slate-100">{t('downloads')}</h2>
              </div>

              {!currentUser ? (
                <div className="p-12 text-center bg-[#091224]/50 rounded-3xl border border-cyan-950/80 flex flex-col items-center justify-center gap-3">
                  <DownloadCloud className="w-12 h-12 text-cyan-400/40" />
                  <h3 className="text-sm font-bold text-slate-200">{t('guestDownloadsNoticeTitle')}</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {t('guestDownloadsNoticeDesc')}
                  </p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="mt-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full text-xs font-bold shadow-lg"
                  >
                    {t('login')}
                  </button>
                </div>
              ) : downloadedVideos.length === 0 ? (
                <div className="p-16 text-center text-slate-500 text-xs bg-[#091224]/30 rounded-3xl border border-cyan-950">
                  {t('emptyDownloadsDesc')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {downloadedVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      language={language}
                      currentUser={currentUser}
                      onSelect={(v) => setActiveVideo(v)}
                      onOpenAuth={() => setShowAuthModal(true)}
                      onSelectChannel={handleSelectChannel}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: PLAYLISTS (قوائم التشغيل) */}
          {currentRoute === 'playlists' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base font-extrabold text-slate-100">{t('playlists')}</h2>
                </div>
                {currentUser && (
                  <button
                    onClick={() => setShowPlaylistsModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full text-xs font-bold"
                  >
                    {t('createPlaylistBtn')}
                  </button>
                )}
              </div>

              {!currentUser ? (
                <div className="p-12 text-center bg-[#091224]/50 rounded-3xl border border-cyan-950/80 flex flex-col items-center justify-center gap-3">
                  <ListMusic className="w-12 h-12 text-cyan-400/40" />
                  <h3 className="text-sm font-bold text-slate-200">{t('guestPlaylistsNoticeTitle')}</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {t('guestPlaylistsNoticeDesc')}
                  </p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="mt-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full text-xs font-bold shadow-lg"
                  >
                    {t('login')}
                  </button>
                </div>
              ) : userPlaylists.length === 0 ? (
                <div className="p-16 text-center text-slate-500 text-xs bg-[#091224]/30 rounded-3xl border border-cyan-950">
                  {t('emptyPlaylists')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userPlaylists.map((pl) => (
                    <div
                      key={pl.id}
                      className="p-4 rounded-2xl bg-[#091224] border border-cyan-950 space-y-2"
                    >
                      <h3 className="font-bold text-sm text-cyan-300">{pl.title}</h3>
                      <p className="text-xs text-slate-400">{pl.videoIds?.length || 0} {t('videosInPlaylist')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: COMMUNITY (المنتدى والمجتمع) */}
          {currentRoute === 'community' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users2 className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base font-extrabold text-slate-100">{t('community')}</h2>
                </div>
                <button
                  onClick={() => {
                    if (!currentUser) setShowAuthModal(true);
                    else setShowCreatePostModal(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full text-xs font-bold shadow-lg"
                >
                  {t('createPost')}
                </button>
              </div>

              {allPosts.length === 0 ? (
                <div className="p-16 text-center text-slate-500 text-xs bg-[#091224]/30 rounded-3xl border border-cyan-950">
                  {t('noPostsYet')}
                </div>
              ) : (
                allPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-5 rounded-3xl bg-[#091224]/80 border border-cyan-950/80 space-y-3 shadow-xl"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={post.channelAvatar}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-cyan-400/60 cursor-pointer"
                        onClick={() => handleSelectChannel(post.channelUid)}
                      />
                      <div>
                        <span
                          onClick={() => handleSelectChannel(post.channelUid)}
                          className="font-bold text-xs text-slate-100 hover:text-cyan-300 cursor-pointer"
                        >
                          {post.channelName}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                      {post.text}
                    </p>

                    {post.images && post.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
                        {post.images.map((img, idx) => (
                          <img key={idx} src={img} alt="" className="w-full aspect-video object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* VIEW: CHANNEL VIEW (صفحة القناة المخصصة) */}
          {currentRoute === 'channel' && selectedChannelUser && (
            <ChannelView
              channelUser={selectedChannelUser}
              currentUser={currentUser}
              allVideos={allVideos}
              allPosts={allPosts}
              subscriptions={subscriptions}
              language={language}
              onSelectVideo={(v) => setActiveVideo(v)}
              onOpenAuth={() => setShowAuthModal(true)}
              onOpenUpload={() => setShowUploadModal(true)}
              onOpenCreatePost={() => setShowCreatePostModal(true)}
            />
          )}

          {/* VIEW: SUPPORT & TICKETS (الدعم الفني) */}
          {currentRoute === 'support' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base font-extrabold text-slate-100">{t('support')}</h2>
                </div>
                <button
                  onClick={() => {
                    if (!currentUser) setShowAuthModal(true);
                    else setShowSupportModal(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full text-xs font-bold"
                >
                  {t('openSupportTicket')}
                </button>
              </div>

              <div className="p-6 rounded-3xl bg-[#091224] border border-cyan-950 space-y-4 text-xs text-slate-300 leading-relaxed">
                <h3 className="font-bold text-sm text-cyan-300">{t('supportTitle')}</h3>
                <p>
                  {t('supportDesc')}
                </p>
              </div>
            </div>
          )}

          {/* VIEW: ABOUT US (من نحن) */}
          {currentRoute === 'about' && (
            <AboutUsView
              language={language}
              onNavigateHome={() => setCurrentRoute('home')}
              onNavigatePrivacy={() => setCurrentRoute('privacy')}
              onNavigateSupport={() => {
                if (!currentUser) setShowAuthModal(true);
                else setShowSupportModal(true);
              }}
            />
          )}

          {/* VIEW: PRIVACY & TERMS (الخصوصية والأمان) */}
          {currentRoute === 'privacy' && (
            <PrivacyView
              language={language}
              onNavigateHome={() => setCurrentRoute('home')}
              onNavigateAbout={() => setCurrentRoute('about')}
              onNavigateSupport={() => {
                if (!currentUser) setShowAuthModal(true);
                else setShowSupportModal(true);
              }}
            />
          )}

          {/* VIEW: SETTINGS (إعدادات الحساب) */}
          {currentRoute === 'settings' && currentUser && (
            <div className="max-w-xl mx-auto p-6 rounded-3xl bg-[#091224] border border-cyan-950 space-y-5">
              <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                <User className="w-5 h-5 text-cyan-400" />
                <span>{t('accountSettings')}</span>
              </h2>

              <div className="space-y-4">
                {/* Theme Selector */}
                <div className="space-y-1.5 p-3 rounded-2xl bg-[#070e1c] border border-cyan-950">
                  <label className="text-xs font-bold text-slate-300 block">{t('themeSettings')}:</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsDarkTheme(true)}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition-all ${
                        isDarkTheme
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                          : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Moon className="w-4 h-4 text-cyan-400" />
                      <span>{t('darkTheme')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDarkTheme(false)}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition-all ${
                        !isDarkTheme
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                          : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sun className="w-4 h-4 text-amber-300" />
                      <span>{t('lightTheme')}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">{t('accountName')}:</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-[#070e1c] border border-cyan-950 rounded-xl p-2.5 text-xs text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">{t('bioLabel')}:</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={3}
                    className="w-full bg-[#070e1c] border border-cyan-950 rounded-xl p-2.5 text-xs text-slate-100"
                  />
                </div>

                <button
                  onClick={async () => {
                    await updateUserProfileFields(currentUser.uid, {
                      username: editUsername.trim(),
                      bio: editBio.trim()
                    });
                    showToast(t('saveProfileChanges'), 'success');
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  {t('saveChanges')}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: Video Player Modal */}
      {activeVideo && (
        <VideoPlayerModal
          video={activeVideo}
          allVideos={allVideos}
          currentUser={currentUser}
          language={language}
          subscriptions={subscriptions}
          onClose={() => setActiveVideo(null)}
          onSelectVideo={(v) => setActiveVideo(v)}
          onOpenAuth={() => setShowAuthModal(true)}
          onSelectChannel={handleSelectChannel}
        />
      )}

      {/* MODAL 2: Upload Video Modal */}
      {showUploadModal && currentUser && (
        <UploadModal
          currentUser={currentUser}
          language={language}
          onClose={() => setShowUploadModal(false)}
          onSuccess={(videoId) => {
            setShowUploadModal(false);
            const found = allVideos.find((v) => v.id === videoId);
            if (found) setActiveVideo(found);
          }}
        />
      )}

      {/* MODAL 3: Create Community Post Modal */}
      {showCreatePostModal && currentUser && (
        <CreatePostModal
          currentUser={currentUser}
          language={language}
          onClose={() => setShowCreatePostModal(false)}
          onSuccess={() => setShowCreatePostModal(false)}
        />
      )}

      {/* MODAL 4: Authentication Modal */}
      {showAuthModal && (
        <AuthModal
          language={language}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(user) => {
            if (user.provider === 'phone' || user.phoneNumber) {
              localStorage.setItem('yassa_phone_user_uid', user.uid);
            }
            setCurrentUser(user);
            setShowAuthModal(false);
          }}
        />
      )}

      {/* MODAL 5: Developer Management Panel */}
      {showDeveloperPanel && (
        <DeveloperPanel
          onClose={() => setShowDeveloperPanel(false)}
          developerSettings={developerSettings}
          onSelectVideo={(v) => {
            setShowDeveloperPanel(false);
            setActiveVideo(v);
          }}
        />
      )}

      {/* MODAL 6: Support Complaint Modal */}
      {showSupportModal && currentUser && (
        <SupportModal
          currentUser={currentUser}
          language={language}
          onClose={() => setShowSupportModal(false)}
        />
      )}

      {/* MODAL 7: Playlists Management Modal */}
      {showPlaylistsModal && currentUser && (
        <PlaylistsModal
          currentUser={currentUser}
          language={language}
          videoToAdd={playlistVideoToAdd || undefined}
          userPlaylists={userPlaylists}
          onClose={() => {
            setShowPlaylistsModal(false);
            setPlaylistVideoToAdd(null);
          }}
        />
      )}

      {/* Responsive Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentRoute={currentRoute}
        onNavigate={(r) => {
          setCurrentRoute(r);
          setSelectedChannelUid(null);
        }}
        currentUser={currentUser}
        language={language}
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenCreatePost={() => setShowCreatePostModal(true)}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenMyChannel={() => {
          if (currentUser) {
            setSelectedChannelUid(currentUser.uid);
            setSelectedChannelUser(currentUser);
            setCurrentRoute('channel');
          }
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
