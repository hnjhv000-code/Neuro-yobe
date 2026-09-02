/**
 * Video Parser and Embed Generator
 * Supports YouTube, YouTube Shorts, TikTok, Facebook, Instagram Reels, Vimeo, Dailymotion, and direct video links.
 */

export interface ParsedVideoInfo {
  isEmbed: boolean;
  embedUrl?: string;
  directUrl?: string;
  provider: 'youtube' | 'tiktok' | 'facebook' | 'instagram' | 'vimeo' | 'dailymotion' | 'googledrive' | 'direct' | 'unknown';
}

export function parseVideoUrl(rawUrl: string): ParsedVideoInfo {
  if (!rawUrl) {
    return { isEmbed: false, provider: 'unknown' };
  }

  const url = rawUrl.trim();

  // 1. YouTube Standard & Shorts & youtu.be
  // Matches: youtube.com/watch?v=xxx, youtu.be/xxx, youtube.com/shorts/xxx, youtube.com/embed/xxx
  const ytWatchMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  const ytShortsMatch = url.match(/youtube\.com\/shorts\/([^"&?\/\s]{11})/i);

  if (ytShortsMatch && ytShortsMatch[1]) {
    return {
      isEmbed: true,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytShortsMatch[1]}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`,
      provider: 'youtube',
    };
  }

  if (ytWatchMatch && ytWatchMatch[1]) {
    return {
      isEmbed: true,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytWatchMatch[1]}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`,
      provider: 'youtube',
    };
  }

  // 2. Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/i);
  if (vimeoMatch && vimeoMatch[3]) {
    return {
      isEmbed: true,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1&dnt=1`,
      provider: 'vimeo',
    };
  }

  // 3. TikTok
  const tiktokMatch = url.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|v\/)(\d+)/i);
  if (tiktokMatch && tiktokMatch[1]) {
    return {
      isEmbed: true,
      embedUrl: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`,
      provider: 'tiktok',
    };
  }

  // 4. Dailymotion
  const dmMatch = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/i) || url.match(/dai\.ly\/([a-zA-Z0-9]+)/i);
  if (dmMatch && dmMatch[1]) {
    return {
      isEmbed: true,
      embedUrl: `https://www.dailymotion.com/embed/video/${dmMatch[1]}?autoplay=1`,
      provider: 'dailymotion',
    };
  }

  // 5. Facebook video
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    return {
      isEmbed: true,
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`,
      provider: 'facebook',
    };
  }

  // 6. Instagram reel / post
  if (url.includes('instagram.com/p/') || url.includes('instagram.com/reel/') || url.includes('instagram.com/tv/')) {
    const cleanUrl = url.split('?')[0].replace(/\/+$/, '');
    return {
      isEmbed: true,
      embedUrl: `${cleanUrl}/embed`,
      provider: 'instagram',
    };
  }

  // 7. Google Drive Video
  // Matches drive.google.com/file/d/FILE_ID, drive.google.com/open?id=FILE_ID, docs.google.com/file/d/FILE_ID
  const driveMatch1 = url.match(/(?:drive|docs)\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  const driveMatch2 = url.match(/(?:drive|docs)\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/i);
  const driveId = (driveMatch1 && driveMatch1[1]) || (driveMatch2 && driveMatch2[1]);
  if (driveId) {
    return {
      isEmbed: true,
      embedUrl: `https://drive.google.com/file/d/${driveId}/preview`,
      provider: 'googledrive',
    };
  }

  // 8. Direct video formats (.mp4, .webm, .ogg, .m3u8)
  if (/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i.test(url) || url.startsWith('blob:') || url.startsWith('data:video/')) {
    return {
      isEmbed: false,
      directUrl: url,
      provider: 'direct',
    };
  }

  // Fallback: Check if it's already an embed URL
  if (url.includes('/embed/') || url.includes('player.')) {
    return {
      isEmbed: true,
      embedUrl: url,
      provider: 'unknown',
    };
  }

  return {
    isEmbed: false,
    directUrl: url,
    provider: 'unknown',
  };
}
