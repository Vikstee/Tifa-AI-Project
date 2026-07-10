import React, { useRef, useState } from 'react';
import { XMarkIcon, ArrowRightOnRectangleIcon, CameraIcon, TrashIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabaseClient';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onLogout: () => void;
  onUserUpdate?: (user: any) => void;
}

const getInitials = (name?: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onLogout, onUserUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate size (e.g. max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file maksimal 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`;

      // Upload to supabase storage (chat_attachments bucket, avatars folder)
      const { error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(fileName);

      const avatar_url = publicUrlData.publicUrl;

      // Update user auth metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url }
      });

      if (updateError) throw updateError;

      // Update local state
      if (onUserUpdate) {
        onUserUpdate({ ...user, avatar_url });
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert('Gagal mengunggah foto profil');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user?.id || !user?.avatar_url) return;
    
    if (!confirm('Hapus foto profil?')) return;

    setIsUploading(true);
    try {
      // Update user auth metadata to remove avatar_url
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      });

      if (updateError) throw updateError;

      // Update local state
      if (onUserUpdate) {
        onUserUpdate({ ...user, avatar_url: null });
      }
    } catch (error: any) {
      console.error('Error deleting avatar:', error);
      alert('Gagal menghapus foto profil');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-telkom-sidebar w-full max-w-sm rounded-2xl p-6 shadow-xl relative animate-in fade-in zoom-in duration-200 border border-transparent dark:border-telkom-border-dark">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-telkom-gray dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-telkom-border-dark transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mt-4 mb-6">
          <div className="relative group mb-4">
            <div className="w-24 h-24 rounded-full flex items-center justify-center bg-primary text-white overflow-hidden text-3xl font-bold shadow-md">
              {user?.avatar_url ? (
                <img src={user?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                getInitials(user?.name)
              )}
            </div>
            
            {/* Hover overlay for changing picture */}
            <label className="absolute inset-0 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity">
              {isUploading ? (
                <span className="text-xs">Loading...</span>
              ) : (
                <>
                  <CameraIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-medium">Ubah Foto</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>

            {/* Delete button (only if has avatar) */}
            {user?.avatar_url && !isUploading && (
              <button
                onClick={handleDeleteAvatar}
                className="absolute -bottom-1 -right-1 bg-white dark:bg-telkom-sidebar p-1.5 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-sm border border-gray-200 dark:border-telkom-border-dark"
                title="Hapus Foto"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{user?.name || 'User'}</h2>
          <p className="text-gray-500 dark:text-telkom-gray text-sm mt-1">
            {user?.email || 'user@telkominfra.co.id'}
          </p>
          <div className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            Staff / Verified
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-telkom-border-dark">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm border border-red-100"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Keluar (Logout)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
