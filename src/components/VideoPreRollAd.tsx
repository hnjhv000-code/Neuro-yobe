import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, ExternalLink, SkipForward } from 'lucide-react';
import { PRE_ROLL_ADS, type VideoAdCreative } from '../services/adCatalogue';
import { recordVideoAdImpression } from '../services/firebase';

interface VideoPreRollAdProps {
  videoId: string;
  onAdFinished: () => void;
}

export const VideoPreRollAd: React.FC<VideoPreRollAdProps> = ({ videoId, onAdFinished }) => {
  const [ad] = useState<VideoAdCreative>(() => {
    const idx = Math.floor(Math.random() * PRE_ROLL_ADS.length);
    return PRE_ROLL_ADS[idx];
  });

  const [secondsRemaining, setSecondsRemaining] = useState(ad.durationSeconds);
  const [secondsWatched, setSecondsWatched] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [skipCountdown, setSkipCountdown] = useState(ad.skippableAfterSeconds);
  const [isMuted, setIsMuted] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsWatched((prev) => prev + 1);

      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });

      if (ad.skippableAfterSeconds > 0) {
        setSkipCountdown((prev) => {
          if (prev <= 1) {
            setCanSkip(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [ad]);

  const handleFinish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    recordVideoAdImpression(videoId, 'preRoll', secondsWatched + 1);
    onAdFinished();
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canSkip && ad.skippableAfterSeconds > 0) return;
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    recordVideoAdImpression(videoId, 'preRoll', secondsWatched);
    onAdFinished();
  };

  const handleOpenAdWebsite = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(ad.websiteUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="absolute inset-0 z-40 bg-black flex flex-col justify-between select-none overflow-hidden animate-in fade-in duration-300">
      {/* Background Ad Video Clip or Motion Canvas */}
      {ad.videoUrl ? (
        <video
          ref={videoRef}
          src={ad.videoUrl}
          autoPlay
          playsInline
          muted={isMuted}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          onEnded={handleFinish}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950 via-slate-950 to-blue-950 flex items-center justify-center">
          <div className="text-center p-6 space-y-3">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-black text-xs border border-cyan-500/40">
              {ad.badgeText}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">{ad.title}</h2>
            <p className="text-xs text-slate-300 font-mono">{ad.displayUrl}</p>
          </div>
        </div>
      )}

      {/* Dark gradient vignettes for contrast */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 p-3 sm:p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-black text-[11px] shadow-md tracking-wider">
            إعلان Ad
          </span>
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <img
              src={ad.advertiserAvatar}
              alt=""
              className="w-5 h-5 rounded-full object-cover border border-cyan-400"
            />
            <span className="text-xs font-bold text-white drop-shadow">
              {ad.advertiser}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mute / Unmute Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-transform active:scale-95"
            title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom Bar: Action CTA and Skip Button */}
      <div className="relative z-10 p-3 sm:p-4 flex flex-wrap items-end justify-between gap-3">
        {/* Advertiser link call to action */}
        <button
          type="button"
          onClick={handleOpenAdWebsite}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-950/60 backdrop-blur-md transition-all active:scale-95"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>زيارة موقع المعلن</span>
          <span className="font-mono text-[10px] opacity-80 border-r border-slate-900/40 pr-2">
            {ad.displayUrl}
          </span>
        </button>

        {/* Skip or Countdown Indicator */}
        <div className="flex items-center gap-2">
          {ad.skippableAfterSeconds > 0 ? (
            canSkip ? (
              <button
                type="button"
                onClick={handleSkip}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/90 hover:bg-white text-slate-900 font-extrabold text-xs shadow-xl backdrop-blur-md border border-slate-200 transition-all active:scale-95 animate-pulse"
              >
                <span>تخطي الإعلان</span>
                <SkipForward className="w-4 h-4 fill-slate-900" />
              </button>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-slate-200 text-xs font-bold font-mono">
                يمكن تخطي الإعلان خلال {skipCountdown} ثوانٍ
              </div>
            )
          ) : (
            <div className="px-3.5 py-2 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-slate-200 text-xs font-bold font-mono">
              ينتهي الإعلان خلال {secondsRemaining} ثوانٍ
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
