'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface UploadedFile {
  name: string;
  size: string;
  type: string;
  file?: File;
  geminiData?: { data: string; mimeType: string };
  url?: string;
  status?: 'loading' | 'ready';
}

interface InputBarProps {
  darkMode: boolean;
  inputText: string;
  onInputChange: (text: string) => void;
  onSend: () => void;
  onFileUpload: (files: UploadedFile[]) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (index: number) => void;
  isLoading?: boolean;
  isScrolledUp?: boolean;
  onCancel?: () => void;
  quotedTexts?: string[];
  onRemoveQuote?: (index: number) => void;
  onClearAllQuotes?: () => void;
}

export default function InputBar({
  darkMode,
  inputText,
  onInputChange,
  onSend,
  onFileUpload,
  uploadedFiles,
  onRemoveFile,
  isLoading = false,
  isScrolledUp = false,
  onCancel,
  quotedTexts = [],
  onRemoveQuote,
  onClearAllQuotes,
}: InputBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [selectedFileForModal, setSelectedFileForModal] = useState<UploadedFile | null>(null);
  const [fileTextContent, setFileTextContent] = useState<string>('');
  const [expandedQuoteIndex, setExpandedQuoteIndex] = useState<number | null>(null);

  // Read text/image content of file selected for modal preview
  useEffect(() => {
    if (!selectedFileForModal) {
      setFileTextContent('');
      return;
    }
    const readContent = async () => {
      if (selectedFileForModal.geminiData?.data) {
        try {
          const decoded = decodeURIComponent(escape(atob(selectedFileForModal.geminiData.data)));
          setFileTextContent(decoded);
          return;
        } catch (e) {
          // fallback
        }
      }
      if (selectedFileForModal.file) {
        const file = selectedFileForModal.file;
        if (file.type.startsWith('image/')) {
          setFileTextContent('');
          return;
        }
        try {
          const text = await file.text();
          setFileTextContent(text || '[File kosong]');
        } catch (e) {
          setFileTextContent('[Format file ini tidak dapat dibaca langsung sebagai teks]');
        }
      } else {
        setFileTextContent('[Detail isi file tidak tersedia]');
      }
    };
    readContent();
  }, [selectedFileForModal]);

  const recognitionRef = useRef<any>(null);
  const currentInputRef = useRef(inputText);
  
  // Audio Visualizer Refs
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const historyRef = useRef<number[]>(new Array(60).fill(0));

  const startVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
        } 
      });
      streamRef.current = stream;
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64; // Small size for just a few bars
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;
      
      const draw = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
        
        // Capture the core voice frequency (around bin 4, ignoring 0-300Hz wind rumble)
        let centerValue = dataArrayRef.current[4] || 0;
        
        // Apply strict Noise Gate Threshold to completely ignore background wind/noise
        if (centerValue < 80) {
          centerValue = 0;
        } else {
          centerValue = centerValue - 80; // Smooth scaling above threshold
        }

        // Push current center value to history array for the ripple effect
        historyRef.current.unshift(centerValue);
        historyRef.current.pop();
        
        // Update the 31 bars for a wide waveform
        for (let i = 0; i < 31; i++) {
          if (barsRef.current[i]) {
            // Calculate distance from center bar (index 15)
            const distance = Math.abs(15 - i);
            
            // Fetch the historical volume for this bar to create an outward moving wave
            const delayIndex = distance * 2; // Outer bars read older volumes
            const historicalValue = historyRef.current[delayIndex] || 0;
            
            // Flat weighting so the wave travels to the edges strongly (W shape)
            const weight = 1.0 - (distance * 0.03); // Center is 1.0, Edge (15) is 0.55
            
            // Normalize to 10% - 100% height
            const heightPercent = Math.max(10, Math.min(100, (historicalValue / 195) * 200 * weight)); 
            barsRef.current[i]!.style.height = `${heightPercent}%`;
          }
        }
        
        animationFrameRef.current = requestAnimationFrame(draw);
      };
      
      draw();
    } catch (err) {
      console.error("Microphone visualizer error:", err);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current) audioContextRef.current.close();
  };

  // Sync inputText to ref for the speech recognition callback
  useEffect(() => {
    currentInputRef.current = inputText;
  }, [inputText]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true; // Enable live text
        recognition.lang = 'id-ID'; // Set to Indonesian

        recognition.onresult = (event: any) => {
          let newFinal = '';
          let interim = '';
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              newFinal += event.results[i][0].transcript + ' ';
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          
          if (newFinal) {
            setFinalTranscript(prev => prev + newFinal);
          }
          setLiveTranscript(interim);
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'not-allowed') {
            console.warn('Microphone access denied:', event.error);
            alert('Tifa membutuhkan izin mikrofon untuk mendengar suara Anda. Silakan klik ikon gembok di sebelah URL browser dan izinkan akses mikrofon.');
          } else {
            console.warn('Speech recognition error:', event.error);
          }
          setIsRecording(false);
          setShowVoiceModal(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Browser Anda tidak mendukung fitur input suara (Gunakan Chrome/Edge/Safari terbaru).");
      return;
    }
    
    if (isRecording) {
      stopRecordingAndApply();
    } else {
      try {
        setFinalTranscript('');
        setLiveTranscript('');
        recognitionRef.current.start();
        setIsRecording(true);
        setShowVoiceModal(true);
        startVisualizer();
      } catch (e) {
        console.error("Microphone start error:", e);
      }
    }
  };

  const stopRecordingAndApply = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    stopVisualizer();
    setIsRecording(false);
    setShowVoiceModal(false);
    
    const current = currentInputRef.current;
    const addedText = (finalTranscript + ' ' + liveTranscript).trim();
    if (addedText) {
      onInputChange(current + (current && !current.endsWith(' ') ? ' ' : '') + addedText);
    }
  };

  const cancelRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    stopVisualizer();
    setIsRecording(false);
    setShowVoiceModal(false);
    setFinalTranscript('');
    setLiveTranscript('');
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to recalculate
    textarea.style.height = 'auto';

    // Max height is 144px (approx 4x the normal height of 36px)
    const maxHeight = 144;
    const currentScrollHeight = textarea.scrollHeight;

    if (currentScrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${currentScrollHeight}px`;
      textarea.style.overflowY = 'hidden';
    }
  }, [inputText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((inputText.trim() || uploadedFiles.length > 0) && !isLoading) onSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 10);
    const mapped: UploadedFile[] = files.map((f) => ({
      name: f.name,
      size:
        f.size > 1024 * 1024
          ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(f.size / 1024).toFixed(0)} KB`,
      type: f.type,
      file: f,
      status: 'loading',
    }));
    onFileUpload(mapped);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileIconMap = (name: string, type: string) => {
    const lowerName = (name || '').toLowerCase();
    const lowerType = (type || '').toLowerCase();

    if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) return '📄';
    if (lowerType.includes('sheet') || lowerType.includes('excel') || lowerType.includes('csv') || lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv')) return '📊';
    if (lowerType.includes('word') || lowerType.includes('document') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) return '📝';
    if (lowerType.includes('image') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png') || lowerName.endsWith('.gif')) return '🖼️';
    return '📎';
  };

  return (
    <div className="w-full">
      {/* Input container with frosted glass pill design */}
      <div className="relative max-w-4xl mx-auto">
        {/* Multi-Quote Reply preview chips */}
        <AnimatePresence>
          {quotedTexts && quotedTexts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex flex-wrap gap-2 mb-2 px-1"
            >
              {quotedTexts.map((quote, idx) => {
                const isExpanded = expandedQuoteIndex === idx;
                return (
                  <motion.div
                    key={`quote-${idx}`}
                    layout
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={() => setExpandedQuoteIndex(isExpanded ? null : idx)}
                    className={`flex items-start justify-between gap-2 px-3 py-2 rounded-2xl border text-xs backdrop-blur-xl transition-all cursor-pointer hover:border-telkom-red ${
                      isExpanded ? 'w-full max-w-2xl shadow-2xl' : 'max-w-[220px] shadow-md'
                    } ${
                      darkMode
                        ? 'bg-gray-900/95 border-telkom-red/50 text-gray-100 shadow-black/50'
                        : 'bg-white/95 border-telkom-red/30 text-gray-900 shadow-gray-300/60'
                    }`}
                    title={isExpanded ? 'Klik untuk mengecilkan kembali' : 'Klik untuk membaca teks lengkap'}
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <div className="w-1.5 h-full min-h-[16px] bg-telkom-red rounded-full flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col min-w-0 flex-1">
                        {isExpanded && (
                          <span className="font-semibold text-telkom-red text-[11px] mb-1 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            Balasan Lengkap #{idx + 1}:
                          </span>
                        )}
                        <span className={`italic font-mono text-[11px] opacity-90 ${
                          isExpanded ? 'whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto pr-1 select-text' : 'truncate'
                        }`}>
                          "{quote}"
                        </span>
                      </div>
                    </div>
                    {onRemoveQuote && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (expandedQuoteIndex === idx) setExpandedQuoteIndex(null);
                          onRemoveQuote(idx);
                        }}
                        className="p-1 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-telkom-red transition-colors flex-shrink-0 mt-0.5"
                        title="Hapus balasan ini"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
        {/* File preview chips */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 px-1">
            {uploadedFiles.map((file, idx) => (
              <div
                key={idx}
                onClick={() => file.status !== 'loading' && setSelectedFileForModal(file)}
                className={`relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all cursor-pointer hover:border-telkom-red hover:scale-105 active:scale-95 group
                  ${darkMode ? 'bg-telkom-surface-dark border-telkom-border-dark text-telkom-gray-light hover:bg-gray-800' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'}
                  ${file.status === 'loading' ? 'opacity-70 pointer-events-none' : 'opacity-100'}
                `}
                title="Klik untuk melihat isi detail file"
              >
                {file.status === 'loading' && (
                  <div className={`absolute top-0 left-0 h-full animate-file-load ${darkMode ? 'bg-telkom-red/30' : 'bg-blue-500/20'}`} />
                )}
                <span className="relative z-10">{fileIconMap(file.name, file.type)}</span>
                <span className="relative z-10 max-w-[120px] truncate group-hover:text-telkom-red font-medium transition-colors">{file.name}</span>
                <span className={`relative z-10 ${darkMode ? 'text-telkom-gray/60' : 'text-gray-400'}`}>
                  ({file.size})
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(idx);
                  }}
                  className={`relative z-10 ml-0.5 p-0.5 rounded-full hover:bg-red-500/20 hover:text-telkom-red transition-colors ${darkMode ? 'text-telkom-gray' : 'text-gray-400'}`}
                  title="Hapus file"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
            {uploadedFiles.length >= 10 && (
              <span className="text-xs text-telkom-gray self-center">Maks. 10 file</span>
            )}
          </div>
        )}

        <motion.div
          layoutId="shared-chat-input-box"
          transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 1 }}
          className="w-full"
        >
          <div
            className={`
            flex items-center gap-3 px-3 py-2 rounded-full transition-all duration-200 border
            ${darkMode 
              ? 'bg-[#2d2d30] border-white/10 text-white shadow-sm' 
              : 'bg-[#f4f4f6] border-gray-200/80 text-gray-900 shadow-sm'}
          `}
          >
          {/* File upload button (Compact Glassmorphism Paperclip Badge matching reference image) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadedFiles.length >= 10}
            title="Upload file (maks. 10)"
            className={`
              w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 border shadow-[0_2px_6px_rgba(0,0,0,0.05)] active:scale-95
              ${darkMode 
                ? 'bg-zinc-800/90 border-zinc-700/80 text-gray-300 hover:bg-zinc-700' 
                : 'bg-white border-gray-200/80 text-gray-500 hover:bg-white hover:shadow-md'}
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
          >
            <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-300 -rotate-45 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's in your mind?"
            rows={1}
            className={`
              flex-1 resize-none bg-transparent outline-none text-[16px] sm:text-sm leading-normal py-1.5 px-1
              placeholder-gray-400 dark:placeholder-gray-400
              ${darkMode ? 'text-white' : 'text-gray-900'}
            `}
            style={{ minHeight: '28px', maxHeight: '120px', overflowY: 'hidden' }}
          />

          {/* Voice input */}
          {!showVoiceModal && (
            <motion.button
              layoutId="voice-modal"
              onClick={toggleRecording}
              title="Input suara"
              className={`p-2 rounded-full transition-colors flex-shrink-0
                ${isRecording
                  ? 'text-[#eb1d4e] bg-[#eb1d4e]/10 animate-pulse'
                  : darkMode
                    ? 'text-gray-400 hover:text-white hover:bg-white/10'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </motion.button>
          )}

          {/* Send button with 3D Glassmorphism & Dynamic Icon Rotation Animation */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isLoading) {
                if (onCancel) onCancel();
              } else {
                if (inputText.trim() || uploadedFiles.length > 0) {
                  onSend();
                }
              }
            }}
            disabled={(!isLoading && !inputText.trim() && uploadedFiles.length === 0) || uploadedFiles.some(f => f.status === 'loading')}
            className={`
              w-9 h-9 rounded-2xl transition-all duration-300 flex-shrink-0 flex items-center justify-center bg-[#eb1d4e] hover:bg-[#d81844] text-white shadow-[0_8px_20px_rgba(235,29,78,0.45)] backdrop-blur-md active:scale-95
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#eb1d4e] disabled:shadow-none
            `}
            title={isLoading ? "Batal" : "Kirim pesan"}
          >
            {isLoading ? (
              <div className="relative w-4 h-4 flex items-center justify-center">
                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </div>
            ) : (
              <div
                className={`
                  transition-transform duration-300 ease-out flex items-center justify-center
                  ${(inputText.trim() || uploadedFiles.length > 0) ? 'rotate-45' : 'rotate-0'}
                `}
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </div>
            )}
          </button>
          </div>
        </motion.div>
      </div>

      {/* Voice Modal Overlay via Portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showVoiceModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={cancelRecording}
              />

              <style>{`
                @keyframes soundWave {
                  0% { transform: scaleY(0.3); opacity: 0.5; }
                  100% { transform: scaleY(1); opacity: 1; }
                }
                .audio-bar {
                  animation: soundWave 0.4s infinite alternate ease-in-out;
                  transform-origin: bottom;
                }
              `}</style>
              
              <motion.div 
                layoutId="voice-modal"
                transition={{ type: 'spring', stiffness: 350, damping: 25, mass: 1.2 }}
                className={`w-full max-w-md mx-4 rounded-3xl overflow-hidden shadow-2xl relative z-10 ${darkMode ? 'bg-[#1E1F22]' : 'bg-white'}`}
              >
                <div className="p-6 flex flex-col items-center">
                  {/* Audio Visualizer */}
                  <div className="flex items-center justify-center gap-1 h-16 mb-6">
                    {[...Array(31)].map((_, i) => (
                      <div
                        key={i}
                        ref={(el) => { barsRef.current[i] = el; }}
                        className={`w-1 rounded-full ${darkMode ? 'bg-telkom-red' : 'bg-red-500'} transition-all duration-75`}
                        style={{ height: '10%' }}
                      />
                    ))}
                  </div>
                  
                  <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Mendengarkan...
                  </h3>
                  
                  {/* Live Text Area */}
                  <div className={`w-full p-4 min-h-[100px] max-h-[200px] overflow-y-auto rounded-xl text-center italic transition-colors mb-6 shadow-inner
                    ${darkMode ? 'bg-black/20 text-gray-300' : 'bg-gray-50 text-gray-600'}
                  `}>
                    {finalTranscript} <span className="opacity-70">{liveTranscript}</span>
                    {!finalTranscript && !liveTranscript && (
                      <span className="opacity-50">Silakan mulai berbicara...</span>
                    )}
                  </div>
                  
                  <div className="flex w-full gap-3">
                    <button
                      onClick={cancelRecording}
                      className={`flex-1 py-3 rounded-full font-medium transition-colors ${
                        darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Batal
                    </button>
                    <button
                      onClick={toggleRecording}
                      className="flex-1 py-3 rounded-full font-medium bg-[#eb1d4e] hover:bg-[#d81844] text-white shadow-lg shadow-[#eb1d4e]/30 transition-colors"
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* File Details Viewer Modal */}
      {selectedFileForModal && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedFileForModal && (
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={() => setSelectedFileForModal(null)}
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className={`relative w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 border ${
                  darkMode ? 'bg-gray-900 border-zinc-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{fileIconMap(selectedFileForModal.name, selectedFileForModal.type)}</span>
                    <div>
                      <h3 className="font-semibold text-sm truncate max-w-md">{selectedFileForModal.name}</h3>
                      <p className="text-xs text-gray-400">{selectedFileForModal.size}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFileForModal(null)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text">
                  {selectedFileForModal.file?.type.startsWith('image/') ? (
                    <div className="flex justify-center items-center">
                      <img
                        src={URL.createObjectURL(selectedFileForModal.file)}
                        alt={selectedFileForModal.name}
                        className="max-h-[60vh] object-contain rounded-2xl shadow-md border"
                      />
                    </div>
                  ) : (
                    fileTextContent || <span className="italic text-gray-400">Memuat teks file...</span>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
