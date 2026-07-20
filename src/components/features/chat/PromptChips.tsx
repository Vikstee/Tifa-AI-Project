'use client';

import React from 'react';

interface Prompt {
  icon: string;
  text: string;
  desc: string;
}

interface PromptChipsProps {
  darkMode: boolean;
  onSelectPrompt: (prompt: string) => void;
  prompts?: Prompt[];
  isLoading?: boolean;
}

const defaultPrompts: Prompt[] = [
  { icon: '📊', text: 'Tampilkan status PO bulan ini', desc: 'Ringkasan Purchase Order aktif' },
  { icon: '💰', text: 'Analisis cash flow Q3 2024', desc: 'Arus kas masuk dan keluar' },
  { icon: '📋', text: 'Laporan aging piutang', desc: 'Piutang berdasarkan umur' },
  { icon: '🔍', text: 'Rekonsiliasi invoice outstanding', desc: 'Invoice yang belum terbayar' },
];

export default function PromptChips({ darkMode, onSelectPrompt, prompts, isLoading }: PromptChipsProps) {
  const displayPrompts = prompts && prompts.length > 0 ? prompts : defaultPrompts;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`rounded-xl border p-4 ${darkMode ? 'border-telkom-border-dark bg-telkom-surface-dark/50' : 'border-gray-100 bg-gray-50'} animate-pulse`}>
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              <div className="flex-1">
                <div className={`h-4 w-3/4 rounded mb-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                <div className={`h-3 w-1/2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-2xl px-1">
      {displayPrompts.map((prompt, idx) => (
        <div 
          key={idx} 
          className={`
            h-full transition-all duration-300 hover:scale-[1.02] 
            rounded-[2rem] border backdrop-blur-2xl
            ${darkMode 
              ? 'bg-black/10 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.4)] hover:bg-white/10' 
              : 'bg-white/10 border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(0,0,0,0.1)] hover:bg-white/30'
            }
          `}
        >
          <button
            onClick={() => onSelectPrompt(prompt.text)}
            className="w-full h-full text-left px-5 py-4 group rounded-[2rem]"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl flex-shrink-0">{prompt.icon}</span>
              <div>
                <p
                  className={`text-xs sm:text-sm font-medium leading-snug sm:leading-normal line-clamp-2 sm:line-clamp-none ${darkMode ? 'text-white' : 'text-gray-900'} group-hover:text-telkom-red transition-colors`}
                >
                  {prompt.text}
                </p>
                <p className={`hidden sm:block text-xs mt-0.5 ${darkMode ? 'text-telkom-gray' : 'text-gray-500'}`}>
                  {prompt.desc}
                </p>
              </div>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}
