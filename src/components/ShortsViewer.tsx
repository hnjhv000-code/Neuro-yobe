import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Volume2,
  VolumeX,
  Heart,
  X,
  Send,
  Trash2,
  HardDrive,
  ShieldCheck
} from 'lucide-react';
import { parseVideoUrl } from '../services/embedHelper';
import { getDriveEmbedUrl } from '../services/googleDrive';
import {
  incrementVideoViews,
  toggleVideoLike,
  subscribeToComments,
  addComment,
  deleteComment,
  toggleSubscription,
  addToWatchHistory,
  logUserActivity,
  recordVisitorWatchedVideo
} from '../services/firebase';
import { getVideoBlobUrl } from '../services/mediaStorage';
import { useReactionBurst, ReactionBurstOverlay } from './ReactionBurst';
import { getTranslation } from '../services/translations';
import { getShareUrl, copyToClipboard } from '../services/shareHelper';
import { useToast } from './Toast';
import type { VideoItem, CommentItem, UserProfile, Language, SubscriptionItem } from '../types';

interface ShortsViewerProps {
  shorts: VideoItem[];
  currentUser: UserProfile | null;
  language: Language;
  subscriptions: SubscriptionItem[];
  onOpenAuth: () => void;
  onSelectChannel?: (channelUid: string) => void;
}

export const ShortsViewer: React.FC<ShortsViewerProps> = ({
  shorts,
  currentUser,
  language,
  subscriptions,
  onOpenAuth,
  onSelectChannel
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [heartCoords, setHeartCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState('');
  const [localBlobUrls, setLocalBlobUrls] = useState<Record<string, string>>({});

  // Floating reaction burst for likes and dislikes
  const { particles: shortsParticles, triggerBurst: triggerShortsBurst } = useReactionBurst();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const lastTapRef = useRef<number>(0);

  const { showToast } = useToast();
  const t = (key: string) => getTranslation(language, key);

  const currentShort = shorts[currentIndex];

  // Subscribe to comments for active short
  useEffect(() => {
    if (!currentShort) return;
    const unsub = subscribeToComments(currentShort.id, (list) => {
      setComments(list);
    });
    return () => unsub();
  }, [currentShort?.id]);

  // Load blob for local files
  useEffect(() => {
    shorts.forEach((s) => {
      if (s.fileBlobKey && !localBlobUrls[s.id]) {
        getVideoBlobUrl(s.fileBlobKey).then((url) => {
          if (url) {
            setLocalBlobUrls((prev) => ({ ...prev, [s.id]: url }));
          }
        });
      }
    });
  }, [shorts]);

  // Track view and history
  useEffect(() => {
    if (currentShort) {
      incrementVideoViews(currentShort.id);
      recordVisitorWatchedVideo(
        currentShort.id,
        currentShort.title,
        'short',
        currentShort.thumbnailDataUrl,
        5,
        currentUser
      );
      if (currentUser) {
        addToWatchHistory(currentUser.uid, currentShort);
        logUserActivity(currentUser, 'watch', `شاهد شورت: ${currentShort.title}`);
      }
    }
  }, [currentIndex, currentShort?.id, currentUser?.uid]);

  const handleNext = () => {
    if (currentIndex < shorts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        handleNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        handlePrev();
      } else if (e.key === 'm') {
        setIsMuted((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, shorts.length]);

  const handleDoubleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (now - lastTapRef.current < 350) {
      // Double tap registered!
      setHeartCoords({ x, y });
      setShowHeartAnim(true);
      triggerShortsBurst('like');
      setTimeout(() => setShowHeartAnim(false), 900);

      if (currentUser && currentShort) {
        toggleVideoLike(currentShort.id, currentUser.uid, 'like');
      } else if (!currentUser) {
        onOpenAuth();
      }
    }
    lastTapRef.current = now;
  };

  const handleLike = async (type: 'like' | 'dislike') => {
    triggerShortsBurst(type);
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!currentShort) return;
    await toggleVideoLike(currentShort.id, currentUser.uid, type);
  };

  const handleSubscribe = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!currentShort) return;
    if (currentUser.uid === currentShort.publisherUid) {
      showToast('لا يمكنك الاشتراك في قناتك', 'info');
      return;
    }
    await toggleSubscription(currentUser, {
      uid: currentShort.publisherUid,
      name: currentShort.publisherName,
      avatar: currentShort.publisherAvatar
    });
  };

  const handleShare = async () => {
    if (!currentShort) return;
    const url = getShareUrl('v', currentShort.id);
    await copyToClipboard(url);
    showToast(t('copiedLink'), 'success');
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!commentText.trim() || !currentShort) return;
    await addComment({
      targetId: currentShort.id,
      targetType: 'video',
      userUid: currentUser.uid,
      userName: currentUser.username,
      userAvatar: currentUser.avatarUrl,
      text: commentText.trim(),
      likes: 0,
      dislikes: 0,
      createdAt: Date.now()
    });
    setCommentText('');
    showToast('تم نشر التعليق', 'success');
  };

  if (shorts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-full bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 mb-4">
          <Heart className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">لا توجد مقاطع Shorts منشورة بعد</h2>
        <p className="text-sm text-slate-400 mt-2">كن أول من ينشر شورت رائع على Yassa Tube!</p>
      </div>
    );
  }

  const isSubscribed = currentShort && subscriptions.some((s) => s.channelUid === currentShort.publisherUid);
  const userLikedStatus = currentUser && currentShort?.likedUsers ? currentShort.likedUsers[currentUser.uid] : null;

  // Google Drive video detection & secure embed URL resolution
  const isGoogleDrive = currentShort && (currentShort.source === 'google_drive' || !!currentShort.driveFileId || (currentShort.externalUrl ? (currentShort.externalUrl.includes('drive.google.com') || currentShort.externalUrl.includes('docs.google.com')) : false));
  const driveEmbedUrl = currentShort?.driveFileId
    ? getDriveEmbedUrl(currentShort.driveFileId)
    : (currentShort?.externalUrl && (currentShort.externalUrl.includes('drive.google.com') || currentShort.externalUrl.includes('docs.google.com'))
        ? parseVideoUrl(currentShort.externalUrl).embedUrl
        : null);

  const parsed = isGoogleDrive && driveEmbedUrl
    ? { isEmbed: true, embedUrl: driveEmbedUrl, provider: 'googledrive' as const }
    : (currentShort?.source === 'external' && currentShort.externalUrl ? parseVideoUrl(currentShort.externalUrl) : null);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden bg-black py-2">
      {/* Navigation Arrows for Tablet & Desktop */}
      <div className="hidden sm:flex flex-col gap-4 absolute end-6 top-1/2 -translate-y-1/2 z-30">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-3.5 rounded-full bg-[#091224]/80 hover:bg-cyan-950 border border-cyan-900/60 disabled:opacity-30 text-white shadow-xl backdrop-blur-xl transition-all"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === shorts.length - 1}
          className="p-3.5 rounded-full bg-[#091224]/80 hover:bg-cyan-950 border border-cyan-900/60 disabled:opacity-30 text-white shadow-xl backdrop-blur-xl transition-all"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>

      {/* Main Short Reel Container */}
      <div
        ref={containerRef}
        onClick={handleDoubleTap}
        onContextMenu={(e) => {
          if (isGoogleDrive) {
            e.preventDefault();
            showToast('حماية المحتوى: تم حظر الوصول للرابط أو التنزيل', 'info');
          }
        }}
        className="relative h-full aspect-[9/16] max-h-[820px] rounded-3xl overflow-hidden bg-[#070e1c] border border-cyan-900/40 shadow-2xl shadow-cyan-950/80 flex items-center justify-center select-none"
      >
        {/* Video / Iframe */}
        {parsed && parsed.isEmbed && parsed.embedUrl ? (
          <div className="relative w-full h-full">
            <iframe
              src={parsed.embedUrl}
              title={currentShort.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full object-cover border-0"
            />
            {/* Anti-Popout Protective Overlay for Google Drive: Prevents clicking "Open in new window" button */}
            {isGoogleDrive && (
              <>
                <div
                  className="absolute top-0 end-0 h-14 w-16 z-20 cursor-default select-none pointer-events-auto bg-transparent"
                  title="مشغل محمي - تم حظر فتح أو مشاركة رابط جوجل درايف المباشر"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showToast('تم حظر فتح أو مشاركة رابط جوجل درايف المباشر لحماية حقوق الناشر', 'info');
                  }}
                />
                <div className="absolute top-4 end-4 z-10 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#050a14]/85 backdrop-blur-md border border-cyan-500/40 text-[10px] text-cyan-300 font-bold shadow-lg">
                  <HardDrive className="w-3 h-3 text-cyan-400" />
                  <span>Google Drive محمي</span>
                </div>
              </>
            )}
          </div>
        ) : (
          <video
            src={localBlobUrls[currentShort.id] || currentShort.videoDataUrl || (parsed ? parsed.directUrl : '') || currentShort.thumbnailDataUrl}
            autoPlay
            loop
            playsInline
            muted={isMuted}
            poster={currentShort.thumbnailDataUrl}
            className="w-full h-full object-cover"
          />
        )}

        {/* Double-Tap Heart Animation */}
        {showHeartAnim && (
          <div
            style={{ left: heartCoords.x, top: heartCoords.y }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-40 animate-ping duration-700"
          >
            <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.9)]" />
          </div>
        )}

        {/* Top Sound Control */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted(!isMuted);
          }}
          className="absolute top-4 start-4 z-30 p-2.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 hover:scale-110 transition-all"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
        </button>

        {/* Right Interaction Rail */}
        <div className="absolute end-3 bottom-20 z-30 flex flex-col items-center gap-4 relative">
          <ReactionBurstOverlay particles={shortsParticles} />
          {/* Like */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLike('like');
            }}
            className="flex flex-col items-center gap-1 group"
          >
            <div
              className={`p-3 rounded-full backdrop-blur-xl border transition-all ${
                userLikedStatus === 'like'
                  ? 'bg-cyan-500 text-black border-cyan-300 shadow-[0_0_15px_#06b6d4]'
                  : 'bg-black/60 text-white border-white/20 group-hover:bg-cyan-950'
              }`}
            >
              <ThumbsUp className="w-5 h-5" />
            </div>
            {currentShort.showLikesCount && (
              <span className="text-xs font-bold text-white drop-shadow-md">{currentShort.likes || 0}</span>
            )}
          </button>

          {/* Dislike */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLike('dislike');
            }}
            className="flex flex-col items-center gap-1 group"
          >
            <div
              className={`p-3 rounded-full backdrop-blur-xl border transition-all ${
                userLikedStatus === 'dislike'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_15px_#f43f5e]'
                  : 'bg-black/60 text-white border-white/20 group-hover:bg-rose-950'
              }`}
            >
              <ThumbsDown className="w-5 h-5" />
            </div>
          </button>

          {/* Comments */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(true);
            }}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-3 rounded-full bg-black/60 text-white border border-white/20 group-hover:bg-cyan-950 backdrop-blur-xl transition-all">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white drop-shadow-md">{comments.length}</span>
          </button>

          {/* Share */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="p-3 rounded-full bg-black/60 text-white border border-white/20 hover:bg-cyan-950 backdrop-blur-xl transition-all"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Overlay: Publisher & Title */}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20 flex flex-col gap-2">
          {/* Publisher */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectChannel) onSelectChannel(currentShort.publisherUid);
              }}
            >
              <img
                src={currentShort.publisherAvatar}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-cyan-400/60"
              />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectChannel) onSelectChannel(currentShort.publisherUid);
              }}
              className="text-xs font-bold text-white hover:text-cyan-300 drop-shadow"
            >
              @{currentShort.publisherName}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSubscribe();
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold shadow-md transition-all ${
                isSubscribed
                  ? 'bg-slate-700/80 text-slate-300'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
              }`}
            >
              {isSubscribed ? t('subscribed') : t('subscribe')}
            </button>
          </div>

          {/* Caption */}
          <p className="text-xs text-slate-100 font-medium line-clamp-2 drop-shadow">
            {currentShort.title}
          </p>
        </div>
      </div>

      {/* Slide-over Comments Drawer */}
      {showComments && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-y-0 end-0 w-full sm:w-96 bg-[#070e1c]/95 border-s border-cyan-900/60 shadow-2xl backdrop-blur-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300"
        >
          <div className="p-4 border-b border-cyan-950 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-100">{t('comments')} ({comments.length})</h3>
            <button
              onClick={() => setShowComments(false)}
              className="p-1 text-slate-400 hover:text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">{t('writeAComment')}</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="p-2.5 rounded-xl bg-[#091224]/60 border border-cyan-950 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={c.userAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                      <span className="font-bold text-slate-200">{c.userName}</span>
                    </div>
                    {currentUser?.uid === c.userUid && (
                      <button
                        onClick={() => deleteComment(c.id, currentShort.id, 'video')}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-slate-300 mt-1 ps-7">{c.text}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddComment} className="p-3 border-t border-cyan-950 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('writeAComment')}
              className="flex-1 bg-[#091224] border border-cyan-900 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="px-3.5 py-2 bg-cyan-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
