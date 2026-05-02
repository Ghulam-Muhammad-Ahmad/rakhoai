"use client";

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

export function AreaChart({ values, height = 120, color = "var(--primary-500)", fill = "var(--primary-100)" }: {
  values: number[]; height?: number; color?: string; fill?: string;
}) {
  const w = 600;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${height - 10 - ((v - min) / range) * (height - 30)}`);
  const path = "M" + pts.join(" L");
  const fillPath = path + ` L${w},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <path d={fillPath} fill={fill} opacity="0.5" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => {
        const [x, y] = p.split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
}

export function BarChart({ values, height = 120, labels }: {
  values: number[]; height?: number; labels: string[];
}) {
  const w = 320;
  const max = Math.max(...values) || 1;
  const bw = (w - (values.length - 1) * 8) / values.length;
  return (
    <svg viewBox={`0 0 ${w} ${height + 18}`} style={{ width: "100%", height: height + 18 }}>
      {values.map((v, i) => {
        const h = (v / max) * height;
        const x = i * (bw + 8);
        const y = height - h;
        const isMax = v === max;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={h} rx={3}
                  fill={isMax ? "var(--primary-500)" : "var(--primary-200)"} />
            <text x={x + bw / 2} y={height + 14} textAnchor="middle"
                  fontSize="10" fill="var(--neutral-500)" fontFamily="var(--font-body)">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}
