import React from 'react';
import { Users, Heart, MessageSquare, ExternalLink, CheckCircle2 } from 'lucide-react';
import type { PostItem, UserProfile } from '../types';
import { togglePostLike } from '../services/firebase';

interface FeedSubscribedPostCardProps {
  post: PostItem;
  currentUser: UserProfile | null;
  onSelectChannel: (channelUid: string) => void;
  onOpenAuth: () => void;
}

export const FeedSubscribedPostCard: React.FC<FeedSubscribedPostCardProps> = ({
  post,
  currentUser,
  onSelectChannel,
  onOpenAuth
}) => {
  const isLiked = currentUser && post.likedUsers && post.likedUsers[currentUser.uid] === 'like';

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    togglePostLike(post.id, currentUser.uid, 'like');
  };

  return (
    <div className="my-5 p-4 sm:p-5 rounded-3xl bg-[#091224]/85 border border-cyan-500/30 hover:border-cyan-400/60 shadow-xl shadow-cyan-950/40 transition-all duration-300">
      {/* Subscribed Badge Header */}
      <div className="flex items-center justify-between gap-3 mb-3.5 pb-3 border-b border-cyan-950/80">
        <div className="flex items-center gap-3">
          <img
            src={post.channelAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
            alt=""
            className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400/80 cursor-pointer shadow-md"
            onClick={() => onSelectChannel(post.channelUid)}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span
                onClick={() => onSelectChannel(post.channelUid)}
                className="font-black text-xs sm:text-sm text-slate-100 hover:text-cyan-300 cursor-pointer transition-colors"
              >
                {post.channelName}
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold">
                مشترك في القناة
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              منشور من منشئ المحتوى • {new Date(post.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
            </span>
          </div>
        </div>

        <button
          onClick={() => onSelectChannel(post.channelUid)}
          className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-900/60 transition-all"
        >
          <span>زيارة القناة</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Post Text */}
      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line px-1">
        {post.text}
      </p>

      {/* Post Attached Images if any */}
      {post.images && post.images.length > 0 && (
        <div
          className={`mt-3 rounded-2xl overflow-hidden border border-cyan-950 ${
            post.images.length === 1 ? 'grid grid-cols-1' : 'grid grid-cols-2 gap-2'
          }`}
        >
          {post.images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt=""
              className="w-full max-h-80 object-cover rounded-xl bg-slate-900"
            />
          ))}
        </div>
      )}

      {/* Footer Stats / Actions */}
      <div className="flex items-center gap-4 mt-3.5 pt-3 border-t border-cyan-950/60 text-xs">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
            isLiked
              ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
              : 'bg-[#070e1c] text-slate-300 hover:text-rose-400 border border-cyan-950'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
          <span>{post.likes || 0}</span>
        </button>

        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <MessageSquare className="w-3.5 h-3.5 text-cyan-400/70" />
          <span>{post.commentsCount || 0} تعليق</span>
        </div>
      </div>
    </div>
  );
};
