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
} from 'recharts';

export interface ChartData {
  type: 'bar' | 'line' | 'pie';
  title?: string;
  data: any[];
  keys: string[]; // Data keys to render (e.g., ["Produk A", "Produk B"])
  xAxisKey?: string; // e.g., "name"
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

// Format large numbers into readable IDR shorthand: 500000000 → 500Jt, 1200000000 → 1,2M
function formatIDR(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace('.', ',')}M`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}Jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}Rb`;
  return value.toString();
}

function formatIDRFull(value: number): string {
  return 'Rp ' + value.toLocaleString('id-ID');
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
          maxWidth: '220px',
        }}
      >
        {label && <p style={{ fontWeight: 700, marginBottom: 6 }}>{label}</p>}
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color, margin: '3px 0' }}>
            <span style={{ fontWeight: 600 }}>{p.name}: </span>
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
          <span>{entry.value}</span>
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
  const { type, title, data, keys, xAxisKey = 'name' } = config;

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
          <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              stroke={textColor}
              fontSize={11}
              tickLine={false}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={60}
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
            <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
            <Legend content={(props) => <CustomLegend {...props} darkMode={darkMode} />} />
            {keys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={COLORS[index % COLORS.length]}
                radius={[5, 5, 0, 0]}
                maxBarSize={60}
              />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              stroke={textColor}
              fontSize={11}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              height={60}
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
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={3}
                dot={{ r: 5, fill: COLORS[index % COLORS.length], strokeWidth: 0 }}
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
              innerRadius={65}
              outerRadius={100}
              paddingAngle={3}
              labelLine
              label={renderPieLabel}
            >
              {data.map((entry, index) => (
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

  // Pie charts need more vertical space for labels
  const chartHeight = type === 'pie' ? 380 : 340;

  return (
    <div
      className={`w-full my-4 rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 
      ${darkMode ? 'border-telkom-border-dark bg-[#252525] shadow-md shadow-black/20' : 'border-gray-100 bg-white shadow-md shadow-gray-200/50'} 
      overflow-hidden`}
    >
      {title && (
        <div
          className={`px-5 py-4 border-b font-semibold text-sm tracking-wide
          ${darkMode ? 'border-telkom-border-dark text-gray-200' : 'border-gray-100 text-gray-700'}`}
        >
          {title}
        </div>
      )}
      <div className="w-full p-4 pt-6" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
