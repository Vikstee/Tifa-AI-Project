import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-telkom-sidebar w-full max-w-md rounded-2xl p-6 shadow-xl relative animate-in fade-in zoom-in duration-200 border border-transparent dark:border-telkom-border-dark">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-telkom-gray dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-telkom-border-dark transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Pengaturan</h2>
          <p className="text-gray-500 dark:text-telkom-gray text-sm">Sesuaikan preferensi aplikasi Anda.</p>
        </div>

        <div className="space-y-6">
          {/* Theme Setting */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Tampilan</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Mode Gelap (Dark Mode)</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 dark:bg-telkom-border-dark peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <hr className="border-gray-200 dark:border-telkom-border-dark" />

          {/* WhatsApp Default Number */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Nomor WhatsApp Default</h3>
            <input
              type="text"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-telkom-charcoal border border-gray-200 dark:border-telkom-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white text-sm"
              placeholder="+62 812-xxxx-xxxx"
              defaultValue="6281234567890"
            />
            <p className="text-xs text-gray-500 dark:text-telkom-gray mt-2">
              Nomor ini akan digunakan sebagai default saat mengirim laporan via WhatsApp.
            </p>
          </div>

          <hr className="border-gray-200 dark:border-telkom-border-dark" />

          {/* Default Model */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Model LLM Default</h3>
            <select className="w-full px-4 py-2 bg-gray-50 dark:bg-telkom-charcoal border border-gray-200 dark:border-telkom-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white text-sm">
              <option value="flash">Gemini Flash (Cepat & Ringan)</option>
              <option value="pro">Gemini Pro (Analisis Mendalam)</option>
              <option value="advanced">Gemini Advanced (Kompleks)</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Simpan & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
