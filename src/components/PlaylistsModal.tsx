import React, { useState } from 'react';
import { X, ListPlus, FolderPlus, Film, Trash2, Check } from 'lucide-react';
import { createPlaylist, addVideoToPlaylist } from '../services/firebase';
import { getTranslation } from '../services/translations';
import { useToast } from './Toast';
import type { UserProfile, VideoItem, PlaylistItem, Language } from '../types';

interface PlaylistsModalProps {
  currentUser: UserProfile;
  videoToAdd?: VideoItem;
  userPlaylists: PlaylistItem[];
  language?: Language;
  onClose: () => void;
}

export const PlaylistsModal: React.FC<PlaylistsModalProps> = ({
  currentUser,
  videoToAdd,
  userPlaylists,
  language = 'ar',
  onClose
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { showToast } = useToast();
  const t = (key: string) => getTranslation(language, key);

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const playlistId = await createPlaylist(
        currentUser.uid,
        currentUser.username,
        newTitle.trim(),
        ''
      );
      if (videoToAdd) {
        await addVideoToPlaylist(playlistId, videoToAdd.id);
      }
      showToast(t('createPlaylistConfirm'), 'success');
      setNewTitle('');
      setIsCreating(false);
    } catch {
      showToast(t('authGeneralError'), 'error');
    }
  };

  const handleAddToExisting = async (playlist: PlaylistItem) => {
    if (!videoToAdd) return;
    try {
      await addVideoToPlaylist(playlist.id, videoToAdd.id);
      showToast(`${t('addToPlaylistFor')} "${playlist.title}"`, 'success');
      onClose();
    } catch {
      showToast(t('authGeneralError'), 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#070e1c] border border-cyan-900/60 rounded-3xl p-6 shadow-2xl space-y-4 relative">
        <button onClick={onClose} className="absolute top-4 end-4 p-2 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 flex items-center justify-center text-cyan-300">
            <ListPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100">{t('playlists')}</h3>
            <p className="text-xs text-slate-400">
              {videoToAdd ? `${t('addToPlaylistFor')} "${videoToAdd.title.slice(0, 24)}..."` : t('manageYourPlaylists')}
            </p>
          </div>
        </div>

        {/* Existing Playlists list */}
        <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-cyan-950/40">
          {userPlaylists.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">{t('noPlaylistsYet')}</p>
          ) : (
            userPlaylists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => handleAddToExisting(pl)}
                className="pt-2 flex items-center justify-between p-2.5 rounded-xl hover:bg-cyan-950/40 cursor-pointer text-xs"
              >
                <div>
                  <h4 className="font-bold text-slate-200">{pl.title}</h4>
                  <span className="text-[11px] text-slate-400">{pl.videoIds?.length || 0} {t('videosTab')}</span>
                </div>
                {videoToAdd && <Check className="w-4 h-4 text-cyan-400" />}
              </div>
            ))
          )}
        </div>

        {/* Create New Playlist */}
        {isCreating ? (
          <form onSubmit={handleCreateNew} className="space-y-2 pt-2 border-t border-cyan-950">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('newPlaylistNamePlaceholder')}
              className="w-full bg-[#091224] border border-cyan-900 rounded-xl p-2.5 text-xs text-slate-100"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="flex-1 py-2 bg-cyan-600 text-white rounded-xl text-xs font-bold"
              >
                {t('create')}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full py-2.5 border border-dashed border-cyan-800 hover:border-cyan-400 rounded-xl text-xs font-bold text-cyan-300 flex items-center justify-center gap-2 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            <span>{t('createPlaylistBtn')}</span>
          </button>
        )}
      </div>
    </div>
  );
};

