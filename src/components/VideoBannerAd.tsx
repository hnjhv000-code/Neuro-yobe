import React, { useState, useEffect } from 'react';
import { ExternalLink, Sparkles, X } from 'lucide-react';
import { BOTTOM_BANNER_ADS } from '../services/adCatalogue';
import { recordVideoAdImpression } from '../services/firebase';

interface VideoBannerAdProps {
  videoId: string;
}

export const VideoBannerAd: React.FC<VideoBannerAdProps> = ({ videoId }) => {
  const [ad] = useState(() => {
    const idx = Math.floor(Math.random() * BOTTOM_BANNER_ADS.length);
    return BOTTOM_BANNER_ADS[idx];
  });
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Record banner impression once
    recordVideoAdImpression(videoId, 'banner', 1);
  }, [videoId]);

  if (isDismissed) return null;

  return (
    <div className="w-full my-1.5 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-[#091428] via-[#0b1b36] to-[#081224] border border-cyan-800/40 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-300">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Ad Badge */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-[9px] font-black text-amber-300">
            إعلان ممول
          </span>
          <span className="text-[8px] text-slate-500 font-mono mt-0.5">Google AdSense</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
            <p className="font-bold text-slate-200 truncate sm:text-xs text-[11px]">
              {ad.title}
            </p>
          </div>
          <span className="text-[10px] text-cyan-400/80 font-medium truncate block">
            بواسطة: {ad.sponsor}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={ad.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-[11px] shadow-md shadow-cyan-950/60 transition-transform active:scale-95"
        >
          <span>{ad.ctaText}</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1 text-slate-500 hover:text-slate-300 rounded-lg transition-colors"
          title="إغلاق هذا الإعلان"
          aria-label="إغلاق الإعلان"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
