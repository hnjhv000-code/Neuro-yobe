export type VideoType = 'video' | 'short';
export type VideoSource = 'file' | 'external' | 'google_drive';
export type VideoVisibility = 'public' | 'private' | 'scheduled' | 'unlisted';
export type PostType = 'text' | 'image' | 'poll_text' | 'poll_image' | 'news';
export type SupportStatus = 'open' | 'answered' | 'rejected';
export type Language = 'ar' | 'en' | 'ja' | 'fr' | 'zh';

export interface UserProfile {
  uid: string;
  email: string;
  phoneNumber?: string;
  username: string;
  avatarUrl: string;
  bannerUrl?: string;
  bio?: string;
  deviceType?: string;
  ip?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  passwordHash?: string;
  password?: string;
  provider?: 'email' | 'phone' | 'password' | 'google' | 'other';
  registeredAt: number;
  lastLoginAt: number;
  isBlocked?: boolean;
  isMutedSupport?: boolean;
  isBlacklisted?: boolean; // Banned from publishing content
  publishingBannedReason?: string;
  strikesCount?: number;
  subscribersCount?: number;
  subscribedChannelsCount?: number;
  totalViews?: number;
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  publisherUid: string;
  publisherName: string;
  publisherAvatar: string;
  type: VideoType;
  source: VideoSource;
  visibility?: VideoVisibility;
  scheduledAt?: number;
  category?: string;
  externalUrl?: string;
  driveFileId?: string;
  videoDataUrl?: string; // For small sample/compressed direct videos
  fileBlobKey?: string; // IndexedDB reference for device videos
  thumbnailDataUrl: string;
  views: number;
  likes: number;
  dislikes: number;
  commentsCount: number;
  downloadsCount: number;
  createdAt: number;
  updatedAt?: number;
  allowDownload: boolean;
  allowComments: boolean;
  showLikesCount: boolean;
  tags?: string[];
  duration?: number;
  watchTimeSeconds?: number;
  watchHours?: number;
  likedUsers?: Record<string, 'like' | 'dislike'>;
}

export interface CommentItem {
  id: string;
  targetId: string; // videoId or postId
  targetType: 'video' | 'post';
  userUid: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: number;
  updatedAt?: number;
  parentCommentId?: string | null;
  replyToUserName?: string;
  isPinned?: boolean;
  pinnedAt?: number;
  likes: number;
  dislikes: number;
  likedUsers?: Record<string, 'like' | 'dislike'>;
  repliesCount?: number;
}

export interface SubscriptionItem {
  id: string;
  subscriberUid: string;
  channelUid: string;
  channelName: string;
  channelAvatar: string;
  createdAt: number;
  notificationsEnabled: boolean;
}

export interface HistoryItem {
  id: string;
  userUid: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string;
  publisherName: string;
  videoType: VideoType;
  watchedAt: number;
  progress?: number;
}

export interface LikedItem {
  id: string;
  userUid: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string;
  publisherName: string;
  videoType: VideoType;
  likedAt: number;
  isLike: boolean; // true = like, false = dislike
}

export interface SavedItem {
  id: string;
  userUid: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string;
  publisherName: string;
  videoType: VideoType;
  savedAt: number;
}

export interface DownloadedItem {
  id: string;
  userUid: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string;
  publisherName: string;
  videoType: VideoType;
  downloadedAt: number;
  localBlobKey?: string;
  videoSource?: VideoSource;
  externalUrl?: string;
}

export interface PlaylistItem {
  id: string;
  userUid: string;
  userName: string;
  title: string;
  description: string;
  videoIds: string[];
  createdAt: number;
  updatedAt: number;
  isPrivate: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  imageUrl?: string;
  votes: number;
  votedUserUids?: string[];
}

export interface PostItem {
  id: string;
  channelUid: string;
  channelName: string;
  channelAvatar: string;
  type: PostType;
  text: string;
  images?: string[]; // max 6 images from device
  pollOptions?: PollOption[];
  visibility?: VideoVisibility;
  scheduledAt?: number;
  likes: number;
  dislikes: number;
  likedUsers?: Record<string, 'like' | 'dislike'>;
  commentsCount: number;
  createdAt: number;
  updatedAt?: number;
  allowComments: boolean;
}

export interface NotificationItem {
  id: string;
  recipientUid: string;
  type: 'new_video' | 'comment_reply' | 'support_reply' | 'video_deleted' | 'system' | 'like' | 'comment' | 'reply';
  title?: string;
  body?: string;
  message?: string;
  senderUid?: string;
  senderName?: string;
  senderAvatar?: string;
  targetId?: string;
  targetType?: string;
  thumbnail?: string;
  link?: string;
  videoId?: string;
  createdAt: number;
  isRead: boolean;
}

export interface SupportTicket {
  id: string;
  userUid: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  text: string;
  images?: string[]; // max 2 images from device
  createdAt: number;
  status: SupportStatus;
  developerReply?: string;
  replyImage?: string;
  repliedAt?: number;
}

export interface ActivityLogItem {
  id: string;
  userUid: string;
  userName: string;
  action:
    | 'login'
    | 'signup'
    | 'watch'
    | 'like'
    | 'dislike'
    | 'comment'
    | 'subscribe'
    | 'save'
    | 'download'
    | 'upload_video'
    | 'edit_video'
    | 'create_post'
    | 'edit_post'
    | 'post'
    | 'support'
    | 'edit_profile';
  details: string;
  createdAt: number;
}

export interface DeveloperSettings {
  customLogoUrl?: string;
  customBgUrl?: string;
  bgTargetSection?: 'all' | 'header' | 'sidebar' | 'content';
  bgAnimation?: 'none' | 'nebula' | 'stars' | 'pulse';
  siteNotice?: string;
  allowDeviceDirectStorageUpload?: boolean;
  updatedAt?: number;
}

export interface VisitorWatchedItem {
  id: string;
  title: string;
  type: VideoType;
  thumbnail: string;
  watchedAt: number;
  watchDurationSeconds: number;
}

export interface VisitorSessionLog {
  id: string;
  action: 'enter' | 'exit' | 'watch' | 'login';
  timestamp: number;
  details?: string;
}

export interface VisitorRecord {
  id: string;
  userUid?: string;
  userName?: string;
  email?: string;
  avatarUrl?: string;
  deviceType: 'Mobile' | 'Desktop' | 'Tablet' | 'Other';
  deviceName: string;
  os: string;
  browser: string;
  ip?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  flagEmoji?: string;
  screenResolution?: string;
  language?: string;
  firstVisitAt: number;
  lastVisitAt: number;
  visitsCount: number;
  isBanned?: boolean;
  watchedVideos: VisitorWatchedItem[];
  sessions: VisitorSessionLog[];
}

export interface VisitorStats {
  dailyCount: number;
  monthlyCount: number;
  totalCount: number;
  dailyResetAt?: number;
  monthlyResetAt?: number;
  lastDailyDate?: string;
  lastMonthlyDate?: string;
}

export interface ComplaintReport {
  id: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string;
  videoSource?: string;
  externalUrl?: string;
  videoDataUrl?: string;
  publisherUid: string;
  publisherName: string;
  reporterUid?: string;
  reporterName: string;
  reporterEmail?: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
  createdAt: number;
}

export interface BlacklistRecord {
  id: string;
  userUid: string;
  userName: string;
  email?: string;
  avatarUrl?: string;
  reason: string;
  bannedAt: number;
  strikesCount: number;
  violations: {
    id: string;
    type: 'video' | 'post';
    title: string;
    deletedAt: number;
    reason: string;
  }[];
}

