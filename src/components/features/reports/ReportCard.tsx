'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { generatePDFReport, generateExcelReport, generateWordReport } from '@/lib/reportGenerator';

interface ReportCardProps {
  darkMode: boolean;
  title: string;
  format: 'PDF' | 'Word' | 'Excel';
  size: string;
  date: string;
  url?: string;
  isGenerating?: boolean;
  isSidebar?: boolean;
}

const formatIcons: Record<string, { icon: string; color: string; bg: string }> = {
  PDF: { icon: '📄', color: 'text-red-400', bg: 'bg-red-500/10' },
  Word: { icon: '📝', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  Excel: { icon: '📊', color: 'text-green-400', bg: 'bg-green-500/10' },
};

export default function ReportCard({
  darkMode,
  title,
  format,
  size,
  date,
  url: initialUrl,
  isGenerating = false,
  isSidebar = false,
}: ReportCardProps) {
  const [url, setUrl] = useState<string | undefined>(initialUrl);
  const [isGeneratingLazy, setIsGeneratingLazy] = useState(false);
  
  // Custom WA Modal State
  const [showWaModal, setShowWaModal] = useState(false);
  const [waTargetNumber, setWaTargetNumber] = useState('');
  const [waMessageContext, setWaMessageContext] = useState({ message: '', mediaUrl: '' });
  const [isSendingWa, setIsSendingWa] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.wa_number) {
        let val = user.user_metadata.wa_number;
        if (val.startsWith('0')) {
          val = '62' + val.substring(1);
        }
        setWaTargetNumber(val);
      }
    });
  }, []);

  const fmt = formatIcons[format];

  const handleWhatsAppShare = async () => {
    // Generate URL if not exists, but do NOT auto-download
    let downloadUrl = url;
    if (!downloadUrl) {
      setIsGeneratingLazy(true);
      try {
        const periodMatch = date;
        if (format === 'PDF') downloadUrl = await generatePDFReport(title, periodMatch);
        else if (format === 'Excel') downloadUrl = await generateExcelReport(title, periodMatch);
        else if (format === 'Word') downloadUrl = await generateWordReport(title, periodMatch);
        setUrl(downloadUrl);
      } catch (err) {
        console.error('Failed to generate report for WA', err);
        alert('Gagal men-generate laporan untuk WhatsApp.');
        setIsGeneratingLazy(false);
        return;
      }
      setIsGeneratingLazy(false);
    }

    // Upload to Supabase to get a public link for WA
    let publicLink = '';
    try {
      const res = await fetch(downloadUrl as string);
      const blob = await res.blob();
      
      const fileName = `wa_share_${Date.now()}_${title.replace(/[^a-zA-Z0-9]/g, '_')}.${format.toLowerCase()}`;
      const { data, error } = await supabase.storage.from('chat_attachments').upload(fileName, blob, {
        contentType: blob.type
      });
      
      if (!error && data) {
        const { data: publicUrlData } = supabase.storage.from('chat_attachments').getPublicUrl(fileName);
        publicLink = publicUrlData.publicUrl;
      } else {
        console.error('Upload error:', error);
      }
    } catch (e) {
      console.error('Failed to upload file for WA share', e);
    }

    const hour = new Date().getHours();
    let timeGreeting = 'Selamat pagi';
    let subGreetings = ["semoga harinya lancar dan produktif selalu ya.", "semoga hari ini penuh dengan semangat.", "semoga urusannya dilancarkan hari ini."];
    
    if (hour >= 11 && hour < 15) {
      timeGreeting = 'Selamat siang';
      subGreetings = ["semoga tetap produktif di tengah hari ini.", "semoga aktivitas siang ini berjalan lancar.", "semoga hari ini terus membawa progres baik."];
    } else if (hour >= 15 && hour < 18) {
      timeGreeting = 'Selamat sore';
      subGreetings = ["semoga sore ini membawa kabar baik.", "semoga aktivitas hari ini membuahkan hasil.", "selamat menjelang waktu istirahat."];
    } else if (hour >= 18) {
      timeGreeting = 'Selamat malam';
      subGreetings = ["selamat beristirahat setelah beraktivitas.", "semoga malam ini tenang dan damai.", "terima kasih atas kerja kerasnya hari ini."];
    }

    const randomSubGreeting = subGreetings[Math.floor(Math.random() * subGreetings.length)];
    const finalGreeting = `${timeGreeting}, ${randomSubGreeting}`;

    const EMOJI_WAVE = String.fromCodePoint(0x1F44B);
    const EMOJI_CHART = String.fromCodePoint(0x1F4CA);
    const EMOJI_LINK = String.fromCodePoint(0x1F517);
    const EMOJI_BRIEFCASE = String.fromCodePoint(0x1F4BC);
    const EMOJI_ROCKET = String.fromCodePoint(0x1F680);

    const message = `Halo Bapak/Ibu! ${EMOJI_WAVE}\n${finalGreeting}\n\nTIFA sudah menyiapkan dokumen *${title}* terbaru untuk Bapak/Ibu. Laporan ini di-generate otomatis, lengkap dengan rincian transaksi, visualisasi grafik, dan rangkuman analisis agar lebih cepat dan mudah di-review. ${EMOJI_CHART}\n\nDetail Laporan:\n\nUpdate per: ${date}\n\nUnduh ${format}: ${publicLink || 'Gagal membuat tautan publik'}\n\nIngin mengeksplorasi data lain atau ngobrol langsung dengan TIFA? Bapak/Ibu bisa langsung mengakses sistem AI kami di sini:\n${EMOJI_LINK} https://tifa-ai-assistant.vercel.app\n\nKalau ada pertanyaan, jangan ragu untuk menghubungi kami. Selamat melanjutkan aktivitas! ${EMOJI_BRIEFCASE}${EMOJI_ROCKET}\n\nSalam hangat,\n*TIFA AI - TelkomInfra*`;

    setWaMessageContext({ message, mediaUrl: publicLink || '' });
    setShowWaModal(true);
  };

  const executeWaSend = async () => {
    if (!waTargetNumber) {
      alert("Masukkan nomor tujuan terlebih dahulu.");
      return;
    }
    setIsSendingWa(true);
    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: waTargetNumber,
          message: waMessageContext.message,
          mediaUrl: waMessageContext.mediaUrl || null
        })
      });
      const data = await response.json();
      if (response.ok) {
        alert('✅ Berhasil dikirim via Bot WhatsApp TIFA!');
        setShowWaModal(false);
      } else {
        alert('❌ Gagal mengirim: ' + data.error);
      }
    } catch (e) {
      alert('❌ Terjadi kesalahan jaringan saat memanggil Bot.');
    } finally {
      setIsSendingWa(false);
    }
  };

  const handlePreview = async () => {
    if (isGeneratingLazy || isGenerating) return;
    
    if (url) {
      window.open(url, '_blank');
      return;
    }

    setIsGeneratingLazy(true);
    try {
      let newUrl = '';
      const periodMatch = date;
      if (format === 'PDF') newUrl = await generatePDFReport(title, periodMatch);
      else if (format === 'Excel') newUrl = await generateExcelReport(title, periodMatch);
      else if (format === 'Word') newUrl = await generateWordReport(title, periodMatch);

      setUrl(newUrl);
      window.open(newUrl, '_blank');
    } catch (err) {
      console.error('Failed to generate report', err);
      alert('Gagal men-generate laporan.');
    } finally {
      setIsGeneratingLazy(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (url) {
      // If URL already exists, just trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Lazy generate
    setIsGeneratingLazy(true);
    try {
      let newUrl = '';
      const periodMatch = date; // We use date as period or a default
      if (format === 'PDF') newUrl = await generatePDFReport(title, periodMatch);
      else if (format === 'Excel') newUrl = await generateExcelReport(title, periodMatch);
      else if (format === 'Word') newUrl = await generateWordReport(title, periodMatch);

      setUrl(newUrl);
      
      const a = document.createElement('a');
      a.href = newUrl;
      a.download = `${title.replace(/\s+/g, '_')}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to generate report', err);
      alert('Gagal men-generate laporan.');
    } finally {
      setIsGeneratingLazy(false);
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleWhatsAppShare();
  };

  return (
    <div className="gradient-border group cursor-pointer" onClick={handlePreview} title="Klik untuk melihat / preview laporan">
      <div className={`p-3 transition-colors ${darkMode ? 'bg-telkom-surface-dark hover:bg-telkom-surface' : 'bg-white hover:bg-gray-50'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
            {/* Format icon */}
            <div
              className={`w-8 h-8 rounded-lg ${fmt.bg} flex items-center justify-center flex-shrink-0`}
            >
              <span className="text-lg">{fmt.icon}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}
                title={title}
              >
                {title}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className={`text-xs ${darkMode ? 'text-telkom-gray' : 'text-gray-500'}`}>
                  {format}
                </span>
                <span className={`text-xs ${darkMode ? 'text-telkom-gray/50' : 'text-gray-300'}`}>
                  •
                </span>
                <span className={`text-xs ${darkMode ? 'text-telkom-gray' : 'text-gray-500'}`}>
                  {size}
                </span>
                <span className={`text-xs ${darkMode ? 'text-telkom-gray/50' : 'text-gray-300'}`}>
                  •
                </span>
                <span className={`text-xs ${darkMode ? 'text-telkom-gray' : 'text-gray-500'}`}>
                  {date}
                </span>
              </div>

              {/* Progress bar when generating */}
              {isGenerating && (
                <div className="mt-2">
                  <div
                    className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-telkom-border-dark' : 'bg-gray-200'}`}
                  >
                    <div
                      className="h-full bg-telkom-red rounded-full animate-pulse"
                      style={{ width: '65%' }}
                    />
                  </div>
                  <p className="text-xs text-telkom-gray mt-1">Generating... 65%</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isGenerating && (
            <div className={`flex ${isSidebar ? 'flex-col' : 'items-center justify-end'} gap-1.5 flex-shrink-0`}>
              <button
                onClick={handleDownload}
                disabled={isGeneratingLazy}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 bg-telkom-red hover:bg-telkom-red-dark text-white text-xs font-medium rounded-lg transition-colors ${isGeneratingLazy ? 'opacity-70 cursor-wait' : ''}`}
                title="Download"
              >
                {isGeneratingLazy ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                {isGeneratingLazy ? 'Memproses...' : 'Unduh'}
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                title="Bagikan via WhatsApp"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WA
              </button>
            </div>
          )}
        </div>
      </div>

      {/* WA Modal */}
      {showWaModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white dark:bg-telkom-sidebar w-full max-w-sm rounded-xl p-6 shadow-xl relative border border-gray-200 dark:border-telkom-border-dark animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Kirim ke WhatsApp 🤖</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Konfirmasi nomor tujuan pengiriman otomatis. Anda dapat mengubahnya.
            </p>
            <input
              type="text"
              value={waTargetNumber}
              onChange={(e) => {
                let val = e.target.value;
                if (val.startsWith('0')) {
                  val = '62' + val.substring(1);
                }
                setWaTargetNumber(val);
              }}
              placeholder="+6281234567890"
              className="w-full px-4 py-2 mb-6 bg-gray-50 dark:bg-telkom-charcoal border border-gray-200 dark:border-telkom-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white"
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowWaModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-telkom-border-dark transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={executeWaSend}
                disabled={isSendingWa}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {isSendingWa ? 'Mengirim...' : 'Kirim Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
