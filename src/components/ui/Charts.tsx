"use client";

import { useState } from "react";
import {
  AreaChart as RechartsArea,
  Area,
  BarChart as RechartsBar,
  Bar,
  Cell,
  PieChart,
  Pie,
  Sector,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SectorProps = any;

const RADIAN = Math.PI / 180;

/**
 * Interactive risk donut + synced legend.
 * - Hover a slice OR a legend row → highlight (grow + dim others), center label follows it.
 * - Click a slice OR a legend row → "cut" that slice out of the donut (explode) and pin it.
 *   Click again (or click elsewhere) to release.
 */
export function RiskDonut({ data, size = 120, thickness = 14 }: {
  data: { label: string; value: number; color: string }[];
  size?: number; thickness?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const grow = 12; // headroom so an exploded slice never clips
  const outerR = size / 2 - grow;
  const innerR = outerR - thickness;

  // Which slice is in focus: hover wins, else the pinned/clicked one.
  const active = hovered != null ? hovered : selected;
  const focus = active != null ? data[active] : null;
  const centerValue = focus ? focus.value : total;
  const centerColor = focus ? focus.color : "var(--neutral-900)";
  const centerSub = focus && total > 0 ? `${Math.round((focus.value / total) * 100)}%` : "total";

  const toggle = (i: number) => setSelected((prev) => (prev === i ? null : i));

  // Active slice grows; if it's the pinned one, it also detaches (explodes) outward.
  const renderActive = (props: SectorProps) => {
    const { cx, cy, midAngle, startAngle, endAngle, innerRadius, outerRadius, fill } = props;
    const explode = active === selected;
    const offset = explode ? 10 : 0;
    const dx = Math.cos(-midAngle * RADIAN) * offset;
    const dy = Math.sin(-midAngle * RADIAN) * offset;
    return (
      <Sector cx={cx + dx} cy={cy + dy} startAngle={startAngle} endAngle={endAngle}
        innerRadius={innerRadius} outerRadius={outerRadius + 6} fill={fill} cornerRadius={3} />
    );
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <PieChart width={size} height={size}>
          {total > 0 ? (
            <Pie
              data={data} dataKey="value" nameKey="label" cx="50%" cy="50%"
              innerRadius={innerR} outerRadius={outerR} paddingAngle={1.5}
              startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}
              activeIndex={active ?? undefined} activeShape={renderActive}
              onMouseEnter={(_, i) => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={(_, i) => toggle(i)}
            >
              {data.map((d, i) => (
                <Cell key={d.label} fill={d.color}
                  opacity={active == null || active === i ? 1 : 0.3}
                  style={{ transition: "opacity 150ms", cursor: "pointer", outline: "none" }} />
              ))}
            </Pie>
          ) : (
            <Pie data={[{ label: "empty", value: 1 }]} dataKey="value" cx="50%" cy="50%"
              innerRadius={innerR} outerRadius={outerR} fill="var(--neutral-100)" stroke="none" isAnimationActive={false} />
          )}
        </PieChart>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, color: centerColor, lineHeight: 1 }}>
            {centerValue.toLocaleString()}
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--neutral-500)", marginTop: 3 }}>
            {centerSub}
          </span>
        </div>
      </div>

      {/* Synced legend — rows act as slice controls and reflect live state */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {data.map((r, i) => {
          const isActive = active === i;
          const isPinned = selected === i;
          const pct = total > 0 ? Math.round((r.value / total) * 100) : 0;
          return (
            <button key={r.label} type="button"
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              onClick={() => toggle(i)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 8, fontSize: 13, padding: "4px 8px", borderRadius: 8,
                border: "none", background: isActive ? "var(--neutral-50)" : "transparent",
                cursor: "pointer", textAlign: "left", width: "100%",
                opacity: active == null || isActive ? 1 : 0.5, transition: "opacity 150ms, background 150ms",
                fontFamily: "inherit",
              }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--neutral-700)", fontWeight: isPinned ? 700 : 400 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: r.color, boxShadow: isPinned ? `0 0 0 3px ${r.color}33` : "none", transition: "box-shadow 150ms" }} />
                {r.label}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--neutral-900)", whiteSpace: "nowrap" }}>
                {r.value}{isActive ? ` · ${pct}%` : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AreaChart({ data, height = 140, color = "var(--primary-500)", fill }: {
  data: { month: string; rate: number | null }[];
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
