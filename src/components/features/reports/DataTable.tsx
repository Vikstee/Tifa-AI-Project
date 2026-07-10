'use client';

import React, { useState } from 'react';

interface DataTableProps {
  darkMode: boolean;
}

interface PORow {
  noPO: string;
  vendor: string;
  nilaiPO: string;
  status: string;
  jatuhTempo: string;
}

const poData: PORow[] = [
  {
    noPO: 'PO-2024-1042',
    vendor: 'PT Ericsson Indonesia',
    nilaiPO: 'Rp 485.000.000',
    status: 'Overdue',
    jatuhTempo: '15 Okt 2024',
  },
  {
    noPO: 'PO-2024-1038',
    vendor: 'PT Huawei Tech',
    nilaiPO: 'Rp 720.500.000',
    status: 'Due Soon',
    jatuhTempo: '22 Okt 2024',
  },
  {
    noPO: 'PO-2024-1035',
    vendor: 'PT Nokia Solutions',
    nilaiPO: 'Rp 312.000.000',
    status: 'Pending',
    jatuhTempo: '30 Okt 2024',
  },
  {
    noPO: 'PO-2024-1031',
    vendor: 'PT ZTE Indonesia',
    nilaiPO: 'Rp 890.000.000',
    status: 'Pending',
    jatuhTempo: '05 Nov 2024',
  },
  {
    noPO: 'PO-2024-1028',
    vendor: 'PT Ciena Networks',
    nilaiPO: 'Rp 440.000.000',
    status: 'Due Soon',
    jatuhTempo: '10 Nov 2024',
  },
];

const statusColors: Record<string, string> = {
  Overdue: 'bg-red-500/20 text-red-400 border border-red-500/30',
  'Due Soon': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  Pending: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};

const statusColorLight: Record<string, string> = {
  Overdue: 'bg-red-100 text-red-700 border border-red-200',
  'Due Soon': 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  Pending: 'bg-blue-100 text-blue-700 border border-blue-200',
};

type SortKey = keyof PORow;

export default function DataTable({ darkMode }: DataTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('jatuhTempo');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sorted = [...poData].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className={`ml-1 text-xs ${sortKey === col ? 'text-telkom-red' : 'opacity-40'}`}>
      {sortKey === col ? (sortAsc ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <div
      className={`rounded-xl overflow-hidden border ${darkMode ? 'border-telkom-border-dark' : 'border-gray-200'} my-3`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={darkMode ? 'bg-telkom-border-dark/60' : 'bg-gray-50'}>
              {(['noPO', 'vendor', 'nilaiPO', 'status', 'jatuhTempo'] as SortKey[]).map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className={`px-4 py-3 text-left font-semibold cursor-pointer select-none whitespace-nowrap transition-colors
                    ${darkMode ? 'text-telkom-gray-light hover:text-white' : 'text-gray-600 hover:text-gray-900'}
                  `}
                >
                  {col === 'noPO'
                    ? 'No PO'
                    : col === 'nilaiPO'
                      ? 'Nilai PO'
                      : col === 'jatuhTempo'
                        ? 'Jatuh Tempo'
                        : col.charAt(0).toUpperCase() + col.slice(1)}
                  <SortIcon col={col} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => (
              <tr
                key={row.noPO}
                className={`
                  border-t transition-colors
                  ${
                    darkMode
                      ? `border-telkom-border-dark/40 ${idx % 2 === 0 ? 'bg-telkom-charcoal/40' : 'bg-transparent'} hover:bg-telkom-red/5`
                      : `border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-red-50/30`
                  }
                `}
              >
                <td
                  className={`px-4 py-3 font-mono text-xs ${darkMode ? 'text-telkom-gray-light' : 'text-gray-700'}`}
                >
                  {row.noPO}
                </td>
                <td className={`px-4 py-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {row.vendor}
                </td>
                <td
                  className={`px-4 py-3 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}
                >
                  {row.nilaiPO}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${darkMode ? statusColors[row.status] : statusColorLight[row.status]}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td
                  className={`px-4 py-3 ${darkMode ? 'text-telkom-gray-light' : 'text-gray-600'}`}
                >
                  {row.jatuhTempo}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
