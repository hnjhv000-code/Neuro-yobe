import React from 'react';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  UserCheck,
  FileCheck2,
  AlertTriangle,
  HardDrive,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { CosmicLogo } from './CosmicLogo';
import { getTranslation } from '../services/translations';
import type { Language } from '../types';

interface PrivacyViewProps {
  language: Language;
  onNavigateHome: () => void;
  onNavigateSupport: () => void;
  onNavigateAbout: () => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({
  language,
  onNavigateHome,
  onNavigateSupport,
  onNavigateAbout
}) => {
  const t = (key: string, fallback?: string) => getTranslation(language, key, fallback);
  const isRtl = language === 'ar';

  const sections = [
    {
      icon: <UserCheck className="w-5 h-5 text-cyan-400" />,
      titleKey: 'privacySec1Title',
      descKey: 'privacySec1Desc',
      badge: 'البيانات'
    },
    {
      icon: <Lock className="w-5 h-5 text-emerald-400" />,
      titleKey: 'privacySec2Title',
      descKey: 'privacySec2Desc',
      badge: 'التشفير'
    },
    {
      icon: <EyeOff className="w-5 h-5 text-purple-400" />,
      titleKey: 'privacySec3Title',
      descKey: 'privacySec3Desc',
      badge: 'الخصوصية'
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-blue-400" />,
      titleKey: 'privacySec4Title',
      descKey: 'privacySec4Desc',
      badge: 'التحكم'
    },
    {
      icon: <FileCheck2 className="w-5 h-5 text-amber-400" />,
      titleKey: 'privacySec5Title',
      descKey: 'privacySec5Desc',
      badge: 'الملكية'
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-pink-400" />,
      titleKey: 'privacySec6Title',
      descKey: 'privacySec6Desc',
      badge: 'الأمان'
    },
    {
      icon: <HardDrive className="w-5 h-5 text-teal-400" />,
      titleKey: 'privacySec7Title',
      descKey: 'privacySec7Desc',
      badge: 'التخزين'
    }
  ];

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-10">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0a1628] via-[#07101e] to-[#050a14] border border-emerald-500/20 p-8 sm:p-12 text-center shadow-2xl">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t('privacyHeroBadge', 'أمان وتشفير معتمد 100%')}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            {t('privacyTitle', 'سياسة الخصوصية وقواعد الأمان')}
          </h1>

          <p className="text-base sm:text-lg text-emerald-200/90 font-medium">
            {t('privacySubtitle', 'التزامنا الكامل بحماية بياناتك وخصوصيتك وتوفير بيئة تصفح آمنة وموثوقة')}
          </p>

          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-right">
            {t('privacyIntro', 'في NeuroYobe (نيورو يوب)، نضع خصوصية وأمان مستخدمينا وصناع المحتوى على رأس أولوياتنا. تحدد هذه الوثيقة بوضوح كيفية التعامل مع البيانات، معايير التشفير المتبعة، وإرشادات الاستخدام الآمن.')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={onNavigateHome}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
            >
              <span>{t('home', 'الرئيسية')}</span>
              {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
            <button
              onClick={onNavigateAbout}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm transition-all"
            >
              {t('aboutUsTitle', 'عن المنصة')}
            </button>
            <button
              onClick={onNavigateSupport}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{t('support', 'الدعم الفني والشكاوى')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security Trust Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">{t('privacyBadgeEncrypted', 'تشفير شامل للبيانات')}</div>
            <div className="text-xs text-slate-400">TLS 1.3 / SSL Encryption</div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
            <EyeOff className="w-6 h-6" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">{t('privacyBadgeZeroTracking', 'صفر تتبع متطفل')}</div>
            <div className="text-xs text-slate-400">No Ads & No Data Selling</div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">{t('privacyBadgeUserControl', 'تحكم كامل بالمحتوى')}</div>
            <div className="text-xs text-slate-400">Instant History & Account Control</div>
          </div>
        </div>
      </div>

      {/* Detailed Policy Sections */}
      <div className="space-y-6">
        {sections.map((section, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 sm:p-8 hover:border-slate-700 transition-all space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
                {section.icon}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {t(section.titleKey)}
              </h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-2 sm:pl-4 border-l-2 border-slate-800">
              {t(section.descKey)}
            </p>
          </div>
        ))}
      </div>

      {/* Footer metadata & Contact */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>{t('privacyLastUpdated', 'آخر تحديث للسياسة: سبتمبر 2026')}</span>
        </div>

        <button
          onClick={onNavigateSupport}
          className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 hover:text-cyan-200 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2"
        >
          <Mail className="w-4 h-4" />
          <span>{t('contactPrivacyOfficer', 'تواصل مع مسؤول الخصوصية والأمان')}</span>
        </button>
      </div>
    </div>
  );
};
