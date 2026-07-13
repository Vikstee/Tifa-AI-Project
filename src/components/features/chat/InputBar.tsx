'use client';

import React, { useRef, useState } from 'react';

interface UploadedFile {
  name: string;
  size: string;
  type: string;
  file: File;
}

interface InputBarProps {
  darkMode: boolean;
  inputText: string;
  onInputChange: (text: string) => void;
  onSend: () => void;
  onFileUpload: (files: UploadedFile[]) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (index: number) => void;
  isLoading: boolean;
}

export default function InputBar({
  darkMode,
  inputText,
  onInputChange,
  onSend,
  onFileUpload,
  uploadedFiles,
  onRemoveFile,
  isLoading,
}: InputBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);

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
    }));
    onFileUpload(mapped);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileIconMap = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return '📊';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('image')) return '🖼️';
    return '📎';
  };

  return (
    <div className="w-full">
      {/* File preview chips */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {uploadedFiles.map((file, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors
                ${darkMode ? 'bg-telkom-surface-dark border-telkom-border-dark text-telkom-gray-light' : 'bg-gray-100 border-gray-200 text-gray-700'}
              `}
            >
              <span>{fileIconMap(file.type)}</span>
              <span className="max-w-[120px] truncate">{file.name}</span>
              <span className={`${darkMode ? 'text-telkom-gray/60' : 'text-gray-400'}`}>
                ({file.size})
              </span>
              <button
                onClick={() => onRemoveFile(idx)}
                className={`ml-0.5 rounded-full hover:text-telkom-red transition-colors ${darkMode ? 'text-telkom-gray' : 'text-gray-400'}`}
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

      {/* Input container with animated gradient border */}
      <div className="gradient-border-input">
        <div
          className={`
          flex items-end gap-2 px-3 py-2.5 rounded-2xl transition-all duration-200
          ${darkMode ? 'bg-telkom-surface-dark' : 'bg-white shadow-sm'}
        `}
        >
          {/* File upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadedFiles.length >= 10}
            title="Upload file (maks. 10)"
            className={`p-2 rounded-xl transition-colors flex-shrink-0 mb-0.5
              ${darkMode ? 'text-telkom-gray hover:text-white hover:bg-telkom-border-dark' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
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
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan tentang data keuangan TelkomInfra..."
            rows={1}
            className={`
              flex-1 resize-none bg-transparent outline-none text-base sm:text-sm leading-relaxed py-1.5
              placeholder-telkom-gray/50 max-h-32 overflow-y-auto
              ${darkMode ? 'text-white' : 'text-gray-900'}
            `}
            style={{ minHeight: '36px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
          />

          {/* Voice input */}
          <button
            onClick={() => setIsRecording(!isRecording)}
            title="Input suara"
            className={`p-2 rounded-xl transition-colors flex-shrink-0 mb-0.5
              ${
                isRecording
                  ? 'text-telkom-red bg-telkom-red/10 animate-pulse'
                  : darkMode
                    ? 'text-telkom-gray hover:text-white hover:bg-telkom-border-dark'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </button>

          {/* Send button */}
          <button
            onClick={() => onSend()}
            disabled={(!inputText.trim() && uploadedFiles.length === 0) || isLoading}
            className={`
              p-2 rounded-xl transition-all duration-200 flex-shrink-0 mb-0.5
              ${
                (inputText.trim() || uploadedFiles.length > 0) && !isLoading
                  ? 'bg-telkom-red hover:bg-telkom-red-dark text-white shadow-lg shadow-telkom-red/20'
                  : darkMode
                    ? 'text-telkom-gray/40 cursor-not-allowed'
                    : 'text-gray-300 cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <p
        className={`text-center text-xs mt-2 ${darkMode ? 'text-telkom-gray/50' : 'text-gray-400'}`}
      >
        TIFA dapat membuat kesalahan. Verifikasi informasi penting sebelum digunakan.
      </p>
    </div>
  );
}
