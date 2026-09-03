import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  ThumbsUp,
  ThumbsDown,
  Share2,
  DownloadCloud,
  Clock,
  Bell,
  BellRing,
  Send,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  Check,
  CornerDownLeft,
  Pin,
  Flame,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  ArrowRight,
  Bookmark,
  Layers,
  Timer,
  Flag,
  ShieldAlert,
  SkipBack,
  SkipForward,
  ListMusic,
  HardDrive,
  ShieldCheck
} from 'lucide-react';
import { parseVideoUrl } from '../services/embedHelper';
import { getDriveEmbedUrl } from '../services/googleDrive';
import { useReactionBurst, ReactionBurstOverlay } from './ReactionBurst';
import {
  incrementVideoViews,
  recordVideoWatchTime,
  toggleVideoLike,
  subscribeToComments,
  addComment,
  deleteComment,
  updateCommentText,
  togglePinComment,
  toggleSubscription,
  setSubscriptionNotification,
  addToWatchHistory,
  toggleSaveToWatchLater,
  recordDownload,
  logUserActivity,
  sendNotification,
  submitComplaintReport,
  recordVisitorWatchedVideo
} from '../services/firebase';
import {
  extractChaptersFromDescription,
  renderTextWithClickableTimestamps,
  formatSecondsToTimeString,
  formatWatchHours,
  VideoChapter
} from '../services/timestampHelper';
import { getVideoBlobUrl } from '../services/mediaStorage';
import { getTranslation } from '../services/translations';
import { getShareUrl, copyToClipboard } from '../services/shareHelper';
import { useToast } from './Toast';
import type { VideoItem, CommentItem, UserProfile, Language, SubscriptionItem } from '../types';

interface VideoPlayerModalProps {
  video: VideoItem;
  allVideos: VideoItem[];
  currentUser: UserProfile | null;
  language: Language;
  subscriptions: SubscriptionItem[];
  playlistVideos?: VideoItem[];
  playlistTitle?: string;
  currentPlaylistIndex?: number;
  onNavigatePlaylist?: (index: number) => void;
  onClose: () => void;
  onSelectVideo: (video: VideoItem) => void;
  onOpenAuth: () => void;
  onSelectChannel?: (channelUid: string) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  allVideos,
  currentUser,
  language,
  subscriptions,
  playlistVideos,
  playlistTitle,
  currentPlaylistIndex,
  onNavigatePlaylist,
  onClose,
  onSelectVideo,
  onOpenAuth,
  onSelectChannel
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyToComment, setReplyToComment] = useState<CommentItem | null>(null);
  const [replyTargetUser, setReplyTargetUser] = useState<string>('');
  const [replyTargetUserUid, setReplyTargetUserUid] = useState<string>('');
  const [replyText, setReplyText] = useState('');
  const [visibleRepliesCountMap, setVisibleRepliesCountMap] = useState<Record<string, number>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);

  // Floating reaction burst hook for like/dislike
  const { particles: likeBurstParticles, triggerBurst: triggerLikeBurst } = useReactionBurst();

  // Playlist drawer state
  const [isPlaylistDrawerOpen, setIsPlaylistDrawerOpen] = useState(true);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('محتوى غير لائق أو مخالف');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Video Player state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [hoverTimelineTime, setHoverTimelineTime] = useState<number | null>(null);
  const [hoverChapter, setHoverChapter] = useState<VideoChapter | null>(null);
  const [hoverPositionX, setHoverPositionX] = useState<number>(0);

  // Watch Time tracking state
  const [sessionWatchedSeconds, setSessionWatchedSeconds] = useState(0);
  const unsavedSecondsRef = useRef(0);
  const hasCountedViewRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const { showToast } = useToast();
  const t = (key: string) => getTranslation(language, key);

  const isVideoPublisher = currentUser?.uid === video.publisherUid;

  // Check subscription status
  const isSubscribed = subscriptions.some((s) => s.channelUid === video.publisherUid);
  const currentSub = subscriptions.find((s) => s.channelUid === video.publisherUid);
  const notificationsOn = currentSub?.notificationsEnabled ?? true;

  // Check user like status
  const userLikedStatus = currentUser && video.likedUsers ? video.likedUsers[currentUser.uid] : null;

  // Extract chapters from description
  const chapters = useMemo(() => {
    return extractChaptersFromDescription(video.description || '');
  }, [video.description]);

  // Current active chapter based on video currentTime
  const currentActiveChapter = useMemo(() => {
    if (chapters.length === 0) return null;
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentTime >= chapters[i].seconds) {
        return chapters[i];
      }
    }
    return chapters[0];
  }, [chapters, currentTime]);

  // Flush unsaved watch time to Firebase
  const flushWatchTime = useCallback(() => {
    if (unsavedSecondsRef.current > 0) {
      const secondsToSave = unsavedSecondsRef.current;
      unsavedSecondsRef.current = 0;
      recordVideoWatchTime(
        video.id,
        secondsToSave,
        currentUser?.uid,
        video.publisherUid
      );
    }
  }, [video.id, currentUser?.uid, video.publisherUid]);

  // 1. View count & watch history initialization
  useEffect(() => {
    // Reset view counted state for this specific video instance
    hasCountedViewRef.current = false;
    setSessionWatchedSeconds(0);
    unsavedSecondsRef.current = 0;

    if (currentUser) {
      addToWatchHistory(currentUser.uid, video);
      logUserActivity(currentUser, 'watch', `شاهد الفيديو: ${video.title}`);
    }

    return () => {
      // Flush accumulated watch time on component unmount or video change
      flushWatchTime();
    };
  }, [video.id, currentUser?.uid, video.publisherUid, flushWatchTime]);

  // 2. Watch duration timer: runs only when isPlaying is TRUE
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isPlaying) {
      interval = setInterval(() => {
        setSessionWatchedSeconds((prev) => {
          const next = prev + 1;

          // CRITICAL USER DIRECTIVE:
          // A view is ONLY counted when the viewer stays in the video for AT LEAST 15 full seconds of active watch time!
          // If the viewer is the publisher watching their own video, it is NEVER counted as a view.
          if (next >= 15 && !hasCountedViewRef.current) {
            const isSelfView = currentUser?.uid && video.publisherUid && currentUser.uid === video.publisherUid;
            if (!isSelfView) {
              hasCountedViewRef.current = true;
              incrementVideoViews(video.id, currentUser?.uid, video.publisherUid);
              recordVisitorWatchedVideo(
                video.id,
                video.title,
                video.type,
                video.thumbnailDataUrl,
                15,
                currentUser
              );
            }
          }

          return next;
        });

        unsavedSecondsRef.current += 1;

        // Auto-flush accumulated watch time to server every 15 seconds of active playback
        if (unsavedSecondsRef.current >= 15) {
          flushWatchTime();
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, flushWatchTime, currentUser, video.id, video.publisherUid, video.title, video.type, video.thumbnailDataUrl]);

  // Load IndexedDB blob if local file
  useEffect(() => {
    let active = true;
    if (video.fileBlobKey) {
      getVideoBlobUrl(video.fileBlobKey).then((url) => {
        if (active && url) setLocalBlobUrl(url);
      });
    }
    return () => {
      active = false;
    };
  }, [video.fileBlobKey]);

  // Real-time comments listener
  useEffect(() => {
    const unsub = subscribeToComments(video.id, (list) => {
      setComments(list);
    });
    return () => unsub();
  }, [video.id]);

  // Google Drive video detection & secure embed URL resolution
  const isGoogleDrive = video.source === 'google_drive' || !!video.driveFileId || (video.externalUrl ? (video.externalUrl.includes('drive.google.com') || video.externalUrl.includes('docs.google.com')) : false);
  const driveEmbedUrl = video.driveFileId
    ? getDriveEmbedUrl(video.driveFileId)
    : (video.externalUrl && (video.externalUrl.includes('drive.google.com') || video.externalUrl.includes('docs.google.com'))
        ? parseVideoUrl(video.externalUrl).embedUrl
        : null);

  const parsed = isGoogleDrive && driveEmbedUrl
    ? { isEmbed: true, embedUrl: driveEmbedUrl, provider: 'googledrive' as const }
    : (video.source === 'external' && video.externalUrl ? parseVideoUrl(video.externalUrl) : null);

  // Jump / Seek video to exact timestamp
  const handleSeekTo = (seconds: number, timeStr?: string) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else if (iframeRef.current && parsed?.provider === 'youtube') {
      // YouTube iframe JS API seek
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
        '*'
      );
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        '*'
      );
      setIsPlaying(true);
    }

    showToast(`⏱ تم الانتقال إلى التوقيت: ${timeStr || formatSecondsToTimeString(seconds)}`, 'info');
  };

  // Timeline scrubber hover handling
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const hoveredSec = pos * duration;
    setHoverTimelineTime(hoveredSec);
    setHoverPositionX(e.clientX - rect.left);

    // Find if hovering in a chapter
    if (chapters.length > 0) {
      let found: VideoChapter | null = null;
      for (let i = chapters.length - 1; i >= 0; i--) {
        if (hoveredSec >= chapters[i].seconds) {
          found = chapters[i];
          break;
        }
      }
      setHoverChapter(found || chapters[0]);
    } else {
      setHoverChapter(null);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = pos * duration;
    handleSeekTo(targetSec);
  };

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleLikeClick = async (type: 'like' | 'dislike') => {
    triggerLikeBurst(type);
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    try {
      await toggleVideoLike(video.id, currentUser.uid, type);
      await logUserActivity(currentUser, type, `تفاعل على الفيديو: ${video.title}`);
    } catch (err) {
      showToast('حدث خطأ في تسجيل التفاعل', 'error');
    }
  };

  const handleSubscribeToggle = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (currentUser.uid === video.publisherUid) {
      showToast('لا يمكنك الاشتراك في قناتك الخاصة', 'info');
      return;
    }
    try {
      const subscribed = await toggleSubscription(currentUser, {
        uid: video.publisherUid,
        name: video.publisherName,
        avatar: video.publisherAvatar
      });
      await logUserActivity(currentUser, 'subscribe', `${subscribed ? 'اشترك في' : 'ألغى اشتراك'} قناة: ${video.publisherName}`);
      showToast(subscribed ? `تم الاشتراك في ${video.publisherName} بنجاح` : `تم إلغاء الاشتراك من ${video.publisherName}`, 'success');
    } catch (err) {
      showToast('فشل تحديث الاشتراك', 'error');
    }
  };

  const handleToggleBell = async () => {
    if (!currentUser || !isSubscribed) return;
    const newState = !notificationsOn;
    await setSubscriptionNotification(currentUser.uid, video.publisherUid, newState);
    showToast(newState ? 'تم تفعيل جميع الإشعارات لهذه القناة' : 'تم إيقاف إشعارات هذه القناة', 'info');
  };

  const handleSaveWatchLater = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    const saved = await toggleSaveToWatchLater(currentUser.uid, video);
    await logUserActivity(currentUser, 'save', `${saved ? 'حفظ' : 'أزال'} من المحفوظات: ${video.title}`);
    showToast(saved ? 'تمت الإضافة إلى المحفوظات' : 'تمت الإزالة من المحفوظات', 'success');
  };

  const handleDownload = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (isGoogleDrive || !video.allowDownload) {
      showToast(isGoogleDrive ? 'تم منع التنزيل أوتوماتيكياً لحماية حقوق البث والنشر' : t('downloadNotAllowed'), 'error');
      return;
    }

    try {
      await recordDownload(currentUser.uid, video, video.fileBlobKey);
      await logUserActivity(currentUser, 'download', `قام بتنزيل الفيديو: ${video.title}`);

      // Trigger browser download if direct URL or blob exists
      const downloadSrc = localBlobUrl || video.videoDataUrl || video.externalUrl;
      if (downloadSrc && !downloadSrc.includes('youtube.com') && !downloadSrc.includes('tiktok.com')) {
        const a = document.createElement('a');
        a.href = downloadSrc;
        a.download = `${video.title.replace(/[^\w\u0600-\u06FF]/g, '_')}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      showToast(t('downloadSuccess'), 'success');
    } catch {
      showToast('حدث خطأ أثناء تنزيل الفيديو', 'error');
    }
  };

  const handleShare = async () => {
    const url = getShareUrl('v', video.id);
    await copyToClipboard(url);
    showToast(t('copiedLink'), 'success');
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setIsSubmittingReport(true);
    try {
      await submitComplaintReport({
        videoId: video.id,
        videoTitle: video.title,
        videoThumbnail: video.thumbnailDataUrl || '',
        publisherUid: video.publisherUid,
        publisherName: video.publisherName,
        reporterUid: currentUser.uid,
        reporterName: currentUser.username,
        reporterEmail: currentUser.email || '',
        reason: reportReason,
        details: reportDetails.trim()
      });
      setShowReportModal(false);
      setReportDetails('');
      showToast('تم إرسال البلاغ بنجاح إلى لوحة تحكم المطور للمراجعة 🛡️', 'success');
    } catch {
      showToast('حدث خطأ أثناء إرسال البلاغ', 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!newCommentText.trim()) return;

    try {
      await addComment({
        targetId: video.id,
        targetType: 'video',
        userUid: currentUser.uid,
        userName: currentUser.username,
        userAvatar: currentUser.avatarUrl,
        text: newCommentText.trim(),
        likes: 0,
        dislikes: 0,
        createdAt: Date.now(),
        parentCommentId: null
      });
      await logUserActivity(currentUser, 'comment', `علق على الفيديو: ${video.title}`);

      // Notify video publisher if different user
      if (currentUser.uid !== video.publisherUid) {
        await sendNotification({
          recipientUid: video.publisherUid,
          senderUid: currentUser.uid,
          senderName: currentUser.username,
          senderAvatar: currentUser.avatarUrl,
          type: 'comment',
          targetId: video.id,
          targetType: 'video',
          message: `علق ${currentUser.username} على الفيديو الخاص بك: "${video.title}"`
        });
      }

      setNewCommentText('');
      showToast('تمت إضافة تعليقك بنجاح', 'success');
    } catch {
      showToast('فشل نشر التعليق', 'error');
    }
  };

  const handleAddReply = async (parentComment: CommentItem) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!replyText.trim()) return;

    try {
      const targetUserName = replyTargetUser || parentComment.userName;
      await addComment({
        targetId: video.id,
        targetType: 'video',
        userUid: currentUser.uid,
        userName: currentUser.username,
        userAvatar: currentUser.avatarUrl,
        text: replyText.trim(),
        likes: 0,
        dislikes: 0,
        createdAt: Date.now(),
        parentCommentId: parentComment.id,
        replyToUserName: targetUserName
      });
      await logUserActivity(currentUser, 'comment', `رد على تعليق في: ${video.title}`);

      // Send notification to author of parent comment if different
      if (currentUser.uid !== parentComment.userUid) {
        await sendNotification({
          recipientUid: parentComment.userUid,
          senderUid: currentUser.uid,
          senderName: currentUser.username,
          senderAvatar: currentUser.avatarUrl,
          type: 'reply',
          targetId: video.id,
          targetType: 'video',
          message: `قام ${currentUser.username} بالرد على تعليقك في فيديو "${video.title}"`
        });
      }

      // If replying directly to another user's reply, notify them as well
      if (replyTargetUserUid && replyTargetUserUid !== currentUser.uid && replyTargetUserUid !== parentComment.userUid) {
        await sendNotification({
          recipientUid: replyTargetUserUid,
          senderUid: currentUser.uid,
          senderName: currentUser.username,
          senderAvatar: currentUser.avatarUrl,
          type: 'reply',
          targetId: video.id,
          targetType: 'video',
          message: `قام ${currentUser.username} بالرد عليك في تعليقات فيديو "${video.title}"`
        });
      }

      // Ensure that this reply is immediately revealed in the visible replies
      setVisibleRepliesCountMap(prev => ({
        ...prev,
        [parentComment.id]: (prev[parentComment.id] ?? 1) + 2
      }));

      setReplyToComment(null);
      setReplyTargetUser('');
      setReplyTargetUserUid('');
      setReplyText('');
      showToast('تم نشر الرد بنجاح', 'success');
    } catch {
      showToast('فشل نشر الرد', 'error');
    }
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    try {
      await updateCommentText(commentId, editCommentText.trim());
      setEditingCommentId(null);
      showToast('تم تعديل التعليق بنجاح', 'success');
    } catch {
      showToast('فشل حفظ التعديل', 'error');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('هل تريد حذف هذا التعليق؟')) {
      try {
        await deleteComment(commentId, video.id, 'video');
        showToast('تم حذف التعليق', 'info');
      } catch {
        showToast('فشل حذف التعليق', 'error');
      }
    }
  };

  const handleTogglePin = async (comment: CommentItem) => {
    if (!isVideoPublisher) {
      showToast('يمكن للناشر فقط تثبيت التعليقات', 'info');
      return;
    }
    const nextPinState = !comment.isPinned;
    try {
      await togglePinComment(comment.id, nextPinState, video.id);
      showToast(nextPinState ? 'تم تثبيت التعليق في أعلى القائمة 📌' : 'تم إلغاء تثبيت التعليق', 'success');
    } catch {
      showToast('فشل تغيير حالة التثبيت', 'error');
    }
  };

  // Smart Suggested Videos Algorithm (Category, Channel, Keywords/Tags & Engagement Scoring)
  const suggestedVideos = useMemo(() => {
    const titleWords = video.title.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const videoTags = video.tags ? video.tags.map((t) => t.toLowerCase()) : [];

    return allVideos
      .filter((v) => {
        if (v.id === video.id) return false;
        const isSched = v.visibility === 'scheduled';
        const isPub = !v.visibility || v.visibility === 'public';
        const isSchedPassed = isSched && v.scheduledAt && v.scheduledAt <= Date.now();
        return isPub || isSchedPassed;
      })
      .map((v) => {
        let score = 0;

        // 1. Same Channel Creator (+50 points)
        if (v.publisherUid && v.publisherUid === video.publisherUid) {
          score += 50;
        }

        // 2. Same Category (+35 points)
        if (v.category && v.category === video.category) {
          score += 35;
        }

        // 3. Matching Tags (+15 points per match)
        if (v.tags && videoTags.length > 0) {
          v.tags.forEach((tag) => {
            if (videoTags.includes(tag.toLowerCase())) score += 15;
          });
        }

        // 4. Keyword similarity in title (+10 points per word match)
        const vTitleLower = v.title.toLowerCase();
        titleWords.forEach((word) => {
          if (vTitleLower.includes(word)) score += 10;
        });

        // 5. Engagement & Popularity weight
        score += Math.min(20, (v.views || 0) * 0.1);
        score += Math.min(15, (v.likes || 0) * 0.5);

        return { video: v, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((item) => item.video)
      .slice(0, 12);
  }, [allVideos, video]);

  const topLevelComments = comments.filter((c) => !c.parentCommentId);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-3xl flex justify-center p-0 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl bg-[#070e1c] border-0 sm:border border-cyan-900/40 sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-none sm:max-h-[96vh]">
        {/* Top Floating Bar */}
        <div className="flex items-center justify-between p-3.5 sm:px-6 bg-[#091224]/90 border-b border-cyan-950/80 sticky top-0 z-20 backdrop-blur-xl">
          <div className="flex items-center gap-2.5 truncate">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <h2 className="text-sm font-bold text-slate-200 truncate">{video.title}</h2>
            {isVideoPublisher && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold shrink-0">
                أنت الناشر (لا تحتسب مشاهدتك الذاتية)
              </span>
            )}
          </div>
          <button
            onClick={() => {
              flushWatchTime();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-cyan-950/60 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout: Player + Comments on Left/Right */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6 p-3 sm:p-6">
          {/* Main Video & Details Column */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Player Viewport */}
            <div
              onContextMenu={(e) => {
                if (isGoogleDrive) {
                  e.preventDefault();
                  showToast('حماية المحتوى: تم حظر الوصول للرابط أو التنزيل', 'info');
                }
              }}
              className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-cyan-900/30 shadow-2xl shadow-cyan-950/50 flex flex-col justify-end group select-none"
            >
              {parsed && parsed.isEmbed && parsed.embedUrl ? (
                <div className="relative w-full h-full">
                  <iframe
                    ref={iframeRef}
                    src={parsed.embedUrl}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                  {/* Anti-Popout Protective Overlay:
                      Prevents opening external window to conceal direct stream links */}
                  {isGoogleDrive && (
                    <>
                      <div
                        className="absolute top-0 end-0 h-14 w-16 z-20 cursor-default select-none pointer-events-auto bg-transparent"
                        title="مشغل محمي - تم تفعيل الحماية المشددة للمحتوى"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          showToast('تم حظر فتح أو مشاركة الرابط المباشر لحماية حقوق البث والنشر', 'info');
                        }}
                      />
                      <div className="absolute top-2.5 end-2.5 z-10 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#050a14]/85 backdrop-blur-md border border-cyan-500/40 text-[10px] text-cyan-300 font-bold shadow-lg">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>بث سحابي محمي</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <video
                  ref={videoRef}
                  src={localBlobUrl || video.videoDataUrl || (parsed ? parsed.directUrl : '') || video.thumbnailDataUrl}
                  autoPlay
                  playsInline
                  poster={video.thumbnailDataUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
                  onLoadedMetadata={(e) => {
                    const dur = (e.target as HTMLVideoElement).duration;
                    if (dur && !isNaN(dur)) setDuration(dur);
                  }}
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={handleTogglePlay}
                />
              )}

              {/* Custom Timeline & Interactive Bookmarks (FOR HTML5 & Direct Videos) */}
              {(!parsed || !parsed.isEmbed) && (
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-1.5 transition-opacity duration-200">
                  {/* Interactive Progress Bar with Bookmark Pins */}
                  <div
                    ref={timelineRef}
                    onMouseMove={handleTimelineMouseMove}
                    onMouseLeave={() => {
                      setHoverTimelineTime(null);
                      setHoverChapter(null);
                    }}
                    onClick={handleTimelineClick}
                    className="relative h-2.5 hover:h-4 w-full bg-slate-800/80 rounded-full cursor-pointer transition-all duration-150 flex items-center group/timeline"
                  >
                    {/* Played Progress Bar */}
                    <div
                      style={{ width: `${progressPercent}%` }}
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full relative"
                    >
                      <div className="absolute end-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover/timeline:scale-100 transition-transform" />
                    </div>

                    {/* Timeline Chapter Markers / Bookmark Pins */}
                    {duration > 0 &&
                      chapters.map((ch, idx) => {
                        const markerPercent = (ch.seconds / duration) * 100;
                        if (markerPercent < 0 || markerPercent > 100) return null;
                        const isReached = currentTime >= ch.seconds;
                        return (
                          <div
                            key={idx}
                            style={{ left: `${markerPercent}%` }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSeekTo(ch.seconds, ch.timeStr);
                            }}
                            className="absolute top-0 bottom-0 w-1.5 -ml-[3px] bg-amber-400 hover:bg-white hover:w-2 rounded-full cursor-pointer z-10 shadow-sm transition-all"
                            title={`📌 ${ch.timeStr} - ${ch.title}`}
                          />
                        );
                      })}

                    {/* Hover Tooltip showing exact time and chapter title */}
                    {hoverTimelineTime !== null && (
                      <div
                        style={{ left: `${hoverPositionX}px` }}
                        className="absolute bottom-6 -translate-x-1/2 px-2.5 py-1.5 bg-[#070e1c]/95 border border-cyan-500/80 rounded-xl text-white text-[11px] font-bold shadow-2xl pointer-events-none whitespace-nowrap z-30 flex flex-col items-center gap-0.5 animate-in fade-in zoom-in-95 duration-100"
                      >
                        <span className="font-mono text-cyan-300">
                          {formatSecondsToTimeString(hoverTimelineTime)}
                        </span>
                        {hoverChapter && (
                          <span className="text-amber-300 text-[10px] max-w-[180px] truncate flex items-center gap-1 font-semibold">
                            <Bookmark className="w-2.5 h-2.5 fill-current shrink-0" />
                            <span>{hoverChapter.title}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Player Controls Bar */}
                  <div className="flex items-center justify-between text-xs text-slate-200 mt-1">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleTogglePlay}
                        className="p-1 hover:text-cyan-300 transition-colors"
                      >
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                      </button>

                      <button
                        onClick={handleToggleMute}
                        className="p-1 hover:text-cyan-300 transition-colors"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>

                      {/* Time display */}
                      <div className="font-mono text-[11px] text-slate-300 flex items-center gap-1">
                        <span className="text-white font-bold">{formatSecondsToTimeString(currentTime)}</span>
                        <span>/</span>
                        <span>{formatSecondsToTimeString(duration)}</span>
                      </div>

                      {/* Active chapter badge */}
                      {currentActiveChapter && (
                        <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[10px] text-cyan-300 font-medium truncate max-w-[200px]">
                          <Bookmark className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />
                          <span className="truncate">{currentActiveChapter.title}</span>
                        </div>
                      )}
                    </div>

                    {/* Live active watch timer indicator */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-cyan-900 text-[10px] text-cyan-400" title="مدة مشاهدتك الفعلية لهذا المقطع (تتوقف عند إيقاف الفيديو)">
                        <Timer className={`w-3 h-3 ${isPlaying ? 'text-cyan-400 animate-spin' : 'text-slate-500'}`} style={{ animationDuration: '3s' }} />
                        <span>مشاهدتك: {formatSecondsToTimeString(sessionWatchedSeconds)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chapters / Bookmarks Drawer Bar (Extracted from Video Description) */}
            {chapters.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-[#091224]/80 border border-cyan-900/40 space-y-2.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-slate-200">
                      فصول وإشارات مرجعية في الفيديو ({chapters.length})
                    </h3>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-medium">اضغط على أي فصل للقفز إليه مباشرة</span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {chapters.map((ch, idx) => {
                    const isActive = currentActiveChapter?.seconds === ch.seconds;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSeekTo(ch.seconds, ch.timeStr)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/60 border border-cyan-400/60 scale-[1.02]'
                            : 'bg-[#070e1c] hover:bg-cyan-950/60 text-slate-300 hover:text-white border border-cyan-950 hover:border-cyan-500/40'
                        }`}
                      >
                        <span className="font-mono text-[11px] text-cyan-300">{ch.timeStr}</span>
                        <span className="max-w-[150px] truncate">{ch.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Video Title */}
            <h1 className="text-lg sm:text-xl font-black text-slate-100 leading-snug">
              {video.title}
            </h1>

            {/* Publisher Info & Main Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-cyan-950/80">
              {/* Publisher Badge */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    flushWatchTime();
                    onClose();
                    if (onSelectChannel) onSelectChannel(video.publisherUid);
                  }}
                  className="focus:outline-none"
                >
                  <img
                    src={video.publisherAvatar}
                    alt={video.publisherName}
                    className="w-11 h-11 rounded-full object-cover border border-cyan-400/50"
                  />
                </button>
                <div>
                  <button
                    onClick={() => {
                      flushWatchTime();
                      onClose();
                      if (onSelectChannel) onSelectChannel(video.publisherUid);
                    }}
                    className="font-bold text-sm text-slate-100 hover:text-cyan-300 transition-colors text-start block"
                  >
                    {video.publisherName}
                  </button>
                  <span className="text-xs text-slate-400">
                    قناة رسمية على Yassa Tube
                  </span>
                </div>

                {/* Subscribe Button */}
                <button
                  onClick={handleSubscribeToggle}
                  className={`ms-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md ${
                    isSubscribed
                      ? 'bg-slate-800 text-slate-200 hover:bg-rose-900/60 hover:text-rose-200 border border-slate-700'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-900/50'
                  }`}
                >
                  {isSubscribed ? t('subscribed') : t('subscribe')}
                </button>

                {isSubscribed && (
                  <button
                    onClick={handleToggleBell}
                    className={`p-2 rounded-full border transition-colors ${
                      notificationsOn
                        ? 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40'
                        : 'text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                    title={notificationsOn ? t('allNotifications') : t('noNotifications')}
                  >
                    {notificationsOn ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Like / Dislike Group */}
                <div className="relative flex items-center rounded-full bg-[#0b1528] border border-cyan-900/50 shadow-inner">
                  <ReactionBurstOverlay particles={likeBurstParticles} />
                  <button
                    onClick={() => handleLikeClick('like')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold transition-colors rounded-s-full ${
                      userLikedStatus === 'like'
                        ? 'text-cyan-300 bg-cyan-950/80'
                        : 'text-slate-300 hover:bg-cyan-950/40'
                    }`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${userLikedStatus === 'like' ? 'fill-current' : ''}`} />
                    {video.showLikesCount && <span>{video.likes || 0}</span>}
                  </button>

                  <div className="w-[1px] h-4 bg-cyan-950" />

                  <button
                    onClick={() => handleLikeClick('dislike')}
                    className={`p-2 text-xs font-bold transition-colors rounded-e-full ${
                      userLikedStatus === 'dislike'
                        ? 'text-rose-400 bg-rose-950/60'
                        : 'text-slate-400 hover:bg-cyan-950/40'
                    }`}
                  >
                    <ThumbsDown className={`w-4 h-4 ${userLikedStatus === 'dislike' ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Save to Watch Later */}
                <button
                  onClick={handleSaveWatchLater}
                  className="p-2.5 rounded-full bg-[#0b1528] border border-cyan-900/50 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title={t('watchLater')}
                >
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">{t('save')}</span>
                </button>

                {/* Download Button or Google Drive Protection Badge */}
                {isGoogleDrive ? (
                  <div
                    className="p-2.5 rounded-full bg-[#081324] border border-cyan-800/50 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 cursor-help shadow-sm"
                    title="تم منع التنزيل ومشاركة الرابط أوتوماتيكياً لحماية حقوق الناشر"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline text-[11px]">محمي من التنزيل</span>
                  </div>
                ) : video.allowDownload ? (
                  <button
                    onClick={handleDownload}
                    className="p-2.5 rounded-full bg-[#0b1528] border border-cyan-900/50 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title={t('download')}
                  >
                    <DownloadCloud className="w-4 h-4 text-cyan-400" />
                    <span className="hidden sm:inline">{t('download')}</span>
                  </button>
                ) : null}

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="p-2.5 rounded-full bg-[#0b1528] border border-cyan-900/50 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title={t('share')}
                >
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">{t('share')}</span>
                </button>

                {/* Report Content Button */}
                <button
                  onClick={() => {
                    if (!currentUser) {
                      onOpenAuth();
                      return;
                    }
                    setShowReportModal(true);
                  }}
                  className="p-2.5 rounded-full bg-[#0b1528] border border-rose-950/60 text-rose-300 hover:text-rose-200 hover:bg-rose-950/50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title={t('reportContent')}
                >
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">{t('reportContent')}</span>
                </button>
              </div>
            </div>

            {/* Playlist Drawer & Prev/Next Controls (If inside a Playlist) */}
            {playlistVideos && playlistVideos.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#091224] to-[#0d1c38] border border-cyan-500/30 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListMusic className="w-4 h-4 text-cyan-400" />
                    <div>
                      <h3 className="text-xs font-bold text-slate-100">
                        {playlistTitle || t('playlistTitleLabel')}
                      </h3>
                      <span className="text-[10px] text-cyan-300">
                        {((currentPlaylistIndex ?? 0) + 1)} / {playlistVideos.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Previous Button */}
                    <button
                      disabled={!currentPlaylistIndex || currentPlaylistIndex <= 0}
                      onClick={() => {
                        if (currentPlaylistIndex !== undefined && currentPlaylistIndex > 0 && onNavigatePlaylist) {
                          flushWatchTime();
                          onNavigatePlaylist(currentPlaylistIndex - 1);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-cyan-900/60 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition-all"
                    >
                      <SkipForward className="w-3.5 h-3.5 rotate-180" />
                    </button>

                    {/* Next Button */}
                    <button
                      disabled={currentPlaylistIndex === undefined || currentPlaylistIndex >= playlistVideos.length - 1}
                      onClick={() => {
                        if (currentPlaylistIndex !== undefined && currentPlaylistIndex < playlistVideos.length - 1 && onNavigatePlaylist) {
                          flushWatchTime();
                          onNavigatePlaylist(currentPlaylistIndex + 1);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition-all shadow-md shadow-cyan-950/60"
                    >
                      <SkipBack className="w-3.5 h-3.5 rotate-180" />
                    </button>

                    {/* Collapse Toggle */}
                    <button
                      onClick={() => setIsPlaylistDrawerOpen(!isPlaylistDrawerOpen)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                      {isPlaylistDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Playlist video items list */}
                {isPlaylistDrawerOpen && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin pt-1">
                    {playlistVideos.map((plItem, pIdx) => {
                      const isCur = pIdx === currentPlaylistIndex || plItem.id === video.id;
                      return (
                        <div
                          key={plItem.id}
                          onClick={() => {
                            if (!isCur) {
                              flushWatchTime();
                              if (onNavigatePlaylist) onNavigatePlaylist(pIdx);
                              else onSelectVideo(plItem);
                            }
                          }}
                          className={`flex items-center gap-2 p-1.5 rounded-xl cursor-pointer shrink-0 transition-all border ${
                            isCur
                              ? 'bg-cyan-950/90 border-cyan-400 shadow-md scale-[1.02]'
                              : 'bg-slate-900/60 hover:bg-slate-800 border-cyan-950/50'
                          }`}
                        >
                          <span className={`text-[10px] font-bold px-1.5 ${isCur ? 'text-cyan-300' : 'text-slate-500'}`}>
                            {pIdx + 1}
                          </span>
                          <img
                            src={plItem.thumbnailDataUrl}
                            alt=""
                            className="w-12 h-8 rounded-lg object-cover bg-slate-950"
                          />
                          <span className={`text-xs font-semibold max-w-[120px] truncate ${isCur ? 'text-cyan-200' : 'text-slate-300'}`}>
                            {plItem.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Expandable Description Box with CLICKABLE TIMESTAMPS */}
            <div className="p-4 rounded-2xl bg-[#091224]/70 border border-cyan-950/80 text-sm text-slate-300">
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-cyan-300 mb-2">
                <span>{video.views || 0} {t('views')}</span>
                <span>•</span>
                <span className="text-indigo-300">
                  {formatWatchHours(video.watchTimeSeconds || 0)} مشاهدة إجمالية
                </span>
                <span>•</span>
                <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                {video.type === 'short' && <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300">Short</span>}
              </div>

              <div className={`text-xs sm:text-sm leading-relaxed ${!isDescExpanded ? 'line-clamp-4' : ''}`}>
                {video.description ? (
                  renderTextWithClickableTimestamps(video.description, handleSeekTo)
                ) : (
                  <span className="text-slate-500">لا يوجد وصف مضاف لهذا الفيديو.</span>
                )}
              </div>

              {video.description && video.description.length > 120 && (
                <button
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="mt-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {isDescExpanded ? (
                    <>
                      <span>عرض أقل</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>عرض المزيد</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Comments Section with CLICKABLE TIMESTAMPS, PINNING, REPLIES, EDITING */}
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-base text-slate-100">
                    {t('comments')} ({comments.length})
                  </h3>
                </div>
                {isVideoPublisher && (
                  <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1">
                    <Pin className="w-3.5 h-3.5" />
                    <span>أنت الناشر: يمكنك تثبيت تعليق مميز ليظهر في البداية</span>
                  </span>
                )}
              </div>

              {/* Add Comment Input */}
              {video.allowComments ? (
                <form onSubmit={handleAddComment} className="flex gap-3 items-start">
                  <img
                    src={currentUser ? currentUser.avatarUrl : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover border border-cyan-900 shrink-0"
                  />
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder={currentUser ? `${t('addCommentPlaceholder')} (مثال: توقيت 01:23 رهيب!)` : 'سجل الدخول لإضافة تعليق...'}
                      disabled={!currentUser}
                      className="w-full bg-[#091224] border border-cyan-950 focus:border-cyan-400/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t('send')}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3 bg-slate-900/40 rounded-xl text-xs text-slate-400 text-center">
                  تم إيقاف التعليقات على هذا الفيديو من قِبل الناشر.
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-3.5 mt-2">
                {topLevelComments.map((comment) => {
                  const replies = comments.filter((c) => c.parentCommentId === comment.id);
                  const isCommentAuthor = currentUser?.uid === comment.userUid;

                  return (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                        comment.isPinned
                          ? 'bg-[#091b35]/90 border-cyan-500/60 shadow-lg shadow-cyan-950/40'
                          : 'bg-[#091224]/60 border-cyan-950/50'
                      }`}
                    >
                      {/* Pinned Header Badge */}
                      {comment.isPinned && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 pb-1 border-b border-cyan-900/50">
                          <Pin className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400 rotate-45" />
                          <span>مثبت من قِبل الناشر ({video.publisherName})</span>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={comment.userAvatar}
                            alt={comment.userName}
                            className="w-8 h-8 rounded-full object-cover border border-cyan-900/60"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-100">{comment.userName}</span>
                              {comment.userUid === video.publisherUid && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 text-[9px] font-bold border border-cyan-600/40">
                                  الناشر
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {new Date(comment.createdAt).toLocaleDateString()}
                              {comment.updatedAt && ' (معدل)'}
                            </span>
                          </div>
                        </div>

                        {/* Top-Right Action Controls */}
                        <div className="flex items-center gap-1">
                          {/* Pin / Unpin Button (FOR PUBLISHER ONLY) */}
                          {isVideoPublisher && (
                            <button
                              onClick={() => handleTogglePin(comment)}
                              className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 font-bold ${
                                comment.isPinned
                                  ? 'text-cyan-300 bg-cyan-950 hover:bg-cyan-900'
                                  : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40'
                              }`}
                              title={comment.isPinned ? 'إلغاء تثبيت التعليق' : 'تثبيت التعليق في الأعلى'}
                            >
                              <Pin className={`w-3.5 h-3.5 ${comment.isPinned ? 'fill-current' : ''}`} />
                            </button>
                          )}

                          {/* Edit / Delete actions for comment owner */}
                          {isCommentAuthor && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditCommentText(comment.text);
                                }}
                                className="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-cyan-950/40"
                                title="تعديل التعليق"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40"
                                title="حذف التعليق"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Comment Body / Edit input with CLICKABLE TIMESTAMPS */}
                      {editingCommentId === comment.id ? (
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            className="flex-1 bg-[#0b1528] border border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveEditComment(comment.id)}
                            className="px-3.5 py-1.5 bg-cyan-600 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>حفظ</span>
                          </button>
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm text-slate-200 leading-relaxed ps-10">
                          {renderTextWithClickableTimestamps(comment.text, handleSeekTo)}
                        </div>
                      )}

                      {/* Reply button on main comment */}
                      <div className="flex items-center gap-4 ps-10 text-[11px] text-slate-400 font-medium">
                        <button
                          onClick={() => {
                            if (!currentUser) onOpenAuth();
                            else {
                              setReplyToComment(replyToComment?.id === comment.id && replyTargetUser === comment.userName ? null : comment);
                              setReplyTargetUser(comment.userName);
                              setReplyTargetUserUid(comment.userUid);
                              setReplyText(`@${comment.userName} `);
                            }
                          }}
                          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold transition-colors"
                        >
                          <CornerDownLeft className="w-3 h-3" />
                          <span>{t('reply')} ({replies.length})</span>
                        </button>
                      </div>

                      {/* Inline Reply input */}
                      {replyToComment?.id === comment.id && (
                        <div className="mt-2 ms-10 p-3 rounded-xl bg-[#0b1528] border border-cyan-900/80 space-y-2 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-cyan-300 font-bold block">
                              {t('reply')} @{replyTargetUser || comment.userName}:
                            </span>
                            <button
                              onClick={() => {
                                setReplyToComment(null);
                                setReplyTargetUser('');
                                setReplyTargetUserUid('');
                              }}
                              className="text-slate-500 hover:text-slate-300 text-xs"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={t('writeAComment')}
                              className="flex-1 bg-[#070e1c] border border-cyan-900 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                              autoFocus
                            />
                            <button
                              onClick={() => handleAddReply(comment)}
                              disabled={!replyText.trim()}
                              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold shrink-0 shadow-md hover:shadow-cyan-500/20"
                            >
                              {t('send')}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Nested Replies list with Show More (2 per click) & Show Less */}
                      {replies.length > 0 && (() => {
                        const visibleCount = visibleRepliesCountMap[comment.id] ?? 1;
                        const visibleReplies = replies.slice(0, visibleCount);
                        const hasMore = visibleCount < replies.length;
                        const isExpanded = visibleCount > 1;

                        return (
                          <div className="ms-10 mt-2 space-y-2 border-s-2 border-cyan-900/60 ps-3">
                            {visibleReplies.map((rep) => (
                              <div key={rep.id} className="text-xs p-2.5 rounded-xl bg-[#070e1c]/70 border border-cyan-950/70 hover:border-cyan-900/60 transition-all">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                    <img
                                      src={rep.userAvatar}
                                      alt=""
                                      className="w-5 h-5 rounded-full object-cover shrink-0"
                                    />
                                    <span className="font-bold text-slate-200 truncate">{rep.userName}</span>
                                    {rep.userUid === video.publisherUid && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 font-bold shrink-0">{t('channelOwner')}</span>
                                    )}
                                    {rep.replyToUserName && rep.replyToUserName !== comment.userName && (
                                      <span className="text-[10px] text-cyan-400/90 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-900/50 font-medium shrink-0">
                                        رد على @{rep.replyToUserName}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-500 shrink-0">
                                      {new Date(rep.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {/* Reply to this specific reply - anyone can reply */}
                                    <button
                                      onClick={() => {
                                        if (!currentUser) onOpenAuth();
                                        else {
                                          setReplyToComment(comment);
                                          setReplyTargetUser(rep.userName);
                                          setReplyTargetUserUid(rep.userUid);
                                          setReplyText(`@${rep.userName} `);
                                        }
                                      }}
                                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-cyan-950/70 transition-colors"
                                      title={`رد على ${rep.userName}`}
                                    >
                                      <CornerDownLeft className="w-3 h-3" />
                                      <span>رد</span>
                                    </button>

                                    {currentUser?.uid === rep.userUid && (
                                      <button
                                        onClick={() => handleDeleteComment(rep.id)}
                                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-950/40 transition-colors"
                                        title="حذف الرد"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="text-slate-300 ps-6 mt-1.5 leading-relaxed">
                                  {renderTextWithClickableTimestamps(rep.text, handleSeekTo)}
                                </div>
                              </div>
                            ))}

                            {/* Two buttons: Show more replies (+2) and Show less */}
                            {replies.length > 1 && (
                              <div className="flex flex-wrap items-center gap-3 pt-1.5">
                                {hasMore && (
                                  <button
                                    onClick={() =>
                                      setVisibleRepliesCountMap((prev) => ({
                                        ...prev,
                                        [comment.id]: (prev[comment.id] ?? 1) + 2
                                      }))
                                    }
                                    className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-950/80 border border-cyan-900/40 transition-all shadow-sm"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>عرض المزيد من الردود (+{Math.min(2, replies.length - visibleCount)})</span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      ({replies.length - visibleCount} متبقي)
                                    </span>
                                  </button>
                                )}

                                {isExpanded && (
                                  <button
                                    onClick={() =>
                                      setVisibleRepliesCountMap((prev) => ({
                                        ...prev,
                                        [comment.id]: 1
                                      }))
                                    }
                                    className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-700/60 transition-all shadow-sm"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                    <span>عرض أقل</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Suggested For You / Up Next Section */}
            <div className="mt-8 pt-6 border-t border-cyan-950/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <h3 className="font-extrabold text-base text-slate-100">
                    {t('upNext')}
                  </h3>
                </div>
                <span className="text-xs text-cyan-400 font-medium">{t('forYou')}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {suggestedVideos.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      flushWatchTime();
                      onSelectVideo(item);
                    }}
                    className="p-2.5 rounded-2xl bg-[#091224]/70 hover:bg-cyan-950/50 border border-cyan-950 hover:border-cyan-500/40 cursor-pointer transition-all flex gap-3 group"
                  >
                    <div className="relative w-32 aspect-video rounded-xl overflow-hidden bg-slate-900 shrink-0">
                      <img
                        src={item.thumbnailDataUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 fill-current ms-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-1 end-1 px-1 py-0.5 rounded bg-black/80 text-[9px] font-bold text-white">
                        {item.views || 0} {t('views')}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200 line-clamp-2 group-hover:text-cyan-300 transition-colors leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 truncate">{item.publisherName}</p>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-cyan-400">
                        <span>{item.likes || 0} {t('likes')}</span>
                        <span className="flex items-center gap-0.5 group-hover:translate-x-[-2px] transition-transform">
                          <span>{t('play')}</span>
                          <ArrowRight className="w-3 h-3 rotate-180" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Recommendations Sidebar */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-200 px-1">{t('suggestedForYou')}</h3>
            <div className="space-y-3">
              {suggestedVideos.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    flushWatchTime();
                    onSelectVideo(item);
                  }}
                  className="flex gap-3 p-2 rounded-xl bg-[#091224]/40 hover:bg-cyan-950/40 border border-cyan-950/30 hover:border-cyan-500/30 cursor-pointer transition-all group"
                >
                  <div className="relative w-28 aspect-video rounded-lg overflow-hidden shrink-0 bg-slate-900">
                    <img
                      src={item.thumbnailDataUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {item.type === 'short' && (
                      <span className="absolute bottom-1 end-1 px-1 rounded bg-rose-600 text-[9px] font-bold text-white">
                        Short
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-200 line-clamp-2 group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">{item.publisherName}</p>
                    <span className="text-[10px] text-cyan-400/80 mt-0.5 block">
                      {item.views || 0} {t('views')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Report Content Modal */}
        {showReportModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0b1528] border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-rose-950/80">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <h3 className="font-bold text-base text-white">{t('reportContent')}</h3>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex gap-3 items-center">
                <img
                  src={video.thumbnailDataUrl}
                  alt=""
                  className="w-14 h-10 rounded-lg object-cover bg-black shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">{video.title}</p>
                  <p className="text-[11px] text-slate-400 truncate">{t('author')}: {video.publisherName}</p>
                </div>
              </div>

              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">{t('reportReasonLabel')}</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-[#070e1c] border border-cyan-950 focus:border-rose-500 rounded-xl p-3 text-xs text-white focus:outline-none"
                  >
                    <option value="inappropriate">{t('reportReason1')}</option>
                    <option value="copyright">{t('reportReason2')}</option>
                    <option value="misleading">{t('reportReason3')}</option>
                    <option value="harassment">{t('reportReason4')}</option>
                    <option value="violence">{t('reportReason5')}</option>
                    <option value="other">{t('reportReason6')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">{t('reportDetailsLabel')}</label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder={t('reportDetailsPlaceholder')}
                    className="w-full bg-[#070e1c] border border-cyan-950 focus:border-rose-500 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-950/60 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{isSubmittingReport ? t('sending') : t('submitReport')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

