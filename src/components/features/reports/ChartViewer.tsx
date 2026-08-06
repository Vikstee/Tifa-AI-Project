import React from 'react';
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
  LabelList,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'candlestick' | 'gantt';
  title?: string;
  data: any[];
  keys: string[]; // Data keys to render (e.g., ["Produk A", "Produk B"])
  xAxisKey?: string; // e.g., "name"
  colors?: string[]; // Semantic color hints from AI (e.g., ["slate", "emerald"])
}

interface ChartViewerProps {
  config: ChartData;
  darkMode?: boolean;
}

// Richer, more distinguishable color palette
const COLORS = [
  '#E4002B', // merah TelkomInfra
  '#0078FF', // biru
  '#F59E0B', // kuning/amber
  '#10B981', // hijau
  '#8B5CF6', // ungu
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // oranye
  '#84CC16', // lime
  '#6366F1', // indigo
];

function formatIDR(value: number): string {
  if (typeof value !== 'number') return String(value);
  if (value >= 1_000_000_000_000) return `Rp ${(value / 1_000_000_000_000).toFixed(3).replace('.', ',')} T`;
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(2).replace('.', ',')} M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(2).replace('.', ',')} Jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0).replace('.', ',')} Rb`;
  return `Rp ${value.toLocaleString('id-ID')}`;
}

const getColorForKey = (key: string, index: number, semanticColors?: string[]) => {
  if (semanticColors && semanticColors[index]) {
    const hint = semanticColors[index].toLowerCase();
    if (hint === 'slate' || hint === 'gray') return '#64748b'; // slate-500
    if (hint === 'emerald' || hint === 'green') return '#10B981'; // emerald-500
    if (hint === 'amber' || hint === 'orange') return '#F59E0B'; // amber-500
    if (hint === 'red' || hint === 'rose') return '#E4002B'; // red
    if (hint === 'blue') return '#0078FF'; // blue
  }

  const k = key.toLowerCase();
  if (k.includes('rkap') || k.includes('target') || k.includes('baseline')) {
    return '#64748b'; // slate-500 (gray-ish blue)
  }
  if (k.includes('invoice') || k.includes('actual') || k.includes('realisasi')) {
    return '#10B981'; // emerald-500 (bright green)
  }
  if (k.includes('selisih') || k.includes('gap') || k.includes('unbilled')) {
    return '#F59E0B'; // amber-500
  }
  return COLORS[index % COLORS.length];
};

function formatIDRFull(value: number): string {
  return 'Rp ' + value.toLocaleString('id-ID');
}

// Format database keys or underscore strings into clean, user-friendly Indonesian labels
export function formatLegendLabel(rawKey: string): string {
  if (!rawKey) return '';
  const dictionary: Record<string, string> = {
    realisasi_revenue_rp: 'Realisasi Revenue (Rp)',
    revenue: 'Realisasi Revenue (Rp)',
    rkap_rp: 'Target RKAP (Rp)',
    rkap: 'Target RKAP (Rp)',
    outlook_rp: 'Proyeksi Outlook (Rp)',
    outlook: 'Proyeksi Outlook (Rp)',
    cash_in_rp: 'Total Cash In (Rp)',
    cash_in: 'Total Cash In (Rp)',
    bast_rp: 'Nilai BAST (Rp)',
    bast: 'Nilai BAST (Rp)',
    invoice_rp: 'Total Invoice (Rp)',
    invoice: 'Total Invoice (Rp)',
    denda_pinalty_rp: 'Denda Pinalty (Rp)',
    pinalty: 'Denda Pinalty (Rp)',
    po_amount: 'Nominal PO (Rp)',
  };

  const lower = rawKey.trim().toLowerCase();
  if (dictionary[lower]) return dictionary[lower];

  let formatted = rawKey.replace(/_/g, ' ');
  if (formatted.toLowerCase().endsWith(' rp')) {
    formatted = formatted.slice(0, -3) + ' (Rp)';
  }
  return formatted.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Custom Tooltip to show readable values
const CustomTooltip = ({ active, payload, label, darkMode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: darkMode ? '#1f2937' : '#fff',
          borderRadius: '10px',
          padding: '10px 14px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
          fontSize: '12px',
          color: darkMode ? '#e5e7eb' : '#374151',
          maxWidth: '260px',
        }}
      >
        {label && <p style={{ fontWeight: 700, marginBottom: 6 }}>{label}</p>}
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color, margin: '3px 0' }}>
            <span style={{ fontWeight: 600 }}>{formatLegendLabel(p.name)}: </span>
            {typeof p.value === 'number' ? formatIDRFull(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom Legend that renders color squares (safe, no emoji issues)
const CustomLegend = ({ payload, darkMode }: any) => {
  if (!payload || payload.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginTop: '12px' }}>
      {payload.map((entry: any, index: number) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: darkMode ? '#d1d5db' : '#4b5563' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: entry.color, flexShrink: 0 }} />
          <span className="font-medium">{formatLegendLabel(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

// Custom Pie label renderer — placed outside slice to prevent overlap
const renderPieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  if (percent < 0.005) return null; // skip truly tiny slices only
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#6b7280" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
      {`${name} (${(percent * 100).toFixed(2)}%)`}
    </text>
  );
};

export default function ChartViewer({ config, darkMode }: ChartViewerProps) {
  const { type, title, data, keys, xAxisKey = 'name', colors: semanticColors } = config;

  const textColor = darkMode ? '#9ca3af' : '#6b7280';
  const gridColor = darkMode ? '#2d3748' : '#f0f0f0';

  // Determine if values look like IDR (large numbers > 10000)
  const firstKey = keys[0];
  const isIDR = data.length > 0 && typeof data[0][firstKey] === 'number' && data[0][firstKey] > 10000;

  // For bar charts: compute a smart Y min so bars at similar values still show contrast
  const allValues: number[] = data.flatMap(d => keys.map(k => d[k] ?? 0));
  const maxVal = Math.max(...allValues);
  const minVal = Math.min(...allValues);
  // If all bars are very close (within 20% of each other), start Y at 90% of min to show differences
  const yMin = maxVal > 0 && (maxVal - minVal) / maxVal < 0.2 ? Math.floor(minVal * 0.9) : 0;

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 35, right: 20, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              stroke={textColor}
              fontSize={11}
              tickLine={false}
              height={30}
              tick={{ fill: textColor }}
            />
            <YAxis
              stroke={textColor}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={isIDR ? formatIDR : undefined}
              domain={[yMin, 'auto']}
              tick={{ fill: textColor }}
              width={55}
            />
            <Tooltip cursor={false} content={<CustomTooltip darkMode={darkMode} />} />
            <Legend content={(props) => <CustomLegend {...props} darkMode={darkMode} />} />
            {keys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={getColorForKey(key, index, semanticColors)}
                radius={[6, 6, 0, 0]}
                maxBarSize={120}
              >
                <LabelList 
                  dataKey={key} 
                  position="top" 
                  formatter={isIDR ? formatIDR : undefined} 
                  fontSize={11} 
                  fill={textColor} 
                  offset={10} 
                  fontWeight={600}
                />
              </Bar>
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data} margin={{ top: 35, right: 20, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              stroke={textColor}
              fontSize={11}
              tickLine={false}
              height={30}
              tick={{ fill: textColor }}
            />
            <YAxis
              stroke={textColor}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={isIDR ? formatIDR : undefined}
              tick={{ fill: textColor }}
              width={55}
            />
            <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
            <Legend content={(props) => <CustomLegend {...props} darkMode={darkMode} />} />
            {keys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={getColorForKey(key, index, semanticColors)}
                strokeWidth={3}
                dot={{ r: 5, fill: getColorForKey(key, index, semanticColors), strokeWidth: 0 }}
                activeDot={{ r: 7 }}
              />
            ))}
          </LineChart>
        );

      case 'pie': {
        // For pie, use a bigger height container and external labels
        return (
          <PieChart>
            <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
            <Legend content={(props) => <CustomLegend {...props} darkMode={darkMode} />} />
            <Pie
              data={data}
              dataKey={keys[0]}
              nameKey={xAxisKey}
              cx="50%"
              cy="45%"
              innerRadius="35%"
              outerRadius="60%"
              paddingAngle={3}
              labelLine
              label={renderPieLabel}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColorForKey(keys[0], index, semanticColors) !== COLORS[index % COLORS.length] ? getColorForKey(keys[0], index, semanticColors) : COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      }

      case 'scatter':
        return (
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey={keys[0] || 'x'} type="number" name={keys[0]} stroke={textColor} fontSize={11} tick={{ fill: textColor }} />
            <YAxis dataKey={keys[1] || 'y'} type="number" name={keys[1]} stroke={textColor} fontSize={11} tickFormatter={isIDR ? formatIDR : undefined} tick={{ fill: textColor }} width={55} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip darkMode={darkMode} />} />
            <Scatter name="Data" data={data} fill={COLORS[1]} />
          </ScatterChart>
        );

      case 'candlestick':
        return (
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey={xAxisKey} type="category" stroke={textColor} fontSize={11} tick={{ fill: textColor }} />
            <YAxis domain={['auto', 'auto']} type="number" stroke={textColor} fontSize={11} tickFormatter={isIDR ? formatIDR : undefined} tick={{ fill: textColor }} width={55} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip darkMode={darkMode} />} />
            <Scatter 
              name="Candle" 
              data={data} 
              shape={(props: any) => {
                const { cx, payload, yAxis } = props;
                if (!yAxis || !yAxis.scale || !payload) return <g></g>;
                const { open, close, high, low } = payload;
                if (open === undefined) return <g></g>;
                const o = yAxis.scale(open);
                const c = yAxis.scale(close);
                const h = yAxis.scale(high);
                const l = yAxis.scale(low);
                const isUp = close >= open;
                const color = isUp ? '#10B981' : '#E4002B';
                const bw = 12;
                return (
                  <g>
                    <line x1={cx} y1={h} x2={cx} y2={l} stroke={color} strokeWidth={1.5} />
                    <rect x={cx - bw/2} y={Math.min(o, c)} width={bw} height={Math.max(2, Math.abs(o - c))} fill={color} />
                  </g>
                );
              }} 
            />
          </ScatterChart>
        );

      case 'gantt':
        return (
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
            <XAxis type="number" stroke={textColor} fontSize={11} tick={{ fill: textColor }} />
            <YAxis dataKey={xAxisKey} type="category" stroke={textColor} fontSize={11} tick={{ fill: textColor }} width={80} />
            <Tooltip cursor={{ fill: darkMode ? '#374151' : '#f3f4f6' }} content={<CustomTooltip darkMode={darkMode} />} />
            <Bar dataKey={keys[0] || 'start'} stackId="a" fill="transparent" />
            <Bar dataKey={keys[1] || 'duration'} stackId="a" fill={COLORS[3]} radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        );

      default:
        return <div className="p-4 text-center text-sm">Unsupported chart type</div>;
    }
  };

  // Pie charts need more vertical space for labels
  const chartHeight = type === 'pie' ? 380 : 340;

  return (
    <div
      className={`w-full my-4 rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 
      ${darkMode ? 'border-telkom-border-dark bg-[#252525] shadow-md shadow-black/20' : 'border-gray-100 bg-white shadow-md shadow-gray-200/50'} 
      overflow-hidden chart-container type-${type}`}
    >
      <style>{`
        /* Hilangkan garis kotak hitam (focus ring) bawaan browser pada SVG */
        svg *:focus {
          outline: none !important;
        }
        
        /* Animasi untuk batang grafik (Bar) */
        .recharts-bar-rectangle path {
          transition: all 0.2s ease-in-out;
          cursor: pointer;
          transform-origin: bottom;
        }
        .recharts-bar-rectangle path:hover {
          transform: scaleY(1.03);
          filter: brightness(1.15) drop-shadow(0px -2px 6px rgba(0,0,0,0.15));
        }

        /* Animasi untuk lingkaran grafik (Pie) */
        .recharts-pie-sector path {
          transition: all 0.2s ease-in-out;
          cursor: pointer;
          transform-origin: 50% 45%;
        }
        .recharts-pie-sector path:hover {
          transform: scale(1.04);
          filter: brightness(1.15) drop-shadow(0px 4px 6px rgba(0,0,0,0.25));
        }

        /* Khusus Bar Chart: Sembunyikan tooltip kecuali batang sedang di-hover secara fisik */
        .chart-container.type-bar .recharts-tooltip-wrapper {
          opacity: 0 !important;
          visibility: hidden !important;
          transition: opacity 0.2s ease, visibility 0.2s;
        }
        .chart-container.type-bar:has(.recharts-bar-rectangle path:hover) .recharts-tooltip-wrapper {
          opacity: 1 !important;
          visibility: visible !important;
        }
      `}</style>
      {title && (
        <div
          className={`px-5 py-4 border-b font-semibold text-sm tracking-wide
          ${darkMode ? 'border-telkom-border-dark text-gray-200' : 'border-gray-100 text-gray-700'}`}
        >
          {title}
        </div>
      )}
      <div className="w-full overflow-x-auto" style={{ height: chartHeight }}>
        <div className="p-4 pt-6" style={{ minWidth: type === 'pie' ? '450px' : '600px', height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
