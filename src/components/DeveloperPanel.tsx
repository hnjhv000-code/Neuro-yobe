import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Film,
  Video,
  Search,
  MessageSquareWarning,
  Image as ImageIcon,
  Palette,
  BarChart3,
  Tv,
  Users2,
  Activity,
  Settings,
  ShieldCheck,
  Trash2,
  Ban,
  CheckCircle,
  Eye,
  Send,
  Upload,
  Sparkles,
  Lock,
  Compass,
  AlertTriangle,
  Globe,
  Smartphone,
  Laptop,
  RotateCcw,
  ShieldAlert,
  UserX,
  Flag,
  History,
  Clock,
  Play
} from 'lucide-react';
import { CosmicLogo } from './CosmicLogo';
import { compressDeviceImage } from '../services/mediaStorage';
import {
  subscribeToAllUsers,
  subscribeToVideos,
  subscribeToPosts,
  subscribeToSupportTickets,
  subscribeToActivityLogs,
  subscribeToAllSubscriptions,
  saveDeveloperSettings,
  deleteUserAndData,
  deleteAllUsers,
  updateUserProfileFields,
  deleteVideo,
  deleteAllVideos,
  deletePost,
  replyToSupportTicket,
  rejectSupportTicket,
  deleteSupportTicket,
  wipeAllSiteContentAndVideos,
  subscribeToVisitors,
  deleteVisitor,
  banVisitor,
  clearAllVisitors,
  subscribeToVisitorStats,
  resetDailyVisits,
  resetMonthlyVisits,
  resetTotalVisits,
  subscribeToComplaintReports,
  updateComplaintStatus,
  deleteComplaintReport,
  deleteVideoWithReason,
  deletePostWithReason,
  subscribeToBlacklist,
  toggleUserBlacklist,
  deleteBlacklistRecord
} from '../services/firebase';
import { parseVideoUrl } from '../services/embedHelper';
import { useToast } from './Toast';
import type {
  UserProfile,
  VideoItem,
  PostItem,
  SupportTicket,
  ActivityLogItem,
  SubscriptionItem,
  DeveloperSettings,
  VisitorRecord,
  VisitorStats,
  ComplaintReport,
  BlacklistRecord
} from '../types';

interface DeveloperPanelProps {
  onClose: () => void;
  developerSettings: DeveloperSettings | null;
  onSelectVideo: (video: VideoItem) => void;
}

type TabType =
  | 'visitors'
  | 'complaints'
  | 'blacklist'
  | 'analytics'
  | 'users'
  | 'content'
  | 'videos'
  | 'search'
  | 'support'
  | 'background'
  | 'logo'
  | 'subscriptions'
  | 'posts'
  | 'activity'
  | 'settings';

export const DeveloperPanel: React.FC<DeveloperPanelProps> = ({
  onClose,
  developerSettings,
  onSelectVideo
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('visitors');

  // Real Firebase Data States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);

  // Analytics & Moderation Data States
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [visitorStats, setVisitorStats] = useState<VisitorStats | null>(null);
  const [complaints, setComplaints] = useState<ComplaintReport[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistRecord[]>([]);

  // Selected Visitor Modal
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);

  // Manual Blacklist Modal/Form
  const [manualUid, setManualUid] = useState('');
  const [manualReason, setManualReason] = useState('مخالفة معايير النشر واستخدام المنصة');

  // Search filter
  const [globalSearch, setGlobalSearch] = useState('');
  const [visitorSearch, setVisitorSearch] = useState('');
  const [complaintFilter, setComplaintFilter] = useState<'all' | 'pending' | 'reviewed' | 'action_taken'>('all');

  // Video Inspection Modal State
  const [inspectingVideo, setInspectingVideo] = useState<VideoItem | null>(null);
  const [deleteReason, setDeleteReason] = useState('مخالفة معايير وشروط استخدام المنصة');

  // Support Reply State
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);

  // Background Control State
  const [bgSection, setBgSection] = useState<'all' | 'header' | 'sidebar' | 'content'>('all');
  const [bgAnimation, setBgAnimation] = useState<'none' | 'nebula' | 'stars' | 'pulse'>('nebula');
  const [bgImageDataUrl, setBgImageDataUrl] = useState<string | null>(null);

  // Logo Control State
  const [customLogoDataUrl, setCustomLogoDataUrl] = useState<string | null>(null);

  // Global Notice State
  const [siteNotice, setSiteNotice] = useState(developerSettings?.siteNotice || '');

  const { showToast } = useToast();

  // Firebase Real-time subscriptions
  useEffect(() => {
    if (!isAuthenticated) return;

    const unUsers = subscribeToAllUsers(setUsers);
    const unVideos = subscribeToVideos(setVideos);
    const unPosts = subscribeToPosts(setPosts);
    const unTickets = subscribeToSupportTickets(setTickets);
    const unLogs = subscribeToActivityLogs(setLogs);
    const unSubs = subscribeToAllSubscriptions(setSubscriptions);
    const unVisitors = subscribeToVisitors(setVisitors);
    const unStats = subscribeToVisitorStats(setVisitorStats);
    const unComplaints = subscribeToComplaintReports(setComplaints);
    const unBlacklist = subscribeToBlacklist(setBlacklist);

    return () => {
      unUsers();
      unVideos();
      unPosts();
      unTickets();
      unLogs();
      unSubs();
      unVisitors();
      unStats();
      unComplaints();
      unBlacklist();
    };
  }, [isAuthenticated]);

  // Handle Developer Login (password: Yassa 20)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'Yassa 20') {
      setIsAuthenticated(true);
      setAuthError('');
      showToast('مرحباً بك في لوحة تحكم المطور NeuroYobe', 'success');
    } else {
      setAuthError('كلمة المرور غير صحيحة! تم منع الوصول.');
    }
  };

  // --- Background & Logo Controls ---
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast('جاري معالجة صورة الخلفية من الجهاز...', 'info');
      const dataUrl = await compressDeviceImage(file, 1920, 1080, 0.75);
      setBgImageDataUrl(dataUrl);
      showToast('تم تحميل صورة الخلفية بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل تحميل الصورة', 'error');
    }
  };

  const handleApplyBackground = async () => {
    if (!bgImageDataUrl) {
      showToast('يرجى اختيار صورة خلفية من جهازك أولاً', 'error');
      return;
    }
    await saveDeveloperSettings({
      ...developerSettings,
      customBgUrl: bgImageDataUrl,
      bgTargetSection: bgSection,
      bgAnimation
    });
    showToast('تم حفظ وتطبيق إعدادات الخلفية على الموقع بنجاح', 'success');
  };

  const handleRemoveBackground = async () => {
    await saveDeveloperSettings({
      ...developerSettings,
      customBgUrl: undefined,
      bgAnimation: 'none'
    });
    setBgImageDataUrl(null);
    showToast('تمت إزالة الخلفية والعودة للافتراضي', 'info');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast('جاري معالجة اللوجو من الجهاز...', 'info');
      const dataUrl = await compressDeviceImage(file, 512, 512, 0.9);
      setCustomLogoDataUrl(dataUrl);
      showToast('تم اختيار اللوجو الجديد', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل تحميل اللوجو', 'error');
    }
  };

  const handleApplyLogo = async () => {
    if (!customLogoDataUrl) {
      showToast('يرجى اختيار لوجو من جهازك أولاً', 'error');
      return;
    }
    await saveDeveloperSettings({
      ...developerSettings,
      customLogoUrl: customLogoDataUrl
    });
    showToast('تم تحديث لوجو الموقع الرسمي بنجاح', 'success');
  };

  const handleResetLogo = async () => {
    await saveDeveloperSettings({
      ...developerSettings,
      customLogoUrl: undefined
    });
    setCustomLogoDataUrl(null);
    showToast('تمت استعادة اللوجو الافتراضي الأصلي', 'info');
  };

  // --- Visitors & Reset Actions ---
  const handleResetDaily = async () => {
    if (window.confirm('هل أنت متأكد من تصفير عداد الزيارات اليومية؟')) {
      await resetDailyVisits();
      showToast('تم تصفير عداد الزيارات اليومية بنجاح 🔄', 'success');
    }
  };

  const handleResetMonthly = async () => {
    if (window.confirm('هل أنت متأكد من تصفير عداد الزيارات الشهرية؟')) {
      await resetMonthlyVisits();
      showToast('تم تصفير عداد الزيارات الشهرية بنجاح 🔄', 'success');
    }
  };

  const handleResetTotal = async () => {
    if (window.confirm('هل أنت متأكد من تصفير إجمالي الزيارات الكلية؟')) {
      await resetTotalVisits();
      showToast('تم تصفير إجمالي الزيارات الكلية بنجاح 🔄', 'success');
    }
  };

  const handleBanVisitor = async (visitorId: string, currentBanned?: boolean) => {
    const nextStatus = !currentBanned;
    await banVisitor(visitorId, nextStatus);
    showToast(nextStatus ? 'تم حظر هذا الزائر بنجاح ومنع وصوله للمنصة 🚫' : 'تم فك الحظر عن الزائر بنجاح ✅', 'info');
  };

  const handleDeleteVisitor = async (visitorId: string) => {
    if (window.confirm('هل تريد حذف سجل هذا الزائر من لوحة التحكم؟')) {
      await deleteVisitor(visitorId);
      if (selectedVisitor?.id === visitorId) setSelectedVisitor(null);
      showToast('تم حذف سجل الزائر', 'info');
    }
  };

  const handleClearAllVisitors = async () => {
    if (window.confirm('تحذير: هل أنت متأكد من مسح كافة سجلات الزوار المخزنة؟')) {
      await clearAllVisitors();
      setSelectedVisitor(null);
      showToast('تم مسح كافة سجلات الزوار بنجاح', 'success');
    }
  };

  // --- Complaints & Reports Actions ---
  const handleResolveComplaint = async (complaintId: string) => {
    await updateComplaintStatus(complaintId, 'reviewed');
    showToast('تم تحديد البلاغ كمراجع ومغلق ✅', 'success');
  };

  const handleDeleteComplaintReport = async (complaintId: string) => {
    await deleteComplaintReport(complaintId);
    showToast('تم حذف البلاغ من القائمة', 'info');
  };

  const handleDeleteReportedVideoWithStrike = async (complaint: ComplaintReport) => {
    const reasonPrompt = window.prompt(
      `حذف المحتوى المخالف واحتساب مخالفة (Strike) على الناشر:\n\nسبب الحذف:`,
      complaint.reason || 'مخالفة معايير وشروط استخدام منصة NeuroYobe'
    );
    if (!reasonPrompt) return;

    try {
      showToast('جاري حذف الفيديو وإشعار الناشر واحتساب المخالفة...', 'info');
      await deleteVideoWithReason(complaint.videoId, complaint.publisherUid, reasonPrompt);
      await updateComplaintStatus(complaint.id, 'action_taken');
      showToast('تم حذف الفيديو بنجاح، وتم إشعار الناشر مع احتساب مخالفة 🛡️ (عند 3 مخالفات يتم الحظر تلقائياً)', 'success');
    } catch {
      showToast('حدث خطأ أثناء تنفيذ الحذف', 'error');
    }
  };

  // --- Blacklist Actions ---
  const handleManualBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUid.trim()) {
      showToast('يرجى اختيار أو إدخال معرف المستخدم المراد حظره', 'error');
      return;
    }
    const targetUser = users.find(u => u.uid === manualUid.trim() || u.email === manualUid.trim());
    const uidToBan = targetUser ? targetUser.uid : manualUid.trim();

    await toggleUserBlacklist(uidToBan, true, manualReason.trim());
    setManualUid('');
    showToast('تمت إضافة المستخدم للقائمة السوداء وتطبيق منع النشر عليه 🚫', 'success');
  };

  const handleUnbanFromBlacklist = async (uid: string) => {
    if (window.confirm('هل تريد فك الحظر عن هذا المستخدم والسماح له بالنشر مجدداً؟')) {
      await toggleUserBlacklist(uid, false);
      await deleteBlacklistRecord(uid);
      showToast('تم فك الحظر بنجاح والسماح للمستخدم بالنشر ✅', 'success');
    }
  };

  // --- Users Actions ---
  const handleToggleBlockUser = async (user: UserProfile) => {
    const newStatus = !user.isBlocked;
    await updateUserProfileFields(user.uid, { isBlocked: newStatus });
    showToast(newStatus ? `تم حظر المستخدم ${user.username}` : `تم إلغاء حظر المستخدم ${user.username}`, 'info');
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم وجميع بياناته وسجلاته؟')) {
      await deleteUserAndData(uid);
      showToast('تم حذف بيانات المستخدم بنجاح', 'success');
    }
  };

  const handleDeleteAllUsers = async () => {
    if (window.confirm('تحذير شديد: هل أنت متأكد من حذف جميع المستخدمين المسجلين في النظام؟')) {
      await deleteAllUsers();
      showToast('تم حذف جميع المستخدمين', 'info');
    }
  };

  // --- Videos Actions ---
  const handleDeleteVideo = async (videoId: string, publisherUid?: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفيديو؟ سيتم إشعار الناشر بسبب الحذف.')) {
      await deleteVideo(videoId, publisherUid, deleteReason);
      setInspectingVideo(null);
      showToast('تم حذف الفيديو وإرسال إشعار للناشر', 'success');
    }
  };

  const handleDeleteAllVideos = async () => {
    if (window.confirm('تحذير: هل أنت متأكد من حذف جميع الفيديوهات من الموقع وقاعدة البيانات؟')) {
      await deleteAllVideos();
      showToast('تم حذف جميع الفيديوهات', 'info');
    }
  };

  const handleWipeAllSiteData = async () => {
    const confirmation = window.prompt(
      'تحذير شامل: سيتم مسح كافة مقاطع الفيديو، مقاطع Shorts، منشورات المجتمع، التعليقات، الإعجابات، وسجلات المشاهدة بالكامل وتصفير الموقع نهائياً!\n\nاكتب "DELETE" لتأكيد المسح الشامل:'
    );
    if (confirmation === 'DELETE' || confirmation === 'delete') {
      try {
        showToast('جاري تصفير ومسح كافة المحتويات من قاعدة البيانات...', 'info');
        await wipeAllSiteContentAndVideos();
        setVideos([]);
        setPosts([]);
        showToast('تم بنجاح مسح وتصفير كافة محتويات وفيديوهات الموقع بأكمله!', 'success');
      } catch (err: any) {
        showToast(err.message || 'حدث خطأ أثناء المسح', 'error');
      }
    } else if (confirmation !== null) {
      showToast('تم إلغاء عملية المسح الشامل لعدم تطابق كلمة التأكيد', 'info');
    }
  };

  // --- Support Reply Actions ---
  const handleReplyImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressDeviceImage(file, 800, 600, 0.8);
      setReplyImage(dataUrl);
      showToast('تم إرفاق الصورة للرد', 'success');
    } catch {
      showToast('فشل تحميل الصورة', 'error');
    }
  };

  const handleSendTicketReply = async (ticket: SupportTicket) => {
    if (!replyText.trim()) {
      showToast('يرجى كتابة نص الرد للمستخدم', 'error');
      return;
    }
    await replyToSupportTicket(ticket.id, ticket.userUid, replyText.trim(), replyImage || undefined);
    setActiveTicket(null);
    setReplyText('');
    setReplyImage(null);
    showToast('تم إرسال الرد للمستخدم بنجاح وإشعاره', 'success');
  };

  // Aggregated Analytics calculations
  const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalLikes = videos.reduce((sum, v) => sum + (v.likes || 0), 0);
  const totalComments = videos.reduce((sum, v) => sum + (v.commentsCount || 0), 0);
  const totalDownloads = videos.reduce((sum, v) => sum + (v.downloadsCount || 0), 0);
  const totalShorts = videos.filter((v) => v.type === 'short').length;
  const totalLongVideos = videos.filter((v) => v.type === 'video').length;

  const sortedVideosByViews = [...videos].sort((a, b) => (b.views || 0) - (a.views || 0));

  // If not authenticated, show Developer Access Password Gate
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#070e1c] border border-cyan-900/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/80 text-center relative animate-in zoom-in-95 duration-200">
          <button
            onClick={onClose}
            className="absolute top-4 end-4 p-2 text-slate-400 hover:text-white rounded-full"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mx-auto mb-4 shadow-lg shadow-cyan-950">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black text-slate-100">لوحة تحكم المطور</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            منطقة الإدارة المركزية لمنصة Yassa Tube. يرجى إدخال كلمة المرور للمتابعة.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="كلمة مرور المطور..."
              className="w-full bg-[#091224] border border-cyan-950 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-center text-slate-100 placeholder:text-slate-500 focus:outline-none tracking-widest font-mono"
            />

            {authError && (
              <p className="text-xs text-rose-400 font-bold">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-cyan-950/80 transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>دخول لوحة المطور</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Navigation Items (Arabic strictly as mandated)
  const navTabs: { id: TabType; label: string; icon: any; badge?: number }[] = [
    { id: 'visitors', label: 'الزوار والتتبع', icon: Globe, badge: visitors.length },
    { id: 'complaints', label: 'الشكاوى والإبلاغات', icon: ShieldAlert, badge: complaints.filter(c => c.status === 'pending').length || undefined },
    { id: 'blacklist', label: 'القائمة السوداء ومنع النشر', icon: UserX, badge: blacklist.length || undefined },
    { id: 'analytics', label: 'الإحصائيات', icon: BarChart3 },
    { id: 'users', label: 'المستخدمون', icon: Users, badge: users.length },
    { id: 'content', label: 'المحتوى', icon: Film, badge: videos.length },
    { id: 'videos', label: 'الفيديوهات', icon: Video },
    { id: 'search', label: 'البحث', icon: Search },
    { id: 'support', label: 'تذاكر الدعم', icon: MessageSquareWarning, badge: tickets.filter(t => t.status === 'open').length || undefined },
    { id: 'background', label: 'التحكم في الخلفية', icon: Palette },
    { id: 'logo', label: 'التحكم بلوجو الموقع', icon: ImageIcon },
    { id: 'subscriptions', label: 'الاشتراكات', icon: Tv },
    { id: 'posts', label: 'المنشورات', icon: Users2 },
    { id: 'activity', label: 'سجل النشاط', icon: Activity },
    { id: 'settings', label: 'إعدادات المطور', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#050914] text-slate-100 flex flex-col overflow-hidden select-none" dir="rtl">
      {/* Top Header */}
      <header className="h-16 px-6 bg-[#070e1c] border-b border-cyan-900/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <CosmicLogo customLogoUrl={developerSettings?.customLogoUrl} size="sm" />
          <div>
            <h1 className="font-extrabold text-base text-cyan-300">لوحة تحكم وإدارة NeuroYobe</h1>
            <span className="text-[10px] text-cyan-500/80 block">متصلة بنظام التتبع والمشاهدات والحظر السحابي</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>خروج من اللوحة</span>
          </button>
        </div>
      </header>

      {/* Main Developer Shell */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Navigation Sidebar / Mobile Horizontal Tabs */}
        <nav className="w-full md:w-64 bg-[#070e1c]/90 border-b md:border-b-0 md:border-e border-cyan-900/40 p-2 md:p-3 overflow-x-auto md:overflow-y-auto shrink-0 flex md:flex-col gap-1.5 scrollbar-thin">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-between px-3 md:px-3.5 py-2 md:py-2.5 rounded-xl text-xs font-bold transition-all text-start whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-md'
                    : 'text-slate-400 hover:bg-cyan-950/30 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-cyan-500 text-black' : 'bg-cyan-950 border border-cyan-800 text-cyan-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#060b18]">
          {/* TAB: الزوار والتتبع (Visitors Intelligence) */}
          {activeTab === 'visitors' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-cyan-400" />
                    <span>تتبع الزوار وإحصائيات الزيارات المباشرة</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    تتبع كل زائر يدخل للمنصة (مسجل أو زائر عادي): نوع الجهاز، المتصفح، نظام التشغيل، المقاطع المشاهدة، والزيارات اليومية والشهرية.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearAllVisitors}
                    className="px-3.5 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>مسح سجلات الزوار</span>
                  </button>
                </div>
              </div>

              {/* Reset Counters Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Daily Counter */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#091224] to-[#0f1d38] border border-cyan-900/60 shadow-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">الزيارات اليومية</span>
                    <p className="text-3xl font-black text-cyan-300 mt-1">
                      {visitorStats?.dailyCount || 0}
                    </p>
                    <span className="text-[10px] text-cyan-500/80 block mt-0.5">اليوم ({new Date().toLocaleDateString()})</span>
                  </div>
                  <button
                    onClick={handleResetDaily}
                    className="px-3 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow"
                    title="تصفير عدد الزيارات اليومية"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تصفير اليومي</span>
                  </button>
                </div>

                {/* Monthly Counter */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#091224] to-[#0f1d38] border border-sky-900/60 shadow-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">الزيارات الشهرية</span>
                    <p className="text-3xl font-black text-sky-300 mt-1">
                      {visitorStats?.monthlyCount || 0}
                    </p>
                    <span className="text-[10px] text-sky-500/80 block mt-0.5">الشهر الحالي</span>
                  </div>
                  <button
                    onClick={handleResetMonthly}
                    className="px-3 py-2 rounded-xl bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow"
                    title="تصفير عدد الزيارات الشهرية"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تصفير الشهري</span>
                  </button>
                </div>

                {/* Total Counter */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#091224] to-[#0f1d38] border border-indigo-900/60 shadow-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">إجمالي الزيارات الكلية</span>
                    <p className="text-3xl font-black text-indigo-300 mt-1">
                      {visitorStats?.totalCount || 0}
                    </p>
                    <span className="text-[10px] text-indigo-400/80 block mt-0.5">منذ بدء المنصة</span>
                  </div>
                  <button
                    onClick={handleResetTotal}
                    className="px-3 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow"
                    title="تصفير إجمالي الزيارات الكلية"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تصفير الإجمالي</span>
                  </button>
                </div>
              </div>

              {/* Visitor Search Filter */}
              <div className="flex items-center gap-3 bg-[#091224] p-3 rounded-2xl border border-cyan-950">
                <Search className="w-4 h-4 text-cyan-400 shrink-0" />
                <input
                  type="text"
                  value={visitorSearch}
                  onChange={(e) => setVisitorSearch(e.target.value)}
                  placeholder="ابحث عن زائر بحسب نظام التشغيل، المتصفح، البريد أو المعرف..."
                  className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              {/* Visitors Cards / Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                  <span>سجلات الزوار المتصلين ({visitors.length})</span>
                  <span>اضغط على أي زائر للاطلاع على تفاصيل وسجل المشاهدات</span>
                </div>

                {visitors.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-[#091224] border border-cyan-950 text-slate-500 text-xs">
                    لا توجد سجلات زوار مسجلة بعد
                  </div>
                ) : (
                  visitors
                    .filter(v => {
                      if (!visitorSearch.trim()) return true;
                      const q = visitorSearch.toLowerCase();
                      return (
                        (v.os || '').toLowerCase().includes(q) ||
                        (v.browser || '').toLowerCase().includes(q) ||
                        (v.deviceType || '').toLowerCase().includes(q) ||
                        (v.email || '').toLowerCase().includes(q) ||
                        (v.userName || '').toLowerCase().includes(q)
                      );
                    })
                    .map((visitor) => {
                      const isMobile = visitor.deviceType === 'Mobile';
                      const watchedCount = visitor.watchedVideos ? visitor.watchedVideos.length : 0;
                      return (
                        <div
                          key={visitor.id}
                          className="p-4 rounded-2xl bg-[#091224] hover:bg-[#0c1830] border border-cyan-950/80 hover:border-cyan-500/40 transition-all flex flex-wrap items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-[240px]">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${
                              isMobile
                                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                                : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                            }`}>
                              {isMobile ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-100">
                                  {visitor.os || 'غير معروف'} ({visitor.deviceType})
                                </span>
                                {visitor.isBanned && (
                                  <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 text-[9px] font-bold">
                                    محظور
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span className="text-cyan-400">{visitor.browser || 'متصفح'}</span>
                                <span>•</span>
                                <span>{visitor.deviceName || 'جهاز'}</span>
                              </div>

                              <div className="text-[10px] text-slate-400 mt-1">
                                {visitor.userUid ? (
                                  <span className="text-emerald-400 font-semibold">
                                    مسجل: {visitor.userName || visitor.email}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">زائر بدون حساب</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Stats Summary */}
                          <div className="flex flex-wrap items-center gap-4 text-xs">
                            <div className="text-center">
                              <span className="text-[10px] text-slate-400 block">مرات الدخول</span>
                              <span className="font-bold text-cyan-300">{visitor.visitsCount || 1}</span>
                            </div>

                            <div className="text-center">
                              <span className="text-[10px] text-slate-400 block">مقاطع شاهدها</span>
                              <span className="font-bold text-indigo-300">{watchedCount}</span>
                            </div>

                            <div className="text-slate-400 text-[11px]">
                              <span className="block">أول زيارة: {new Date(visitor.firstVisitAt).toLocaleDateString()}</span>
                              <span className="block text-slate-500">آخر ظهور: {new Date(visitor.lastVisitAt).toLocaleTimeString()}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedVisitor(visitor)}
                              className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>التفاصيل والسجل</span>
                            </button>

                            <button
                              onClick={() => handleBanVisitor(visitor.id, visitor.isBanned)}
                              className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                                visitor.isBanned
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}
                              title={visitor.isBanned ? 'إلغاء حظر الزائر' : 'حظر الزائر من الموقع'}
                            >
                              <Ban className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteVisitor(visitor.id)}
                              className="p-2 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl transition-colors"
                              title="حذف سجل الزائر"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* TAB: الشكاوى والإبلاغات (Complaints & Reports) */}
          {activeTab === 'complaints' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                    <span>إدارة الشكاوى وبلاغات المحتوى المخالف ({complaints.length})</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    مراجعة البلاغات المقدمة من المستخدمين، مع إمكانية حذف الفيديو واحتساب مخالفة (Strike) للناشر، ونظام الحظر التلقائي (3 مخالفات).
                  </p>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2 bg-[#091224] p-1.5 rounded-xl border border-cyan-950">
                  {(['all', 'pending', 'reviewed', 'action_taken'] as const).map((filterKey) => (
                    <button
                      key={filterKey}
                      onClick={() => setComplaintFilter(filterKey)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        complaintFilter === filterKey
                          ? 'bg-cyan-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {filterKey === 'all' && 'الكل'}
                      {filterKey === 'pending' && 'قيد المراجعة'}
                      {filterKey === 'reviewed' && 'تمت المراجعة'}
                      {filterKey === 'action_taken' && 'تم حذف المحتوى والمخالفة'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Complaints List */}
              <div className="space-y-3">
                {complaints
                  .filter(c => complaintFilter === 'all' || c.status === complaintFilter)
                  .map((comp) => (
                    <div
                      key={comp.id}
                      className="p-4 rounded-2xl bg-[#091224] border border-cyan-950 space-y-3.5 shadow-md"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-cyan-950/80">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            comp.status === 'pending' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            comp.status === 'action_taken' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                            'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {comp.status === 'pending' ? 'بلاغ جديد قيد المراجعة' :
                             comp.status === 'action_taken' ? 'تم اتخاذ إجراء وحذف المحتوى' : 'تمت المراجعة'}
                          </span>
                          <span className="text-xs font-bold text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/60">
                            السبب: {comp.reason}
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(comp.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {/* Content Target Card */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                        <div className="flex items-center gap-3">
                          {comp.videoThumbnail && (
                            <img
                              src={comp.videoThumbnail}
                              alt=""
                              className="w-16 h-10 rounded-lg object-cover bg-black shrink-0"
                            />
                          )}
                          <div>
                            <h4 className="font-bold text-xs text-slate-100">{comp.videoTitle}</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              الناشر: <span className="text-cyan-300 font-semibold">{comp.publisherName}</span> ({comp.publisherUid})
                            </p>
                          </div>
                        </div>

                        <div className="text-xs text-slate-400">
                          <span>المبلغ: <strong className="text-slate-200">{comp.reporterName}</strong> ({comp.reporterEmail})</span>
                        </div>
                      </div>

                      {/* Complaint Details */}
                      {comp.details && (
                        <p className="text-xs text-slate-300 leading-relaxed bg-[#070e1c] p-3 rounded-xl border border-cyan-950">
                          <strong className="text-cyan-400 block mb-1">تفاصيل البلاغ:</strong>
                          {comp.details}
                        </p>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-cyan-950">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteReportedVideoWithStrike(comp)}
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف المحتوى واحتساب مخالفة (Strike)</span>
                          </button>

                          <button
                            onClick={() => handleResolveComplaint(comp.id)}
                            className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold transition-colors"
                          >
                            تمت المراجعة
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteComplaintReport(comp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                          title="حذف البلاغ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                {complaints.length === 0 && (
                  <div className="p-12 text-center rounded-2xl bg-[#091224] border border-cyan-950 text-slate-500 text-xs">
                    لا توجد بلاغات أو شكاوى مخالفات واردة حالياً
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: القائمة السوداء ومنع النشر (Blacklist) */}
          {activeTab === 'blacklist' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                    <UserX className="w-5 h-5 text-rose-400" />
                    <span>القائمة السوداء ومنع النشر (Blacklist System)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    قائمة بالمستخدمين المحظورين من النشر. يقوم النظام تلقائياً بضم أي مستخدم يصل لـ 3 مخالفات حذف، كما يمكنك حظره أو فك حظره يدوياً.
                  </p>
                </div>
              </div>

              {/* Manual Blacklist Card */}
              <div className="p-5 rounded-2xl bg-[#091224] border border-rose-950/80 shadow-lg space-y-4">
                <h3 className="text-xs font-bold text-rose-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  <span>إضافة مستخدم يدوياً للقائمة السوداء وتطبيق منع النشر</span>
                </h3>

                <form onSubmit={handleManualBlacklist} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">المستخدم المراد حظره:</label>
                    <select
                      value={manualUid}
                      onChange={(e) => setManualUid(e.target.value)}
                      className="w-full bg-[#070e1c] border border-cyan-950 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">-- اختر مستخدماً من القائمة --</option>
                      {users.map(u => (
                        <option key={u.uid} value={u.uid}>
                          {u.username} ({u.email || u.uid}) - مخالفات: {u.strikesCount || 0}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">سبب الحظر ومنع النشر:</label>
                    <input
                      type="text"
                      value={manualReason}
                      onChange={(e) => setManualReason(e.target.value)}
                      placeholder="سبب المنع..."
                      className="w-full bg-[#070e1c] border border-cyan-950 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow transition-colors flex items-center justify-center gap-2"
                    >
                      <UserX className="w-4 h-4" />
                      <span>حظر ومنع من النشر</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Blacklisted Users List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 px-1">المستخدمون المحظورون حالياً ({blacklist.length}):</h3>

                {blacklist.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-[#091224] border border-cyan-950 text-slate-500 text-xs">
                    القائمة السوداء فارغة حالياً. لا يوجد مستخدمون محظورون.
                  </div>
                ) : (
                  blacklist.map((item) => (
                    <div
                      key={item.userUid}
                      className="p-4 rounded-2xl bg-[#091224] border border-rose-950/80 space-y-3 shadow"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-rose-800"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-xs text-slate-100">{item.userName}</h4>
                              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] font-bold border border-rose-800">
                                {item.strikesCount || 3} مخالفات
                              </span>
                              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-bold border border-amber-800">
                                ممنوع من النشر
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{item.email || item.userUid}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-400">
                            تاريخ الحظر: {new Date(item.bannedAt).toLocaleDateString()}
                          </span>

                          <button
                            onClick={() => handleUnbanFromBlacklist(item.userUid)}
                            className="px-3.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>فك الحظر والسماح بالنشر</span>
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#070e1c] p-3 rounded-xl border border-cyan-950 text-xs">
                        <span className="text-slate-400 block mb-0.5 font-semibold">سبب الحظر:</span>
                        <p className="text-rose-300">{item.reason}</p>
                      </div>

                      {/* Violations History */}
                      {item.violations && item.violations.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-slate-400 block">سجل المحتويات المخالفة المحذوفة:</span>
                          <div className="divide-y divide-cyan-950/40 bg-slate-950/60 rounded-xl border border-cyan-950 overflow-hidden">
                            {item.violations.map((v, vIdx) => (
                              <div key={vIdx} className="p-2.5 flex items-center justify-between text-[11px]">
                                <div>
                                  <span className="text-slate-200 font-bold">{v.title}</span>
                                  <span className="text-slate-400 ms-2">({v.reason})</span>
                                </div>
                                <span className="text-slate-500">{new Date(v.deletedAt).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Users with Warning Strikes (1 or 2 strikes) */}
              <div className="space-y-3 pt-4 border-t border-cyan-950">
                <h3 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>مستخدمون لديهم مخالفات تحت الإنذار (1 أو 2 مخالفة):</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {users
                    .filter(u => u.strikesCount && u.strikesCount > 0 && (!u.isBlacklisted))
                    .map(u => (
                      <div key={u.uid} className="p-3 rounded-xl bg-[#091224] border border-amber-900/40 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{u.username}</span>
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-bold">
                            {u.strikesCount} مخالفة
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                        <span className="text-[10px] text-rose-400 block">
                          متبقي له {3 - (u.strikesCount || 0)} مخالفة للدخول في القائمة السوداء تلقائياً
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: الإحصائيات (Analytics) */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <span>إحصائيات المنصة الحقيقية</span>
              </h2>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {[
                  { label: 'إجمالي المستخدمين', value: users.length, color: 'text-cyan-300' },
                  { label: 'إجمالي الفيديوهات', value: videos.length, color: 'text-sky-300' },
                  { label: 'إجمالي Shorts', value: totalShorts, color: 'text-rose-300' },
                  { label: 'إجمالي الفيديوهات الطويلة', value: totalLongVideos, color: 'text-indigo-300' },
                  { label: 'إجمالي المشاهدات', value: totalViews, color: 'text-emerald-300' },
                  { label: 'إجمالي الإعجابات', value: totalLikes, color: 'text-amber-300' },
                  { label: 'إجمالي التعليقات', value: totalComments, color: 'text-purple-300' },
                  { label: 'إجمالي التنزيلات', value: totalDownloads, color: 'text-teal-300' },
                  { label: 'إجمالي الاشتراكات', value: subscriptions.length, color: 'text-blue-300' },
                  { label: 'الشكاوى والتذاكر', value: tickets.length, color: 'text-orange-300' },
                ].map((stat, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#091224] border border-cyan-950/80 shadow-md">
                    <span className="text-xs text-slate-400">{stat.label}</span>
                    <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Highest Viewed Videos */}
              <div className="p-5 rounded-2xl bg-[#091224] border border-cyan-950">
                <h3 className="text-sm font-bold text-slate-200 mb-3">أعلى الفيديوهات مشاهدة على المنصة</h3>
                <div className="divide-y divide-cyan-950/60">
                  {sortedVideosByViews.slice(0, 5).map((v, i) => (
                    <div key={v.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-cyan-400 w-4">#{i + 1}</span>
                        <img src={v.thumbnailDataUrl} alt="" className="w-12 h-7 rounded object-cover bg-slate-900" />
                        <div>
                          <p className="font-bold text-slate-200">{v.title}</p>
                          <span className="text-[11px] text-slate-400">{v.publisherName}</span>
                        </div>
                      </div>
                      <span className="font-bold text-cyan-300">{v.views || 0} مشاهدة</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: المستخدمون (Users) */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <span>جميع المستخدمين المسجلين ({users.length})</span>
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDeleteAllUsers}
                    className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف جميع المستخدمين</span>
                  </button>
                </div>
              </div>

              <div className="divide-y divide-cyan-950/60 bg-[#091224] border border-cyan-950 rounded-2xl overflow-hidden">
                {users.length === 0 ? (
                  <p className="p-8 text-center text-xs text-slate-500">لا يوجد مستخدمون مسجلون بعد</p>
                ) : (
                  users.map((u) => (
                    <div key={u.uid} className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-cyan-900" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">{u.username}</span>
                            {u.isBlocked && (
                              <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 text-[10px] font-bold">
                                محظور
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-[11px]">{u.email}</p>
                          <span className="text-[10px] text-cyan-400">{u.deviceType || 'متصفح ويب'}</span>
                        </div>
                      </div>

                      <div className="text-slate-400 text-[11px]">
                        <span>تاريخ التسجيل: {new Date(u.registeredAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleBlockUser(u)}
                          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-colors ${
                            u.isBlocked
                              ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800'
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>{u.isBlocked ? 'إلغاء الحظر' : 'حظر الحساب'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u.uid)}
                          className="p-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors"
                          title="حذف المستخدم وجميع بياناته"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3 & 4: المحتوى والفيديوهات (Content / Videos) */}
          {(activeTab === 'content' || activeTab === 'videos') && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#091224] border border-cyan-950">
                <div>
                  <h2 className="text-base font-black text-slate-100 flex items-center gap-2">
                    <Film className="w-5 h-5 text-cyan-400" />
                    <span>جميع الفيديوهات والمحتويات المنشورة ({videos.length})</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">إدارة وحذف الفيديوهات والمحتويات المتوفرة على المنصة</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleWipeAllSiteData}
                    className="px-3.5 py-2 bg-gradient-to-r from-rose-900 to-red-800 hover:from-rose-800 hover:to-red-700 border border-rose-500/50 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-950/60 transition-all flex items-center gap-2"
                    title="حذف وتصفير كافة محتويات وفيديوهات ومنشورات الموقع بالكامل"
                  >
                    <Trash2 className="w-4 h-4 text-rose-300" />
                    <span>حذف كافة محتويات وفيديوهات الموقع بالكامل</span>
                  </button>
                  <button
                    onClick={handleDeleteAllVideos}
                    className="px-3 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف الفيديوهات فقط</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedVideosByViews.map((video) => (
                  <div
                    key={video.id}
                    className="p-3.5 rounded-2xl bg-[#091224] border border-cyan-950 flex flex-col gap-3"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
                      <img src={video.thumbnailDataUrl} alt="" className="w-full h-full object-cover" />
                      <span className="absolute top-2 start-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-bold text-cyan-300">
                        {video.type === 'short' ? 'Short' : 'فيديو'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xs text-slate-100 line-clamp-1">{video.title}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">الناشر: {video.publisherName}</p>
                      <div className="flex items-center gap-3 text-[11px] text-cyan-400 mt-2 font-semibold">
                        <span>{video.views || 0} مشاهدة</span>
                        <span>•</span>
                        <span>{video.likes || 0} إعجاب</span>
                        <span>•</span>
                        <span>{video.commentsCount || 0} تعليق</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-cyan-950">
                      <button
                        onClick={() => setInspectingVideo(video)}
                        className="flex-1 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>عرض التفاصيل</span>
                      </button>

                      <button
                        onClick={() => handleDeleteVideo(video.id, video.publisherUid)}
                        className="p-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-xl"
                        title="حذف الفيديو"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: البحث المباشر (Search) */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Search className="w-5 h-5 text-cyan-400" />
                <span>البحث المباشر في قاعدة البيانات</span>
              </h2>

              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="ابحث عن مستخدم، بريد، عنوان فيديو، أو منشور..."
                className="w-full bg-[#091224] border border-cyan-900 focus:border-cyan-400 rounded-2xl px-5 py-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />

              {globalSearch.trim() && (
                <div className="space-y-4 mt-4">
                  {/* Matching Videos */}
                  <div className="p-4 rounded-2xl bg-[#091224] border border-cyan-950">
                    <h3 className="font-bold text-xs text-cyan-300 mb-2">الفيديوهات المطابقة:</h3>
                    {videos
                      .filter((v) => v.title.toLowerCase().includes(globalSearch.toLowerCase()))
                      .map((v) => (
                        <div key={v.id} className="py-2 flex items-center justify-between text-xs border-b border-cyan-950/40">
                          <span>{v.title} ({v.publisherName})</span>
                          <button
                            onClick={() => setInspectingVideo(v)}
                            className="text-cyan-400 hover:underline"
                          >
                            معاينة
                          </button>
                        </div>
                      ))}
                  </div>

                  {/* Matching Users */}
                  <div className="p-4 rounded-2xl bg-[#091224] border border-cyan-950">
                    <h3 className="font-bold text-xs text-cyan-300 mb-2">المستخدمون المطابقون:</h3>
                    {users
                      .filter(
                        (u) =>
                          u.username.toLowerCase().includes(globalSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(globalSearch.toLowerCase())
                      )
                      .map((u) => (
                        <div key={u.uid} className="py-2 flex items-center justify-between text-xs border-b border-cyan-950/40">
                          <span>{u.username} — {u.email}</span>
                          <span className="text-slate-400">{u.deviceType}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: الشكاوى (Support Complaints) */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <MessageSquareWarning className="w-5 h-5 text-cyan-400" />
                <span>شكاوى وتواصل المستخدمين ({tickets.length})</span>
              </h2>

              <div className="space-y-3">
                {tickets.length === 0 ? (
                  <p className="p-8 text-center text-xs text-slate-500">لا توجد شكاوى واردة حالياً</p>
                ) : (
                  tickets.map((t) => (
                    <div key={t.id} className="p-4 rounded-2xl bg-[#091224] border border-cyan-950 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img src={t.userAvatar} alt="" className="w-8 h-8 rounded-full object-cover border border-cyan-900" />
                          <div>
                            <span className="font-bold text-xs text-slate-100">{t.userName}</span>
                            <span className="text-[11px] text-slate-400 ms-2">{t.userEmail}</span>
                          </div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'answered' ? 'bg-emerald-950 text-emerald-300' :
                          t.status === 'rejected' ? 'bg-rose-950 text-rose-300' : 'bg-amber-950 text-amber-300'
                        }`}>
                          {t.status === 'answered' ? 'تم الرد' : t.status === 'rejected' ? 'مرفوضة' : 'قيد المراجعة'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed bg-[#070e1c] p-3 rounded-xl border border-cyan-950">
                        {t.text}
                      </p>

                      {/* Attached images from device (max 2) */}
                      {t.images && t.images.length > 0 && (
                        <div className="flex gap-2">
                          {t.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt="Complaint attachment"
                              className="w-24 h-24 rounded-xl object-cover border border-cyan-900/60"
                            />
                          ))}
                        </div>
                      )}

                      {/* Developer Reply if already sent */}
                      {t.developerReply && (
                        <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs">
                          <span className="font-bold text-cyan-300 block mb-1">ردك السابق:</span>
                          <p className="text-slate-300">{t.developerReply}</p>
                          {t.replyImage && (
                            <img src={t.replyImage} alt="" className="w-20 h-20 rounded-lg object-cover mt-2 border border-cyan-800" />
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-cyan-950">
                        <button
                          onClick={() => setActiveTicket(t)}
                          className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold"
                        >
                          الرد على الشكوى
                        </button>
                        <button
                          onClick={() => rejectSupportTicket(t.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
                        >
                          رفض المشكلة
                        </button>
                        <button
                          onClick={() => deleteSupportTicket(t.id)}
                          className="p-1.5 text-rose-400 hover:bg-rose-950 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 7: التحكم في الخلفية (Background Control) */}
          {activeTab === 'background' && (
            <div className="max-w-xl space-y-5">
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Palette className="w-5 h-5 text-cyan-400" />
                <span>التحكم في خلفيات الموقع (من الجهاز فقط)</span>
              </h2>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">اختر صورة الخلفية من جهازك:</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-cyan-900 hover:border-cyan-400 rounded-2xl p-6 bg-[#091224] cursor-pointer transition-all">
                  <Upload className="w-8 h-8 text-cyan-400 mb-2" />
                  <span className="text-xs font-bold text-slate-200">
                    {bgImageDataUrl ? 'تم تحميل صورة الخلفية بنجاح' : 'انقر لرفع صورة الخلفية من جهازك'}
                  </span>
                  <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                </label>
              </div>

              {bgImageDataUrl && (
                <div className="w-full aspect-video rounded-2xl overflow-hidden border border-cyan-400/50 shadow-xl">
                  <img src={bgImageDataUrl} alt="Background Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">القسم المستهدف:</label>
                <select
                  value={bgSection}
                  onChange={(e) => setBgSection(e.target.value as any)}
                  className="w-full bg-[#091224] border border-cyan-950 rounded-xl p-2.5 text-xs text-slate-100"
                >
                  <option value="all">كامل الموقع (Background All)</option>
                  <option value="header">الشريط العلوي فقط</option>
                  <option value="sidebar">القائمة الجانبية</option>
                  <option value="content">منطقة المحتوى الرئيسية</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">نوع Animation الخلفية:</label>
                <select
                  value={bgAnimation}
                  onChange={(e) => setBgAnimation(e.target.value as any)}
                  className="w-full bg-[#091224] border border-cyan-950 rounded-xl p-2.5 text-xs text-slate-100"
                >
                  <option value="nebula">انسياب السديم الفضائي (Nebula Drift)</option>
                  <option value="stars">تلألؤ النجوم (Star Twinkle)</option>
                  <option value="pulse">نبض المجرة (Pulse Glow)</option>
                  <option value="none">خلفية ثابتة بدون حركة</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleApplyBackground}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-extrabold rounded-xl text-xs shadow-lg"
                >
                  تطبيق وحفظ الخلفية
                </button>
                <button
                  onClick={handleRemoveBackground}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  إزالة الخلفية
                </button>
              </div>
            </div>
          )}

          {/* TAB 8: التحكم بلوجو الموقع (Logo Control) */}
          {activeTab === 'logo' && (
            <div className="max-w-xl space-y-5">
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-cyan-400" />
                <span>التحكم بلوجو الموقع الرسمي</span>
              </h2>

              <div className="flex items-center gap-6 p-6 rounded-2xl bg-[#091224] border border-cyan-950">
                <CosmicLogo customLogoUrl={customLogoDataUrl || developerSettings?.customLogoUrl} size="lg" />
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Yassa Tube</h3>
                  <span className="text-xs text-slate-400">اللوجو الرسمي الظاهر للمستخدمين في الشريط العلوي</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">رفع لوجو جديد (من جهازك فقط):</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-cyan-900 hover:border-cyan-400 rounded-2xl p-6 bg-[#091224] cursor-pointer transition-all">
                  <Upload className="w-8 h-8 text-cyan-400 mb-2" />
                  <span className="text-xs font-bold text-slate-200">اختر ملف لوجو من جهازك</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleApplyLogo}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-extrabold rounded-xl text-xs shadow-lg"
                >
                  تعيين اللوجو الجديد
                </button>
                <button
                  onClick={handleResetLogo}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  استعادة اللوجو الأصلي
                </button>
              </div>
            </div>
          )}

          {/* TAB 9: الاشتراكات (Subscriptions) */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Tv className="w-5 h-5 text-cyan-400" />
                <span>سجل الاشتراكات الفعلي ({subscriptions.length})</span>
              </h2>

              <div className="divide-y divide-cyan-950/60 bg-[#091224] border border-cyan-950 rounded-2xl overflow-hidden">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-200">صاحب الاشتراك: {sub.subscriberUid}</span>
                      <span className="block text-[11px] text-cyan-400 mt-0.5">القناة: {sub.channelName}</span>
                    </div>
                    <span className="text-slate-400">{new Date(sub.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 10: المنشورات (Posts) */}
          {activeTab === 'posts' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Users2 className="w-5 h-5 text-cyan-400" />
                <span>منشورات المجتمع ({posts.length})</span>
              </h2>

              <div className="space-y-3">
                {posts.map((post) => (
                  <div key={post.id} className="p-4 rounded-2xl bg-[#091224] border border-cyan-950 flex items-start justify-between gap-4">
                    <div>
                      <span className="font-bold text-xs text-cyan-300">{post.channelName}</span>
                      <p className="text-xs text-slate-200 mt-1">{post.text}</p>
                    </div>
                    <button
                      onClick={() => deletePost(post.id)}
                      className="p-2 bg-rose-950 text-rose-300 hover:bg-rose-900 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 11: سجل النشاط (Activity Logs - Logged in users only) */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <span>سجل النشاط المباشر للمستخدمين المسجلين ({logs.length})</span>
              </h2>

              <div className="divide-y divide-cyan-950/60 bg-[#091224] border border-cyan-950 rounded-2xl overflow-hidden">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-200">{log.userName}: </span>
                      <span className="text-slate-300">{log.details}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 12: إعدادات المطور (Settings) */}
          {activeTab === 'settings' && (
            <div className="max-w-xl space-y-4">
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                <span>إعدادات النظام والإدارة</span>
              </h2>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">شريط إعلان وتنبيه عام لجميع زوار الموقع:</label>
                <textarea
                  value={siteNotice}
                  onChange={(e) => setSiteNotice(e.target.value)}
                  rows={3}
                  placeholder="اكتب إعلاناً أو تنبيهاً يظهر في أعلى الموقع لجميع الزوار..."
                  className="w-full bg-[#091224] border border-cyan-950 rounded-xl p-3 text-xs text-slate-100"
                />
              </div>

              <button
                onClick={async () => {
                  await saveDeveloperSettings({
                    ...developerSettings,
                    siteNotice
                  });
                  showToast('تم حفظ ونشر التنبيه العام في الموقع', 'success');
                }}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold"
              >
                حفظ التنبيه
              </button>

              <hr className="my-6 border-cyan-950/80" />

              {/* Danger Zone */}
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/60 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>منطقة الخطر الشاملة (Danger Zone)</span>
                </div>
                <p className="text-xs text-rose-200/80 leading-relaxed">
                  تصفير الموقع ومسح جميع الفيديوهات، مقاطع Shorts، منشورات المجتمع، والتعليقات بالكامل من قاعدة البيانات.
                </p>
                <button
                  onClick={handleWipeAllSiteData}
                  className="w-full py-3 bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-950/80 flex items-center justify-center gap-2 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>تصفير ومسح كافة محتويات وفيديوهات الموقع الآن</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Video Full Inspection Modal (تفاصيل الفيديو) */}
      {inspectingVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#070e1c] border border-cyan-900/60 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-100">تفاصيل وإحصائيات الفيديو</h3>
              <button onClick={() => setInspectingVideo(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-cyan-950">
              <img src={inspectingVideo.thumbnailDataUrl} alt="" className="w-full h-full object-cover" />
            </div>

            <div>
              <h4 className="font-bold text-sm text-slate-100">{inspectingVideo.title}</h4>
              <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">{inspectingVideo.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-[#091224] border border-cyan-950">
                <span className="text-slate-400 block">المشاهدات</span>
                <span className="font-bold text-cyan-300">{inspectingVideo.views || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-[#091224] border border-cyan-950">
                <span className="text-slate-400 block">الإعجابات</span>
                <span className="font-bold text-cyan-300">{inspectingVideo.likes || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-[#091224] border border-cyan-950">
                <span className="text-slate-400 block">التعليقات</span>
                <span className="font-bold text-cyan-300">{inspectingVideo.commentsCount || 0}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">سبب الحذف (يصل كإشعار للناشر):</label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full bg-[#091224] border border-cyan-950 rounded-xl p-2.5 text-xs text-slate-100"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleDeleteVideo(inspectingVideo.id, inspectingVideo.publisherUid)}
                className="flex-1 py-2.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف الفيديو بسبب مخالفة</span>
              </button>
              <button
                onClick={() => setInspectingVideo(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                إغلاق التفاصيل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support Reply Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#070e1c] border border-cyan-900/60 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-100">الرد على شكوى {activeTicket.userName}</h3>
              <button onClick={() => setActiveTicket(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              placeholder="اكتب رد الدعم الفني هنا..."
              className="w-full bg-[#091224] border border-cyan-950 rounded-xl p-3 text-xs text-slate-100"
            />

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 px-3 py-2 bg-[#091224] border border-cyan-950 rounded-xl text-xs cursor-pointer hover:border-cyan-400">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>إرفاق صورة توضيحية من جهازك</span>
                <input type="file" accept="image/*" onChange={handleReplyImageUpload} className="hidden" />
              </label>
              {replyImage && <span className="text-[11px] text-emerald-400">تم إرفاق الصورة</span>}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleSendTicketReply(activeTicket)}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>إرسال الرد وإشعار المستخدم</span>
              </button>
              <button
                onClick={() => setActiveTicket(null)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Visitor Details & History Modal */}
      {selectedVisitor && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#070e1c] border border-cyan-900/60 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-950">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                  selectedVisitor.deviceType === 'Mobile'
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                    : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                }`}>
                  {selectedVisitor.deviceType === 'Mobile' ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                    <span>تفاصيل الزائر ({selectedVisitor.os} - {selectedVisitor.browser})</span>
                    {selectedVisitor.isBanned && (
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] font-bold border border-rose-800">
                        محظور
                      </span>
                    )}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">المعرف: {selectedVisitor.id}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedVisitor(null)}
                className="p-1 text-slate-400 hover:text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hardware & System Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[#091224] border border-cyan-950">
                <span className="text-[10px] text-slate-400 block">نظام التشغيل</span>
                <strong className="text-xs text-slate-200">{selectedVisitor.os || 'غير محدد'}</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#091224] border border-cyan-950">
                <span className="text-[10px] text-slate-400 block">المتصفح</span>
                <strong className="text-xs text-cyan-300">{selectedVisitor.browser || 'متصفح'}</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#091224] border border-cyan-950">
                <span className="text-[10px] text-slate-400 block">نوع الجهاز</span>
                <strong className="text-xs text-sky-300">{selectedVisitor.deviceType}</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#091224] border border-cyan-950">
                <span className="text-[10px] text-slate-400 block">اسم الجهاز والبيئة</span>
                <strong className="text-xs text-indigo-300">{selectedVisitor.deviceName || 'غير محدد'}</strong>
              </div>
            </div>

            {/* Account & Visits Summary */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-blue-950/20 border border-cyan-900/40 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-slate-400 block">حساب المستخدم المتصل:</span>
                {selectedVisitor.userUid ? (
                  <div className="text-xs font-bold text-emerald-300 mt-0.5">
                    {selectedVisitor.userName} ({selectedVisitor.email})
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">زائر عادي بدون تسجيل دخول</span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">مرات الدخول:</span>
                  <strong className="text-cyan-300">{selectedVisitor.visitsCount || 1}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">أول زيارة:</span>
                  <span className="text-slate-300">{new Date(selectedVisitor.firstVisitAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">آخر زيارة:</span>
                  <span className="text-slate-300">{new Date(selectedVisitor.lastVisitAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Watched Videos by this visitor */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5" />
                <span>الفيديوهات التي شاهدها هذا الزائر ({selectedVisitor.watchedVideos ? selectedVisitor.watchedVideos.length : 0})</span>
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedVisitor.watchedVideos && selectedVisitor.watchedVideos.length > 0 ? (
                  selectedVisitor.watchedVideos.map((vInfo) => (
                    <div
                      key={vInfo.id}
                      className="p-2.5 rounded-xl bg-[#091224] border border-cyan-950 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        {vInfo.thumbnail && (
                          <img src={vInfo.thumbnail} alt="" className="w-12 h-8 rounded object-cover bg-black shrink-0" />
                        )}
                        <span className="font-bold text-slate-200 truncate max-w-xs">{vInfo.title || vInfo.id}</span>
                      </div>
                      <div className="text-end text-[11px]">
                        <span className="text-cyan-400 font-mono font-bold block">{vInfo.watchDurationSeconds || 0} ثانية مشاهدة</span>
                        <span className="text-slate-500 text-[10px]">{new Date(vInfo.watchedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-xl bg-[#091224] border border-cyan-950 text-slate-500 text-xs text-center">
                    لم يسجل أي مشاهدات فيديوهات بعد
                  </div>
                )}
              </div>
            </div>

            {/* Session Navigation History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span>سجل تصفح الصفحات والجلسات ({selectedVisitor.sessions?.length || 0})</span>
              </h4>

              <div className="divide-y divide-cyan-950 bg-[#091224] rounded-xl border border-cyan-950 max-h-40 overflow-y-auto">
                {selectedVisitor.sessions && selectedVisitor.sessions.length > 0 ? (
                  selectedVisitor.sessions.map((s, idx) => (
                    <div key={idx} className="p-2 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-cyan-300">{s.details || s.action}</span>
                      <span className="text-slate-500 font-mono">{new Date(s.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-500">لا توجد سجلات جلسات</div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-cyan-950">
              <button
                onClick={() => handleBanVisitor(selectedVisitor.id, selectedVisitor.isBanned)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedVisitor.isBanned
                    ? 'bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-200'
                    : 'bg-amber-950 hover:bg-amber-900 border border-amber-700 text-amber-200'
                }`}
              >
                <Ban className="w-4 h-4" />
                <span>{selectedVisitor.isBanned ? 'إلغاء حظر الزائر' : 'حظر الزائر من المنصة'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteVisitor(selectedVisitor.id)}
                  className="px-4 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف السجل</span>
                </button>
                <button
                  onClick={() => setSelectedVisitor(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
