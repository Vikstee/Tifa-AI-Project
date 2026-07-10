import React, { useState } from 'react';
import { XMarkIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}

export default function ShareModal({ isOpen, onClose, shareUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const platforms = [
    {
      name: 'LinkedIn',
      color: 'bg-[#0a66c2]',
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
      onClick: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank'),
    },
    {
      name: 'WhatsApp',
      color: 'bg-[#25D366]',
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.891-4.444 9.893-9.896.002-5.466-4.415-9.898-9.881-9.898-5.452 0-9.887 4.435-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.738-.964zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      ),
      onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareUrl)}`, '_blank'),
    },
    {
      name: 'X',
      color: 'bg-black dark:bg-[#1DA1F2]',
      icon: (
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      onClick: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`, '_blank'),
    },
    {
      name: 'Instagram',
      color: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]',
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
      onClick: () => window.open(`https://instagram.com/`, '_blank'),
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1E1F22] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
            Link publik yang dapat dibagikan
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-6">
          {/* Link Box */}
          <div className="flex items-center bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-full p-1.5 pl-5">
            <div className="flex-1 truncate text-sm text-gray-600 dark:text-gray-300 mr-4 font-medium">
              {shareUrl.replace(/^https?:\/\//, '')}
            </div>
            <button
              onClick={handleCopy}
              className={`flex-shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                copied
                  ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-[#A8C7FA] dark:text-[#062E6F] dark:hover:bg-[#C2E7FF]'
              }`}
            >
              {copied ? (
                <span>Tersalin!</span>
              ) : (
                <>
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  <span>Salin link</span>
                </>
              )}
            </button>
          </div>

          {/* Disclaimer text */}
          <div className="flex gap-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="leading-relaxed">
              Link publik dapat dibagikan ulang. Bagikan <a href="#" className="text-blue-600 dark:text-[#A8C7FA] hover:underline">secara bertanggung jawab</a>, hapus kapan saja. Jika dibagikan kepada pihak ketiga, kebijakan mereka berlaku.
            </p>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-gray-100 dark:border-white/10" />

        {/* Social Icons */}
        <div className="px-6 py-8 flex items-center justify-center gap-8 sm:gap-12 bg-gray-50/50 dark:bg-transparent">
          {platforms.map((platform) => (
            <div key={platform.name} className="flex flex-col items-center gap-2.5">
              <button
                onClick={platform.onClick}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm hover:scale-110 hover:shadow-md transition-all duration-300 ${platform.color}`}
              >
                {platform.icon}
              </button>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {platform.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
