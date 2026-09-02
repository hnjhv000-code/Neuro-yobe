import type { VideoItem, PostItem } from '../types';

export const STARTER_VIDEOS: VideoItem[] = [];
export const STARTER_POSTS: PostItem[] = [];

const CACHE_VIDEOS_KEY = 'yassa_cached_videos_v1';
const CACHE_POSTS_KEY = 'yassa_cached_posts_v1';

export function getCachedVideos(): VideoItem[] {
  try {
    const cached = localStorage.getItem(CACHE_VIDEOS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        // Filter out any starter items if they were previously cached
        const real = parsed.filter(v => v && !v.id?.startsWith('starter_'));
        return real;
      }
    }
  } catch (e) {
    console.warn('Failed to read cached videos:', e);
  }
  return [];
}

export function saveCachedVideos(videos: VideoItem[]): void {
  try {
    if (Array.isArray(videos)) {
      const real = videos.filter(v => v && !v.id?.startsWith('starter_'));
      localStorage.setItem(CACHE_VIDEOS_KEY, JSON.stringify(real));
    }
  } catch (e) {
    console.warn('Failed to cache videos:', e);
  }
}

export function getCachedPosts(): PostItem[] {
  try {
    const cached = localStorage.getItem(CACHE_POSTS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        const real = parsed.filter(p => p && !p.id?.startsWith('starter_'));
        return real;
      }
    }
  } catch (e) {
    console.warn('Failed to read cached posts:', e);
  }
  return [];
}

export function saveCachedPosts(posts: PostItem[]): void {
  try {
    if (Array.isArray(posts)) {
      const real = posts.filter(p => p && !p.id?.startsWith('starter_'));
      localStorage.setItem(CACHE_POSTS_KEY, JSON.stringify(real));
    }
  } catch (e) {
    console.warn('Failed to cache posts:', e);
  }
}

export function clearAllLocalCachedContent(): void {
  try {
    localStorage.removeItem(CACHE_VIDEOS_KEY);
    localStorage.removeItem(CACHE_POSTS_KEY);
  } catch (e) {
    console.warn('Failed to clear cache:', e);
  }
}
