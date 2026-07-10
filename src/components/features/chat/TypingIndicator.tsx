'use client';

import React from 'react';

interface TypingIndicatorProps {
  darkMode: boolean;
}

export default function TypingIndicator({ darkMode }: TypingIndicatorProps) {
  return (
    <div className="flex items-start gap-3 animate-fadeIn">
      {/* TIFA Avatar */}
      <div className="w-8 h-8 rounded-full bg-telkom-red flex items-center justify-center flex-shrink-0 shadow-lg shadow-telkom-red/20">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2"
          />
        </svg>
      </div>

      {/* Typing dots */}
      <div
        className={`px-4 py-3 rounded-2xl rounded-tl-sm ${darkMode ? 'bg-telkom-surface-dark border border-telkom-border-dark' : 'bg-white border border-gray-200 shadow-sm'}`}
      >
        <div className="flex items-center gap-1.5 h-5">
          <span
            className="w-2 h-2 rounded-full bg-telkom-gray inline-block"
            style={{ animation: 'bounce3 1.2s infinite', animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-telkom-gray inline-block"
            style={{ animation: 'bounce3 1.2s infinite', animationDelay: '200ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-telkom-gray inline-block"
            style={{ animation: 'bounce3 1.2s infinite', animationDelay: '400ms' }}
          />
        </div>
      </div>
    </div>
  );
}
