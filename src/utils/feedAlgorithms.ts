import type { VideoItem, PostItem, SubscriptionItem } from '../types';

export interface FeedChunk {
  id: string;
  longVideos: VideoItem[];
  shorts: VideoItem[];
  subscribedPost?: PostItem;
}

/**
 * Calculates a dynamic algorithmic discovery score for a video.
 * Factors in:
 * - Search relevance (if query provided)
 * - Engagement (views, likes, comments)
 * - Recency (freshness bonus)
 * - Controlled randomized jitter for fresh rotation
 */
export function calculateVideoScore(
  video: VideoItem,
  searchQuery: string = '',
  randomSeed: number = 1
): number {
  let score = 0;

  // 1. Search Relevance (High Weight)
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    const titleLower = (video.title || '').toLowerCase();
    const descLower = (video.description || '').toLowerCase();
    const pubLower = (video.publisherName || '').toLowerCase();
    const catLower = (video.category || '').toLowerCase();

    if (titleLower === q) score += 5000;
    else if (titleLower.startsWith(q)) score += 2500;
    else if (titleLower.includes(q)) score += 1200;

    if (pubLower.includes(q)) score += 800;
    if (descLower.includes(q)) score += 400;
    if (catLower.includes(q)) score += 300;

    if (video.tags && video.tags.some(t => t.toLowerCase().includes(q))) {
      score += 600;
    }
  }

  // 2. Engagement Metrics
  const views = Number(video.views) || 0;
  const likes = Number(video.likes) || 0;
  const comments = Number(video.commentsCount) || 0;

  score += views * 1.5;
  score += likes * 4.0;
  score += comments * 3.0;

  // 3. Recency & Freshness Boost (within last 3 days +50%, last 14 days +20%)
  const now = Date.now();
  const ageInHours = Math.max(1, (now - (video.createdAt || now)) / (1000 * 60 * 60));
  if (ageInHours < 72) {
    score += 150 * (1 - ageInHours / 72);
  } else if (ageInHours < 336) {
    score += 60;
  }

  // 4. Controlled Randomized Exploration Multiplier (0.75 to 1.35)
  // Ensures variety across sessions while maintaining top quality
  const randomFactor = 0.75 + (Math.random() * 0.6) * randomSeed;
  score *= randomFactor;

  return score;
}

/**
 * Shuffles and sorts videos using anti-clustering so the same creator's
 * videos are distributed evenly instead of grouping consecutively.
 */
export function rankAndDistributeVideos(
  videos: VideoItem[],
  searchQuery: string = ''
): VideoItem[] {
  if (videos.length === 0) return [];

  // Score each video
  const scored = videos.map((v) => ({
    video: v,
    score: calculateVideoScore(v, searchQuery, 1)
  }));

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Anti-clustering distribution by publisher
  const result: VideoItem[] = [];
  const publisherRecentMap = new Map<string, number>();

  const remaining = [...scored];
  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestWeightedScore = -Infinity;

    for (let i = 0; i < Math.min(6, remaining.length); i++) {
      const item = remaining[i];
      const pubUid = item.video.publisherUid;
      const lastPlaced = publisherRecentMap.get(pubUid) ?? -999;
      const distance = result.length - lastPlaced;

      // Penalize if placed very recently
      let penalty = 1;
      if (distance < 2) penalty = 0.3;
      else if (distance < 4) penalty = 0.7;

      const weighted = item.score * penalty;
      if (weighted > bestWeightedScore) {
        bestWeightedScore = weighted;
        bestIndex = i;
      }
    }

    const chosen = remaining.splice(bestIndex, 1)[0];
    result.push(chosen.video);
    publisherRecentMap.set(chosen.video.publisherUid, result.length);
  }

  return result;
}

/**
 * Builds the repeating algorithmic chunks:
 * 3 Long Videos -> 4 Shorts (2x2 grid) -> 1 Subscribed Channel Post (if exists) -> Repeat!
 */
export function buildAlgorithmicFeed(
  longVideos: VideoItem[],
  shortsVideos: VideoItem[],
  allPosts: PostItem[],
  subscriptions: SubscriptionItem[],
  searchQuery: string = ''
): FeedChunk[] {
  // 1. Rank long videos and shorts
  const rankedLong = rankAndDistributeVideos(longVideos, searchQuery);
  const rankedShorts = rankAndDistributeVideos(shortsVideos, searchQuery);

  // 2. Filter posts from subscribed channels (منشور لشخص مشترك عنده أن وجد)
  const subscribedChannelUids = new Set(subscriptions.map((s) => s.channelUid));
  
  let eligiblePosts = allPosts.filter((p) => subscribedChannelUids.has(p.channelUid));
  
  // If search query is active, further filter or rank matching posts
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    eligiblePosts = eligiblePosts.filter(
      (p) =>
        (p.text || '').toLowerCase().includes(q) ||
        (p.channelName || '').toLowerCase().includes(q)
    );
  }

  // Shuffle eligible posts slightly for fresh discovery
  const shuffledPosts = [...eligiblePosts].sort(() => Math.random() - 0.5);

  const chunks: FeedChunk[] = [];
  let longIndex = 0;
  let shortsIndex = 0;
  let postIndex = 0;
  let chunkCounter = 1;

  // Continue as long as we have videos or shorts
  while (longIndex < rankedLong.length || shortsIndex < rankedShorts.length) {
    // Take up to 3 long videos
    const chunkLong = rankedLong.slice(longIndex, longIndex + 3);
    longIndex += 3;

    // Take up to 4 shorts
    const chunkShorts = rankedShorts.slice(shortsIndex, shortsIndex + 4);
    shortsIndex += 4;

    // Take 1 subscribed post if available
    let chunkPost: PostItem | undefined;
    if (postIndex < shuffledPosts.length) {
      chunkPost = shuffledPosts[postIndex];
      postIndex++;
    }

    chunks.push({
      id: `feed-chunk-${chunkCounter++}`,
      longVideos: chunkLong,
      shorts: chunkShorts,
      subscribedPost: chunkPost
    });
  }

  return chunks;
}
