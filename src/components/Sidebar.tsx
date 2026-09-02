import React from 'react';
import {
  Home,
  Compass,
  Tv,
  History,
  ThumbsUp,
  Clock,
  DownloadCloud,
  ListMusic,
  Users2,
  HelpCircle,
  Info,
  ShieldCheck,
  Code2,
  LogIn,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { getTranslation } from '../services/translations';
import type { Language, UserProfile } from '../types';

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  language: Language;
  isOpen: boolean;
  onClose?: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenDeveloper: () => void;
  isDarkTheme?: boolean;
  onThemeToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  language,
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  onOpenDeveloper,
  isDarkTheme = true,
  onThemeToggle
}) => {
  const t = (key: string) => getTranslation(language, key);

  const handleItemClick = (routeId: string) => {
    if (onClose && window.innerWidth < 640) {
      onClose();
    }
    onNavigate(routeId);
  };

  const mainNavItems = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'shorts', label: t('shorts'), icon: Compass },
    { id: 'subscriptions', label: t('subscriptions'), icon: Tv },
  ];

  const libraryNavItems = [
    { id: 'history', label: t('history'), icon: History },
    { id: 'liked', label: t('likedVideos'), icon: ThumbsUp },
    { id: 'saved', label: t('watchLater'), icon: Clock },
    { id: 'downloads', label: t('downloads'), icon: DownloadCloud },
    { id: 'playlists', label: t('playlists'), icon: ListMusic },
    { id: 'community', label: t('community'), icon: Users2 },
  ];

  const bottomNavItems = [
    { id: 'support', label: t('support'), icon: HelpCircle },
    { id: 'about', label: t('aboutUs'), icon: Info },
    { id: 'privacy', label: t('privacy'), icon: ShieldCheck },
  ];

  return (
    <>
      {/* Backdrop overlay on mobile when sidebar is opened */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm sm:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 start-0 z-40 sm:z-30 flex flex-col bg-[#070e1c]/98 sm:bg-[#070e1c]/95 backdrop-blur-2xl border-e border-cyan-900/30 transition-all duration-300 overflow-y-auto ${
          isOpen
            ? 'w-72 sm:w-64 px-3 py-4 translate-x-0'
            : '-translate-x-full sm:translate-x-0 w-0 sm:w-20 px-0 sm:px-2 py-4'
        }`}
      >
        {/* Mobile Close button header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-cyan-950 sm:hidden">
          <span className="font-bold text-sm text-cyan-300">{t('mainMenu')}</span>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Routes */}
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 via-sky-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-950/40 font-bold'
                    : 'text-slate-300 hover:bg-cyan-950/40 hover:text-white'
                } ${!isOpen && 'sm:justify-center'}`}
                title={!isOpen ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                {(isOpen || window.innerWidth < 640) && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        <hr className="my-3 border-cyan-950/60" />

        {/* Library Routes */}
        <div className="space-y-1">
          {isOpen && (
            <h4 className="px-3 text-[11px] font-bold text-cyan-400/80 uppercase tracking-wider mb-2">
              {t('library')}
            </h4>
          )}
          {libraryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!currentUser && ['history', 'liked', 'saved', 'playlists'].includes(item.id)) {
                    if (onClose && window.innerWidth < 640) onClose();
                    onOpenAuth();
                  } else {
                    handleItemClick(item.id);
                  }
                }}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 via-sky-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-950/40 font-bold'
                    : 'text-slate-300 hover:bg-cyan-950/40 hover:text-white'
                } ${!isOpen && 'sm:justify-center'}`}
                title={!isOpen ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                {(isOpen || window.innerWidth < 640) && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        <hr className="my-3 border-cyan-950/60" />

        {/* Info & Support Routes */}
        <div className="space-y-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'text-cyan-300 font-bold bg-cyan-950/30'
                    : 'text-slate-400 hover:bg-cyan-950/30 hover:text-slate-200'
                } ${!isOpen && 'sm:justify-center'}`}
                title={!isOpen ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {(isOpen || window.innerWidth < 640) && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Guest Call to action inside sidebar if not logged in */}
        {!currentUser && isOpen && (
          <div className="mt-auto pt-4 p-3 bg-gradient-to-br from-cyan-950/40 via-blue-950/30 to-indigo-950/40 border border-cyan-800/40 rounded-2xl">
            <p className="text-xs text-slate-300 font-semibold mb-2 leading-relaxed">
              {t('sidebarGuestPrompt')}
            </p>
            <button
              onClick={() => {
                if (onClose && window.innerWidth < 640) onClose();
                onOpenAuth();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-950/60"
            >
              <LogIn className="w-4 h-4" />
              <span>{t('login')}</span>
            </button>
          </div>
        )}

        {/* Theme & Developer shortcuts */}
        {isOpen && (
          <div className="mt-2 pt-2 border-t border-cyan-950/60 flex flex-col gap-1">
            {onThemeToggle && (
              <button
                onClick={onThemeToggle}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40 rounded-xl transition-colors"
              >
                {isDarkTheme ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{t('lightTheme')}</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-cyan-500 shrink-0" />
                    <span>{t('darkTheme')}</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => {
                if (onClose && window.innerWidth < 640) onClose();
                onOpenDeveloper();
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs text-cyan-400/80 hover:text-cyan-300 hover:bg-cyan-950/40 rounded-xl transition-colors"
            >
              <Code2 className="w-4 h-4 shrink-0" />
              <span>لوحة تحكم المطور</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

