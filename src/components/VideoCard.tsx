import React, { useState, useRef } from 'react';
import { MoreVertical, Clock, DownloadCloud, Share2, Play, Compass, Check, ListPlus } from 'lucide-react';
import { parseVideoUrl } from '../services/embedHelper';
import { getTranslation } from '../services/translations';
import { getShareUrl, copyToClipboard } from '../services/shareHelper';
import { useToast } from './Toast';
import type { VideoItem, Language, UserProfile } from '../types';

interface VideoCardProps {
  video: VideoItem;
  language: Language;
  currentUser: UserProfile | null;
  onSelect: (video: VideoItem) => void;
  onSaveToWatchLater?: (video: VideoItem) => void;
  onAddToPlaylist?: (video: VideoItem) => void;
  onDownload?: (video: VideoItem) => void;
  onOpenAuth: () => void;
  onSelectChannel?: (channelUid: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  language,
  currentUser,
  onSelect,
  onSaveToWatchLater,
  onAddToPlaylist,
  onDownload,
  onOpenAuth,
  onSelectChannel
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();
  const t = (key: string) => getTranslation(language, key);

  const parsed = video.source === 'external' && video.externalUrl ? parseVideoUrl(video.externalUrl) : null;

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 400);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(false);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    const url = getShareUrl('v', video.id);
    await copyToClipboard(url);
    showToast(t('copiedLink'), 'success');
  };

  const handleWatchLaterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (onSaveToWatchLater) onSaveToWatchLater(video);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!video.allowDownload) {
      showToast(t('downloadNotAllowed'), 'error');
      return;
    }
    if (onDownload) onDownload(video);
  };

  return (
    <div
      onClick={() => onSelect(video)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative flex flex-col cursor-pointer rounded-2xl bg-[#091224]/50 border border-cyan-950/40 hover:border-cyan-500/40 p-2.5 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-950/60 hover:-translate-y-1"
    >
      {/* Thumbnail / Hover Preview Container */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 shadow-inner">
        <img
          src={video.thumbnailDataUrl}
          alt={video.title}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            isHovered && video.videoDataUrl ? 'opacity-0' : 'opacity-100'
          }`}
          loading="lazy"
        />

        {/* Video Preview on Hover (soundless preview for direct videos) */}
        {isHovered && video.videoDataUrl && (
          <video
            src={video.videoDataUrl}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Short Indicator or Duration */}
        <div className="absolute bottom-2 end-2 flex items-center gap-1">
          {video.type === 'short' ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-rose-600 to-orange-600 text-[10px] font-bold text-white shadow-md">
              <Compass className="w-3 h-3" />
              Short
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-medium text-slate-200 font-mono">
              {video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : 'فيديو'}
            </span>
          )}
        </div>

        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-cyan-950/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-cyan-500/90 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/40 transform scale-75 group-hover:scale-100 transition-all">
            <Play className="w-5 h-5 fill-current translate-x-0.5" />
          </div>
        </div>
      </div>

      {/* Video Info */}
      <div className="flex gap-3 mt-3 items-start">
        {/* Publisher Avatar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectChannel) onSelectChannel(video.publisherUid);
          }}
          className="shrink-0 group/avatar focus:outline-none"
        >
          <img
            src={video.publisherAvatar}
            alt={video.publisherName}
            className="w-9 h-9 rounded-full object-cover border border-cyan-900/60 group-hover/avatar:border-cyan-400 transition-colors"
          />
        </button>

        {/* Title, Channel, Stats */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-100 line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors">
            {video.title}
          </h3>

          <p
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectChannel) onSelectChannel(video.publisherUid);
            }}
            className="text-xs text-slate-400 hover:text-cyan-400 transition-colors mt-1 truncate"
          >
            {video.publisherName}
          </p>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-medium">
            <span>{video.views || 0} {t('views')}</span>
            <span>•</span>
            <span>{new Date(video.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* 3-Dots Quick Actions Menu */}
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-cyan-950/40 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute end-0 bottom-full mb-2 w-48 bg-[#091224] border border-cyan-900/60 rounded-xl shadow-2xl shadow-black/80 overflow-hidden z-20 backdrop-blur-2xl divide-y divide-cyan-950/60"
            >
              <button
                onClick={handleWatchLaterClick}
                className="w-full text-start px-3.5 py-2.5 text-xs text-slate-300 hover:bg-cyan-950/40 hover:text-cyan-200 transition-colors flex items-center gap-2.5"
              >
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>{t('watchLater')}</span>
              </button>

              {onAddToPlaylist && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    if (!currentUser) {
                      onOpenAuth();
                      return;
                    }
                    onAddToPlaylist(video);
                  }}
                  className="w-full text-start px-3.5 py-2.5 text-xs text-slate-300 hover:bg-cyan-950/40 hover:text-cyan-200 transition-colors flex items-center gap-2.5"
                >
                  <ListPlus className="w-4 h-4 text-cyan-400" />
                  <span>{t('addToPlaylist')}</span>
                </button>
              )}

              {video.allowDownload && (
                <button
                  onClick={handleDownloadClick}
                  className="w-full text-start px-3.5 py-2.5 text-xs text-slate-300 hover:bg-cyan-950/40 hover:text-cyan-200 transition-colors flex items-center gap-2.5"
                >
                  <DownloadCloud className="w-4 h-4 text-cyan-400" />
                  <span>{t('download')}</span>
                </button>
              )}

              <button
                onClick={handleShare}
                className="w-full text-start px-3.5 py-2.5 text-xs text-slate-300 hover:bg-cyan-950/40 hover:text-cyan-200 transition-colors flex items-center gap-2.5"
              >
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>{t('share')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
