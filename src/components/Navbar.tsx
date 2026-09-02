import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Upload,
  Bell,
  Sun,
  Moon,
  Globe,
  Code2,
  User,
  LogOut,
  PlusSquare,
  X,
  CheckCircle,
  PlaySquare,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { CosmicLogo } from './CosmicLogo';
import { MobileNotificationsModal } from './MobileNotificationsModal';
import { NotificationDetailModal } from './NotificationDetailModal';
import { getTranslation } from '../services/translations';
import { markAllNotificationsAsRead, markNotificationAsRead } from '../services/firebase';
import type { Language, UserProfile, NotificationItem, DeveloperSettings, VideoItem } from '../types';

interface NavbarProps {
  currentUser: UserProfile | null;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isDarkTheme: boolean;
  onThemeToggle: () => void;
  onOpenUpload: () => void;
  onOpenCreatePost: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenDeveloper: () => void;
  onOpenMyChannel: () => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
  onToggleSidebar: () => void;
  notifications: NotificationItem[];
  allVideos: VideoItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  onSelectVideo: (video: VideoItem) => void;
  developerSettings: DeveloperSettings | null;
  onNavigate: (route: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  language,
  onLanguageChange,
  isDarkTheme,
  onThemeToggle,
  onOpenUpload,
  onOpenCreatePost,
  onOpenAuth,
  onLogout,
  onOpenDeveloper,
  onOpenMyChannel,
  onOpenSettings,
  onOpenSupport,
  onToggleSidebar,
  notifications,
  allVideos,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onSelectVideo,
  developerSettings,
  onNavigate
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileNotifications, setShowMobileNotifications] = useState(false);
  const [selectedNotificationForDetail, setSelectedNotificationForDetail] = useState<NotificationItem | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const t = (key: string, fallback = '') => getTranslation(language, key, fallback);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (isMobileSearchOpen && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [isMobileSearchOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = searchQuery.trim()
    ? allVideos
        .filter(
          (v) =>
            v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.publisherName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAllNotificationsAsRead(currentUser.uid, unreadIds);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setShowSearchDropdown(false);
      setIsMobileSearchOpen(false);
      onSearchSubmit(searchQuery);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#070e1c]/95 backdrop-blur-xl border-b border-cyan-900/30 transition-colors">
      {/* Mobile Search Overlay Bar */}
      {isMobileSearchOpen ? (
        <div className="relative flex items-center px-2 sm:px-4 h-14 sm:h-16 gap-2 bg-[#070e1c] w-full">
          <button
            onClick={() => {
              setIsMobileSearchOpen(false);
              setShowSearchDropdown(false);
            }}
            className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-cyan-950/50 shrink-0"
            aria-label="Back"
          >
            {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>

          <div className="relative flex-1">
            <input
              ref={mobileSearchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-[#0b1528] border border-cyan-900/60 focus:border-cyan-400 rounded-full py-1.5 sm:py-2 ps-3.5 pe-9 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setIsMobileSearchOpen(false);
              setShowSearchDropdown(false);
              onSearchSubmit(searchQuery);
            }}
            className="p-2 sm:p-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full shrink-0 shadow-md"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Instant Search Suggestions Dropdown for Mobile Search */}
          {showSearchDropdown && filteredSuggestions.length > 0 && (
            <div className="absolute top-full start-0 end-0 mt-1.5 mx-2 bg-[#091224] border border-cyan-900/60 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden z-50 divide-y divide-cyan-950/60 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
              {filteredSuggestions.map((video) => (
                <div
                  key={video.id}
                  onClick={() => {
                    setShowSearchDropdown(false);
                    setIsMobileSearchOpen(false);
                    onSelectVideo(video);
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-cyan-950/40 cursor-pointer transition-colors"
                >
                  <img
                    src={video.thumbnailDataUrl}
                    alt={video.title}
                    className="w-12 h-8 rounded-lg object-cover bg-slate-900 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{video.title}</p>
                    <p className="text-[11px] text-cyan-400/80 truncate">{video.publisherName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-2 sm:px-4 md:px-6 h-14 sm:h-16 gap-1.5 sm:gap-3 max-w-full">
          {/* Left Section: Menu Toggle & Brand Logo */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0 min-w-0">
            <button
              onClick={onToggleSidebar}
              aria-label="Toggle navigation"
              className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-cyan-400 hover:bg-cyan-950/40 transition-colors focus:outline-none shrink-0"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-1.5 sm:gap-2 group text-left focus:outline-none shrink-0 min-w-0"
            >
              <CosmicLogo customLogoUrl={developerSettings?.customLogoUrl} size="md" />
              <div className="flex flex-col min-w-0">
                <span className="font-black text-sm sm:text-lg md:text-xl tracking-tight bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 bg-clip-text text-transparent group-hover:from-cyan-200 group-hover:to-white transition-all font-display truncate">
                  {t('siteName')}
                </span>
                <span className="text-[9px] sm:text-[10px] text-cyan-400/80 font-semibold tracking-wider uppercase -mt-0.5 sm:-mt-1 hidden md:block">
                  {language === 'ar' ? 'منصة البث الذكية' : 'Smart Video Hub'}
                </span>
              </div>
            </button>
          </div>

          {/* Center Section: Desktop Search Bar */}
          <div ref={searchRef} className="relative flex-1 max-w-2xl mx-2 sm:mx-6 hidden md:block">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder={t('searchPlaceholder')}
                className="w-full bg-[#0b1528] border border-cyan-900/50 focus:border-cyan-400/80 rounded-full py-2.5 ps-5 pe-12 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner shadow-cyan-950/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    onSearchChange('');
                    setShowSearchDropdown(false);
                  }}
                  className="absolute end-11 p-1 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  setShowSearchDropdown(false);
                  onSearchSubmit(searchQuery);
                }}
                className="absolute end-1.5 p-2 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white rounded-full transition-all shadow-md shadow-cyan-900/40"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Instant Search Suggestions Dropdown */}
            {showSearchDropdown && filteredSuggestions.length > 0 && (
              <div className="absolute top-full start-0 end-0 mt-2 bg-[#091224] border border-cyan-900/60 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-50 divide-y divide-cyan-950/60 backdrop-blur-2xl">
                {filteredSuggestions.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => {
                      setShowSearchDropdown(false);
                      onSelectVideo(video);
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-cyan-950/40 cursor-pointer transition-colors"
                  >
                    <img
                      src={video.thumbnailDataUrl}
                      alt={video.title}
                      className="w-12 h-8 rounded-lg object-cover bg-slate-900 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{video.title}</p>
                      <p className="text-[11px] text-cyan-400/80 truncate">{video.publisherName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Section: Actions & Profile - Responsive */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
            {/* Mobile Search Button */}
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="p-1.5 sm:p-2 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40 rounded-xl transition-colors md:hidden shrink-0"
              title={t('search')}
              aria-label="Open Search"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Desktop Upload Button (hidden on mobile since bottom nav handles creation) */}
            <button
              onClick={onOpenUpload}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 via-sky-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-500/40 text-cyan-200 hover:text-white rounded-full text-xs font-semibold shadow-md shadow-cyan-950/40 transition-all shrink-0"
              title={t('upload')}
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('upload')}</span>
            </button>

            {/* Desktop Quick Post Button */}
            <button
              onClick={onOpenCreatePost}
              className="p-2 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40 rounded-xl transition-colors hidden lg:flex items-center shrink-0"
              title={t('createPost')}
            >
              <PlusSquare className="w-4 h-4" />
            </button>

            {/* Notifications Dropdown & Mobile Trigger */}
            <div ref={notifRef} className="relative shrink-0">
              <button
                id="notifications-bell-btn"
                onClick={() => {
                  if (!currentUser) {
                    onOpenAuth();
                  } else {
                    // On mobile: smoothly navigate to the full screen dedicated Notifications view
                    if (typeof window !== 'undefined' && window.innerWidth < 640) {
                      setShowNotifications(false);
                      onNavigate('notifications');
                    } else {
                      setShowNotifications(!showNotifications);
                    }
                  }
                }}
                className="relative p-1.5 sm:p-2 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40 rounded-xl transition-colors"
                title={t('notifications')}
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 end-0.5 sm:top-1 sm:end-1 flex h-3.5 min-w-3.5 sm:h-4 sm:min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] sm:text-[10px] font-bold text-white shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Desktop & Large Screen Dropdown (hidden on small mobile screens) */}
              {showNotifications && (
                <div className="absolute top-full mt-2 end-0 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-[#091224] border border-cyan-900/60 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between p-3 border-b border-cyan-950/60 bg-[#070e1c]/60">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-cyan-400" />
                      <h3 className="font-bold text-xs sm:text-sm text-slate-100">{t('notifications')}</h3>
                      {unreadCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                          {unreadCount} {t('new', 'جديد')}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{t('markAllRead', 'تحديد الكل كمقروء')}</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 sm:max-h-80 overflow-y-auto divide-y divide-cyan-950/40">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-400" />
                        <p>{t('noNotifications')}</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={async () => {
                            await markNotificationAsRead(notif.id);
                            setShowNotifications(false);
                            // Open dedicated full view for this notification
                            setSelectedNotificationForDetail(notif);
                          }}
                          className={`p-3 text-xs flex items-start gap-2.5 transition-colors cursor-pointer ${
                            !notif.isRead ? 'bg-cyan-950/20 text-slate-200 font-semibold' : 'bg-transparent text-slate-400'
                          } hover:bg-cyan-950/40`}
                        >
                          {notif.thumbnail ? (
                            <img
                              src={notif.thumbnail}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-cyan-900/40"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/40 flex items-center justify-center shrink-0 text-cyan-300">
                              <Sparkles className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-200 truncate">{notif.title}</p>
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{notif.body}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[9px] text-cyan-400/60 block">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-[9px] text-cyan-300/80 underline font-medium">
                                {t('tapToViewFull', 'عرض التفاصيل')}
                              </span>
                            </div>
                          </div>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1.5 shadow-[0_0_6px_#22d3ee]" />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Open in Dedicated Full-Screen View button */}
                  <div className="p-2 border-t border-cyan-950/80 bg-[#070e1c]/90">
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        onNavigate('notifications');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-bold text-center border border-cyan-800/40 transition-colors flex items-center justify-center gap-2"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>{t('openNotificationsPage', 'فتح صندوق الإشعارات بالكامل')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Language Selector Dropdown */}
            <div ref={langMenuRef} className="relative shrink-0">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="p-1.5 sm:p-2 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40 rounded-xl transition-colors flex items-center gap-1 text-xs"
                title={t('language')}
              >
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="uppercase font-bold text-[10px] sm:text-[11px] hidden sm:inline">{language}</span>
              </button>

              {showLangMenu && (
                <div className="absolute top-full mt-2 end-0 w-40 sm:w-44 bg-[#091224] border border-cyan-900/60 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden z-50 backdrop-blur-2xl divide-y divide-cyan-950/40 animate-in fade-in zoom-in-95 duration-150">
                  {[
                    { code: 'ar', label: 'العربية (Arabic)' },
                    { code: 'en', label: 'English' },
                    { code: 'ja', label: '日本語 (Japanese)' },
                    { code: 'fr', label: 'Français' },
                    { code: 'zh', label: '中文 (Chinese)' }
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        onLanguageChange(lang.code as Language);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-start px-3.5 py-2 sm:py-2.5 text-xs font-medium transition-colors flex items-center justify-between ${
                        language === lang.code
                          ? 'bg-cyan-950 text-cyan-300 font-bold'
                          : 'text-slate-300 hover:bg-cyan-950/40 hover:text-white'
                      }`}
                    >
                      <span>{lang.label}</span>
                      {language === lang.code && <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Toggle (Available on all devices) */}
            <button
              onClick={onThemeToggle}
              className="p-1.5 sm:p-2 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40 rounded-xl transition-colors flex items-center justify-center shrink-0"
              title={isDarkTheme ? 'التبديل إلى الوضع النهاري (Light Mode)' : 'التبديل إلى الوضع الليلي (Dark Mode)'}
              aria-label="Toggle Theme"
            >
              {isDarkTheme ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-cyan-500 animate-in spin-in-180 duration-300" />
              )}
            </button>

            {/* Developer Mode Button (Mandatory - Compact on mobile) */}
            <button
              onClick={onOpenDeveloper}
              className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-blue-900/60 via-indigo-900/60 to-purple-900/60 hover:from-blue-800 hover:to-purple-800 border border-cyan-400/40 text-cyan-300 hover:text-white rounded-full text-[10px] sm:text-xs font-bold shadow-md shadow-cyan-950/40 transition-all shrink-0"
              title="وضع المطور (Developer Mode)"
            >
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">المطور</span>
            </button>

            {/* User Profile / Login */}
            {currentUser ? (
              <div ref={userMenuRef} className="relative shrink-0">
                <button
                  id="navbar-user-avatar-btn"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-1.5 p-1 rounded-full border transition-all cursor-pointer ${
                    showUserMenu
                      ? 'border-cyan-400 ring-2 ring-cyan-400/40 bg-cyan-950/40'
                      : 'border-cyan-500/30 hover:border-cyan-400 hover:ring-2 hover:ring-cyan-400/30'
                  }`}
                  title={`${currentUser.username} - انقر لخيارات الحساب وتسجيل الخروج`}
                  aria-label="User Account Menu"
                >
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.username}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-cyan-400/50 shrink-0"
                  />
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden sm:block transition-transform duration-200 ${showUserMenu ? 'rotate-180 text-cyan-300' : ''}`} />
                </button>

                {showUserMenu && (
                  <div
                    id="navbar-user-dropdown-menu"
                    className="absolute end-0 mt-2 w-64 sm:w-72 max-w-[calc(100vw-1.5rem)] bg-[#080e1d] border border-cyan-800/60 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden z-50 backdrop-blur-2xl divide-y divide-cyan-950/70 animate-in fade-in zoom-in-95 duration-150"
                  >
                    {/* User Header Details */}
                    <div className="p-3.5 flex items-center gap-3 bg-[#050a15]/80">
                      <img
                        src={currentUser.avatarUrl}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400/60 shadow-md shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-black text-slate-100 truncate">{currentUser.username}</p>
                        <p className="text-[11px] text-slate-400 truncate" dir="ltr">{currentUser.email}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-cyan-400 font-semibold">
                            {currentUser.subscribersCount || 0} {t('subscribers')}
                          </span>
                          {currentUser.emailVerified ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                              {currentUser.provider === 'phone' ? t('phoneVerifiedBadge', 'هاتف مؤكد') : t('emailVerifiedBadge', 'حساب مؤكد')}
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30">
                              {t('unverifiedAccount', 'غير مؤكد')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Navigation Options */}
                    <div className="py-1.5">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenMyChannel();
                        }}
                        className="w-full text-start px-3.5 py-2 text-xs text-slate-200 hover:bg-cyan-950/50 hover:text-cyan-200 transition-colors flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <PlaySquare className="w-4 h-4 text-cyan-400" />
                        <span>{t('myChannel')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onNavigate('notifications');
                        }}
                        className="w-full text-start px-3.5 py-2 text-xs text-slate-200 hover:bg-cyan-950/50 hover:text-cyan-200 transition-colors flex items-center justify-between cursor-pointer font-medium"
                      >
                        <div className="flex items-center gap-2.5">
                          <Bell className="w-4 h-4 text-cyan-400" />
                          <span>{t('notifications')}</span>
                        </div>
                        {unreadCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold">
                            {unreadCount}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onThemeToggle();
                        }}
                        className="w-full text-start px-3.5 py-2 text-xs text-slate-200 hover:bg-cyan-950/50 hover:text-cyan-200 transition-colors flex items-center justify-between cursor-pointer font-medium"
                      >
                        <div className="flex items-center gap-2.5">
                          {isDarkTheme ? (
                            <Sun className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Moon className="w-4 h-4 text-cyan-500" />
                          )}
                          <span>{isDarkTheme ? t('lightTheme', 'الوضع النهاري') : t('darkTheme', 'الوضع الليلي')}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                          {isDarkTheme ? 'Dark' : 'Light'}
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenSupport();
                        }}
                        className="w-full text-start px-3.5 py-2 text-xs text-slate-200 hover:bg-cyan-950/50 hover:text-cyan-200 transition-colors flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <MessageSquare className="w-4 h-4 text-cyan-400" />
                        <span>{t('support')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenSettings();
                        }}
                        className="w-full text-start px-3.5 py-2 text-xs text-slate-200 hover:bg-cyan-950/50 hover:text-cyan-200 transition-colors flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <User className="w-4 h-4 text-cyan-400" />
                        <span>{t('accountSettings')}</span>
                      </button>
                    </div>

                    {/* Prominent Log Out Option */}
                    <div className="p-1.5 bg-rose-950/20">
                      <button
                        id="dropdown-logout-btn"
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full text-start px-3 py-2.5 rounded-xl text-xs text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 hover:border-rose-600 transition-all flex items-center justify-between font-bold cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <LogOut className="w-4 h-4 text-rose-400" />
                          <span>{t('logoutFromAccount', 'تسجيل الخروج من الحساب')}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-200">{t('logoutBadge', 'خروج')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="navbar-login-btn"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full text-xs sm:text-sm font-bold shadow-lg shadow-cyan-950/60 hover:shadow-cyan-500/30 transition-all shrink-0 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <User className="w-4 h-4 text-white" />
                <span>{t('login')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dedicated Mobile Notification Drawer / Bottom Sheet */}
      <MobileNotificationsModal
        isOpen={showMobileNotifications}
        onClose={() => setShowMobileNotifications(false)}
        notifications={notifications}
        language={language}
        onSelectNotification={(notif) => {
          setSelectedNotificationForDetail(notif);
        }}
        onMarkAllRead={handleMarkAllRead}
        allVideos={allVideos}
      />

      {/* Dedicated Full Notification Detail View Modal */}
      <NotificationDetailModal
        notification={selectedNotificationForDetail}
        onClose={() => setSelectedNotificationForDetail(null)}
        language={language}
        onSelectVideo={onSelectVideo}
        allVideos={allVideos}
      />
    </header>
  );
};

