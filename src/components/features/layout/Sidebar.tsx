'use client';

import React, { useState, useRef, useEffect } from 'react';
import AppImage from '@/components/ui/AppImage';
import { motion, AnimatePresence } from 'framer-motion';
import { EllipsisHorizontalIcon, ShareIcon, TrashIcon, LockClosedIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface ConversationItem {
  id: string;
  title: string;
  timestamp: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  activeConversation: string;
  onSelectConversation: (id: string) => void;
  history: ConversationItem[];
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenLogout?: () => void;
  isLoggedIn: boolean;
  onRequireLogin?: () => void;
  userProfile: any;
  onDeleteConversation?: (id: string) => void;
  onShareConversation?: (id: string) => void;
  isSettingsOpen?: boolean;
  isProfileOpen?: boolean;
}

const sampleToday = [
  { id: 'sample-1', title: 'Reviewing and approving p...' },
  { id: 'sample-2', title: 'Matching invoices against...' },
  { id: 'sample-3', title: 'Planning outgoing payment...' },
];

const sampleYesterday = [
  { id: 'sample-4', title: 'Following up on overdue cu...' },
  { id: 'sample-5', title: 'Discussion on material purc...' },
  { id: 'sample-6', title: 'Finance approval for suppli...' },
];

const sampleOlder = [
  { id: 'sample-7', title: 'Finance approval for suppli...' },
  { id: 'sample-8', title: 'Updating quantities and pri...' },
  { id: 'sample-9', title: 'Preparing invoice for compl...' },
  { id: 'sample-10', title: 'Reviewing expected cash in...' },
  { id: 'sample-11', title: 'Request for project advanc...' },
  { id: 'sample-12', title: 'Tracking outstanding custo...' },
];

export default function Sidebar({
  isOpen,
  onToggle,
  darkMode,
  onToggleDarkMode,
  activeConversation,
  onSelectConversation,
  history,
  onNewChat,
  onOpenSettings,
  onOpenProfile,
  onOpenLogout,
  onRequireLogin,
  isLoggedIn,
  userProfile,
  onDeleteConversation,
  onShareConversation,
  isSettingsOpen,
  isProfileOpen
}: SidebarProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const todayItems: any[] = [];
  const yesterdayItems: any[] = [];
  const olderItems: any[] = [];

  if (history && history.length > 0) {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayMidnight = todayMidnight - 86400000;

    history.forEach(item => {
      const itemTime = new Date(item.timestamp).getTime();
      if (itemTime >= todayMidnight) {
        todayItems.push(item);
      } else if (itemTime >= yesterdayMidnight) {
        yesterdayItems.push(item);
      } else {
        olderItems.push(item);
      }
    });
  }

  const hasRealHistory = history && history.length > 0;
  const displayToday = hasRealHistory ? todayItems : sampleToday;
  const displayYesterday = hasRealHistory ? yesterdayItems : sampleYesterday;
  const displayOlder = hasRealHistory ? olderItems : sampleOlder;

  const renderHistoryItem = (item: ConversationItem) => {
    const isMenuOpen = menuOpenId === item.id;

    return (
      <div
        key={item.id}
        onClick={() => {
          onSelectConversation(item.id);
          if (window.innerWidth < 1024) onToggle();
        }}
        className={`
          group relative flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors font-medium text-xs
          ${activeConversation === item.id
            ? darkMode
              ? 'bg-zinc-800 text-white font-semibold'
              : 'bg-gray-200/80 text-gray-900 font-semibold'
            : darkMode
            ? 'text-zinc-300 hover:bg-zinc-800/50 hover:text-white'
            : 'text-gray-700 hover:bg-gray-200/50 hover:text-gray-900'}
        `}
      >
        <span className="truncate flex-1 pr-1">{item.title}</span>

        {/* 3-dots action button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpenId(isMenuOpen ? null : item.id);
          }}
          className={`
            p-1 rounded-md transition-all flex-shrink-0
            ${isMenuOpen 
              ? 'opacity-100 bg-gray-300/60 dark:bg-zinc-700/80' 
              : 'opacity-70 group-hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:bg-gray-300/50 dark:hover:bg-zinc-700/60'}
          `}
          title="Opsi Chat"
        >
          <EllipsisHorizontalIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>

        {/* 3-dots popup menu */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            className="
              absolute right-2 top-8 z-[70] w-36 py-1 rounded-xl shadow-xl
              bg-white dark:bg-zinc-800 border border-gray-200/90 dark:border-zinc-700/90
              backdrop-blur-xl text-xs flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bagikan */}
            <button
              type="button"
              onClick={() => {
                setMenuOpenId(null);
                if (onShareConversation) onShareConversation(item.id);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-zinc-700/70 text-gray-700 dark:text-gray-200 font-medium transition-colors"
            >
              <ShareIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              <span>Bagikan</span>
            </button>

            {/* Hapus Chat */}
            <button
              type="button"
              onClick={() => {
                setMenuOpenId(null);
                if (onDeleteConversation) onDeleteConversation(item.id);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 font-medium transition-colors border-t border-gray-100 dark:border-zinc-700/50"
            >
              <TrashIcon className="w-3.5 h-3.5 text-red-500" />
              <span>Hapus Chat</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50] lg:hidden transition-all duration-300"
          onClick={onToggle}
        />
      )}

      {/* Sidebar container - 100% Smooth Framer Motion Push & Slide */}
      <motion.aside
        suppressHydrationWarning
        initial={false}
        animate={{
          width: isOpen ? 270 : 0,
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }}
        className={`
          fixed lg:relative top-0 left-0 bottom-0 z-[60]
          flex flex-col h-full flex-shrink-0 overflow-hidden
          ${darkMode ? 'bg-[#121214] text-white' : 'bg-[#f4f4f6] text-gray-900'}
        `}
      >
        <motion.div
          initial={false}
          animate={{
            x: isOpen ? 0 : -270,
            opacity: isOpen ? 1 : 0,
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }}
          className="flex flex-col h-full w-[270px] flex-shrink-0"
        >
          {/* Header with logo & toggle button */}
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <AppImage
                src={darkMode ? "/logo_sidebar_dark.png" : "/logo_sidebar_light.png"}
                alt="TIFA Logo"
                width={120}
                height={32}
                className="h-8 w-auto object-contain"
                priority
              />
            </div>
            <button
              onClick={onToggle}
              title="Toggle Sidebar"
              className={`p-1.5 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-200 text-gray-500'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M6 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-3.5">
            <button
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 1024) onToggle();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#eb1d4e] hover:bg-[#d81844] active:scale-[0.98] text-white font-medium text-sm transition-all shadow-[0_10px_25px_-5px_rgba(235,29,78,0.5)]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Chat</span>
            </button>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-4 text-xs flex flex-col">
            {!isLoggedIn ? (
              <div className="my-auto p-4 text-center flex flex-col items-center justify-center mx-2">
                <div className="w-10 h-10 rounded-xl bg-[#eb1d4e]/10 text-[#eb1d4e] flex items-center justify-center mb-3">
                  <LockClosedIcon className="w-5 h-5 text-[#eb1d4e]" />
                </div>
                <p className="text-xs font-bold text-gray-800 dark:text-white mb-1">
                  Masuk untuk Melihat Riwayat
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-[210px]">
                  Login ke akun Anda untuk menyimpan dan mengelola riwayat percakapan TIFA.
                </p>
              </div>
            ) : (
              <>
                {/* TODAY */}
                {displayToday.length > 0 && (
                  <div>
                    <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                      TODAY
                    </p>
                    <div className="space-y-0.5">
                      {displayToday.map(renderHistoryItem)}
                    </div>
                  </div>
                )}

                {/* YESTERDAY */}
                {displayYesterday.length > 0 && (
                  <div>
                    <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                      YESTERDAY
                    </p>
                    <div className="space-y-0.5">
                      {displayYesterday.map(renderHistoryItem)}
                    </div>
                  </div>
                )}

                {/* OLDER */}
                {displayOlder.length > 0 && (
                  <div>
                    <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                      OLDER
                    </p>
                    <div className="space-y-0.5">
                      {displayOlder.map(renderHistoryItem)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* User Profile Footer - Morphing Shared Layout or Login/Signup Button */}
          <div className="p-3 mt-auto min-h-[56px] relative flex items-center">
            {!isLoggedIn ? (
              <div
                className={`
                  w-full flex items-center justify-between p-1.5 pl-3 pr-2 rounded-full border transition-all shadow-sm
                  ${darkMode 
                    ? 'bg-[#1f1f22] border-zinc-800/80 text-white' 
                    : 'bg-[#f4f4f6] border-gray-200/80 text-gray-900'}
                `}
              >
                <button
                  onClick={onRequireLogin}
                  className="flex items-center gap-2 text-xs font-semibold text-[#eb1d4e] hover:opacity-80 transition-opacity flex-1 py-1"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4 text-[#eb1d4e]" />
                  <span>Masuk / Daftar</span>
                </button>

                <button
                  onClick={onToggleDarkMode}
                  title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  className={`p-1.5 rounded-full transition-colors ${
                    darkMode ? 'hover:bg-zinc-800 text-amber-400' : 'hover:bg-gray-200 text-zinc-600'
                  }`}
                >
                  {darkMode ? (
                    <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
              </div>
            ) : (
              <AnimatePresence>
                {!isProfileOpen && (
                  <motion.div
                    layoutId="profile-card-modal-container"
                    transition={{ type: 'spring', stiffness: 280, damping: 26, mass: 0.7 }}
                    className={`
                      w-full flex items-center justify-between p-1.5 pl-2 pr-2 rounded-full border transition-colors shadow-sm
                      ${darkMode 
                        ? 'bg-[#1f1f22] border-zinc-800/80 text-white' 
                        : 'bg-[#f4f4f6] border-gray-200/80 text-gray-900'}
                    `}
                  >
                    {/* Left: Avatar & Name - Clicking opens Settings / Profil Modal */}
                    <div
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 py-0.5 hover:opacity-80 transition-opacity"
                      onClick={onOpenProfile}
                      title="Pengaturan Profil"
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center">
                        {userProfile?.avatar_url ? (
                          <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <img
                            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                            alt="John Wick"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {userProfile?.name || 'John Wick'}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Theme Toggle Button */}
                    <button
                      onClick={onToggleDarkMode}
                      title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                      className={`p-1.5 rounded-full transition-colors mx-1 ${
                        darkMode ? 'hover:bg-zinc-800 text-amber-400' : 'hover:bg-gray-200 text-zinc-600'
                      }`}
                    >
                      {darkMode ? (
                        <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      )}
                    </button>

                    {/* Right: Exit Logo Button - Opens Dedicated Logout Confirmation Popup */}
                    <button
                      onClick={onOpenLogout || onOpenProfile}
                      title="Keluar Akun (Logout)"
                      className="w-8 h-8 rounded-full bg-[#fde8ef] dark:bg-[#eb1d4e]/20 hover:bg-[#fbd0dd] dark:hover:bg-[#eb1d4e]/30 flex items-center justify-center text-[#eb1d4e] transition-colors flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </motion.aside>
    </>
  );
}
