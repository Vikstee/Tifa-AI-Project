import React from 'react';
import { XMarkIcon, ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onLogout: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onLogout }) => {
  if (!isOpen) return null;

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
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <UserCircleIcon className="w-12 h-12 text-primary" />
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
