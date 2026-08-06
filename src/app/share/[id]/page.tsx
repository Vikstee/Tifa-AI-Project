'use client';

import React, { useEffect, useState, use } from 'react';
import MessageBubble, { Message } from '@/components/features/chat/MessageBubble';
import { ShareIcon, ArrowRightEndOnRectangleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SharedChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [sessionData, setSessionData] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSharedChat = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/chat/history?sessionId=${encodeURIComponent(resolvedParams.id)}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error('Obrolan tidak ditemukan');
        }

        setSessionData({
          title: 'Obrolan Dibagikan',
          created_at: new Date().toISOString(),
        });

        const msgs = data.data || [];
        const mappedMsgs: Message[] = msgs.map((m: any) => ({
          id: m.id,
          role: m.role as 'user' | 'ai',
          content: m.content,
          timestamp: new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          files: undefined 
        }));

        setMessages(mappedMsgs);
      } catch (err: any) {
        console.error('Error fetching shared chat:', err);
        setError('Percakapan tidak ditemukan atau tidak dapat diakses.');
      } finally {
        setIsLoading(false);
      }
    };

    if (resolvedParams.id) {
      fetchSharedChat();
    }
  }, [resolvedParams.id]);

  const handleClone = () => {
    router.push(`/?clone=${resolvedParams.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#1E1F22] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Memuat obrolan...</div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#1E1F22] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Oops!</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link href="/" className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#1E1F22] flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-[#2B2D31] border-b border-gray-200 dark:border-black/20 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <ShareIcon className="w-6 h-6 text-blue-500" />
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-white truncate max-w-md">
              {sessionData.title}
            </h1>
            <p className="text-xs text-gray-500">
              Dibagikan secara publik • {new Date(sessionData.created_at).toLocaleDateString('id-ID')}
            </p>
          </div>
        </div>
        <button 
          onClick={handleClone}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors"
        >
          <ArrowRightEndOnRectangleIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Lanjutkan Chat Ini</span>
        </button>
      </header>

      {/* Chat Area (Read-Only) */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl w-full mx-auto pb-32">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} darkMode={true} />
        ))}
      </main>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center sm:hidden px-4">
        <button 
          onClick={handleClone}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 shadow-lg text-white rounded-full font-medium active:scale-95 transition-transform"
        >
          <ArrowRightEndOnRectangleIcon className="w-5 h-5" />
          Lanjutkan Percakapan
        </button>
      </div>
    </div>
  );
}
