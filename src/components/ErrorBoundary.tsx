import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { getTranslation } from '../services/translations';
import { Language } from '../types';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("NeuroYobe Caught Exception in ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private getCurrentLang(): Language {
    try {
      const saved = localStorage.getItem('yassa_tube_lang');
      if (saved === 'ar' || saved === 'en' || saved === 'ja' || saved === 'fr' || saved === 'zh') {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'ar';
  }

  public render() {
    if (this.state.hasError) {
      const lang = this.getCurrentLang();
      const isRtl = lang === 'ar';
      const t = (key: string) => getTranslation(lang, key);

      return (
        <div className="min-h-screen bg-[#050a14] text-slate-100 flex flex-col items-center justify-center p-6 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">
            {lang === 'ar' ? 'عذراً، حدث خطأ أثناء تشغيل الصفحة' : 'Oops, an error occurred while running the page'}
          </h1>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            {this.state.error?.message || (lang === 'ar' ? 'حدث خطأ غير متوقع، يمكنك إعادة تحميل الصفحة للمتابعة.' : 'An unexpected error occurred. You can reload the page to continue.')}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              {lang === 'ar' ? 'إعادة تحميل الصفحة' : 'Reload Page'}
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = window.location.pathname;
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-sm font-semibold flex items-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              {lang === 'ar' ? 'إعادة ضبط البيانات' : 'Reset Data'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

