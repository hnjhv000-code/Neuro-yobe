import React, { useState } from 'react';
import { Megaphone, X, Sparkles, ZoomIn } from 'lucide-react';
import type { DeveloperSettings } from '../types';

interface CosmicSiteNoticeProps {
  settings?: DeveloperSettings;
}

export const CosmicSiteNotice: React.FC<CosmicSiteNoticeProps> = ({ settings }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);

  if (!settings?.siteNotice || isDismissed) {
    return null;
  }

  const anim = settings.siteNoticeAnimation || 'cosmic-pulse';

  // Animation and visual theme mapping
  const getAnimationClass = () => {
    switch (anim) {
      case 'aurora':
        return 'bg-gradient-to-r from-teal-900/95 via-cyan-900/95 to-indigo-900/95 border-cyan-400/50 shadow-cyan-950/50';
      case 'neon-glow':
        return 'bg-[#071329]/95 border-cyan-400 shadow-lg shadow-cyan-500/20';
      case 'floating':
        return 'bg-gradient-to-r from-blue-950/95 via-slate-900/95 to-indigo-950/95 border-blue-500/40 animate-pulse';
      case 'shimmer':
        return 'bg-gradient-to-r from-cyan-950/95 via-slate-900/95 to-blue-950/95 border-cyan-500/50';
      case 'bounce-soft':
        return 'bg-gradient-to-r from-indigo-950/95 via-purple-950/95 to-cyan-950/95 border-indigo-400/40';
      case 'gradient-wave':
        return 'bg-gradient-to-r from-cyan-900/90 via-sky-900/90 to-blue-900/90 border-cyan-400/50';
      case 'cosmic-pulse':
      default:
        return 'bg-gradient-to-r from-cyan-950/95 via-blue-950/95 to-purple-950/95 border-cyan-500/40 shadow-md';
    }
  };

  return (
    <>
      <div
        className={`relative z-30 border-b px-4 py-2.5 transition-all duration-300 text-xs text-slate-100 ${getAnimationClass()}`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Main Notice Content */}
          <div className="flex items-center gap-3 min-w-0 flex-1 justify-center sm:justify-start">
            <div className="p-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shrink-0">
              <Megaphone className="w-4 h-4 animate-bounce" />
            </div>

            {/* Optional Attached Picture */}
            {settings.siteNoticeImageUrl && (
              <div
                onClick={() => setShowImageZoom(true)}
                className="relative group cursor-pointer shrink-0 rounded-lg overflow-hidden border border-cyan-400/60 shadow-md hover:scale-105 transition-transform"
                title="اضغط لتكبير الصورة"
              >
                <img
                  src={settings.siteNoticeImageUrl}
                  alt="مرفق التنبيه"
                  className="w-9 h-9 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <ZoomIn className="w-3 h-3 text-white" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-extrabold text-cyan-200 tracking-wide text-xs sm:text-sm">
                {settings.siteNotice}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin shrink-0 hidden sm:inline" style={{ animationDuration: '6s' }} />
            </div>
          </div>

          {/* Dismiss Button (X) */}
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0"
            title="إخفاء هذا التنبيه"
            aria-label="إخفاء التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {showImageZoom && settings.siteNoticeImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowImageZoom(false)}
        >
          <div className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden border border-cyan-500/50 shadow-2xl bg-black">
            <button
              onClick={() => setShowImageZoom(false)}
              className="absolute top-3 end-3 z-10 p-2 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={settings.siteNoticeImageUrl}
              alt="صورة التنبيه الموسعة"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};
