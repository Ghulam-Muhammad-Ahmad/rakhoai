"use client";

import {
  AreaChart as RechartsArea,
  Area,
  BarChart as RechartsBar,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function Donut({ data, size = 132, thickness = 16 }: {
  data: { label: string; value: number; color: string }[];
  size?: number; thickness?: number;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  const segments = data.reduce<{
    label: string;
    color: string;
    len: number;
    offset: number;
  }[]>((items, d) => {
    const offset = items.reduce((sum, item) => sum + item.len, 0);
    const len = total > 0 ? (d.value / total) * c : 0;
    return [...items, { label: d.label, color: d.color, len, offset }];
  }, []);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--neutral-100)" strokeWidth={thickness} />
      {segments.map((segment) => {
        const dasharray = `${segment.len} ${c - segment.len}`;
        return (
          <circle key={segment.label} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={segment.color} strokeWidth={thickness}
            strokeDasharray={dasharray}
            strokeDashoffset={-segment.offset}
            transform={`rotate(-90 ${size/2} ${size/2})`} />
        );
      })}
      <text x="50%" y="48%" textAnchor="middle" fontFamily="var(--font-display)" fontSize="20" fontWeight="500" fill="var(--neutral-900)">{total.toLocaleString()}</text>
      <text x="50%" y="62%" textAnchor="middle" fontFamily="var(--font-body)" fontSize="11" fill="var(--neutral-500)">total</text>
    </svg>
  );
}

export function AreaChart({ data, height = 140, color = "var(--primary-500)", fill }: {
  data: { month: string; rate: number }[];
  height?: number;
  color?: string;
  fill?: string;
}) {
  const gradientId = `areaGradient-${color.replace(/[^a-z0-9]/gi, "")}`;
  const fillColor = fill ?? color;
  if (data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--neutral-400)", fontSize: 13 }}>
        No data yet
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsArea data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={fillColor} stopOpacity={0.18} />
            <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--neutral-500)" }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--neutral-500)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip
          contentStyle={{ border: "1px solid var(--neutral-200)", borderRadius: 8, fontSize: 13, boxShadow: "var(--shadow-xs)" }}
          formatter={(value) => [`${value}%`, "Retention"]}
        />
        <Area type="monotone" dataKey="rate" stroke={color} strokeWidth={2.5} fill={`url(#${gradientId})`} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </RechartsArea>
    </ResponsiveContainer>
  );
}

export function BarChart({ data, height = 140 }: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--neutral-400)", fontSize: 13 }}>
        No data yet
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBar data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--neutral-500)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--neutral-500)" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ border: "1px solid var(--neutral-200)", borderRadius: 8, fontSize: 13, boxShadow: "var(--shadow-xs)" }}
          formatter={(value) => [value, "Students"]}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.value === max ? "var(--primary-500)" : "var(--primary-200)"} />
          ))}
        </Bar>
      </RechartsBar>
    </ResponsiveContainer>
  );
}
