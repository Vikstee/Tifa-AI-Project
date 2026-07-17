'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/features/layout/Sidebar';
import ChatArea from '@/components/features/chat/ChatArea';
import AuthModal from '@/components/features/modals/AuthModal';
import SettingsModal from '@/components/features/modals/SettingsModal';
import ProfileModal from '@/components/features/modals/ProfileModal';
import ShareModal from '@/components/features/modals/ShareModal';
import { supabase } from '@/lib/supabaseClient';

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [activeConversation, setActiveConversation] = useState<string>('');

  // Modals state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Auth state
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Chat state
  const [history, setHistory] = useState<any[]>([]);
  const [currentChatHistory, setCurrentChatHistory] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthToken(session.access_token);
        setUserProfile({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          wa_number: session.user.user_metadata?.wa_number || '',
          llm_model: session.user.user_metadata?.llm_model || 'flash',
          avatar_url: session.user.user_metadata?.avatar_url || null,
        });
      }
      setIsAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthToken(session.access_token);
        setUserProfile({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          wa_number: session.user.user_metadata?.wa_number || '',
          llm_model: session.user.user_metadata?.llm_model || 'flash',
          avatar_url: session.user.user_metadata?.avatar_url || null,
        });
      } else {
        setAuthToken(null);
        setUserProfile(null);
        setActiveConversation('');
        setCurrentChatHistory([]);
      }
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userProfile?.id) {
      loadHistory();
    }
  }, [userProfile?.id]);

  useEffect(() => {
    // Clone Logic
    if (isAuthLoading) return;
    
    const params = new URLSearchParams(window.location.search);
    const cloneId = params.get('clone');
    if (cloneId) {
      if (userProfile?.id) {
        handleCloneChat(cloneId);
      } else {
        setShowLoginModal(true);
      }
    }
  }, [userProfile?.id, isAuthLoading]); // Re-run when user logs in to handle clone after login

  const handleCloneChat = async (sourceId: string) => {
    if (!userProfile?.id) return;
    
    try {
      // Fetch source session
      const { data: sourceSession } = await supabase.from('chat_sessions').select('*').eq('id', sourceId).single();
      if (!sourceSession) return;
      
      // Fetch source msgs
      const { data: sourceMsgs } = await supabase.from('chat_messages').select('*').eq('session_id', sourceId).order('created_at', { ascending: true });
      
      // Create new session
      const { data: newSession } = await supabase.from('chat_sessions').insert({
        user_id: userProfile.id,
        title: `${sourceSession.title} (Cloned)`
      }).select().single();
      
      if (newSession && sourceMsgs) {
        // Insert cloned msgs with stripped files
        const newMsgs = sourceMsgs.map((msg: any) => ({
          session_id: newSession.id,
          role: msg.role,
          content: msg.content,
        }));
        
        if (newMsgs.length > 0) {
          const { error: insertError } = await supabase.from('chat_messages').insert(newMsgs);
          if (insertError) {
             console.error('Failed to insert cloned messages:', insertError);
          }
        }
        
        // Clean up URL
        window.history.replaceState({}, '', '/');
        
        // Load new session
        await loadHistory();
        setActiveConversation(newSession.id);
      }
    } catch (e) {
      console.error('Failed to clone chat:', e);
    }
  };


  const loadHistory = async () => {
    // Try updated_at first (if column exists). Fallback to created_at.
    let { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('updated_at', { ascending: false });

    if (error) {
      // updated_at column may not exist yet — fallback to created_at
      const result = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false });
      data = result.data;
      error = result.error;
    }

    if (data && !error) {
      setHistory(data.map((s: any) => ({
        id: s.id,
        title: s.title,
        timestamp: s.updated_at || s.created_at
      })));
    }
  };

  const handleLoginSuccess = (token: string, user: any) => {
    setAuthToken(token);
    setUserProfile(user);
    setShowLoginModal(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowProfileModal(false);
  };

  const handleSelectConversation = async (id: string) => {
    setActiveConversation(id);
    setCurrentChatHistory([]); // Segera kosongkan chat lama agar tidak nge-lag saat merender ulang
    setIsFetchingHistory(true);
    
    // Fetch messages for this session
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', id)
      .order('created_at', { ascending: true });
      
    if (data && !error) {
      setCurrentChatHistory(data.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        type: 'text',
        timestamp: new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        files: msg.files || [],
      })));
    } else {
      setCurrentChatHistory([]);
    }
    setIsFetchingHistory(false);
  };

  const handleNewChat = () => {
    setActiveConversation('');
    setCurrentChatHistory([]);
  };

  const handleDeleteConversation = async (id: string) => {
    await supabase.from('chat_sessions').delete().eq('id', id);
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
    if (!userProfile?.id) return undefined;
    
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userProfile.id,
        title: text.substring(0, 30) + (text.length > 30 ? '...' : '')
      })
      .select()
      .single();
      
    if (data && !error) {
      setActiveConversation(data.id);
      loadHistory();
      return data.id;
    }
    return undefined;
  };

  const handleConversationActivity = async (conversationId: string) => {
    // Bump updated_at so this conversation rises to the top of the sidebar
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
    loadHistory();
  };

  return (
    <div
      className={`flex h-[100dvh] overflow-hidden ${darkMode ? 'dark bg-telkom-charcoal' : 'bg-telkom-surface-light'}`}
    >
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
        onRequireLogin={() => setShowLoginModal(true)}
        isLoggedIn={!!authToken}
        userProfile={userProfile}
        onDeleteConversation={handleDeleteConversation}
        onShareConversation={handleShareConversation}
      />
      <ChatArea
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        darkMode={darkMode}
        isLoggedIn={!!authToken}
        onRequireLogin={() => setShowLoginModal(true)}
        chatHistory={currentChatHistory}
        setChatHistory={setCurrentChatHistory}
        userProfile={userProfile}
        onFirstMessage={handleFirstMessage}
        activeConversation={activeConversation}
        globalHistory={history}
        onConversationActivity={handleConversationActivity}
        isFetchingHistory={isFetchingHistory}
      />

      <AuthModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
        userProfile={userProfile} 
        onUserUpdate={setUserProfile}
      />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={userProfile}
        onLogout={handleLogout}
        onUserUpdate={setUserProfile}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl}
      />
    </div>
  );
}
