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
  created_at?: string;
  files?: { name: string; size: string; type: string }[];
}

interface MessageBubbleProps {
  message: Message;
  darkMode: boolean;
  onEditMessage?: (messageId: string, newContent: string) => void;
  userProfile?: any;
}

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default React.memo(function MessageBubble({ message, darkMode, onEditMessage, userProfile }: MessageBubbleProps) {
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

  // Pass content as-is — status normalization happens at cell level (see td renderer below)
  const sanitizedContent = message.content;

  if (isUser) {
    return (
      <div className="flex justify-end animate-fadeIn message-item" data-date={message.created_at || new Date().toISOString()}>
        <div className="max-w-[88%] sm:max-w-[75%] flex flex-col items-end gap-1 group">
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
                className={`opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 transition-opacity p-1.5 rounded-full mb-1 ${darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-200 text-gray-500'}`}
                title="Edit message"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            <div
              className={`relative text-sm leading-relaxed ${isEditing ? 'w-full min-w-[250px] sm:min-w-[400px]' : 'px-4 py-3 rounded-2xl rounded-br-sm'}
              ${!isEditing ? 'bg-gradient-to-br from-telkom-red to-[#FF4D4D] text-white shadow-[0_4px_16px_rgba(228,0,43,0.25)] border border-white/20' : ''}
            `}
            >
              {isEditing ? (
                <div className="flex flex-col gap-2 w-full">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className={`w-full p-3 text-sm rounded-xl outline-none resize-none min-h-[100px] shadow-md transition-colors ${darkMode ? 'bg-gray-800 text-white border-gray-700 focus:border-telkom-red' : 'bg-white text-gray-900 border-gray-200 focus:border-telkom-red'} border`}
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
                <div className="prose prose-sm prose-invert max-w-none break-words">
                  <ReactMarkdown>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            {!isEditing && (
              <div className="w-7 h-7 rounded-full bg-telkom-red/20 border border-telkom-red/30 flex items-center justify-center flex-shrink-0 mb-0.5 overflow-hidden">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-telkom-red">{getInitials(userProfile?.name)}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-fadeIn message-item" data-date={message.created_at || new Date().toISOString()}>
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
      <div className="flex-1 max-w-[85%]" data-tifa-response>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-telkom-red">TIFA</span>
          <span className={`text-xs ${darkMode ? 'text-telkom-gray/50' : 'text-gray-400'}`}>
            {message.timestamp}
          </span>
        </div>

        {/* Text content */}
        <div className={`text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          {message.content.trim() ? (
            <div className={`prose prose-sm max-w-none break-words ${darkMode ? 'prose-invert' : ''}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ node, ...props }: any) => <p className="!my-1.5 leading-relaxed" {...props} />,
                  h1: ({ node, ...props }: any) => <h1 className="!mt-3.5 !mb-1.5 text-lg font-bold text-telkom-red" {...props} />,
                  h2: ({ node, ...props }: any) => <h2 className="!mt-3 !mb-1 text-base font-bold text-telkom-red" {...props} />,
                  h3: ({ node, ...props }: any) => <h3 className="!mt-2.5 !mb-1 text-sm font-semibold text-telkom-red flex items-center gap-1.5" {...props} />,
                  blockquote: ({ node, ...props }: any) => (
                    <blockquote className={`!my-2 border-l-4 border-telkom-red px-3 py-2 rounded-r-xl italic shadow-xs ${darkMode ? 'bg-telkom-red/10 text-gray-200' : 'bg-red-50/80 text-gray-800'}`} {...props} />
                  ),
                  hr: ({ node, ...props }: any) => <hr className={`!my-2.5 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`} {...props} />,
                  ul: ({ node, ...props }: any) => <ul className="!my-1.5 pl-5 list-disc space-y-0.5" {...props} />,
                  ol: ({ node, ...props }: any) => <ol className="!my-1.5 pl-5 list-decimal space-y-0.5" {...props} />,
                  li: ({ node, ...props }: any) => <li className="!my-0.5" {...props} />,
                  table: ({ node, ...props }: any) => (
                    <div className={`overflow-x-auto my-3 rounded-xl shadow-lg border transition-all duration-300 hover:shadow-xl ${darkMode ? 'border-gray-700 shadow-black/30' : 'border-gray-200 shadow-gray-200/50'}`}>
                      <table className={`!m-0 w-full text-left border-collapse ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} {...props} />
                    </div>
                  ),
                  thead: ({ node, ...props }: any) => (
                    <thead className={`${darkMode ? 'bg-gray-800/80 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200'}`} {...props} />
                  ),
                  tbody: ({ node, ...props }: any) => (
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700 bg-gray-900/50' : 'divide-gray-200 bg-white'}`} {...props} />
                  ),
                  tr: ({ node, ...props }: any) => (
                    <tr className={`transition-colors duration-200 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50/80'}`} {...props} />
                  ),
                  th: ({ node, ...props }: any) => (
                    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${darkMode ? 'text-gray-200' : 'text-gray-600'}`} {...props} />
                  ),
                  td: ({ node, children, ...props }: any) => {
                    // Normalize status text ONLY inside table cells — safe, won't touch JSON
                    const normalizeCell = (text: string): string => {
                      return text
                        .replace(/[^\w\s]{1,4}\s*(Unpaid|Belum Dibayar)/gi, '🔴 $1')
                        .replace(/[^\w\s]{1,4}\s*(Paid|Lunas)(?!.*Unpaid)/gi, '🟢 $1')
                        .replace(/[^\w\s]{1,4}\s*(Pending)/gi, '🟡 $1')
                        .replace(/[^\w\s]{1,4}\s*(Approved|Disetujui)/gi, '✅ $1')
                        .replace(/[^\w\s]{1,4}\s*(Rejected|Ditolak)/gi, '❌ $1')
                        .replace(/[^\w\s]{1,4}\s*(Overdue)/gi, '⛔ $1')
                        .replace(/[^\w\s]{1,4}\s*(Ongoing)/gi, '🔵 $1')
                        .replace(/[^\w\s]{1,4}\s*(Completed|Selesai)/gi, '✅ $1');
                    };
                    const processedChildren = React.Children.map(children, (child) =>
                      typeof child === 'string' ? normalizeCell(child) : child
                    );
                    return (
                      <td className={`px-4 py-3 text-sm whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} {...props}>
                        {processedChildren}
                      </td>
                    );
                  },
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
                                title={data.title || data.reportType || 'Laporan'}
                                format={data.format as any || 'PDF'}
                                size="~200 KB"
                                date={data.period || reportDate}
                                sections={data.sections}
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
                {sanitizedContent}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 py-2 px-3 rounded-2xl w-fit bg-telkom-red/10 border border-telkom-red/20 my-1 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-telkom-red animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-telkom-red animate-bounce" style={{ animationDelay: '200ms' }} />
              <span className="w-2 h-2 rounded-full bg-telkom-red animate-bounce" style={{ animationDelay: '400ms' }} />
              <span className="text-xs font-medium text-telkom-red ml-1.5">TIFA sedang berpikir...</span>
            </div>
          )}
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
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when onEditMessage reference changes (which happens on every keystroke)
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.darkMode === nextProps.darkMode &&
    prevProps.userProfile?.avatar_url === nextProps.userProfile?.avatar_url
  );
});
