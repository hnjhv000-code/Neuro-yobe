import React, { useState } from 'react';
import { Compass, Sparkles, Heart, ExternalLink, X, ZoomIn } from 'lucide-react';
import type { VideoItem, Language, UserProfile } from '../types';
import type { AlgorithmicFeedBlock } from '../services/feedAlgorithms';
import { VideoCard } from './VideoCard';
import { togglePostLike } from '../services/firebase';

interface AlgorithmicFeedProps {
  blocks: AlgorithmicFeedBlock[];
  language: Language;
  currentUser: UserProfile | null;
  onSelectVideo: (video: VideoItem) => void;
  onSaveToWatchLater?: (video: VideoItem) => void;
  onAddToPlaylist?: (video: VideoItem) => void;
  onDownload?: (video: VideoItem) => void;
  onOpenAuth: () => void;
  onSelectChannel: (channelUid: string) => void;
  t: (key: string) => string;
}

export const AlgorithmicFeed: React.FC<AlgorithmicFeedProps> = ({
  blocks,
  language,
  currentUser,
  onSelectVideo,
  onSaveToWatchLater,
  onAddToPlaylist,
  onDownload,
  onOpenAuth,
  onSelectChannel,
  t
}) => {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  if (blocks.length === 0) {
    return (
      <div className="p-16 text-center text-slate-500 text-xs bg-[#091224]/30 rounded-3xl border border-cyan-950">
        {t('noVideosYet')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {blocks.map((block) => {
        // --- BLOCK 1: 3 LONG VIDEOS IN GRID ---
        if (block.type === 'long_videos_chunk') {
          return (
            <div key={block.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {block.videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  language={language}
                  currentUser={currentUser}
                  onSelect={onSelectVideo}
                  onSaveToWatchLater={onSaveToWatchLater}
                  onAddToPlaylist={onAddToPlaylist}
                  onDownload={onDownload}
                  onOpenAuth={onOpenAuth}
                  onSelectChannel={onSelectChannel}
                />
              ))}
            </div>
          );
        }

        // --- BLOCK 2: 4 SHORTS (2x2 GRID) ---
        if (block.type === 'shorts_group') {
          return (
            <div
              key={block.id}
              className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#09152a] via-[#070e1c] to-[#0d1f3d] border border-cyan-900/50 shadow-xl space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-400">
                    <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: '10s' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-100 flex items-center gap-1.5">
                      <span>فيديوهات قصيرة (Shorts)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800/60">
                        2×2
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">مقاطع شورتس سريعة ومميزة</p>
                  </div>
                </div>
              </div>

              {/* 2x2 Grid (2 shorts side by side, 2 rows) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {block.shorts.map((short) => (
                  <div
                    key={short.id}
                    onClick={() => onSelectVideo(short)}
                    className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 border border-cyan-950/80 hover:border-rose-500/80 cursor-pointer shadow-md transition-all hover:scale-[1.03] active:scale-95"
                  >
                    <img
                      src={short.thumbnailDataUrl}
                      alt={short.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-3 flex flex-col justify-end">
                      <span className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-rose-200 transition-colors">
                        {short.title}
                      </span>
                      <div className="flex items-center justify-between text-[10px] text-cyan-300 mt-1">
                        <span>{short.views || 0} مشاهدة</span>
                        <span className="text-slate-400 truncate max-w-[80px]">{short.publisherName}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // --- BLOCK 3: SUBSCRIBED POST ---
        if (block.type === 'subscribed_post') {
          const { post, isSubscribed } = block;
          const hasLiked = currentUser && post.likedUsers && post.likedUsers[currentUser.uid] === 'like';

          return (
            <div
              key={block.id}
              className="p-5 rounded-3xl bg-gradient-to-br from-[#0a172e] to-[#070e1c] border border-cyan-800/50 shadow-lg space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <div
                  onClick={() => onSelectChannel(post.channelUid)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <img
                    src={post.channelAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={post.channelName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-cyan-500/60 group-hover:scale-105 transition-transform"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {post.channelName}
                      </h4>
                      {isSubscribed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          <span>قناة مشترك بها</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                          منشور مجتمعي
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Post Text */}
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {post.text}
              </p>

              {/* Attached Images */}
              {post.images && post.images.length > 0 && (
                <div className={`grid gap-2 rounded-2xl overflow-hidden ${
                  post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                }`}>
                  {post.images.map((imgUrl, i) => (
                    <div
                      key={i}
                      onClick={() => setZoomedImage(imgUrl)}
                      className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden cursor-pointer group border border-cyan-950"
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-cyan-950/80 text-xs">
                <button
                  onClick={async () => {
                    if (!currentUser) {
                      onOpenAuth();
                      return;
                    }
                    await togglePostLike(post.id, currentUser.uid, 'like');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
                    hasLiked
                      ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                      : 'bg-[#070e1c] border-cyan-950 text-slate-400 hover:text-rose-400'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current' : ''}`} />
                  <span>{post.likes || 0}</span>
                </button>

                <button
                  onClick={() => onSelectChannel(post.channelUid)}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:underline font-bold"
                >
                  <span>زيارة القناة</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        }

        return null;
      })}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden border border-cyan-500/60 shadow-2xl bg-black">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 end-3 z-10 p-2 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={zoomedImage} alt="صورة موسعة" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
