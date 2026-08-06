'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/features/layout/Sidebar';
import ChatArea from '@/components/features/chat/ChatArea';
import AuthModal from '@/components/features/modals/AuthModal';
import SettingsModal from '@/components/features/modals/SettingsModal';
import ProfileModal from '@/components/features/modals/ProfileModal';
import LogoutModal from '@/components/features/modals/LogoutModal';
import ShareModal from '@/components/features/modals/ShareModal';
import { Message } from '@/components/features/chat/MessageBubble';

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [activeConversation, setActiveConversation] = useState<string>('');

  // Modals state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Auth state
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Chat state
  const [history, setHistory] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    // Initial session check from localStorage
    try {
      const savedUser = localStorage.getItem('tifa_user');
      const savedToken = localStorage.getItem('tifa_token');
      if (savedUser && savedToken) {
        setUserProfile(JSON.parse(savedUser));
        setAuthToken(savedToken);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadHistory();
  }, [userProfile?.id, userProfile?.user_uuid]);

  const loadHistory = async () => {
    const uId = userProfile?.id || userProfile?.user_uuid || 'guest_user';

    try {
      const res = await fetch(`/api/chat/history?userId=${encodeURIComponent(uId)}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setHistory(data.data.map((s: any) => ({
          id: s.id,
          title: s.title,
          timestamp: s.updated_at || s.created_at
        })));
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const handleLoginSuccess = (token: string, user: any) => {
    setAuthToken(token);
    setUserProfile(user);
    try {
      localStorage.setItem('tifa_token', token);
      localStorage.setItem('tifa_user', JSON.stringify(user));
    } catch {}
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUserProfile(null);
    setActiveConversation('');
    setChatHistory([]);
    try {
      localStorage.removeItem('tifa_token');
      localStorage.removeItem('tifa_user');
    } catch {}
    setShowProfileModal(false);
  };

  const handleSelectConversation = async (id: string) => {
    setActiveConversation(id);
    setChatHistory([]);
    setIsFetchingHistory(true);
    
    try {
      const res = await fetch(`/api/chat/history?sessionId=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setChatHistory(data.data.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          type: 'text',
          timestamp: new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          created_at: msg.created_at,
          files: msg.attachments ? (typeof msg.attachments === 'string' ? JSON.parse(msg.attachments) : msg.attachments) : [],
        })));
      } else {
        setChatHistory([]);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setChatHistory([]);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversation('');
    setChatHistory([]);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch(`/api/chat/history?sessionId=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
    if (activeConversation === id) {
      handleNewChat();
    }
    loadHistory();
  };

  const handleShareConversation = (id: string) => {
    setShareUrl(`${window.location.origin}/share/${id}`);
    setShowShareModal(true);
  };

  const handleFirstMessage = async (text: string) => {
    const uId = userProfile?.id || userProfile?.user_uuid || 'guest_user';
    
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const title = text.substring(0, 30) + (text.length > 30 ? '...' : '');

    try {
      await fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'create_session',
          session: { id: newSessionId, user_id: uId, title }
        })
      });
      setActiveConversation(newSessionId);
      loadHistory();
      return newSessionId;
    } catch (e) {
      console.error('Failed to create chat session:', e);
      return undefined;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-telkom-dark transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        activeConversation={activeConversation}
        onSelectConversation={handleSelectConversation}
        history={history}
        onNewChat={handleNewChat}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenLogout={() => setShowLogoutModal(true)}
        isLoggedIn={Boolean(userProfile)}
        onRequireLogin={() => setShowLoginModal(true)}
        userProfile={userProfile}
        onDeleteConversation={handleDeleteConversation}
        onShareConversation={handleShareConversation}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <ChatArea
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          darkMode={darkMode}
          isLoggedIn={Boolean(userProfile)}
          onRequireLogin={() => setShowLoginModal(true)}
          chatHistory={chatHistory}
          setChatHistory={setChatHistory}
          userProfile={userProfile}
          onFirstMessage={handleFirstMessage}
          activeConversation={activeConversation}
          globalHistory={history}
          onConversationActivity={loadHistory}
          isFetchingHistory={isFetchingHistory}
        />
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        userProfile={userProfile}
        onUserUpdate={(updated) => {
          setUserProfile(updated);
          try {
            localStorage.setItem('tifa_user', JSON.stringify(updated));
          } catch {}
        }}
      />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={userProfile}
        onLogout={() => {
          setShowProfileModal(false);
          setShowLogoutModal(true);
        }}
        onUserUpdate={(updated) => {
          setUserProfile(updated);
          try {
            localStorage.setItem('tifa_user', JSON.stringify(updated));
          } catch {}
        }}
      />

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onLogout={handleLogout}
        user={userProfile}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl}
      />
    </div>
  );
}
