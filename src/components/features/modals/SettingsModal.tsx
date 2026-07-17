import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: any;
  onUserUpdate?: (user: any) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, userProfile, onUserUpdate }) => {
  const [waNumber, setWaNumber] = useState('');
  const [llmModel, setLlmModel] = useState('flash');
  const [fullName, setFullName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setWaNumber(userProfile.wa_number || '');
      setLlmModel(userProfile.llm_model || 'flash');
      setFullName(userProfile.name || '');
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!userProfile) {
      alert("Anda harus login untuk menyimpan pengaturan ini.");
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          wa_number: waNumber,
          llm_model: llmModel
        }
      });
      
      if (error) throw error;
      
      onUserUpdate?.({ ...userProfile, name: fullName, wa_number: waNumber, llm_model: llmModel });
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Gagal menyimpan pengaturan: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Overlay (Only visible on small screens to focus on modal) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm md:hidden" 
            onClick={onClose} 
          />

          <motion.div
            layoutId="settings-modal"
            transition={{ type: 'spring', stiffness: 350, damping: 25, mass: 1.2 }}
            className="
              fixed z-[70] flex flex-col overflow-hidden
              m-auto inset-0 h-fit w-[calc(100%-2rem)] md:w-[480px] p-8
              bg-white/90 dark:bg-gray-900/90 lg:dark:bg-black/40
              border border-white/40 dark:border-white/20
              shadow-[0_16px_48px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(0,0,0,0.1)]
              dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.4)]
              backdrop-blur-3xl rounded-[2rem]
            "
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 dark:text-telkom-gray dark:hover:text-white rounded-full hover:bg-gray-100/50 dark:hover:bg-white/10 transition-colors z-10"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Pengaturan</h2>
          <p className="text-gray-500 dark:text-telkom-gray text-sm">Sesuaikan preferensi aplikasi Anda.</p>
        </div>

        <div className="space-y-6">
          {/* User Name Setting */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Profil</h3>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">Nama Lengkap</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-telkom-charcoal border border-gray-200 dark:border-telkom-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white text-sm"
                placeholder="Masukkan nama Anda"
              />
            </div>
          </div>

          <hr className="border-gray-200 dark:border-telkom-border-dark" />

          {/* WhatsApp Default Number */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Nomor WhatsApp Default</h3>
            <input
              type="text"
              value={waNumber}
              onChange={(e) => {
                let val = e.target.value;
                if (val.startsWith('0')) {
                  val = '62' + val.substring(1);
                }
                setWaNumber(val);
              }}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-telkom-charcoal border border-gray-200 dark:border-telkom-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white text-sm"
              placeholder="+62 812-xxxx-xxxx"
            />
            <p className="text-xs text-gray-500 dark:text-telkom-gray mt-2">
              Nomor ini akan digunakan sebagai default saat mengirim laporan via WhatsApp.
            </p>
          </div>

          <hr className="border-gray-200 dark:border-telkom-border-dark" />

          {/* Default Model */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Model LLM Default</h3>
            <select 
              value={llmModel}
              onChange={(e) => setLlmModel(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-telkom-charcoal border border-gray-200 dark:border-telkom-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white text-sm"
            >
              <option value="flash">Gemini Flash (Cepat & Ringan)</option>
              <option value="pro">Gemini Pro (Analisis Mendalam)</option>
              <option value="advanced">Gemini Advanced (Kompleks)</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan & Tutup'}
          </button>
        </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
