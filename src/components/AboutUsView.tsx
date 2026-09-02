import React from 'react';
import {
  Sparkles,
  Zap,
  Shield,
  HardDriveDownload,
  Film,
  Globe2,
  Bell,
  SlidersHorizontal,
  Compass,
  Eye,
  CheckCircle2,
  Layers,
  ArrowRight,
  ArrowLeft,
  Share2,
  Heart
} from 'lucide-react';
import { CosmicLogo } from './CosmicLogo';
import { getTranslation } from '../services/translations';
import type { Language } from '../types';

interface AboutUsViewProps {
  language: Language;
  onNavigateHome: () => void;
  onNavigatePrivacy: () => void;
  onNavigateSupport: () => void;
}

export const AboutUsView: React.FC<AboutUsViewProps> = ({
  language,
  onNavigateHome,
  onNavigatePrivacy,
  onNavigateSupport
}) => {
  const t = (key: string, fallback?: string) => getTranslation(language, key, fallback);
  const isRtl = language === 'ar';

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0e172a] via-[#09101f] to-[#050a14] border border-cyan-500/20 p-8 sm:p-12 text-center shadow-2xl">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs sm:text-sm font-medium">
            <Sparkles className="w-4 h-4 animate-pulse text-cyan-400" />
            <span>{t('aboutHeroBadge', 'منصة المستقبل للفيديو والمحتوى الإبداعي')}</span>
          </div>

          <div className="flex items-center justify-center scale-110 sm:scale-125 py-2">
            <CosmicLogo size="lg" />
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            {t('aboutUsTitle', 'عن منصة NeuroYobe')}
          </h1>

          <p className="text-lg sm:text-xl text-cyan-200/90 font-medium">
            {t('aboutUsSubtitle', 'الجيل الجديد من منصات بث الفيديو الذكية والمجتمعات الإبداعية')}
          </p>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            {t('aboutHeroTagline', 'تم تصميم NeuroYobe لتمنح المشاهدين وصناع المحتوى تجربة استثنائية تجمع بين سرعة البث الخارقة، التصميم الكوني الراقي، وحرية التعبير مع أعلى معايير الخصوصية والأمان.')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={onNavigateHome}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all transform active:scale-95 flex items-center gap-2"
            >
              <span>{t('home', 'الرئيسية')}</span>
              {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4 text-slate-950" />}
            </button>
            <button
              onClick={onNavigatePrivacy}
              className="px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold text-sm transition-all"
            >
              {t('privacyTitle', 'الخصوصية وقواعد الأمان')}
            </button>
          </div>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 sm:p-8 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-5">
            <Compass className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <span>{t('aboutMissionTitle', 'رسالتنا')}</span>
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {t('aboutMissionDesc', 'إعادة تعريف تجربة مشاهدة ونشر الفيديو عبر الإنترنت من خلال توفير بيئة ذكية، خفيفة، وسريعة للغاية، تمكّن المبدعين من مشاركة أفكارهم بحرية وتضمن للمستخدمين تجربة ترفيهية وتعليمية غنية بدون إعلانات متطفلة أو تتبع غير مرغوب فيه.')}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 sm:p-8 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-5">
            <Eye className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <span>{t('aboutVisionTitle', 'رؤيتنا')}</span>
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {t('aboutVisionDesc', 'أن نكون المنصة الرائدة عالمياً في بث مقاطع الفيديو الطويلة والقصيرة والمجتمعات التفاعلية، مدعومة بأحدث التقنيات مع الحفاظ الكامل على سيادة المستخدم على بياناته وهويته الرقمية.')}
          </p>
        </div>
      </div>

      {/* Core Pillars */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            {t('aboutPillarsTitle', 'ركائز المنصة ومميزاتها الأساسية')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-4 hover:border-cyan-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {t('pillarFastStreamingTitle', 'بث ذكي وفائق السرعة')}
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              {t('pillarFastStreamingDesc', 'مشغل فيديو حديث مدعوم بتقنيات الضغط والتحميل التكيفي لضمان تشغيل فوري وسلس بجودة عالية.')}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-4 hover:border-cyan-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {t('pillarStudioToolsTitle', 'استوديو صانع المحتوى')}
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              {t('pillarStudioToolsDesc', 'أدوات رفع متقدمة من الجهاز أو عبر الروابط الخارجية، فيديوهات طويلة، مقاطع Shorts، منشورات المجتمع واستطلاعات الرأي.')}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-4 hover:border-cyan-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {t('pillarPrivacyFirstTitle', 'الخصوصية والأمان أولاً')}
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              {t('pillarPrivacyFirstDesc', 'حماية مطلقة لبيانات المستخدمين، تشفير متقدم، بدون بيع للبيانات أو تعقب متطفل للأنشطة الشخصية.')}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-4 hover:border-cyan-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {t('pillarOfflinePlaybackTitle', 'التنزيل والتشغيل بدون إنترنت')}
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              {t('pillarOfflinePlaybackDesc', 'إمكانية حفظ وتنزيل مقاطع الفيديو المفضلة للاستمتاع بها في أي وقت ومكان بدون الحاجة لاتصال بالإنترنت.')}
            </p>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="rounded-3xl bg-slate-900/50 border border-slate-800 p-8 space-y-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white text-center">
          {t('aboutFeaturesTitle', 'لماذا يفضل الملايين منصة NeuroYobe؟')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-1">
                {t('aboutFeature1Title', 'تنوع لا محدود في المحتوى')}
              </h4>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                {t('aboutFeature1Desc', 'مكتبة متجددة تشمل التعليم، التكنولوجيا، الألعاب، العلوم، الموسيقى، والترفيه.')}
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-1">
                {t('aboutFeature2Title', 'نظام إشعارات فوري وتفاعلي')}
              </h4>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                {t('aboutFeature2Desc', 'ابقَ على اطلاع دائم بجديد القنوات المشترك بها والتفاعل مع متابعيك لحظياً.')}
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-1">
                {t('aboutFeature3Title', 'دعم متعدد اللغات عالمياً')}
              </h4>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                {t('aboutFeature3Desc', 'واجهة متكاملة تدعم 5 لغات عالمية مع توجيه تلقائي وترجمة فورية.')}
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-1">
                {t('aboutFeature4Title', 'لوحة تحكم متطورة للمشرفين')}
              </h4>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                {t('aboutFeature4Desc', 'تحكم برمجي وتقني كامل لإدارة المحتوى بأمان واستقرار فائق.')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400">100K+</div>
          <div className="text-xs sm:text-sm text-slate-400">{t('aboutStatsCreators', 'صانع محتوى ومبدع')}</div>
        </div>
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-400">1M+</div>
          <div className="text-xs sm:text-sm text-slate-400">{t('aboutStatsVideos', 'فيديو ومشاهدة نشطة')}</div>
        </div>
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">5</div>
          <div className="text-xs sm:text-sm text-slate-400">{t('aboutStatsLanguages', 'لغات عالمية مدعومة')}</div>
        </div>
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-400">99.9%</div>
          <div className="text-xs sm:text-sm text-slate-400">{t('aboutStatsUptime', 'نسبة استقرار وبث فوري')}</div>
        </div>
      </div>

      {/* Join Community CTA */}
      <div className="rounded-3xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-purple-950/40 border border-cyan-500/30 p-8 text-center space-y-4">
        <h3 className="text-xl sm:text-2xl font-bold text-white">
          {t('aboutJoinCommunityTitle', 'انضم إلى مجتمع NeuroYobe اليوم')}
        </h3>
        <p className="text-slate-300 text-sm max-w-xl mx-auto">
          {t('aboutJoinCommunityDesc', 'سواء كنت صانع محتوى يطمح للوصول لجمهور واسع أو مشاهداً يبحث عن محتوى ثري، منصتنا هي وجهتك المثالية.')}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={onNavigateHome}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-md transition-all"
          >
            {t('home', 'ابدأ الاستكشاف الآن')}
          </button>
          <button
            onClick={onNavigateSupport}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all"
          >
            {t('support', 'تواصل مع الدعم')}
          </button>
        </div>
      </div>
    </div>
  );
};
