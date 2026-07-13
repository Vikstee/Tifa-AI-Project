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
          className="gradient-border transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:hover:shadow-black/50"
        >
          <button
            onClick={() => onSelectPrompt(prompt.text)}
            className={`
              w-full text-left px-4 py-3.5 transition-colors duration-200 group
              ${
                darkMode
                  ? 'bg-telkom-surface-dark'
                  : 'bg-white'
              }
            `}
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
