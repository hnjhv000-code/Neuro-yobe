import type { VideoItem, PostItem, SubscriptionItem, UserProfile } from '../types';

export type AlgorithmicFeedBlock =
  | { type: 'long_videos_chunk'; id: string; videos: VideoItem[] }
  | { type: 'shorts_group'; id: string; shorts: VideoItem[] }
  | { type: 'subscribed_post'; id: string; post: PostItem; isSubscribed: boolean };

/**
 * Fisher-Yates smart shuffle
 */
function smartShuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Advanced Algorithmic Feed Builder
 * Exact user pattern:
 * [3 Long Videos] -> [4 Shorts (2x2 grid)] -> [1 Subscribed Post (if any)] -> Repeat
 */
export function buildAlgorithmicFeed({
  videos,
  posts,
  subscriptions,
  currentUser
}: {
  videos: VideoItem[];
  posts: PostItem[];
  subscriptions: SubscriptionItem[];
  currentUser: UserProfile | null;
}): AlgorithmicFeedBlock[] {
  const rawLongVideos = videos.filter((v) => v.type !== 'short');
  const rawShorts = videos.filter((v) => v.type === 'short');

  // Randomize with smart entropy & freshness
  const longPool = smartShuffle(rawLongVideos);
  const shortsPool = smartShuffle(rawShorts);

  // Identify subscribed channels
  const subscribedChannelIds = new Set<string>();
  if (currentUser) {
    subscriptions
      .filter((s) => s.subscriberUid === currentUser.uid)
      .forEach((s) => subscribedChannelIds.add(s.channelUid));
  }

  // Prioritize posts from subscribed channels
  const subscribedPosts = posts.filter((p) => subscribedChannelIds.has(p.channelUid));
  const otherPosts = posts.filter((p) => !subscribedChannelIds.has(p.channelUid));

  const postPool = [
    ...smartShuffle(subscribedPosts),
    ...smartShuffle(otherPosts)
  ];

  const blocks: AlgorithmicFeedBlock[] = [];
  let longIdx = 0;
  let shortsIdx = 0;
  let postIdx = 0;
  let iteration = 0;

  while (longIdx < longPool.length || shortsIdx < shortsPool.length) {
    iteration++;

    // 1. Take up to 3 Long Videos
    if (longIdx < longPool.length) {
      const longChunk = longPool.slice(longIdx, longIdx + 3);
      longIdx += longChunk.length;
      blocks.push({
        type: 'long_videos_chunk',
        id: `long-chunk-${iteration}-${longIdx}`,
        videos: longChunk
      });
    }

    // 2. Take up to 4 Shorts (2x2)
    if (shortsIdx < shortsPool.length) {
      const shortsChunk = shortsPool.slice(shortsIdx, shortsIdx + 4);
      shortsIdx += shortsChunk.length;
      blocks.push({
        type: 'shorts_group',
        id: `shorts-group-${iteration}-${shortsIdx}`,
        shorts: shortsChunk
      });
    }

    // 3. Take 1 Subscribed Post (if available)
    if (postIdx < postPool.length) {
      const p = postPool[postIdx];
      postIdx++;
      blocks.push({
        type: 'subscribed_post',
        id: `post-item-${iteration}-${p.id}`,
        post: p,
        isSubscribed: subscribedChannelIds.has(p.channelUid)
      });
    }

    if (longIdx >= longPool.length && shortsIdx >= shortsPool.length) {
      break;
    }
  }

  return blocks;
}
