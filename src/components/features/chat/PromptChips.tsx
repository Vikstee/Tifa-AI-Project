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
      <div className="flex overflow-x-auto snap-x sm:grid sm:grid-cols-2 gap-3 w-full max-w-2xl pb-4 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
    <div className="flex overflow-x-auto snap-x sm:grid sm:grid-cols-2 gap-3 w-full max-w-2xl pb-4 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {displayPrompts.map((prompt, idx) => (
        <div 
          key={idx} 
          className="gradient-border flex-shrink-0 w-[240px] sm:w-auto snap-center transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:hover:shadow-black/50"
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
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{prompt.icon}</span>
              <div>
                <p
                  className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'} group-hover:text-telkom-red transition-colors`}
                >
                  {prompt.text}
                </p>
                <p className={`text-xs mt-0.5 ${darkMode ? 'text-telkom-gray' : 'text-gray-500'}`}>
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
