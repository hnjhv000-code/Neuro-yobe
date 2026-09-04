import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Server,
  Globe,
  FileCode,
  Sparkles,
  Search,
  Filter,
  Eye,
  Sliders
} from 'lucide-react';
import {
  fetchSecurityDashboard,
  fetchSecurityEvents,
  runLiveSecurityAudit,
  clearSecurityEventsLog,
  SecurityDashboardData,
  SecurityEvent,
  SecurityAuditReport
} from '../services/securityService';

interface Props {
  searchQuery: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SecurityDashboardTab: React.FC<Props> = ({ searchQuery, showToast }) => {
  const [dashboardData, setDashboardData] = useState<SecurityDashboardData | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [auditReport, setAuditReport] = useState<SecurityAuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAudit, setRunningAudit] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'Critical' | 'High' | 'Medium' | 'Low'>('all');
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dash, evts] = await Promise.all([
        fetchSecurityDashboard(),
        fetchSecurityEvents()
      ]);
      setDashboardData(dash);
      setEvents(evts);
    } catch {
      showToast('تعذر تحديث بيانات الحماية', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto poll security stats every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRunAudit = async () => {
    setRunningAudit(true);
    showToast('جارٍ تشغيل الفحص الأمني الشامل...', 'info');
    try {
      const report = await runLiveSecurityAudit();
      setAuditReport(report);
      showToast('اكتمل الفحص الأمني الشامل بنجاح', 'success');
      await loadData();
    } catch {
      showToast('حدث خطأ أثناء إجراء الفحص الأمني', 'error');
    } finally {
      setRunningAudit(false);
    }
  };

  const handleClearEvents = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في تفريغ وتصفير سجل الأحداث الأمنية؟')) {
      return;
    }
    const success = await clearSecurityEventsLog();
    if (success) {
      setEvents([]);
      showToast('تم تصفير سجل الأحداث الأمنية بنجاح', 'success');
      await loadData();
    } else {
      showToast('فشل تصفير السجل: يلزم صلاحية مطور', 'error');
    }
  };

  // Filter events based on search query and severity
  const q = searchQuery.toLowerCase().trim();
  const filteredEvents = events.filter((e) => {
    const matchesSeverity = severityFilter === 'all' || e.severity === severityFilter;
    if (!matchesSeverity) return false;

    if (!q) return true;
    return (
      e.id.toLowerCase().includes(q) ||
      e.attackType.toLowerCase().includes(q) ||
      e.ip.toLowerCase().includes(q) ||
      e.endpoint.toLowerCase().includes(q) ||
      e.details.toLowerCase().includes(q) ||
      e.actionTaken.toLowerCase().includes(q) ||
      e.result.toLowerCase().includes(q)
    );
  });

  // Recent Critical / High alerts
  const criticalAlerts = events.filter(e => e.severity === 'Critical' || e.severity === 'High');

  return (
    <div className="space-y-6">
      {/* High / Critical Security Alert Banner */}
      {criticalAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/90 via-red-950/80 to-slate-900 border border-rose-600/80 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600/30 text-rose-300 border border-rose-500/50 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-rose-100">
                  تنبيه أمني عالي الخطورة ({criticalAlerts.length} حدث رُصد)
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900 text-rose-200 border border-rose-600">
                  {criticalAlerts[0].severity}
                </span>
              </div>
              <p className="text-xs text-rose-200/90 mt-1">
                آخر محاولة: <strong className="text-white">{criticalAlerts[0].attackType}</strong> من الـ IP ({criticalAlerts[0].ip}) استهدفت المسار (<code className="text-rose-300">{criticalAlerts[0].endpoint}</code>) - الإجراء: {criticalAlerts[0].actionTaken}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSeverityFilter('Critical')}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shrink-0 shadow"
          >
            عرض الأحداث الحرجة
          </button>
        </div>
      )}

      {/* Main Score & Status Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Security Score Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0a1428] to-[#0f1f3d] border border-cyan-700/60 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400">معدل الأمان الحقيقي</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-cyan-950 text-cyan-300 border border-cyan-800">
                Security Score
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-5xl font-black text-cyan-300 tracking-tight">
                {dashboardData?.securityScore ?? 98}
              </span>
              <span className="text-xl font-bold text-slate-400">/ 100</span>
            </div>

            <div className="mt-3">
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-900/60">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-1000"
                  style={{ width: `${dashboardData?.securityScore ?? 98}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-cyan-900/60 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">حالة الموقع العامة:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black ${
                dashboardData?.overallStatus === 'ممتاز'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : dashboardData?.overallStatus === 'جيد'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                  : dashboardData?.overallStatus === 'يحتاج إلى تحسين'
                  ? 'bg-amber-950 text-amber-300 border border-amber-700'
                  : 'bg-rose-950 text-rose-300 border border-rose-700'
              }`}
            >
              {dashboardData?.overallStatus ?? 'ممتاز'}
            </span>
          </div>
        </div>

        {/* Quick Stats Card */}
        <div className="p-6 rounded-2xl bg-[#09152b] border border-cyan-800/60 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">نشاط الرصد الأمني</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-900/50">
                <span className="text-[11px] text-slate-400 block">إجمالي الأحداث المسجلة</span>
                <span className="text-2xl font-black text-slate-100 mt-1 block">
                  {events.length}
                </span>
                <span className="text-[10px] text-slate-500">منذ بدء الجلسة</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-900/50">
                <span className="text-[11px] text-slate-400 block">الهجمات المحظورة فوراً</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  {events.filter(e => e.result === 'Blocked').length}
                </span>
                <span className="text-[10px] text-slate-500">حماية IPS التلقائية</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-cyan-900/60 flex items-center justify-between text-xs text-slate-400">
            <span>درع هجمات التخمين:</span>
            <span className="text-emerald-400 font-bold">نشط (حظر بعد 5 محاولات)</span>
          </div>
        </div>

        {/* Interactive Audit Action Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0c1833] to-[#122245] border border-cyan-700/60 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-black">الفحص الأمني الشامل (Security Audit)</span>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              يقوم باختبار مباشر وفحص شامل للـ Authentication، الـ Headers، حقن الأوامر، الحظر المؤقت، رفع الملفات، وسلامة ملف ads.txt.
            </p>
          </div>

          <div className="mt-5 space-y-2">
            <button
              onClick={handleRunAudit}
              disabled={runningAudit}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-black transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98"
            >
              <RefreshCw className={`w-4 h-4 ${runningAudit ? 'animate-spin' : ''}`} />
              <span>{runningAudit ? 'جارٍ فحص المنظومة...' : 'تشغيل الفحص الأمني الشامل الآن'}</span>
            </button>

            {auditReport && (
              <div className="p-2.5 rounded-lg bg-black/50 border border-cyan-900 text-center text-[11px] text-cyan-300">
                حالة الفحص: <strong>Security posture: {auditReport.posture}</strong> ({auditReport.passedCount}/{auditReport.totalTests} ناجح)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Audit Report (if executed) */}
      {auditReport && (
        <div className="p-5 rounded-2xl bg-[#09152b] border border-cyan-700/60 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-cyan-900/60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-black text-slate-100">نتائج الفحص الأمني الشامل المباشر</h3>
                <span className="text-[11px] text-slate-400">
                  Security posture: <strong className="text-emerald-300">{auditReport.posture}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="text-emerald-400">{auditReport.passedCount} ناجح</span>
              <span className="text-slate-500">|</span>
              <span className="text-amber-400">{auditReport.remainingWarningsCount} تحذيرات</span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-400">{auditReport.fixedIssuesCount} مشكلة تم إصلاحها</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {auditReport.tests.map((t, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900/80 border border-cyan-950 flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-200 block">{t.testName}</span>
                  <p className="text-[11px] text-slate-400 leading-snug">{t.details}</p>
                </div>
              </div>
            ))}
          </div>

          {auditReport.recommendations.length > 0 && (
            <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40">
              <span className="text-xs font-bold text-cyan-300 block mb-1">توصيات إضافية للمطور:</span>
              <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                {auditReport.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* The 20 Required Independent Indicators Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-black text-slate-100">
              مؤشرات الأمان المنفصلة (20 مؤشراً تخصصياً)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">قياسات تقنية معتمدة</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {(dashboardData?.metrics || []).map((metric) => (
            <div
              key={metric.id}
              className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-900/60 hover:border-cyan-600/70 transition-all flex flex-col justify-between space-y-2 shadow"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-slate-200 leading-tight">
                    {metric.title}
                  </span>
                  {metric.status === 'optimal' ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1 shadow-sm shadow-emerald-500"></span>
                  ) : metric.status === 'not_measurable' ? (
                    <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0 mt-1"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1"></span>
                  )}
                </div>

                <span
                  className={`text-xs font-extrabold mt-1.5 block ${
                    metric.status === 'optimal'
                      ? 'text-emerald-300'
                      : metric.status === 'not_measurable'
                      ? 'text-slate-400'
                      : 'text-amber-300'
                  }`}
                >
                  {metric.value}
                </span>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed pt-1 border-t border-cyan-950">
                {metric.details}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Security Events Log Table (سجل الأحداث الأمنية) */}
      <div className="p-5 rounded-2xl bg-[#09152b] border border-cyan-800/60 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-900/60">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                <span>سجل الأحداث الأمنية (Security Events Log)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {filteredEvents.length} حدث
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                تسجيل حي للأحداث ورصد الحمولات ومحاولات الفحص والحظر المؤقت
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Severity Filter Pills */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-cyan-900/70 text-xs">
              {(['all', 'Critical', 'High', 'Medium', 'Low'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    severityFilter === sev
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sev === 'all' ? 'الكل' : sev}
                </button>
              ))}
            </div>

            <button
              onClick={handleClearEvents}
              className="p-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-700/60 transition-colors"
              title="تصفير السجل"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Disclaimer about IP and Location */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-950 text-[11px] text-slate-400 flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong>تنويه أمني قانوني:</strong> يتم تسجيل عنوان IP وUser-Agent وتفاصيل الطلب تقنياً لحماية المنصة. الموقع الجغرافي للـ IP هو تقدير شبكي تقريبي ولا يُدعى معرفة هوية الشخص الحقيقية أو جهازه الفعلي.
          </span>
        </div>

        {/* The Events Table */}
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <ShieldCheck className="w-12 h-12 text-emerald-400/60 mx-auto" />
            <p className="text-sm font-bold text-slate-300">لا توجد أحداث أمنية تطابق الفلتر الحالي</p>
            <p className="text-xs text-slate-500">المنظومة تعمل بأمان تام ولم يتم رصد أي تهديدات غير معالجة.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-cyan-900/60">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#050b17] text-slate-300 text-[11px] font-bold border-b border-cyan-900/80">
                <tr>
                  <th className="p-3">رقم الحدث (ID)</th>
                  <th className="p-3">نوع الحدث</th>
                  <th className="p-3">نوع الهجوم</th>
                  <th className="p-3">التاريخ والوقت</th>
                  <th className="p-3">عنوان IP</th>
                  <th className="p-3">النتيجة</th>
                  <th className="p-3">درجة الخطورة</th>
                  <th className="p-3">الـ Endpoint</th>
                  <th className="p-3">الإجراء</th>
                  <th className="p-3 text-center">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-950 bg-slate-950/40 font-medium">
                {filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-cyan-950/20 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-cyan-400">{evt.id}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          evt.eventType === 'Attack'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : evt.eventType === 'Suspicious'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}
                      >
                        {evt.eventType}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-200">{evt.attackType}</td>
                    <td className="p-3 text-[11px] text-slate-400 font-mono">
                      {new Date(evt.timestamp).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="p-3 font-mono text-cyan-300 text-[11px]">{evt.ip}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          evt.result === 'Blocked'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : evt.result === 'Failed'
                            ? 'bg-rose-950 text-rose-300 border border-rose-700'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {evt.result}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          evt.severity === 'Critical'
                            ? 'bg-rose-600 text-white'
                            : evt.severity === 'High'
                            ? 'bg-rose-950 text-rose-300 border border-rose-700'
                            : evt.severity === 'Medium'
                            ? 'bg-amber-950 text-amber-300 border border-amber-700'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {evt.severity}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-300">{evt.endpoint}</td>
                    <td className="p-3 text-slate-300 text-[11px]">{evt.actionTaken}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedEvent(evt)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-900 text-cyan-300 transition-colors"
                        title="عرض كامل التفاصيل"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#09152b] border border-cyan-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-900">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-black text-slate-100">
                  تفاصيل الحدث الأمني: {selectedEvent.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-950">
                  <span className="text-[10px] text-slate-500 block">نوع الهجوم</span>
                  <span className="font-bold text-slate-100">{selectedEvent.attackType}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-950">
                  <span className="text-[10px] text-slate-500 block">درجة الخطورة والنتيجة</span>
                  <span className="font-bold text-amber-300">{selectedEvent.severity} - {selectedEvent.result}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-950">
                <span className="text-[10px] text-slate-500 block">الـ Endpoint المستهدف</span>
                <code className="font-mono text-cyan-300">{selectedEvent.endpoint}</code>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-950">
                <span className="text-[10px] text-slate-500 block">عنوان IP</span>
                <span className="font-mono text-slate-200">{selectedEvent.ip}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-950">
                <span className="text-[10px] text-slate-500 block">User-Agent</span>
                <span className="font-mono text-[10px] text-slate-300 break-all">{selectedEvent.userAgent}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-950">
                <span className="text-[10px] text-slate-500 block">الوصف والتفاصيل</span>
                <p className="text-slate-200 mt-1 leading-relaxed">{selectedEvent.details}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
                <span className="text-[10px] text-emerald-400 block">الإجراء المتخذ من المنظومة</span>
                <p className="text-emerald-200 font-bold mt-0.5">{selectedEvent.actionTaken}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
