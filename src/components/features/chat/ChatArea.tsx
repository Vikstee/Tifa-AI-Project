'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import AppImage from '@/components/ui/AppImage';
import MessageBubble, { Message } from './MessageBubble';
import PromptChips from './PromptChips';
import InputBar from './InputBar';
import TypingIndicator from './TypingIndicator';
import ReportCard from '../reports/ReportCard';
import { supabase } from '@/lib/supabaseClient';
import { generatePDFReport, generateExcelReport, generateWordReport } from '@/lib/reportGenerator';

interface UploadedFile {
  name: string;
  size: string;
  type: string;
  file?: File;
  url?: string;
  status?: 'loading' | 'ready';
  geminiData?: { data: string; mimeType: string };
}

// Remove initialMessages since it will be handled by page.tsx or empty at start

interface ChatAreaProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  darkMode: boolean;
  isLoggedIn: boolean;
  onRequireLogin: () => void;
  chatHistory: Message[];
  setChatHistory: React.Dispatch<React.SetStateAction<Message[]>>;
  userProfile: any;
  onFirstMessage?: (text: string) => Promise<string | undefined>;
  activeConversation?: string;
  globalHistory?: any[];
  onConversationActivity?: (conversationId: string) => void;
  isFetchingHistory?: boolean;
}

export default function ChatArea({
  sidebarOpen,
  onToggleSidebar,
  darkMode,
  isLoggedIn,
  onRequireLogin,
  chatHistory,
  setChatHistory,
  userProfile,
  onFirstMessage,
  activeConversation,
  globalHistory,
  onConversationActivity,
  isFetchingHistory = false,
}: ChatAreaProps) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [reportFormat, setReportFormat] = useState<'PDF' | 'Word' | 'Excel'>('PDF');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [dynamicSubtitle, setDynamicSubtitle] = useState<string>('Asisten AI Keuangan TelkomInfra\nDomain: PO to Cash In Financial');
  const [dynamicPrompts, setDynamicPrompts] = useState<any[]>([]);
  const [isSubtitleLoading, setIsSubtitleLoading] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const formatStickyDate = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    
    // Normalize to midnight for accurate day diffs
    const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = Math.abs(nowMidnight.getTime() - dateMidnight.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hari ini';
    if (diffDays === 1) return 'Kemarin';
    
    if (diffDays < 7) {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return days[date.getDay()];
    }
    
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    
    // Hide disclaimer if scrolled up by more than 50px
    const isUp = target.scrollHeight - target.scrollTop - target.clientHeight > 50;
    setIsScrolledUp(isUp);
  };

  const isEmpty = chatHistory.length === 0;

  useEffect(() => {
    if (isEmpty && isLoggedIn && userProfile) {
      const fetchDynamicSubtitle = async () => {
        setIsSubtitleLoading(true);
        try {
          const titles = (globalHistory || []).slice(0, 5).map((h: any) => h.title);
          const res = await fetch('/api/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ historyTitles: titles, userName: userProfile.name })
          });
          const data = await res.json();
          if (data.subtitle) setDynamicSubtitle(data.subtitle);
          if (data.prompts) setDynamicPrompts(data.prompts);
        } catch (e) {
          console.error(e);
        } finally {
          setIsSubtitleLoading(false);
        }
      };
      fetchDynamicSubtitle();
    }
  }, [isEmpty, isLoggedIn, userProfile, globalHistory]);

  // Process files (import to memory) when they are added
  useEffect(() => {
    const processLoadingFiles = async () => {
      const loadingFiles = uploadedFiles.filter(f => f.status === 'loading');
      if (loadingFiles.length === 0) return;

      const updatedFiles = await Promise.all(
        uploadedFiles.map(async (uf) => {
          if (uf.status === 'loading' && uf.file) {
            try {
              const geminiData = await processFileForGemini(uf.file);
              return { ...uf, status: 'ready', geminiData } as UploadedFile;
            } catch (error) {
              console.error('Failed to import file', error);
              return { ...uf, status: 'ready' } as UploadedFile; // Mark ready even if failed so it doesn't block forever
            }
          }
          return uf;
        })
      );
      
      setUploadedFiles(updatedFiles);
    };

    processLoadingFiles();
  }, [uploadedFiles]);

  const getGreeting = () => {
    if (isLoggedIn && userProfile?.name) {
      const hour = new Date().getHours();
      let timeGreeting = 'Selamat pagi';
      if (hour >= 11 && hour < 15) timeGreeting = 'Selamat siang';
      else if (hour >= 15 && hour < 18) timeGreeting = 'Selamat sore';
      else if (hour >= 18) timeGreeting = 'Selamat malam';
      
      const firstName = userProfile.name.split(' ')[0];
      return `${timeGreeting}, ${firstName}`;
    }
    return 'Selamat datang di TIFA';
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  // Extract reports from chat history
  useEffect(() => {
    const extractedReports: any[] = [];
    chatHistory.forEach((msg) => {
      if (msg.role === 'ai') {
        const regex = /```json_report\s+([\s\S]*?)\s*```/g;
        let match;
        while ((match = regex.exec(msg.content)) !== null) {
          try {
            const data = JSON.parse(match[1].trim());
            extractedReports.push({
              id: `${msg.id}-${extractedReports.length}`,
              title: data.reportType || 'Laporan',
              format: data.format || 'PDF',
              size: '~100 KB',
              date: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB',
              sections: data.sections,
            });
          } catch (e) {
            console.warn('Failed to parse json_report from history', e);
          }
        }
      }
    });
    // Reverse to show newest first
    setReports(extractedReports.reverse());
  }, [chatHistory]);

  const processFileForGemini = async (file: File): Promise<{ data: string; mimeType: string }> => {
    // If it's an Excel file, parse it to CSV
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      
      // Return CSV as base64
      const base64 = btoa(unescape(encodeURIComponent(csv)));
      return { data: base64, mimeType: 'text/csv' };
    }

    // Otherwise, just read as Base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve({ data: base64, mimeType: file.type || 'text/plain' });
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSend = async (overrideText?: string, overrideFiles?: any[], overrideHistory?: Message[]) => {
    const currentInput = (overrideText !== undefined ? overrideText : inputText).trim();
    const currentFiles = overrideFiles !== undefined ? overrideFiles : uploadedFiles;
    const currentHistory = overrideHistory !== undefined ? overrideHistory : chatHistory;
    const currentIsEmpty = currentHistory.length === 0;

    if (!currentInput && currentFiles.length === 0) return;
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }

    let currentSessionId = activeConversation;
    if (currentIsEmpty && !activeConversation && onFirstMessage && currentInput) {
      currentSessionId = (await onFirstMessage(currentInput)) || currentSessionId;
    }

    const userMsgFiles = currentFiles.map(f => ({ name: f.name, size: f.size, type: f.type, url: f.url }));

    if (currentSessionId) {
      let uploadedUrls: any[] = [];
      try {
        for (const uf of uploadedFiles) {
          if (!uf.file) continue;
          const filePath = `${currentSessionId}/${Date.now()}_${uf.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const { data, error } = await supabase.storage.from('chat_attachments').upload(filePath, uf.file);
          if (!error && data) {
            const { data: publicUrlData } = supabase.storage.from('chat_attachments').getPublicUrl(filePath);
            uploadedUrls.push({ name: uf.name, size: uf.size, type: uf.type, url: publicUrlData.publicUrl });
          }
        }
      } catch (e) {
        console.warn('Bucket chat_attachments mungkin belum dibuat:', e);
      }

      const { error: insertError } = await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        role: 'user',
        content: currentInput || `[${uploadedFiles.length} file diunggah]`,
        files: uploadedUrls.length > 0 ? uploadedUrls : userMsgFiles
      });
      
      if (insertError) {
        console.warn('Gagal insert dengan kolom files (mungkin kolom belum dibuat):', insertError);
        // Fallback without files column if migration not run
        await supabase.from('chat_messages').insert({
          session_id: currentSessionId,
          role: 'user',
          content: currentInput || `[${uploadedFiles.length} file diunggah]`
        });
      }
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: currentInput || `[${currentFiles.length} file diunggah]`,
      type: 'text',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      created_at: new Date().toISOString(),
      files: userMsgFiles.length > 0 ? userMsgFiles : undefined
    };

    setChatHistory([...currentHistory, userMsg]);
    if (overrideText === undefined) setInputText('');
    if (overrideFiles === undefined) setUploadedFiles([]);
    setIsLoading(true);

    const aiMsgId = `msg-${Date.now() + 1}`;
    setChatHistory([...currentHistory, userMsg, {
      id: aiMsgId,
      role: 'ai',
      content: '',
      type: 'text',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      created_at: new Date().toISOString()
    }]);

    try {
      // Use pre-processed files for Gemini
      const processedFiles = currentFiles.map((uf) => {
        if (uf.url) return null;
        if (!uf.geminiData) return null;
        return {
          inlineData: uf.geminiData,
        };
      });
      const validFiles = processedFiles.filter(Boolean);

      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: currentInput,
          files: validFiles,
          history: [...currentHistory, userMsg].slice(-10), // Send last 10 messages for context
          userId: userProfile?.id
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal terhubung ke AI');
      }

      if (!response.body) throw new Error('Response body is null');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        
        setChatHistory((prev) =>
          prev.map((msg) => (msg.id === aiMsgId ? { ...msg, content: fullText } : msg))
        );
      }
      
      if (currentSessionId) {
        await supabase.from('chat_messages').insert({
          session_id: currentSessionId,
          role: 'ai',
          content: fullText
        });
        // Bump updated_at on the session so it rises to top of sidebar
        onConversationActivity?.(currentSessionId);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        // Do not display error message if manually aborted
      } else {
        console.error(error);
        setChatHistory((prev) =>
          prev.map((msg) => (msg.id === aiMsgId ? { ...msg, content: `Error: ${error.message}` } : msg))
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleEditMessage = async (msgId: string, newText: string) => {
    const msgIndex = chatHistory.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    const originalMessage = chatHistory[msgIndex];
    const truncatedHistory = chatHistory.slice(0, msgIndex);
    
    // Attempt to delete from Supabase if we have a session
    if (activeConversation) {
      try {
        const { data: dbMsgs } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('session_id', activeConversation)
          .order('created_at', { ascending: true });
          
        if (dbMsgs && dbMsgs.length >= msgIndex) {
          const msgsToDelete = dbMsgs.slice(msgIndex).map(m => m.id);
          if (msgsToDelete.length > 0) {
            await supabase.from('chat_messages').delete().in('id', msgsToDelete);
          }
        }
      } catch (e) {
        console.warn('Failed to delete subsequent messages from db', e);
      }
    }

    // Pass original files if any
    const filesToKeep = originalMessage.files || [];
    
    handleSend(newText, filesToKeep, truncatedHistory);
  };

  const handlePromptSelect = (prompt: string) => {
    setInputText(prompt);
  };

  return (
    <div
      className={`flex flex-col flex-1 min-w-0 h-full relative ${darkMode ? 'bg-transparent' : 'bg-telkom-surface-light'}`}
    >
      {/* Top bar (Glassmorphism) */}
      <div
        className={`absolute top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b backdrop-blur-lg transition-all duration-300 ${darkMode ? 'bg-gray-900/85 border-white/5' : 'bg-white/85 border-black/5'}`}
      >
        {/* Hamburger for mobile / collapsed sidebar */}
        <button
          onClick={onToggleSidebar}
          className={`absolute left-4 p-2 rounded-xl transition-all duration-300 origin-center z-10
            ${sidebarOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}
            ${darkMode ? 'hover:bg-telkom-border-dark text-telkom-gray' : 'hover:bg-gray-100 text-gray-500'}
          `}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Logo for collapsed state */}
        <div className={`absolute left-[64px] flex-shrink-0 flex items-center justify-center bg-transparent transition-all duration-300 origin-center z-10
          ${sidebarOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100 w-7 h-7'}
        `}>
          <AppImage src={darkMode ? "/tifa_dark.png" : "/tifa_light.png"} alt="TIFA Logo" width={28} height={28} className="object-contain" />
        </div>

        <div className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:pl-[336px]' : 'pl-[88px]'}`}>
          <h1
            className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}
          >
            {isEmpty ? 'Chat Baru' : (globalHistory?.find(h => h.id === activeConversation)?.title || 'Percakapan')}
          </h1>
          <p className={`text-xs ${darkMode ? 'text-telkom-gray' : 'text-gray-500'}`}>
            TIFA - TelkomInfra Financial Assistant
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowReportPanel(true)}
            title="Generate Laporan"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 origin-center
              ${showReportPanel ? 'scale-0 opacity-0 pointer-events-none absolute right-4' : 'scale-100 opacity-100 relative'}
              ${darkMode ? 'bg-telkom-red text-white' : 'bg-telkom-red text-white hover:bg-red-700'}
            `}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="hidden sm:inline">Laporan</span>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* Chat messages */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div 
            className={`flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-20 space-y-6 transition-all duration-300 ${sidebarOpen ? 'lg:pl-[352px]' : ''} ${showReportPanel ? 'lg:pr-[352px]' : ''}`}
            onScroll={handleScroll}
          >
            {isFetchingHistory ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] relative">
                {/* SVG Filter for Gooey Effect */}
                <svg width="0" height="0" className="absolute">
                  <filter id="goo">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
                    <feBlend in="SourceGraphic" in2="goo" />
                  </filter>
                </svg>
                
                {/* Gooey Bubbles Container */}
                <div 
                  className="relative flex items-center justify-center mb-6 opacity-60 mix-blend-multiply dark:mix-blend-screen" 
                  style={{ filter: 'url(#goo)', width: '80px', height: '80px' }}
                >
                  <motion.div
                    animate={{ x: [-15, 15, -15], y: [-15, 15, -15] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute w-9 h-9 bg-telkom-red rounded-full"
                  />
                  <motion.div
                    animate={{ x: [15, -15, 15], y: [-15, 15, -15] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    className="absolute w-12 h-12 bg-red-400 rounded-full"
                  />
                  <motion.div
                    animate={{ x: [0, 0, 0], y: [15, -15, 15], scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="absolute w-10 h-10 bg-red-300 rounded-full"
                  />
                </div>
                
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} animate-pulse`}>Memuat riwayat percakapan...</p>
              </div>
            ) : isEmpty ? (
              /* Empty state */
              <div className="flex flex-col items-center mt-4 md:mt-12 lg:mt-20 text-center px-4">
                <div className="w-32 h-32 mb-2 relative">
                  <AppImage
                    src={darkMode ? "/tifa_dark.png" : "/tifa_light.png"}
                    alt="TIFA Logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <h2
                  className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}
                >
                  {getGreeting()}
                </h2>
                <div className={`text-sm mb-8 max-w-xl mx-auto leading-relaxed ${darkMode ? 'text-telkom-gray' : 'text-gray-500'}`}>
                  {isSubtitleLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                    </div>
                  ) : (
                    dynamicSubtitle.split('\n').map((line, i) => (
                      <p key={i} className={i > 0 ? 'text-xs opacity-70 mt-1' : ''}>{line}</p>
                    ))
                  )}
                </div>
                <PromptChips 
                  darkMode={darkMode} 
                  onSelectPrompt={handlePromptSelect} 
                  prompts={dynamicPrompts.length > 0 ? dynamicPrompts : undefined}
                  isLoading={isSubtitleLoading}
                />
              </div>
            ) : (
              /* Messages */
              <div className="flex flex-col gap-6">
                {(() => {
                  const groups: { dateStr: string, messages: Message[] }[] = [];
                  let currentGroup: { dateStr: string, messages: Message[] } | null = null;
                  
                  chatHistory.forEach(msg => {
                    const dStr = formatStickyDate(msg.created_at || new Date().toISOString());
                    if (!currentGroup || currentGroup.dateStr !== dStr) {
                      currentGroup = { dateStr: dStr, messages: [] };
                      groups.push(currentGroup);
                    }
                    currentGroup.messages.push(msg);
                  });

                  return groups.map((group, groupIdx) => (
                    <div key={`group-${group.dateStr}-${groupIdx}`} className="relative flex flex-col gap-6">
                      {/* Sticky Date Header for this group */}
                      <div className="sticky top-2 z-20 flex justify-center pointer-events-none">
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow-[0_4px_12px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 ${darkMode ? 'bg-[#1E2024]/80 text-gray-300 border border-white/10' : 'bg-white/80 text-gray-700 border border-black/5'}`}>
                          {group.dateStr}
                        </div>
                      </div>
                      
                      {/* Messages in this group */}
                      <div className="flex flex-col gap-6">
                        {group.messages.map((msg) => (
                          <MessageBubble 
                            key={msg.id} 
                            message={msg} 
                            darkMode={darkMode} 
                            onEditMessage={handleEditMessage} 
                            userProfile={userProfile}
                          />
                        ))}
                      </div>
                    </div>
                  ));
                })()}
                {isLoading && <TypingIndicator darkMode={darkMode} />}
              </div>
            )}
            {/* Spacer so the last message is not covered by the InputBar */}
            <div className="h-40 flex-shrink-0" />
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="absolute bottom-0 left-0 right-0 flex-shrink-0 overflow-visible pointer-events-none">
            {/* Animated Smoky Gradient - Changed to subtle tech indigo/blue to avoid clashing with red elements */}
            <div className={`absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t ${darkMode ? 'from-indigo-500/20 via-blue-500/10' : 'from-indigo-500/10 via-blue-500/5'} to-transparent blur-2xl animate-bottom-smoke pointer-events-none`} />

            <div className={`pointer-events-auto relative z-30 px-4 pb-6 pb-safe pt-2 transition-all duration-300 ${sidebarOpen ? 'lg:pl-[352px]' : ''} ${showReportPanel ? 'lg:pr-[352px]' : ''}`}>

            <InputBar
              darkMode={darkMode}
              inputText={inputText}
              onInputChange={setInputText}
              onSend={handleSend}
              onFileUpload={(files) => setUploadedFiles((prev) => [...prev, ...files].slice(0, 10))}
              uploadedFiles={uploadedFiles}
              onRemoveFile={(idx) => setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))}
              isLoading={isLoading}
              isScrolledUp={isScrolledUp}
              onCancel={handleCancel}
            />
            </div>
          </div>
        </div>

        {/* Mobile overlay for Report Panel */}
        {showReportPanel && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-all duration-300" onClick={() => setShowReportPanel(false)} />
        )}

        {/* Report generation panel */}
        <motion.div
          className={`absolute z-50 w-[calc(100%-2rem)] md:w-80 flex flex-col overflow-hidden
          top-4 right-4 bottom-4 rounded-[2rem]
          ${darkMode 
            ? 'bg-gray-900/60 lg:bg-black/10 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.4)]' 
            : 'bg-white/80 lg:bg-white/10 border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(0,0,0,0.1)]'}
          backdrop-blur-2xl
          ${!showReportPanel ? 'pointer-events-none' : ''}
        `}
          style={{ transformOrigin: 'calc(100% - 24px) 24px' }}
          initial={false}
          animate={{
            scale: showReportPanel ? 1 : 0.4,
            opacity: showReportPanel ? 1 : 0,
          }}
          transition={{ type: 'spring', stiffness: 350, damping: 25, mass: 1.2 }}
        >
          {/* Panel header */}
          <div
            className={`flex items-center justify-between px-4 py-3 border-b border-white/10`}
          >
            <h3 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Generate Laporan
            </h3>
            <button
              onClick={() => setShowReportPanel(false)}
              className={`p-1.5 rounded-full transition-colors ${darkMode ? 'hover:bg-white/10 text-white/70' : 'hover:bg-black/5 text-gray-700'}`}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className={`p-3 rounded-xl text-xs mb-2 ${darkMode ? 'bg-telkom-charcoal/50 text-telkom-gray-light' : 'bg-gray-50 text-gray-600'}`}>
                Riwayat *file* laporan yang dihasilkan oleh TIFA pada sesi percakapan ini akan muncul di sini.
              </div>
              
              {/* Search Bar */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  placeholder="Cari laporan..."
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none transition-colors ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-telkom-red' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-telkom-red'
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${darkMode ? 'text-telkom-gray' : 'text-gray-500'}`}
                >
                  File Laporan
                </label>
                <div className="space-y-2">
                  {reports.filter(r => r.title.toLowerCase().includes(reportSearchQuery.toLowerCase())).map((report) => (
                    <ReportCard
                      key={report.id}
                      darkMode={darkMode}
                      title={report.title}
                      format={report.format}
                      size={report.size}
                      date={report.date}
                      url={report.url}
                      isSidebar={true}
                      sections={report.sections}
                    />
                  ))}
                  {isGeneratingReport && (
                    <ReportCard
                      darkMode={darkMode}
                      title="Generating Laporan..."
                      format={reportFormat}
                      size="---"
                      date="..."
                      isGenerating={true}
                      isSidebar={true}
                    />
                  )}
                  {reports.length === 0 && !isGeneratingReport && (
                    <p className={`text-xs ${darkMode ? 'text-onSurface/50' : 'text-gray-500'}`}>
                      Belum ada laporan yang dibuat.
                    </p>
                  )}
                  {reports.length > 0 && reports.filter(r => r.title.toLowerCase().includes(reportSearchQuery.toLowerCase())).length === 0 && (
                    <p className={`text-xs ${darkMode ? 'text-onSurface/50' : 'text-gray-500'}`}>
                      Tidak ada laporan yang sesuai pencarian.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

      {/* Login Modal (soft-gate) is now handled in page.tsx */}
    </div>
  );
}
