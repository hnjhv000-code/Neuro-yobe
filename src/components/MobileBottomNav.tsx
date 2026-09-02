import React, { useState } from 'react';
import { Home, Compass, Plus, Tv, User, Upload, PlusSquare, Sparkles, X, Heart } from 'lucide-react';
import { getTranslation } from '../services/translations';
import type { Language, UserProfile } from '../types';

interface MobileBottomNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  currentUser: UserProfile | null;
  language: Language;
  onOpenUpload: () => void;
  onOpenCreatePost: () => void;
  onOpenAuth: () => void;
  onOpenMyChannel: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentRoute,
  onNavigate,
  currentUser,
  language,
  onOpenUpload,
  onOpenCreatePost,
  onOpenAuth,
  onOpenMyChannel
}) => {
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const t = (key: string) => getTranslation(language, key);

  return (
    <>
      {/* Quick Action Drawer / Bottom Sheet for (+) Create */}
      {showCreateMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end sm:hidden animate-in fade-in duration-200"
          onClick={() => setShowCreateMenu(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[#091224] border-t border-cyan-900/60 rounded-t-3xl p-5 pb-8 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-300"
          >
            <div className="flex items-center justify-between border-b border-cyan-950 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-slate-100">{t('createNewContent')}</h3>
              </div>
              <button
                onClick={() => setShowCreateMenu(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Upload Video / Short */}
              <button
                onClick={() => {
                  setShowCreateMenu(false);
                  if (!currentUser) onOpenAuth();
                  else onOpenUpload();
                }}
                className="w-full p-4 rounded-2xl bg-[#0b162c] hover:bg-cyan-950/60 border border-cyan-900/40 flex items-center gap-3.5 text-start transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-950 flex items-center justify-center text-cyan-300 border border-cyan-800">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-100">{t('upload')}</h4>
                  <p className="text-xs text-slate-400">{t('uploadVideoSubtitle')}</p>
                </div>
              </button>

              {/* Create Post */}
              <button
                onClick={() => {
                  setShowCreateMenu(false);
                  if (!currentUser) onOpenAuth();
                  else onOpenCreatePost();
                }}
                className="w-full p-4 rounded-2xl bg-[#0b162c] hover:bg-cyan-950/60 border border-cyan-900/40 flex items-center gap-3.5 text-start transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-950 flex items-center justify-center text-indigo-300 border border-indigo-800">
                  <PlusSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-100">{t('createPost')}</h4>
                  <p className="text-xs text-slate-400">{t('createPostSubtitle')}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Sticky Mobile Bottom Bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-[#070e1c]/95 backdrop-blur-xl border-t border-cyan-900/40 sm:hidden flex items-center justify-around px-2 py-1.5 h-16 transition-colors shadow-2xl select-none"
        aria-label="Mobile Navigation"
      >
        {/* 1. Home */}
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentRoute === 'home' ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 ${currentRoute === 'home' ? 'text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]' : ''}`} />
          <span className="text-[10px] mt-1 truncate">{t('home')}</span>
        </button>

        {/* 2. Shorts */}
        <button
          onClick={() => onNavigate('shorts')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentRoute === 'shorts' ? 'text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className={`w-5 h-5 ${currentRoute === 'shorts' ? 'text-rose-400 drop-shadow-[0_0_8px_#f43f5e]' : ''}`} />
          <span className="text-[10px] mt-1 truncate">{t('shorts')}</span>
        </button>

        {/* 3. Central Plus (+) Action Button */}
        <button
          onClick={() => setShowCreateMenu(true)}
          className="flex items-center justify-center -mt-4 w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 text-white shadow-lg shadow-cyan-900/70 border-2 border-[#070e1c] active:scale-95 transition-all"
          aria-label="Create Content"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* 4. Subscriptions */}
        <button
          onClick={() => onNavigate('subscriptions')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentRoute === 'subscriptions' ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tv className={`w-5 h-5 ${currentRoute === 'subscriptions' ? 'text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]' : ''}`} />
          <span className="text-[10px] mt-1 truncate">{t('subscriptions')}</span>
        </button>

        {/* 5. You / Profile / Library */}
        <button
          onClick={() => {
            if (!currentUser) {
              onOpenAuth();
            } else {
              onOpenMyChannel();
            }
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentRoute === 'channel' ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {currentUser ? (
            <img
              src={currentUser.avatarUrl}
              alt=""
              className="w-5 h-5 rounded-full object-cover border border-cyan-400"
            />
          ) : (
            <User className="w-5 h-5" />
          )}
          <span className="text-[10px] mt-1 truncate">{currentUser ? t('you') : t('login')}</span>
        </button>
      </nav>
    </>
  );
};
