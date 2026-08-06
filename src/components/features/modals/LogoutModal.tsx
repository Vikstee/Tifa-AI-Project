'use client';

import React from 'react';
import { ArrowRightOnRectangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  user?: any;
}

export default function LogoutModal({ isOpen, onClose, onLogout, user }: LogoutModalProps) {
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
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Logout Confirmation Popup Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="
              fixed z-[90] flex flex-col overflow-hidden
              m-auto inset-0 h-fit w-[calc(100%-2.5rem)] sm:w-[400px] p-6 sm:p-7
              bg-white/95 dark:bg-[#18181b]/95
              border border-gray-200/80 dark:border-zinc-800/80
              shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-3xl rounded-[2rem]
            "
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors z-10"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            {/* Header Icon & Title */}
            <div className="flex flex-col items-center text-center mt-2 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-[#eb1d4e] flex items-center justify-center mb-3 shadow-inner">
                <ArrowRightOnRectangleIcon className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                Konfirmasi Logout
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[280px]">
                Apakah Anda yakin ingin keluar dari akun <span className="font-semibold text-gray-800 dark:text-gray-200">TIFA AI</span>?
              </p>
            </div>

            {/* User Profile Summary */}
            {user && (
              <div className="flex items-center gap-3 p-3 mb-6 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/50">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-telkom-red text-white flex items-center justify-center font-bold text-sm">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user.name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                    {user.name || 'User'}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-400 truncate">
                    {user.email || 'user@telkominfra.co.id'}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 transition-all border border-gray-200/60 dark:border-zinc-700/60 active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#eb1d4e] hover:bg-[#d81844] text-white shadow-[0_8px_20px_rgba(235,29,78,0.45)] transition-all active:scale-95 cursor-pointer"
              >
                Ya, Keluar Akun
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
