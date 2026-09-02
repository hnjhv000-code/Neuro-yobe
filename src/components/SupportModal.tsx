import React, { useState, useEffect } from 'react';
import {
  X,
  HelpCircle,
  MessageSquare,
  Image as ImageIcon,
  Send,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { compressDeviceImage } from '../services/mediaStorage';
import {
  createSupportTicket,
  subscribeToUserSupportTickets,
  logUserActivity
} from '../services/firebase';
import { getTranslation } from '../services/translations';
import { useToast } from './Toast';
import type { UserProfile, Language, SupportTicket } from '../types';

interface SupportModalProps {
  currentUser: UserProfile;
  language: Language;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  currentUser,
  language,
  onClose
}) => {
  const [complaintText, setComplaintText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

  const { showToast } = useToast();
  const t = (key: string) => getTranslation(language, key);

  // Subscribe to user tickets
  useEffect(() => {
    const unsub = subscribeToUserSupportTickets(currentUser.uid, setUserTickets);
    return () => unsub();
  }, [currentUser.uid]);

  // Upload image from device only (max 2 images)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 2) {
      showToast('الحد الأقصى لإرفاق الصور هو صورتان فقط من جهازك', 'error');
      return;
    }

    try {
      showToast('جاري معالجة الصور من جهازك...', 'info');
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressDeviceImage(files[i], 1200, 1200, 0.85);
        newImages.push(compressed);
      }
      setImages((prev) => [...prev, ...newImages]);
      showToast('تم إرفاق الصور بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل إرفاق الصور', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim()) {
      showToast('يرجى كتابة نص الشكوى أو الاستفسار', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await createSupportTicket({
        userUid: currentUser.uid,
        userName: currentUser.username,
        userEmail: currentUser.email,
        userAvatar: currentUser.avatarUrl,
        text: complaintText.trim(),
        images: images.length > 0 ? images : undefined
      });

      await logUserActivity(currentUser, 'support', `أرسل تذكرة دعم فني: ${complaintText.slice(0, 30)}`);
      showToast('تم إرسال تذكرتك بنجاح إلى فريق الدعم الفني', 'success');
      setComplaintText('');
      setImages([]);
      setActiveTab('history');
    } catch (err: any) {
      showToast('فشل إرسال التذكرة: ' + (err.message || 'خطأ غير معروف'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#070e1c] border border-cyan-900/60 rounded-3xl p-6 shadow-2xl shadow-cyan-950/80 relative flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 text-slate-400 hover:text-white rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">{t('support')}</h2>
            <span className="text-xs text-slate-400">{t('supportSubtitle')}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-cyan-950 pb-2 mb-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('new')}
            className={`pb-1 border-b-2 transition-colors ${
              activeTab === 'new' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400'
            }`}
          >
            {t('newTicketTab')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-1 border-b-2 transition-colors ${
              activeTab === 'history' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400'
            }`}
          >
            {t('ticketHistoryTab')} ({userTickets.length})
          </button>
        </div>

        {/* Tab 1: New Ticket Form */}
        {activeTab === 'new' && (
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">{t('ticketTextLabel')}</label>
              <textarea
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                rows={5}
                placeholder={t('ticketTextPlaceholder')}
                className="w-full bg-[#091224] border border-cyan-950 focus:border-cyan-400 rounded-2xl p-4 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Images Preview */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-cyan-900">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, i) => i !== idx))}
                      className="absolute top-1 end-1 p-1 bg-rose-950 text-rose-300 rounded-full"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 px-3 py-2 bg-[#091224] hover:bg-cyan-950 border border-cyan-900 rounded-xl text-xs font-semibold text-cyan-300 cursor-pointer transition-colors">
                <ImageIcon className="w-4 h-4" />
                <span>{t('attachImagesFromDevice')} ({images.length}/2)</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={images.length >= 2}
                  className="hidden"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting || !complaintText.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold shadow-lg transition-all flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? t('sendingTicket') : t('sendTicket')}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Ticket History */}
        {activeTab === 'history' && (
          <div className="overflow-y-auto flex-1 space-y-3">
            {userTickets.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-12">{t('noPreviousTickets')}</p>
            ) : (
              userTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 rounded-2xl bg-[#091224] border border-cyan-950 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ticket.status === 'answered'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : ticket.status === 'rejected'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {ticket.status === 'answered' ? t('statusAnswered') : ticket.status === 'rejected' ? t('statusRejected') : t('statusPending')}
                    </span>
                  </div>

                  <p className="text-slate-200 leading-relaxed bg-[#070e1c] p-2.5 rounded-xl border border-cyan-950/60">
                    {ticket.text}
                  </p>

                  {/* Developer reply */}
                  {ticket.developerReply && (
                    <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/60 mt-2 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                        <CheckCircle className="w-4 h-4" />
                        <span>{t('supportReplyPrefix')}</span>
                      </div>
                      <p className="text-slate-200 ps-5 leading-relaxed">{ticket.developerReply}</p>
                      {ticket.replyImage && (
                        <img src={ticket.replyImage} alt="" className="w-28 h-28 rounded-xl object-cover ms-5 border border-cyan-800" />
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
