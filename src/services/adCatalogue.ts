export interface VideoAdCreative {
  id: string;
  title: string;
  advertiser: string;
  advertiserAvatar: string;
  websiteUrl: string;
  displayUrl: string;
  videoUrl?: string;
  imageUrl?: string;
  badgeText: string;
  durationSeconds: number;
  skippableAfterSeconds: number; // e.g. 5, or 0 for non-skippable
}

export const PRE_ROLL_ADS: VideoAdCreative[] = [
  {
    id: 'pr-cloud-1',
    title: 'استضافة سحابية فائقة السرعة مع حماية DDoS ذكية',
    advertiser: 'NovaCloud Ultra',
    advertiserAvatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=100&auto=format&fit=crop&q=80',
    websiteUrl: 'https://google.com',
    displayUrl: 'novacloud.io/ultra-speed',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cyber-network-connection-points-in-motion-41584-large.mp4',
    badgeText: 'إعلان ممول',
    durationSeconds: 15,
    skippableAfterSeconds: 5
  },
  {
    id: 'pr-ai-2',
    title: 'أنظمة الذكاء الاصطناعي لتطوير وتحليل المحتوى الرقمي',
    advertiser: 'NeuroTech AI Hub',
    advertiserAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    websiteUrl: 'https://google.com',
    displayUrl: 'neurotech-ai.global',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-technology-digital-grid-loop-41585-large.mp4',
    badgeText: 'إعلان ممول',
    durationSeconds: 12,
    skippableAfterSeconds: 5
  },
  {
    id: 'pr-sec-3',
    title: 'تأمين الحسابات والمعاملات الرقمية بأعلى معايير التشفير',
    advertiser: 'CipherShield Pro',
    advertiserAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    websiteUrl: 'https://google.com',
    displayUrl: 'ciphershield.net/security',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-motherboard-computer-technology-animation-41589-large.mp4',
    badgeText: 'إعلان ممول',
    durationSeconds: 8,
    skippableAfterSeconds: 0 // Non-skippable short ad
  }
];

export const BOTTOM_BANNER_ADS = [
  {
    id: 'bn-1',
    title: 'احصل على دومين وتصميم موقعك بالذكاء الاصطناعي مجاناً',
    sponsor: 'HostPro Studio',
    ctaText: 'معرفة المزيد',
    url: 'https://google.com',
    clientPubId: 'ca-pub-3905915653534385'
  },
  {
    id: 'bn-2',
    title: 'تطبيق التداول وإدارة الأصول الذكية الأكثر ثقة في العالم العربي',
    sponsor: 'Apex Global Trade',
    ctaText: 'تنزيل التطبيق',
    url: 'https://google.com',
    clientPubId: 'ca-pub-3905915653534385'
  },
  {
    id: 'bn-3',
    title: 'كورسات هندسة البرمجيات والذكاء الاصطناعي بشهادات معتمدة عالمياً',
    sponsor: 'CodeAcademy Future',
    ctaText: 'سجل مجاناً',
    url: 'https://google.com',
    clientPubId: 'ca-pub-3905915653534385'
  }
];

export interface ShortsAdCreative {
  id: string;
  title: string;
  description: string;
  advertiserName: string;
  advertiserAvatar: string;
  ctaText: string;
  websiteUrl: string;
  mediaType: 'video' | 'image';
  mediaUrl: string;
}

export const SHORTS_INTERSTITIAL_ADS: ShortsAdCreative[] = [
  {
    id: 'sh-ad-1',
    title: 'عالم التكنولوجيا بين يديك! حمل أقوى تطبيق إنتاجية لهذا العام',
    description: 'تنظيم مهام، تحليلات ذكية، وتزامن فوري بين جميع أجهزتك بنقرة واحدة.',
    advertiserName: 'SyncPulse Productivity',
    advertiserAvatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=100&auto=format&fit=crop&q=80',
    ctaText: 'تنزيل مجاناً',
    websiteUrl: 'https://google.com',
    mediaType: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-vertical-animation-of-futuristic-lines-and-dots-42971-large.mp4'
  },
  {
    id: 'sh-ad-2',
    title: 'سماعات الألعاب الاحترافية ثلاثية الأبعاد بعزل صوتي 100%',
    description: 'صوت محيطي 7.1 نقي للغاية مع بطارية تدوم أكثر من 60 ساعة متواصلة.',
    advertiserName: 'SoundWave Titan',
    advertiserAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    ctaText: 'اطلب الآن مع شحن مجاني',
    websiteUrl: 'https://google.com',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'sh-ad-3',
    title: 'طور مهاراتك في البرمجة مع مدربك الذكي المدمج',
    description: 'تطبيق تفاعلي يشرح لك الأخطاء ويساعدك في كتابة كود نظيف واحترافي.',
    advertiserName: 'DevTutor AI',
    advertiserAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    ctaText: 'تجربة مجانية',
    websiteUrl: 'https://google.com',
    mediaType: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-glowing-digital-network-connections-in-the-dark-41586-large.mp4'
  },
  {
    id: 'sh-ad-4',
    title: 'الساعة الرياضية الذكية المقاومة للماء مع مراقبة النبض والأكسجين',
    description: 'شاشة AMOLED فائقة السطوع ونظام GPS متقدم لكل مغامراتك.',
    advertiserName: 'ChronoFit Pro',
    advertiserAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80',
    ctaText: 'استكشف التخفيضات',
    websiteUrl: 'https://google.com',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'
  }
];

/**
 * Smart probabilistic check whether to show an ad for a video view.
 * Displays sometimes and skips sometimes (e.g. ~65% probability)
 */
export function shouldDisplayLongVideoAd(): boolean {
  return Math.random() < 0.65;
}

export function shouldDisplayBannerAd(): boolean {
  return Math.random() < 0.85;
}
