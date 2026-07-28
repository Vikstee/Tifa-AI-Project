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
  const [quotedTexts, setQuotedTexts] = useState<string[]>([]);
  const [selectionPopup, setSelectionPopup] = useState<{ text: string; x: number; y: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Dynamic Time-of-Day Greeting with User Name
  const [greetingText, setGreetingText] = useState<string>('');

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      let timeGreeting = 'Selamat Pagi';
      if (hour >= 11 && hour < 15) {
        timeGreeting = 'Selamat Siang';
      } else if (hour >= 15 && hour < 19) {
        timeGreeting = 'Selamat Sore';
      } else if (hour >= 19 || hour < 4) {
        timeGreeting = 'Selamat Malam';
      }

      const firstName = userProfile?.name ? userProfile.name.split(' ')[0] : '';
      const namePart = firstName ? `, ${firstName}` : '';
      setGreetingText(`${timeGreeting}${namePart}! Ada yang bisa saya bantu hari ini?`);
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, [userProfile]);

  // Handle Text Selection Popup
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionPopup(null);
        return;
      }
      const text = selection.toString().trim();
      if (text.length > 2) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            setSelectionPopup({
              text,
              x: rect.left + rect.width / 2,
              y: Math.max(10, rect.top - 42),
            });
          }
        } catch (e) {
          // ignore selection error
        }
      } else {
        setSelectionPopup(null);
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

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
    let rawInput = (overrideText !== undefined ? overrideText : inputText).trim();
    if (quotedTexts.length > 0 && overrideText === undefined) {
      const formattedQuotes = quotedTexts.map(q => `> "${q}"`).join('\n');
      rawInput = `${formattedQuotes}\n\n${rawInput}`;
      setQuotedTexts([]);
    }
    const currentInput = rawInput;
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
    <div className="flex-1 flex flex-col h-full min-w-0 p-3 md:p-4 overflow-hidden relative">
      {/* Inner Rounded Chat Card Viewport */}
      <div
        className={`
          flex-1 flex flex-col h-full w-full rounded-[24px] md:rounded-[28px] overflow-hidden border shadow-sm transition-all duration-200 relative
          ${darkMode ? 'bg-[#1a1a1c] border-zinc-800 text-white' : 'bg-white border-gray-200/80 text-gray-900'}
        `}
      >
        {/* Card Header inside Chat Window */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 dark:border-zinc-800/80 flex-shrink-0 bg-transparent">
          <div className="flex items-center gap-3 min-w-0">
            {!sidebarOpen && (
              <button
                onClick={onToggleSidebar}
                className={`p-1.5 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-gray-100 text-gray-600'
                }`}
                title="Open Sidebar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-base font-semibold truncate leading-tight">
                {isEmpty ? 'New Chat' : (globalHistory?.find(h => h.id === activeConversation)?.title || 'New Chat')}
              </h1>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} truncate mt-0.5`}>
                TIFA - Telkominfra Financial Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReportPanel(true)}
              title="Generate Laporan"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#eb1d4e] hover:bg-[#d81844] text-white transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Laporan</span>
            </button>
          </div>
        </div>

        {/* Card Body Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden relative flex-col">
          {isFetchingHistory ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] relative">
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} animate-pulse`}>
                Memuat riwayat percakapan...
              </p>
            </div>
          ) : isEmpty ? (
            /* Empty Chat State - Shifted upwards, compact elegant text with disclaimer at bottom */
            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-between p-6 text-center">
              <div className="w-full flex flex-col items-center justify-start pt-2 sm:pt-4">
                {/* Room chat logo: logo_utama.png */}
                <div className="w-24 sm:w-28 mb-3 flex justify-center">
                  <AppImage
                    src="/logo_utama.png"
                    alt="TIFA Main Logo"
                    width={130}
                    height={85}
                    className="w-auto h-20 sm:h-24 object-contain"
                    priority
                  />
                </div>

                {/* Headline with Elms Sans / Plus Jakarta Sans font */}
                <h2 className={`text-lg sm:text-xl font-medium mb-3.5 tracking-tight font-['Plus_Jakarta_Sans',sans-serif] ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {greetingText || 'Selamat Pagi! Ada yang bisa saya bantu hari ini?'}
                </h2>

                {/* Central Input Field */}
                <div className="w-full max-w-3xl mb-4">
                  <InputBar
                    darkMode={darkMode}
                    inputText={inputText}
                    onInputChange={setInputText}
                    onSend={handleSend}
                    onFileUpload={(files) => setUploadedFiles((prev) => [...prev, ...files].slice(0, 10))}
                    uploadedFiles={uploadedFiles}
                    onRemoveFile={(idx) => setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))}
                    isLoading={isLoading}
                    isScrolledUp={false}
                    onRemoveQuote={(idx) => setQuotedTexts((prev) => prev.filter((_, i) => i !== idx))}
                    onClearAllQuotes={() => setQuotedTexts([])}
                  />
                </div>

                {/* 4 Feature Cards */}
                <PromptChips
                  darkMode={darkMode}
                  onSelectPrompt={handlePromptSelect}
                  prompts={dynamicPrompts.length > 0 ? dynamicPrompts : undefined}
                  isLoading={isSubtitleLoading}
                />
              </div>

              {/* Disclaimer positioned at the very bottom center of card */}
              <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-6 text-center`}>
                TIFA dapat membuat kesalahan. Verifikasi informasi penting sebelum digunakan.
              </p>
            </div>
          ) : (
            /* Active Messages State */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {chatHistory.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    darkMode={darkMode}
                    onEditMessage={handleEditMessage}
                    userProfile={userProfile}
                  />
                ))}
                {isLoading && !chatHistory.some(m => m.role === 'ai' && !m.content) && (
                  <TypingIndicator darkMode={darkMode} />
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Anchored Input Bar at bottom of card */}
              <div className="p-4 bg-transparent">
                <InputBar
                  darkMode={darkMode}
                  inputText={inputText}
                  onInputChange={setInputText}
                  onSend={handleSend}
                  onFileUpload={(files) => setUploadedFiles((prev) => [...prev, ...files].slice(0, 10))}
                  uploadedFiles={uploadedFiles}
                  onRemoveFile={(idx) => setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))}
                  isLoading={isLoading}
                  isScrolledUp={false}
                  onCancel={handleCancel}
                  quotedTexts={quotedTexts}
                  onRemoveQuote={(idx) => setQuotedTexts((prev) => prev.filter((_, i) => i !== idx))}
                  onClearAllQuotes={() => setQuotedTexts([])}
                />
                {/* Bottom Disclaimer */}
                <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'} text-center mt-2`}>
                  TIFA dapat membuat kesalahan. Verifikasi informasi penting sebelum digunakan.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Floating Selection "Balas ↩" Tooltip */}
        {selectionPopup && (
          <div
            style={{
              position: 'fixed',
              left: `${selectionPopup.x}px`,
              top: `${selectionPopup.y}px`,
              transform: 'translateX(-50%)',
              zIndex: 9999,
            }}
            className="animate-fadeIn pointer-events-auto"
          >
            <button
              type="button"
              onClick={() => {
                if (quotedTexts.length < 5) {
                  setQuotedTexts((prev) => [...prev, selectionPopup.text]);
                }
                setSelectionPopup(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-telkom-red text-white text-xs font-semibold shadow-2xl hover:bg-red-600 transition-all hover:scale-105 active:scale-95 border border-white/30 backdrop-blur-md"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Balas
            </button>
          </div>
        )}

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
  );
}
