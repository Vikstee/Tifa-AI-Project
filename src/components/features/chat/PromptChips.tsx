'use client';

import React from 'react';

interface Prompt {
  icon: string | React.ReactNode;
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
  {
    icon: (
      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    text: 'Summarize a PO',
    desc: 'Showing a Purchase Order progression into a report.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    text: 'Analyze cash flow',
    desc: 'Details report of cash in to cash out.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    text: 'Aging account credit',
    desc: 'Reporting account credit based on the age.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    text: 'Outstanding invoice',
    desc: 'Make a list of of unpaid invoices.',
  },
];

export default function PromptChips({ darkMode, onSelectPrompt, prompts, isLoading }: PromptChipsProps) {
  const displayPrompts = prompts && prompts.length > 0 ? prompts : defaultPrompts;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-4xl">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`rounded-2xl p-4 ${darkMode ? 'bg-[#29292b]' : 'bg-[#f4f4f6]'} animate-pulse`}>
            <div className={`w-5 h-5 rounded mb-2 ${darkMode ? 'bg-zinc-700' : 'bg-gray-300'}`}></div>
            <div className={`h-4 w-3/4 rounded mb-1 ${darkMode ? 'bg-zinc-700' : 'bg-gray-300'}`}></div>
            <div className={`h-3 w-full rounded ${darkMode ? 'bg-zinc-700' : 'bg-gray-300'}`}></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-3xl">
      {displayPrompts.map((prompt, idx) => (
        <button
          key={idx}
          onClick={() => onSelectPrompt(prompt.text)}
          className={`
            text-left p-3.5 rounded-2xl transition-all duration-300 cursor-pointer h-full min-h-[105px] flex flex-col justify-start items-start backdrop-blur-xl shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-95
            ${darkMode
              ? 'bg-[#1f1f22]/80 hover:bg-[#28282c]/90 text-white border border-white/10 hover:border-white/20 shadow-black/40'
              : 'bg-white/80 hover:bg-white/95 text-gray-900 border border-gray-200/80 hover:border-gray-300 shadow-gray-200/60'
            }
          `}
        >
          <div className="w-4 h-4 flex items-center justify-center mb-2">
            {typeof prompt.icon === 'string' ? (
              <span className="text-xs">{prompt.icon}</span>
            ) : (
              prompt.icon
            )}
          </div>
          <p className="text-[12px] font-semibold mb-1 leading-snug">
            {prompt.text}
          </p>
          <p className={`text-[10.5px] leading-tight line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
            {prompt.desc}
          </p>
        </button>
      ))}
    </div>
  );
}
