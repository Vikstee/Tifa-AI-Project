'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DataTable from '../reports/DataTable';
import dynamic from 'next/dynamic';
import type { ChartData } from '../reports/ChartViewer';

const ChartViewer = dynamic(() => import('../reports/ChartViewer'), {
  ssr: false,
  loading: () => <div className="p-4 text-center text-sm text-gray-500 animate-pulse">Memuat grafik...</div>
});
import ReportCard from '../reports/ReportCard';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  type?: 'text' | 'table' | 'report' | 'combined';
  timestamp: string;
  files?: { name: string; size: string; type: string }[];
}

interface MessageBubbleProps {
  message: Message;
  darkMode: boolean;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

export default function MessageBubble({ message, darkMode, onEditMessage }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(message.content);

  // Freeze the generated date so it doesn't update on every re-render (e.g. when opening WA modal)
  const reportDate = React.useMemo(() => {
    return new Date().toLocaleString('id-ID', { 
      timeZone: 'Asia/Jakarta', 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    }) + ' WIB';
  }, []);

  if (isUser) {
    return (
      <div className="flex justify-end animate-fadeIn">
        <div className="max-w-[75%] flex flex-col items-end gap-1 group">
          {message.files && message.files.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2 mb-1">
              {message.files.map((f, i) => (
                <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600'}`}>
                  <span>📎</span>
                  <span className="truncate max-w-[150px] font-medium">{f.name}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 w-full justify-end">
            {!isEditing && onEditMessage && (
              <button 
                onClick={() => {
                  setEditContent(message.content);
                  setIsEditing(true);
                }}
                className={`opacity-60 hover:opacity-100 transition-opacity p-1.5 rounded-full mb-1 ${darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-200 text-gray-500'}`}
                title="Edit message"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            <div
              className={`px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed relative ${isEditing ? 'w-full' : ''}
              ${darkMode && !isEditing ? 'bg-telkom-red text-white' : ''}
              ${!darkMode && !isEditing ? 'bg-telkom-red text-white' : ''}
              ${isEditing ? (darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-300 shadow-sm') : ''}
            `}
            >
              {isEditing ? (
                <div className="flex flex-col gap-3 min-w-[300px]">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className={`w-full p-2 text-sm rounded-lg outline-none resize-none min-h-[80px] ${darkMode ? 'bg-gray-900 text-white border-gray-700 focus:border-telkom-red' : 'bg-gray-50 text-gray-900 border-gray-200 focus:border-telkom-red'} border`}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        if (onEditMessage && editContent.trim()) {
                          onEditMessage(message.id, editContent.trim());
                          setIsEditing(false);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-telkom-red text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Simpan & Kirim Ulang
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            {!isEditing && (
              <div className="w-7 h-7 rounded-full bg-telkom-red/20 border border-telkom-red/30 flex items-center justify-center flex-shrink-0 mb-0.5">
                <span className="text-xs font-bold text-telkom-red">AS</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-fadeIn">
      {/* TIFA Avatar */}
      <div className="w-8 h-8 rounded-full bg-telkom-red flex items-center justify-center flex-shrink-0 shadow-lg shadow-telkom-red/20 mt-0.5">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2"
          />
        </svg>
      </div>

      {/* AI message content */}
      <div className="flex-1 max-w-[85%]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-telkom-red">TIFA</span>
          <span className={`text-xs ${darkMode ? 'text-telkom-gray/50' : 'text-gray-400'}`}>
            {message.timestamp}
          </span>
        </div>

        {/* Text content */}
        <div className={`text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          <div className={`prose prose-sm max-w-none ${darkMode ? 'prose-invert' : ''}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ node, ...props }: any) => (
                  <div className={`overflow-x-auto my-4 rounded-xl shadow-lg border transition-all duration-300 hover:shadow-xl ${darkMode ? 'border-telkom-border-dark shadow-black/20' : 'border-gray-200 shadow-gray-200/50'}`}>
                    <table className={`min-w-full divide-y ${darkMode ? 'divide-telkom-border-dark text-gray-300' : 'divide-gray-200 text-gray-700'}`} {...props} />
                  </div>
                ),
                thead: ({ node, ...props }: any) => (
                  <thead className={`${darkMode ? 'bg-telkom-surface-dark/80' : 'bg-gray-50'}`} {...props} />
                ),
                tbody: ({ node, ...props }: any) => (
                  <tbody className={`divide-y ${darkMode ? 'divide-telkom-border-dark bg-telkom-sidebar' : 'divide-gray-200 bg-white'}`} {...props} />
                ),
                tr: ({ node, ...props }: any) => (
                  <tr className={`transition-colors duration-200 ${darkMode ? 'hover:bg-telkom-surface-dark' : 'hover:bg-gray-50/80'}`} {...props} />
                ),
                th: ({ node, ...props }: any) => (
                  <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-telkom-gray-light' : 'text-gray-500'}`} {...props} />
                ),
                td: ({ node, ...props }: any) => (
                  <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} {...props} />
                ),
                pre({ node, children, ...props }: any) {
                  // Check if the pre contains a code block with our json_chart language
                  if (node?.children?.[0]?.tagName === 'code') {
                    const codeNode = node.children[0];
                    const className = codeNode.properties?.className?.[0] || '';
                    if (className.includes('language-json_chart')) {
                      try {
                        const content = codeNode.children?.[0]?.value || '';
                        const data: ChartData = JSON.parse(content.trim());
                        return <ChartViewer config={data} darkMode={darkMode} />;
                      } catch (e) {
                        return (
                          <div className="text-red-500 text-xs border border-red-200 bg-red-50 p-3 rounded-lg my-2">
                            Error parsing chart data.
                          </div>
                        );
                      }
                    } else if (className.includes('language-json_report')) {
                      try {
                        const content = codeNode.children?.[0]?.value || '';
                        const data = JSON.parse(content.trim());
                        return (
                          <div className="my-3">
                            <ReportCard
                              darkMode={darkMode}
                              title={data.reportType || 'Laporan'}
                              format={data.format as any || 'PDF'}
                              size="~100 KB"
                              date={reportDate}
                            />
                          </div>
                        );
                      } catch (e) {
                        return (
                          <div className="text-red-500 text-xs border border-red-200 bg-red-50 p-3 rounded-lg my-2">
                            Error parsing report data.
                          </div>
                        );
                      }
                    }
                  }
                  // If it's just normal code, render the pre tag as usual
                  return <pre {...props}>{children}</pre>;
                },
                code({ node, inline, className, children, ...props }: any) {
                  // We still keep the inline code styles here if needed
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Data table for table type */}
        {(message.type === 'table' || message.type === 'combined') && (
          <DataTable darkMode={darkMode} />
        )}

        {/* Insight text for combined */}
        {message.type === 'combined' && (
          <div className="gradient-border mt-3">
            <div
              className={`p-3 border-l-4 border-telkom-red text-sm
              ${darkMode ? 'bg-telkom-red/5 text-gray-300' : 'bg-red-50 text-gray-700'}
            `}
            >
              <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0">💡</span>
                <div>
                  <p className="font-medium text-telkom-red mb-1">Insight</p>
                  <p>
                    Total outstanding: <strong>Rp 2.847.500.000</strong> dari 12 PO aktif.{' '}
                    <strong>3 PO</strong> mendekati jatuh tempo dalam 7 hari ke depan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action chips for combined */}
        {message.type === 'combined' && (
          <div className="flex flex-wrap gap-2 mt-3">
            {['📥 Export Excel', '📄 Generate Report', '🔍 Detail lebih lanjut'].map((chip) => (
              <button
                key={chip}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200
                  ${
                    darkMode
                      ? 'border-telkom-border-dark text-telkom-gray-light hover:border-telkom-red/50 hover:text-telkom-red hover:bg-telkom-red/5'
                      : 'border-gray-200 text-gray-600 hover:border-telkom-red/40 hover:text-telkom-red hover:bg-red-50'
                  }
                `}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Report cards for report type */}
        {message.type === 'report' && (
          <div className="mt-3 space-y-2">
            <p
              className={`text-sm font-medium mb-2 ${darkMode ? 'text-telkom-gray-light' : 'text-gray-700'}`}
            >
              Laporan siap diunduh:
            </p>
            <ReportCard
              darkMode={darkMode}
              title="Laporan PO Outstanding Oktober 2024"
              format="PDF"
              size="2.4 MB"
              date={reportDate}
            />
            <ReportCard
              darkMode={darkMode}
              title="Laporan PO Outstanding Oktober 2024"
              format="Excel"
              size="1.1 MB"
              date={reportDate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
