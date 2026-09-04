import React, { useState, useRef } from 'react';
import { Compass, Play, Eye } from 'lucide-react';
import type { VideoItem } from '../types';

interface FeedShortsQuadProps {
  shorts: VideoItem[];
  onSelectShort: (short: VideoItem) => void;
  onNavigateToShorts?: () => void;
}

export const FeedShortsQuad: React.FC<FeedShortsQuadProps> = ({
  shorts,
  onSelectShort,
  onNavigateToShorts
}) => {
  const [hoveredShortId, setHoveredShortId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (!shorts || shorts.length === 0) return null;

  const handleMouseEnter = (id: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredShortId(id);
    }, 2); // 0.002s
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredShortId(null);
  };

  const handleTouchStart = (id: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredShortId(id);
    }, 0.1); // 0.0001s
  };

  const handleTouchEnd = () => {
    setTimeout(() => {
      setHoveredShortId(null);
    }, 2500);
  };

  return (
    <div className="my-6 p-3.5 sm:p-5 rounded-3xl bg-gradient-to-br from-[#081122]/90 via-[#060c18]/85 to-[#0b162c]/90 border border-cyan-950/80 shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-950/60">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-100">
                شورتس مميزة (Shorts)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-800/60">
                سريعة
              </span>
            </div>
            <span className="text-[11px] text-slate-400">مقاطع رأسية سريعة وممتعة</span>
          </div>
        </div>

        {onNavigateToShorts && (
          <button
            onClick={onNavigateToShorts}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
          >
            عرض الكل
          </button>
        )}
      </div>

      {/* Grid: Exactly 2 shorts per row (كل 2 شورت جنب بعض) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto sm:max-w-2xl">
        {shorts.map((short) => {
          const isHovered = hoveredShortId === short.id;

          return (
            <div
              key={short.id}
              onClick={() => onSelectShort(short)}
              onMouseEnter={() => handleMouseEnter(short.id)}
              onMouseLeave={handleMouseLeave}
              onTouchStart={() => handleTouchStart(short.id)}
              onTouchEnd={handleTouchEnd}
              className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 border border-cyan-950/70 hover:border-rose-500/70 cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-rose-950/50 transition-all duration-300 hover:scale-[1.02]"
            >
              <img
                src={short.thumbnailDataUrl}
                alt={short.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />

              {/* Soundless preview on hover / touch if videoDataUrl exists */}
              {isHovered && short.videoDataUrl && (
                <video
                  src={short.videoDataUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
                />
              )}

              {/* Top gradient & badge */}
              <div className="absolute top-0 inset-x-0 p-2.5 bg-gradient-to-b from-black/80 via-transparent to-transparent flex items-center justify-between z-20 pointer-events-none">
                <span className="p-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-rose-400">
                  <Play className="w-3 h-3 fill-rose-500 text-rose-500" />
                </span>
                <span className="text-[10px] font-bold text-white/90 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                  <Eye className="w-2.5 h-2.5 text-cyan-400" />
                  <span>{short.views || 0}</span>
                </span>
              </div>

              {/* Bottom gradient with Title & Publisher */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 flex flex-col justify-end z-20 pointer-events-none">
                <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug drop-shadow-md">
                  {short.title}
                </h4>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <img
                    src={short.publisherAvatar}
                    alt=""
                    className="w-4 h-4 rounded-full object-cover border border-cyan-400/60"
                  />
                  <span className="text-[11px] text-slate-300 truncate">
                    {short.publisherName}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
