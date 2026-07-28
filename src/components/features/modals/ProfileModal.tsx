'use client';

import React, { useRef, useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  ArrowRightOnRectangleIcon, 
  CameraIcon, 
  TrashIcon, 
  CheckIcon, 
  UserIcon, 
  PhoneIcon, 
  BriefcaseIcon,
  EnvelopeIcon 
} from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form state for CRUD
  const [name, setName] = useState('');
  const [waNumber, setWaNumber] = useState('');
  const position = user?.role || 'Senior Manager Telkom Infra'; // System-managed position input

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setWaNumber(user.wa_number || user.phone || '');
    }
  }, [user, isOpen]);

  const initialName = user?.name || '';
  const initialWa = user?.wa_number || user?.phone || '';
  const hasChanges = (name.trim() !== initialName.trim()) || (waNumber.trim() !== initialWa.trim());

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !hasChanges) return;

    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name,
          wa_number: waNumber,
        }
      });

      if (error) throw error;

      if (onUserUpdate) {
        onUserUpdate({
          ...user,
          name,
          wa_number: waNumber,
          phone: waNumber,
        });
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      alert('Gagal menyimpan perubahan profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file maksimal 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(fileName);

      const avatar_url = publicUrlData.publicUrl;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url }
      });

      if (updateError) throw updateError;

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
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      });

      if (updateError) throw updateError;

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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Morphing Modal Window with Shared layoutId */}
          <motion.div
            layoutId="profile-card-modal-container"
            transition={{ type: 'spring', stiffness: 280, damping: 26, mass: 0.7 }}
            className="
              fixed z-[70] flex flex-col overflow-hidden
              m-auto inset-0 h-fit max-h-[90vh] w-[calc(100%-2rem)] sm:w-[460px] p-6 sm:p-7
              bg-white/95 dark:bg-[#18181b]/95
              border border-gray-200/80 dark:border-zinc-800/80
              shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-3xl rounded-[2.5rem]
            "
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors z-10"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-telkom-red/10 dark:bg-telkom-red/20 text-telkom-red flex items-center justify-center font-bold">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">Pengaturan Profil</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Kelola dan perbarui data diri akun Anda</p>
              </div>
            </div>

            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-5 pb-4 border-b border-gray-100 dark:border-zinc-800/80">
              <div className="relative group mb-2">
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-telkom-red text-white overflow-hidden text-2xl font-bold shadow-md">
                  {user?.avatar_url ? (
                    <img src={user?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(name || user?.name)
                  )}
                </div>

                <label className="absolute inset-0 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity">
                  {isUploading ? (
                    <span className="text-[10px]">Loading...</span>
                  ) : (
                    <>
                      <CameraIcon className="w-5 h-5 mb-0.5" />
                      <span className="text-[9px] font-semibold">Ubah Foto</span>
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

                {user?.avatar_url && !isUploading && (
                  <button
                    type="button"
                    onClick={handleDeleteAvatar}
                    className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-800 p-1.5 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-md border border-gray-200 dark:border-zinc-700"
                    title="Hapus Foto"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                {user?.email || 'user@telkominfra.co.id'}
              </p>
            </div>

            {/* CRUD Form */}
            <form onSubmit={handleSaveChanges} className="space-y-3.5">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-gray-200 dark:border-zinc-700/80 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-white outline-none focus:border-telkom-red dark:focus:border-telkom-red transition-all"
                  />
                </div>
              </div>

              {/* Nomor WA */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nomor WhatsApp
                </label>
                <div className="relative">
                  <PhoneIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={waNumber}
                    onChange={(e) => setWaNumber(e.target.value)}
                    placeholder="0813xxxxxxxx"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-gray-200 dark:border-zinc-700/80 bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-white outline-none focus:border-telkom-red dark:focus:border-telkom-red transition-all"
                  />
                </div>
              </div>

              {/* Jabatan (Read-only / Non-editable) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Jabatan
                </label>
                <div className="relative">
                  <BriefcaseIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={position}
                    disabled
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-gray-200 dark:border-zinc-800 bg-gray-200/60 dark:bg-zinc-900/80 text-gray-500 dark:text-gray-400 cursor-not-allowed font-medium select-none"
                  />
                </div>
              </div>

              {/* Success Toast */}
              {savedSuccess && (
                <div className="flex items-center justify-center gap-1.5 py-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                  <CheckIcon className="w-4 h-4" />
                  <span>Perubahan profil berhasil disimpan!</span>
                </div>
              )}

              {/* "Simpan Perubahan" Primary Button - Redup if no changes, Menyala if has changes */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={!hasChanges || isSaving}
                  className={`
                    w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-2 border
                    ${hasChanges
                      ? 'bg-[#eb1d4e] hover:bg-[#d81844] text-white border-transparent shadow-[0_8px_20px_rgba(235,29,78,0.45)] cursor-pointer active:scale-95'
                      : 'bg-red-500/10 text-red-400/50 dark:bg-red-950/20 dark:text-red-400/40 border-red-200/40 dark:border-red-900/30 cursor-not-allowed opacity-50 shadow-none'}
                  `}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProfileModal;
