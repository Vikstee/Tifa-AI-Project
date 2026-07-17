'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SparklesIcon, EllipsisVerticalIcon, TrashIcon, ShareIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import AppImage from '@/components/ui/AppImage';

const getInitials = (name?: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface ConversationItem {
  id: string;
  title: string;
  timestamp: string;
}

const MemoizedConversationItem = React.memo(({ 
  conv, isActive, isHovered, darkMode, isMenuOpen, menuRef,
  onHover, onSelect, onMenuToggle, onShare, onDelete, onToggleSidebarMobile 
}: {
  conv: ConversationItem;
  isActive: boolean;
  isHovered: boolean;
  darkMode: boolean;
  isMenuOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onHover: (id: string) => void;
  onSelect: (id: string) => void;
  onMenuToggle: (e: React.MouseEvent, id: string | null) => void;
  onShare?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleSidebarMobile: () => void;
}) => (
  <div 
    className="relative group"
    onMouseEnter={() => onHover(conv.id)}
  >
    {isActive && (
      <motion.div
        layoutId="activeChat"
        className={`absolute inset-0 rounded-xl z-0 ${
          darkMode 
            ? 'bg-telkom-red/15 border border-telkom-red/30 shadow-[0_4px_12px_rgba(228,0,43,0.15)]' 
            : 'bg-red-50/90 border border-telkom-red/20 shadow-[0_4px_12px_rgba(228,0,43,0.08)]'
        }`}
        initial={false}
        transition={{ type: 'spring', stiffness: 350, damping: 25, mass: 1.2 }}
      />
    )}
    {isHovered && !isActive && (
      <motion.div
        layoutId="hoverChat"
        className={`absolute inset-0 rounded-xl z-0 ${
          darkMode 
            ? 'bg-white/5 border border-white/10' 
            : 'bg-black/5 border border-black/5'
        }`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    )}
    <button
      onClick={() => {
        onSelect(conv.id);
        if (window.innerWidth < 1024) onToggleSidebarMobile();
      }}
      className={`
        w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 relative z-10
        ${
          isActive
            ? 'border-l-2 border-telkom-red'
            : darkMode
              ? 'hover:bg-telkom-border-dark/60'
              : 'hover:bg-gray-100'
        }
      `}
    >
      <div className="flex items-start gap-2.5">
        <span className="text-base flex-shrink-0 mt-0.5">💬</span>
        <div className="min-w-0 flex-1 pr-6">
          <p
            className={`text-sm font-medium truncate ${
              isActive
                ? 'text-telkom-red'
                : darkMode
                  ? 'text-white'
                  : 'text-gray-900'
            }`}
          >
            {conv.title}
          </p>
          <p
            className={`text-xs truncate mt-0.5 ${darkMode ? 'text-telkom-gray' : 'text-gray-500'}`}
          >
            {new Date(conv.timestamp).toLocaleDateString()}
          </p>
        </div>
      </div>
    </button>
    
    {/* 3-dot menu button */}
    <button
      onClick={(e) => onMenuToggle(e, isMenuOpen ? null : conv.id)}
      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20
        ${isMenuOpen ? 'opacity-100' : ''}
        ${darkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-200 text-gray-500'}
      `}
    >
      <EllipsisVerticalIcon className="w-4 h-4" />
    </button>

    {/* Dropdown Menu */}
    {isMenuOpen && (
      <div 
        ref={menuRef as React.RefObject<HTMLDivElement>}
        className={`absolute right-8 top-1/2 -translate-y-1/2 z-50 w-36 rounded-xl shadow-lg border py-1 animate-in fade-in zoom-in-95 duration-150
          ${darkMode ? 'bg-[#2A2B2E] border-white/10' : 'bg-white border-gray-100'}
        `}
      >
        <button
          onClick={(e) => {
            onMenuToggle(e, null);
            onShare?.(conv.id);
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
            ${darkMode ? 'text-gray-200 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-50'}
          `}
        >
          <ShareIcon className="w-4 h-4" />
          Bagikan
        </button>
        <button
          onClick={(e) => {
            onMenuToggle(e, null);
            onDelete?.(conv.id);
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
            ${darkMode ? 'text-red-400 hover:bg-white/10' : 'text-red-600 hover:bg-red-50'}
          `}
        >
          <TrashIcon className="w-4 h-4" />
          Hapus
        </button>
      </div>
    )}
  </div>
));

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
  isLoggedIn: boolean;
  onRequireLogin?: () => void;
  userProfile: any;
  onDeleteConversation?: (id: string) => void;
  onShareConversation?: (id: string) => void;
  isSettingsOpen?: boolean;
  isProfileOpen?: boolean;
}

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
  onRequireLogin,
  isLoggedIn,
  userProfile,
  onDeleteConversation,
  onShareConversation,
  isSettingsOpen,
  isProfileOpen
}: SidebarProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null);
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

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden transition-all duration-300" onClick={onToggle} />}

      {/* Sidebar */}
      <motion.aside
        className={`
          fixed z-40
          flex flex-col
          top-4 left-4 bottom-4
          ${darkMode 
            ? 'bg-gray-900/60 lg:bg-black/10 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.4)]' 
            : 'bg-white/80 lg:bg-white/10 border border-white/40 shadow-[0_16px_48px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(0,0,0,0.1)]'}
          backdrop-blur-2xl rounded-[2rem]
          overflow-hidden
          ${!isOpen ? 'pointer-events-none' : ''}
        `}
        style={{ WebkitBackdropFilter: 'blur(24px)', transformOrigin: '18px 14px' }}
        initial={false}
        animate={{
          width: 288,
          scale: isOpen ? 1 : 0.4,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 25, mass: 1.2 }}
      >
        <div className="flex flex-col h-full min-w-[288px] lg:min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 p-4">
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-transparent">
                <AppImage src={darkMode ? "/tifa_dark.png" : "/tifa_light.png"} alt="TIFA" width={40} height={40} className="object-contain w-10 h-10" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-bold text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}
                  >
                    TIFA
                  </span>
                  <span className="text-xs bg-telkom-red/20 text-telkom-red px-1.5 py-0.5 rounded font-medium">
                    Beta
                  </span>
                </div>
                <p className="text-xs text-telkom-gray truncate">AI Financial Assistant</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${darkMode ? 'hover:bg-telkom-border-dark text-telkom-gray' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 1024) onToggle();
              }}
              className={`
              w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl
              bg-telkom-red hover:bg-telkom-red-dark
              text-white font-medium text-sm
              transition-all duration-200 shadow-lg shadow-telkom-red/20
            `}
            >
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Chat Baru</span>
            </button>
          </div>

          {/* Conversation History */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {isLoggedIn ? (
              <>
                <p
                  className={`text-xs font-semibold uppercase tracking-wider px-2 py-2 ${darkMode ? 'text-telkom-gray' : 'text-gray-400'}`}
                >
                  Percakapan Terbaru
                </p>
                {history.length === 0 && (
                  <div className="px-3 py-6 text-center">
                    <p className={`text-xs ${darkMode ? 'text-telkom-gray' : 'text-gray-500'}`}>
                      Belum ada percakapan.
                    </p>
                  </div>
                )}
                <div className="space-y-0.5 relative" onMouseLeave={() => setHoveredConversation(null)}>
                  {history.map((conv) => (
                    <MemoizedConversationItem
                      key={conv.id}
                      conv={conv}
                      isActive={activeConversation === conv.id}
                      isHovered={hoveredConversation === conv.id}
                      darkMode={darkMode}
                      isMenuOpen={menuOpenId === conv.id}
                      menuRef={menuRef}
                      onHover={setHoveredConversation}
                      onSelect={onSelectConversation}
                      onMenuToggle={(e, id) => {
                        e.stopPropagation();
                        setMenuOpenId(id);
                      }}
                      onShare={onShareConversation}
                      onDelete={onDeleteConversation}
                      onToggleSidebarMobile={onToggle}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="px-3 py-6 text-center">
                <p className={`text-xs ${darkMode ? 'text-telkom-gray' : 'text-gray-500'} mb-3`}>
                  Masuk untuk menyimpan riwayat chat
                </p>
                {onRequireLogin && (
                  <button
                    onClick={onRequireLogin}
                    className="text-xs font-medium text-telkom-red hover:underline"
                  >
                    Masuk Sekarang
                  </button>
                )}
              </div>
            )}
          </div>



            {/* User profile */}
            <div
              className="flex items-center gap-3 p-3 rounded-xl transition-all"
            >
              {!isProfileOpen ? (
                <motion.div 
                  layoutId="profile-modal"
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden ${
                    isLoggedIn ? 'bg-primary' : 'bg-telkom-red'
                  }`}
                  onClick={isLoggedIn ? onOpenProfile : onRequireLogin}
                >
                  {isLoggedIn && userProfile?.avatar_url ? (
                    <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-sm font-bold">
                      {isLoggedIn ? getInitials(userProfile?.name) : '?'}
                    </span>
                  )}
                </motion.div>
              ) : (
                <div className="w-10 h-10 rounded-full flex-shrink-0" />
              )}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={isLoggedIn ? onOpenProfile : onRequireLogin}
              >
                <p
                  className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}
                >
                  {isLoggedIn ? userProfile?.name : 'Tamu'}
                </p>
                <p className="text-xs text-telkom-gray truncate">
                  {isLoggedIn ? 'Staff' : 'Belum Masuk'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Neomorphic Icon-only Gooey Switch inside Profile Row */}
                <div
                  onClick={onToggleDarkMode}
                  className="relative w-[48px] h-[24px] rounded-full cursor-pointer flex items-center transition-colors duration-500 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.2)] flex-shrink-0"
                  style={{
                    backgroundColor: darkMode ? '#5A6789' : '#D1D5DB'
                  }}
                >
                  {/* Inactive Icons inside track */}
                  <div className="absolute inset-0 flex justify-between items-center px-2 pointer-events-none">
                    {/* Faded Sun (Left) - visible in dark mode */}
                    <svg className={`w-3.5 h-3.5 transition-opacity duration-500 ${darkMode ? 'text-white/50 opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {/* Faded Moon (Right) - visible in light mode */}
                    <svg className={`w-3.5 h-3.5 transition-opacity duration-500 ${!darkMode ? 'text-slate-500/30 opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  </div>

                  {/* Absolute positioned Thumb */}
                  <motion.div
                    animate={{ x: darkMode ? 26 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25, mass: 1 }}
                    whileTap={{ scaleX: 1.2 }}
                    className="absolute w-[20px] h-[20px] bg-white rounded-full flex-shrink-0 flex items-center justify-center shadow-[0_1.5px_4px_rgba(0,0,0,0.25),-1px_-1px_2px_rgba(255,255,255,0.8)] z-10 origin-center"
                  >
                    <motion.div
                      initial={false}
                      animate={{ rotate: darkMode ? -45 : 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      {darkMode ? (
                        <svg className="w-3.5 h-3.5 text-[#4C62B0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-[#F99F0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      )}
                    </motion.div>
                  </motion.div>
                </div>

                {isLoggedIn && !isSettingsOpen ? (
                  <motion.button
                    layoutId="settings-modal"
                    onClick={onOpenSettings}
                    className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-telkom-border-dark text-telkom-gray' : 'hover:bg-gray-100 text-gray-500'}`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </motion.button>
                ) : isLoggedIn && isSettingsOpen ? (
                  <div className="w-7 h-7" />
                ) : null}
              </div>
            </div>
          </div>
        </motion.aside>
      </>
  );
}
