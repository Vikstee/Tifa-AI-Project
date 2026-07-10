'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SparklesIcon } from '@heroicons/react/24/solid';
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
        const regex = /```json_report\n([\s\S]*?)\n```/g;
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
    if (currentIsEmpty && onFirstMessage && currentInput) {
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
    }]);

    try {
      // Process files for Gemini
      const processedFiles = await Promise.all(
        currentFiles.map(async (uf) => {
          if (uf.url) {
            // Already uploaded, we should still try to send to Gemini? 
            // Since we don't have the File object, Gemini can't read it easily without downloading.
            // For now, if editing, we might just ignore the old files for Gemini unless we fetch them.
            return null;
          }
          if (!uf.file) return null;
          const { data, mimeType } = await processFileForGemini(uf.file);
          return {
            inlineData: {
              data,
              mimeType,
            },
          };
        })
      );
      const validFiles = processedFiles.filter(Boolean);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: currentInput,
          files: validFiles,
          history: [...currentHistory, userMsg].slice(-10) // Send last 10 messages for context
        }),
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
      }
    } catch (error: any) {
      console.error(error);
      setChatHistory((prev) =>
        prev.map((msg) => (msg.id === aiMsgId ? { ...msg, content: `Error: ${error.message}` } : msg))
      );
    } finally {
      setIsLoading(false);
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
      className={`flex flex-col flex-1 min-w-0 h-full relative ${darkMode ? 'bg-telkom-charcoal' : 'bg-telkom-surface-light'}`}
    >
      {/* Top bar */}
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 ${darkMode ? 'border-telkom-border-dark' : 'border-gray-200'}`}
      >
        {/* Hamburger for mobile / collapsed sidebar */}
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-telkom-border-dark text-telkom-gray' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}

        {/* Logo for collapsed state */}
        {!sidebarOpen && (
          <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-telkom-red/10 rounded-lg">
            <SparklesIcon className="w-4 h-4 text-telkom-red" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1
            className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}
          >
            {isEmpty ? 'Chat Baru' : 'PO to Cash Analysis'}
          </h1>
          <p className={`text-xs ${darkMode ? 'text-telkom-gray' : 'text-gray-500'}`}>
            TIFA — TelkomInfra AI Financial Assistant
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowReportPanel(!showReportPanel)}
            title="Generate Laporan"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors
              ${
                showReportPanel
                  ? 'bg-telkom-red text-white'
                  : darkMode
                    ? 'hover:bg-telkom-border-dark text-telkom-gray'
                    : 'hover:bg-gray-100 text-gray-600'
              }
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
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Chat messages */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {isEmpty ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
                <div className="w-48 h-16 mb-6 relative">
                  <AppImage
                    src={darkMode ? "/assets/images/logo_telkominfra_grayscale.png" : "/assets/images/telkominfra-hires.png"}
                    alt="TelkomInfra Logo"
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
              <>
                {chatHistory.map((msg) => (
                  <MessageBubble 
                    key={msg.id} 
                    message={msg} 
                    darkMode={darkMode} 
                    onEditMessage={handleEditMessage} 
                  />
                ))}
                {isLoading && <TypingIndicator darkMode={darkMode} />}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div
            className={`px-4 pb-4 pt-2 flex-shrink-0 border-t ${darkMode ? 'border-telkom-border-dark/50' : 'border-gray-200/50'}`}
          >
            <InputBar
              darkMode={darkMode}
              inputText={inputText}
              onInputChange={setInputText}
              onSend={handleSend}
              onFileUpload={(files) => setUploadedFiles((prev) => [...prev, ...files].slice(0, 10))}
              uploadedFiles={uploadedFiles}
              onRemoveFile={(idx) => setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Report generation panel */}
        {showReportPanel && (
          <div
            className={`w-80 flex-shrink-0 border-l flex flex-col overflow-hidden animate-slideIn
            ${darkMode ? 'bg-telkom-sidebar border-telkom-border-dark' : 'bg-white border-gray-200'}
          `}
          >
            {/* Panel header */}
            <div
              className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-telkom-border-dark' : 'border-gray-200'}`}
            >
              <h3 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Generate Laporan
              </h3>
              <button
                onClick={() => setShowReportPanel(false)}
                className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-telkom-border-dark text-telkom-gray' : 'hover:bg-gray-100 text-gray-500'}`}
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
          </div>
        )}
      </div>

      {/* Login Modal (soft-gate) is now handled in page.tsx */}
    </div>
  );
}
