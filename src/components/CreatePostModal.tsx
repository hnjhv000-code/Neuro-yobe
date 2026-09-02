import React, { useState } from 'react';
import { X, PlusSquare, Image as ImageIcon, Send, Trash2, Sparkles } from 'lucide-react';
import { compressDeviceImage } from '../services/mediaStorage';
import { createPost, logUserActivity } from '../services/firebase';
import { getTranslation } from '../services/translations';
import { useToast } from './Toast';
import type { UserProfile, Language } from '../types';

interface CreatePostModalProps {
  currentUser: UserProfile;
  language: Language;
  onClose: () => void;
  onSuccess: (postId: string) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  currentUser,
  language,
  onClose,
  onSuccess
}) => {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();
  const t = (key: string) => getTranslation(language, key);

  // Upload image from device only (up to 4 images)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 4) {
      showToast('الحد الأقصى للصور في المنشور هو 4 صور من الجهاز', 'error');
      return;
    }

    try {
      showToast('جاري معالجة الصور من جهازك...', 'info');
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressDeviceImage(files[i], 720, 720, 0.65);
        newImages.push(compressed);
      }
      setImages((prev) => [...prev, ...newImages]);
      showToast('تمت إضافة الصور بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل رفع الصور', 'error');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && images.length === 0) {
      showToast('يرجى كتابة نص أو إرفاق صورة للمنشور', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const postId = await createPost({
        channelUid: currentUser.uid,
        channelName: currentUser.username,
        channelAvatar: currentUser.avatarUrl,
        text: text.trim(),
        images: images.length > 0 ? images : undefined,
        type: images.length > 0 ? 'image' : 'text',
        likes: 0,
        dislikes: 0,
        commentsCount: 0,
        allowComments: true,
        createdAt: Date.now()
      });

      await logUserActivity(currentUser, 'create_post', `نشر منشوراً في مجتمع القناة: ${text.slice(0, 30)}`);
      showToast('تم نشر المنشور في مجتمع القناة بنجاح!', 'success');
      onSuccess(postId);
    } catch (err: any) {
      showToast('فشل نشر المنشور: ' + (err.message || 'خطأ غير معروف'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#070e1c] border border-cyan-900/60 rounded-3xl p-6 shadow-2xl shadow-cyan-950/80 relative">
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 text-slate-400 hover:text-white rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.username}
            className="w-11 h-11 rounded-full object-cover border border-cyan-400"
          />
          <div>
            <h2 className="text-base font-bold text-slate-100">{t('createPost')}</h2>
            <span className="text-xs text-cyan-400">{t('publishingAs')}: {currentUser.username}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={t('postPlaceholder')}
            className="w-full bg-[#091224] border border-cyan-950 focus:border-cyan-400 rounded-2xl p-4 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed"
          />

          {/* Attached Images Preview */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-cyan-900 group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-2 end-2 p-1.5 rounded-full bg-rose-950/90 text-rose-300 hover:bg-rose-900 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions toolbar */}
          <div className="flex items-center justify-between pt-2 border-t border-cyan-950/80">
            <label className="flex items-center gap-2 px-3 py-2 bg-[#091224] hover:bg-cyan-950/60 border border-cyan-900/60 rounded-xl text-xs font-semibold text-cyan-300 cursor-pointer transition-colors">
              <ImageIcon className="w-4 h-4" />
              <span>{t('attachImagesFromDevice')} ({images.length}/4)</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={images.length >= 4}
                className="hidden"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting || (!text.trim() && images.length === 0)}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-cyan-950/80 transition-all flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? t('uploadProgress') : t('publish')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
