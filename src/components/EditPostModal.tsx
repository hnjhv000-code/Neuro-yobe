import React, { useState } from 'react';
import {
  X,
  Edit,
  Globe,
  Lock,
  Clock,
  CheckCircle,
  ThumbsUp,
  MessageSquare,
  BarChart3,
  Calendar
} from 'lucide-react';
import { updatePost, logUserActivity } from '../services/firebase';
import { getTranslation } from '../services/translations';
import { useToast } from './Toast';
import type { PostItem, VideoVisibility, UserProfile, Language } from '../types';

interface EditPostModalProps {
  post: PostItem;
  currentUser: UserProfile;
  language: Language;
  onClose: () => void;
  onSuccess: (updatedPost: Partial<PostItem>) => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  post,
  currentUser,
  language,
  onClose,
  onSuccess
}) => {
  const [text, setText] = useState(post.text || '');
  const [visibility, setVisibility] = useState<VideoVisibility>(post.visibility || 'public');
  const [allowComments, setAllowComments] = useState(post.allowComments ?? true);
  const [isSaving, setIsSaving] = useState(false);

  const { showToast } = useToast();
  const t = (key: string) => getTranslation(language, key);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      showToast(t('postTextRequired'), 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updateData: Partial<PostItem> = {
        text: text.trim(),
        visibility,
        allowComments
      };

      await updatePost(post.id, updateData);
      await logUserActivity(currentUser, 'edit_post', `تعديل المنشور في المجتمع: ${text.slice(0, 30)}`);

      showToast(t('postUpdatedSuccess'), 'success');
      onSuccess(updateData);
      onClose();
    } catch (err: any) {
      showToast(t('authGeneralError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#070e1c] border border-cyan-900/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 bg-[#091224]/90 border-b border-cyan-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-100">{t('editPost')}</h2>
              <span className="text-[11px] text-cyan-400">{t('editPostSubtitle')}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Post Metrics Summary */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[#091224]/50 border border-cyan-950">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <ThumbsUp className="w-4 h-4 text-cyan-400" />
              <span>{post.likes || 0} {t('likes')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span>{post.commentsCount || 0} {t('comments')}</span>
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">{t('postTextLabel')}</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder={t('postPlaceholder')}
              className="w-full bg-[#091224] border border-cyan-950 focus:border-cyan-400 rounded-2xl p-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Attached Images preview */}
          {post.images && post.images.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">{t('attachedImages')} ({post.images.length})</label>
              <div className="grid grid-cols-2 gap-2">
                {post.images.map((img, i) => (
                  <img key={i} src={img} alt="" className="w-full aspect-video rounded-xl object-cover border border-cyan-950" />
                ))}
              </div>
            </div>
          )}

          {/* Visibility */}
          <div className="space-y-2 p-3 rounded-2xl bg-[#091224]/60 border border-cyan-950">
            <label className="text-xs font-bold text-slate-200">{t('visibility')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  visibility === 'public'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : 'bg-[#070e1c] border-cyan-950 text-slate-400'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>{t('publicVisibility')}</span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  visibility === 'private'
                    ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                    : 'bg-[#070e1c] border-cyan-950 text-slate-400'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>{t('privateVisibility')}</span>
              </button>
            </div>
          </div>

          {/* Comment setting */}
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#091224]/50 border border-cyan-950 cursor-pointer">
            <span className="text-xs text-slate-200">{t('allowCommentsLabel')}</span>
            <input
              type="checkbox"
              checked={allowComments}
              onChange={(e) => setAllowComments(e.target.checked)}
              className="rounded text-cyan-500 focus:ring-cyan-400"
            />
          </label>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              {t('cancel')}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-lg shadow-cyan-950/60 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSaving ? t('uploadProgress') : t('saveChanges')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

