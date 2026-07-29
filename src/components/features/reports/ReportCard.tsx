'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { generatePDFReport, generateExcelReport, generateWordReport, generateHTMLFromSections } from '@/lib/reportGenerator';

const hydrateSections = async (originalSections: any[]) => {
  if (!originalSections) return originalSections;
  const newSections = JSON.parse(JSON.stringify(originalSections));
  
  for (const sec of newSections) {
    // If table already has curated headers and rows from AI, do NOT overwrite with raw select * dump
    if (sec.type === 'table' && sec.headers && sec.headers.length > 0 && sec.rows && sec.rows.length > 0 && !sec.force_hydrate) {
      continue;
    }

    if (sec.type === 'table' && sec.query_meta) {
      const { tableName, filterColumn, filterValue, orderBy, ascending = false, limit = 20 } = sec.query_meta;
      if (tableName) {
        try {
          let query = supabase.from(tableName).select('*');
          if (filterColumn && filterValue) {
             if (filterValue.startsWith('>=') || filterValue.startsWith('<=')) {
                const op = filterValue.substring(0, 2);
                const val = filterValue.substring(2).trim();
                if (op === '>=') query = query.gte(filterColumn, val);
                else query = query.lte(filterColumn, val);
              } else if (filterValue.startsWith('>')) {
                query = query.gt(filterColumn, filterValue.substring(1).trim());
              } else if (filterValue.startsWith('<')) {
                query = query.lt(filterColumn, filterValue.substring(1).trim());
              } else {
                query = query.ilike(filterColumn, `%${filterValue}%`);
              }
          }
          if (orderBy) {
            query = query.order(orderBy, { ascending: !!ascending });
          }
          if (limit && typeof limit === 'number') {
            query = query.limit(limit);
          }

          const { data, error } = await query;
          if (!error && data && data.length > 0) {
             let enrichedData = data;
             // Auto-resolve project_name
             if (data[0].project_id) {
               const uuids = Array.from(new Set(data.map((d: any) => d.project_id)));
               const { data: projs } = await supabase.from('projects').select('id, project_name').in('id', uuids);
               if (projs) {
                 const projMap = Object.fromEntries(projs.map((p: any) => [p.id, p.project_name]));
                 enrichedData = data.map((d: any) => ({
                   ...d,
                   project_id: projMap[d.project_id] ? `${projMap[d.project_id]}` : d.project_id
                 }));
               }
             }
             
             const excludedKeys = ['id', 'created_at', 'updated_at', 'user_id'];
             const headers = Object.keys(enrichedData[0]).filter(k => !excludedKeys.includes(k) && typeof enrichedData[0][k] !== 'object');
             const rows = enrichedData.map((row: any) => headers.map(h => {
                const val = row[h];
                if (val === null || val === undefined) return '-';
                return String(val);
             }));
             
             sec.headers = headers.map(h => h.replace(/_/g, ' ').toUpperCase());
             sec.rows = rows;
             if (sec.title) sec.title += ` (Full Data: ${rows.length} baris)`;
          }
        } catch(e) {
          console.error("Hydration error:", e);
        }
      }
    }
  }
  return newSections;
};

interface ReportCardProps {
  darkMode: boolean;
  title: string;
  format: 'PDF' | 'Word' | 'Excel';
  size: string;
  date: string;
  url?: string;
  isGenerating?: boolean;
  isSidebar?: boolean;
  sections?: any[]; // structured report sections from AI
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
  sections,
}: ReportCardProps) {
  const [url, setUrl] = useState<string | undefined>(initialUrl);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isGeneratingLazy, setIsGeneratingLazy] = useState(false);
  const [actualSize, setActualSize] = useState<string>(size);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
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

  // Normalize format string (e.g. "pdf" -> "PDF", "word" -> "Word", "excel" -> "Excel")
  const normalizedFormat = format?.toLowerCase() === 'pdf' ? 'PDF'
    : format?.toLowerCase() === 'word' ? 'Word'
    : format?.toLowerCase() === 'excel' ? 'Excel'
    : format;
  const fmt = formatIcons[normalizedFormat] ?? { icon: '📄', color: 'text-gray-400', bg: 'bg-gray-500/10' };

  const handleWhatsAppShare = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let downloadUrl = url;
    if (!downloadUrl) {
      setIsGeneratingLazy(true);
      try {
        const periodMatch = date;
        let res: { url: string; size: number } | null = null;
        const fullSections = await hydrateSections(sections || []);
        if (format === 'PDF') res = await generatePDFReport(title, "", periodMatch, fullSections);
        else if (format === 'Excel') res = await generateExcelReport(title, "", periodMatch, fullSections);
        else if (format === 'Word') res = await generateWordReport(title, "", periodMatch, fullSections);
        
        if (res) {
          downloadUrl = res.url;
          setUrl(res.url);
          setActualSize(res.size >= 1024 * 1024 ? (res.size / (1024 * 1024)).toFixed(2) + ' MB' : (res.size / 1024).toFixed(0) + ' KB');
        }
      } catch (err) {
        console.error('Failed to generate report for WA', err);
        alert('Gagal men-generate laporan untuk WhatsApp.');
        setIsGeneratingLazy(false);
        return;
      }
      setIsGeneratingLazy(false);
    }

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
    if (format === 'PDF') {
      try {
        const fullSections = await hydrateSections(sections || []);
        const htmlStr = generateHTMLFromSections(title, "", date, fullSections);
        setPreviewHtml(htmlStr);
        setShowPreviewModal(true);
      } catch (e) {
        console.error("Preview error:", e);
      }
      return;
    }

    handleDownloadDirect();
  };

  const handleDownloadDirect = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const extension = format === 'Word' ? 'docx' : format === 'Excel' ? 'xlsx' : 'pdf';
    const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_TIFA.${extension}`;

    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    setIsGeneratingLazy(true);
    try {
      let res: { url: string; size: number } | null = null;
      const periodMatch = date;
      const fullSections = await hydrateSections(sections || []);
      if (format === 'PDF') res = await generatePDFReport(title, "", periodMatch, fullSections);
      else if (format === 'Excel') res = await generateExcelReport(title, "", periodMatch, fullSections);
      else if (format === 'Word') res = await generateWordReport(title, "", periodMatch, fullSections);

      if (res) {
        setUrl(res.url);
        setActualSize(res.size >= 1024 * 1024 ? (res.size / (1024 * 1024)).toFixed(2) + ' MB' : (res.size / 1024).toFixed(0) + ' KB');
        
        const a = document.createElement('a');
        a.href = res.url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Failed to generate report', err);
      alert('Gagal men-generate laporan.');
    } finally {
      setIsGeneratingLazy(false);
    }
  };

  return (
    <div className="gradient-border group cursor-pointer" onClick={handlePreview} title="Klik untuk melihat / pratinjau laporan">
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
                  {actualSize}
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
                onClick={handleDownloadDirect}
                disabled={isGeneratingLazy}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 bg-telkom-red hover:bg-telkom-red-dark text-white text-xs font-medium rounded-lg transition-colors ${isGeneratingLazy ? 'opacity-70 cursor-wait' : ''}`}
                title="Download File"
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
                onClick={handleWhatsAppShare}
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

      {/* PDF Interactive Preview Modal - INSTANT 0ms LOADING */}
      {showPreviewModal && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/75 backdrop-blur-md p-4 sm:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white dark:bg-telkom-sidebar w-full max-w-4xl h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-telkom-border-dark animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-telkom-border-dark bg-gray-50 dark:bg-telkom-charcoal">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white truncate max-w-[300px] sm:max-w-[450px]">{title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pratinjau Dokumen Langsung • {date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadDirect}
                  disabled={isGeneratingLazy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-telkom-red hover:bg-telkom-red-dark text-white text-xs font-medium rounded-lg transition-colors"
                  title="Unduh File PDF"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {isGeneratingLazy ? 'Mengunduh...' : 'Unduh PDF'}
                </button>
                <button
                  onClick={handleWhatsAppShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                  title="Bagikan via WhatsApp"
                >
                  WA
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                  title="Tutup"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body - Instant HTML Document Rendering */}
            <div className="flex-1 w-full bg-slate-200 dark:bg-gray-900 overflow-hidden relative">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-none shadow-inner"
                title={`Pratinjau Dokumen - ${title}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* WA Modal */}
      {showWaModal && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm"
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
