'use client';

import React, { useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'area';
  title?: string;
  data: any[];
  keys: string[];
  xAxisKey?: string;
  // === Dynamic Chart Config (Zero-Token) ===
  sourceTable?: string;       // Supabase table name
  groupByColumn?: string;     // Column to group data by
  sumColumn?: string;         // Column to aggregate (SUM)
  filterOptions?: string[];   // Available filter choices (e.g. ["Vendor A", "Vendor B"])
  filterColumn?: string;      // Column used for filtering (e.g. "category")
  drillColumn?: string;       // Column used for drill-down lookup (defaults to xAxisKey)
}

interface ChartViewerProps {
  config: ChartData;
  darkMode?: boolean;
}

const COLORS = [
  '#E4002B', '#0078FF', '#F59E0B', '#10B981',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#84CC16', '#6366F1', '#14B8A6', '#F43F5E',
  '#A78BFA', '#34D399', '#60A5FA',
];

function formatIDR(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace('.', ',')}M`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}Jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}Rb`;
  return value.toString();
}

function formatIDRFull(value: number): string {
  return 'Rp ' + value.toLocaleString('id-ID');
}

const CustomTooltip = ({ active, payload, label, darkMode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: darkMode ? '#1f2937' : '#fff',
        borderRadius: '10px', padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
        fontSize: '12px', color: darkMode ? '#e5e7eb' : '#374151', maxWidth: '220px',
      }}>
        {label && <p style={{ fontWeight: 700, marginBottom: 6 }}>{label}</p>}
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color, margin: '3px 0' }}>
            <span style={{ fontWeight: 600 }}>{p.name}: </span>
            {typeof p.value === 'number' ? formatIDRFull(p.value) : p.value}
          </p>
        ))}
        <p style={{ fontSize: 10, marginTop: 6, opacity: 0.5 }}>Klik untuk lihat detail</p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload, darkMode }: any) => {
  if (!payload || payload.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginTop: '12px' }}>
      {payload.map((entry: any, index: number) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: darkMode ? '#d1d5db' : '#4b5563' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: entry.color, flexShrink: 0 }} />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const renderPieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  if (percent < 0.005) return null;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#6b7280" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
      {`${name} (${(percent * 100).toFixed(1)}%)`}
    </text>
  );
};

export default function ChartViewer({ config, darkMode }: ChartViewerProps) {
  const { type, title, keys, xAxisKey = 'name', sourceTable, groupByColumn, sumColumn, filterOptions, filterColumn, drillColumn } = config;

  // === State ===
  const [chartData, setChartData] = useState<any[]>(config.data);
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [realFilterOptions, setRealFilterOptions] = useState<string[]>(config.filterOptions || []);
  const [drillData, setDrillData] = useState<any[] | null>(null);
  const [drillLabel, setDrillLabel] = useState<string>('');
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [loadingDrill, setLoadingDrill] = useState(false);
  const [drillError, setDrillError] = useState<string>('');

  const textColor = darkMode ? '#9ca3af' : '#6b7280';
  const gridColor = darkMode ? '#2d3748' : '#f0f0f0';

  const firstKey = keys[0];
  const isIDR = chartData.length > 0 && typeof chartData[0][firstKey] === 'number' && chartData[0][firstKey] > 10000;

  const allValues: number[] = chartData.flatMap(d => keys.map(k => d[k] ?? 0));
  const maxVal = Math.max(...allValues, 0);
  const minVal = Math.min(...allValues, 0);
  const yMin = maxVal > 0 && (maxVal - minVal) / maxVal < 0.2 ? Math.floor(minVal * 0.9) : 0;

  // === Fetch real database filter options on mount ===
  React.useEffect(() => {
    if (sourceTable && filterColumn) {
      const fetchDistinct = async () => {
        try {
          const res = await fetch('/api/chart-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceTable,
              fetchDistinctColumn: filterColumn,
            }),
          });
          const json = await res.json();
          if (json.distinctValues && json.distinctValues.length > 0) {
            setRealFilterOptions(json.distinctValues);
          }
        } catch (e) {
          console.error('Failed to fetch distinct filter values', e);
        }
      };
      fetchDistinct();
    }
  }, [sourceTable, filterColumn]);

  // === Fetch chart data from Supabase (zero token) ===
  const fetchChartData = useCallback(async (filterVal: string) => {
    if (!sourceTable || !groupByColumn || !sumColumn) return;
    setLoadingFilter(true);
    try {
      const res = await fetch('/api/chart-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTable,
          groupByColumn,
          sumColumn,
          filterColumn: filterColumn || undefined,
          filterValue: filterVal || undefined,
        }),
      });
      const json = await res.json();
      if (json.chartData) {
        // Convert {label, value} to the recharts format using existing keys
        const normalized = json.chartData.map((item: { label: string; value: number }) => ({
          [xAxisKey]: item.label,
          [firstKey]: item.value,
        }));
        setChartData(normalized);
      }
    } catch (e) {
      console.error('chart-data fetch error', e);
    } finally {
      setLoadingFilter(false);
    }
  }, [sourceTable, groupByColumn, sumColumn, filterColumn, xAxisKey, firstKey]);

  // === Drill-down: fetch raw rows for a clicked label ===
  const handleDrillDown = useCallback(async (label: string) => {
    if (!sourceTable) return;
    setDrillLabel(label);
    setDrillData(null);
    setDrillError('');
    setLoadingDrill(true);
    try {
      const res = await fetch('/api/chart-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceTable,
          drillColumn: drillColumn || groupByColumn || xAxisKey,
          drillValue: label,
          filterColumn: filterColumn && activeFilter ? filterColumn : undefined,
          filterValue: activeFilter || undefined,
          limit: 50,
        }),
      });
      const json = await res.json();
      if (json.rows) {
        setDrillData(json.rows);
      } else {
        setDrillError(json.error || 'Tidak ada data ditemukan');
      }
    } catch (e) {
      setDrillError('Gagal mengambil data rincian.');
    } finally {
      setLoadingDrill(false);
    }
  }, [sourceTable, drillColumn, groupByColumn, xAxisKey, filterColumn, activeFilter]);

  const handleFilterChange = (val: string) => {
    setActiveFilter(val);
    setDrillData(null);
    fetchChartData(val);
  };

  const clickProps = sourceTable ? {
    onClick: (data: any) => {
      const label = data?.activePayload?.[0]?.payload?.[xAxisKey]
        || data?.activePayload?.[0]?.payload?.name
        || data?.name
        || '';
      if (label) handleDrillDown(label);
    },
    cursor: 'pointer',
  } : {};

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }} {...clickProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey={xAxisKey} stroke={textColor} fontSize={11} tickLine={false} interval={0} angle={-35} textAnchor="end" height={60} tick={{ fill: textColor }} />
            <YAxis stroke={textColor} fontSize={11} tickLine={false} axisLine={false} tickFormatter={isIDR ? formatIDR : undefined} domain={[yMin, 'auto']} tick={{ fill: textColor }} width={55} />
            <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
            <Legend content={(props) => <CustomLegend {...props} darkMode={darkMode} />} />
            {keys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} radius={[5, 5, 0, 0]} maxBarSize={60} />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }} {...clickProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey={xAxisKey} stroke={textColor} fontSize={11} tickLine={false} angle={-35} textAnchor="end" height={60} tick={{ fill: textColor }} />
            <YAxis stroke={textColor} fontSize={11} tickLine={false} axisLine={false} tickFormatter={isIDR ? formatIDR : undefined} tick={{ fill: textColor }} width={55} />
            <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
            <Legend content={(props) => <CustomLegend {...props} darkMode={darkMode} />} />
            {keys.map((key, index) => (
              <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} strokeWidth={3} dot={{ r: 5, fill: COLORS[index % COLORS.length], strokeWidth: 0 }} activeDot={{ r: 8, cursor: 'pointer' }} />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }} {...clickProps}>
            <defs>
              {keys.map((key, index) => (
                <linearGradient key={key} id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey={xAxisKey} stroke={textColor} fontSize={11} tickLine={false} angle={-35} textAnchor="end" height={60} tick={{ fill: textColor }} />
            <YAxis stroke={textColor} fontSize={11} tickLine={false} axisLine={false} tickFormatter={isIDR ? formatIDR : undefined} tick={{ fill: textColor }} width={55} />
            <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
            <Legend content={(props) => <CustomLegend {...props} darkMode={darkMode} />} />
            {keys.map((key, index) => (
              <Area key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} fill={`url(#grad-${index})`} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8, cursor: 'pointer' }} />
            ))}
          </AreaChart>
        );

      case 'pie': {
        const clickPieProp = sourceTable ? {
          onClick: (data: any) => {
            if (data?.name) handleDrillDown(data.name);
          },
        } : {};
        return (
          <PieChart>
            <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
            <Legend content={(props) => <CustomLegend {...props} darkMode={darkMode} />} />
            <Pie
              data={chartData}
              dataKey={keys[0]}
              nameKey={xAxisKey}
              cx="50%" cy="45%"
              innerRadius={65} outerRadius={100}
              paddingAngle={3}
              labelLine
              label={renderPieLabel}
              cursor={sourceTable ? 'pointer' : 'default'}
              {...clickPieProp}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      }

      default:
        return <div className="p-4 text-center text-sm">Unsupported chart type</div>;
    }
  };

  const chartHeight = type === 'pie' ? 380 : 340;
  const hasDynamicFilter = sourceTable && realFilterOptions && realFilterOptions.length > 0 && filterColumn;

  // Get drill-down table column headers from first row
  const drillColumns = drillData && drillData.length > 0 ? Object.keys(drillData[0]) : [];

  return (
    <div className={`w-full my-4 rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${darkMode ? 'border-telkom-border-dark bg-[#252525] shadow-md shadow-black/20' : 'border-gray-100 bg-white shadow-md shadow-gray-200/50'} overflow-hidden`}>
      {/* Chart Header */}
      <div className={`px-5 py-3 border-b flex items-center justify-between gap-3 flex-wrap ${darkMode ? 'border-telkom-border-dark' : 'border-gray-100'}`}>
        <span className={`font-semibold text-sm tracking-wide ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          {title}
          {loadingFilter && <span className="ml-2 text-xs font-normal opacity-60 animate-pulse">Memuat data...</span>}
        </span>

        {/* Dynamic Filter Dropdowns */}
        {hasDynamicFilter && (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={activeFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className={`text-xs px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors ${darkMode ? 'bg-telkom-surface-dark border-telkom-border-dark text-gray-200 hover:border-telkom-red' : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-telkom-red'}`}
            >
              <option value="">Semua {filterColumn}</option>
              {realFilterOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Chart Area */}
      <div className="w-full p-4 pt-6" style={{ height: chartHeight }}>
        {sourceTable && (
          <p className={`text-[10px] mb-1 text-center ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>
            💡 Klik grafik untuk lihat detail data
          </p>
        )}
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Drill-Down Panel */}
      {(loadingDrill || drillData !== null || drillError) && (
        <div className={`border-t px-5 py-4 ${darkMode ? 'border-telkom-border-dark bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-telkom-red">📊 Rincian:</span>
              <span className={`text-xs font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{drillLabel}</span>
            </div>
            <button
              onClick={() => { setDrillData(null); setDrillLabel(''); setDrillError(''); }}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-telkom-border-dark text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
            >
              ✕ Tutup
            </button>
          </div>

          {loadingDrill && (
            <div className="flex items-center gap-2 text-xs text-gray-500 animate-pulse py-2">
              <div className="w-2 h-2 bg-telkom-red rounded-full animate-bounce" />
              Mengambil data dari database...
            </div>
          )}

          {drillError && (
            <p className="text-xs text-red-500">{drillError}</p>
          )}

          {drillData && drillData.length === 0 && (
            <p className={`text-xs italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Tidak ada data rincian ditemukan.</p>
          )}

          {drillData && drillData.length > 0 && (
            <div className="overflow-x-auto rounded-lg">
              <table className={`min-w-full text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <thead>
                  <tr className={darkMode ? 'bg-telkom-surface-dark' : 'bg-white'}>
                    {drillColumns.map((col) => (
                      <th key={col} className={`px-3 py-2 text-left font-semibold uppercase tracking-wider text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drillData.map((row, ri) => (
                    <tr key={ri} className={`border-t transition-colors ${darkMode ? 'border-telkom-border-dark hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'}`}>
                      {drillColumns.map((col) => (
                        <td key={col} className="px-3 py-2 whitespace-nowrap">
                          {typeof row[col] === 'number' && row[col] > 10000
                            ? formatIDRFull(row[col])
                            : String(row[col] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={`text-[10px] mt-2 px-1 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                Menampilkan {drillData.length} baris pertama
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
