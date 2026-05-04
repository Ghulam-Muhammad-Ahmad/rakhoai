# Dashboard Recharts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hand-rolled SVG charts with Recharts, fix all static/hardcoded values in the dashboard.

**Architecture:** Install Recharts, rewrite `Charts.tsx` AreaChart and BarChart using Recharts components (tooltips, axes, animations), add a real retention trend query from RiskAssessment data, fix hardcoded greeting name and pending count.

**Tech Stack:** Recharts, Supabase JS client, Next.js App Router (server + client components)

---

## Files

| Action | File | Purpose |
|--------|------|---------|
| Modify | `package.json` | add recharts dependency |
| Modify | `src/components/ui/Charts.tsx` | replace AreaChart + BarChart with Recharts |
| Modify | `src/lib/dashboard/charts-core.ts` | add `buildRetentionTrend` |
| Modify | `src/lib/dashboard/charts.ts` | query RiskAssessment for trend, return trend data |
| Modify | `src/app/(dashboard)/dashboard/page.tsx` | fix static greeting, fix "3 pending", wire trend |

---

### Task 1: Install Recharts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install recharts**

```bash
npm install recharts
```

Expected: `package.json` gains `"recharts"` in dependencies. No errors.

- [ ] **Step 2: Verify types are bundled**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors about missing recharts types (recharts ships its own types).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts"
```

---

### Task 2: Replace AreaChart and BarChart in Charts.tsx

**Files:**
- Modify: `src/components/ui/Charts.tsx`

Keep the existing `Donut` component unchanged. Replace only `AreaChart` and `BarChart`.

- [ ] **Step 1: Rewrite `src/components/ui/Charts.tsx`**

Replace the file content with:

```tsx
"use client";

import {
  AreaChart as RechartsArea,
  Area,
  BarChart as RechartsBar,
  Bar,
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

export function AreaChart({ data, height = 140 }: {
  data: { month: string; rate: number }[];
  height?: number;
}) {
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
          <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--neutral-500)" }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--neutral-500)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          contentStyle={{ border: "1px solid var(--neutral-200)", borderRadius: 8, fontSize: 13, boxShadow: "var(--shadow-xs)" }}
          formatter={(value: number) => [`${value}%`, "Retention"]}
        />
        <Area type="monotone" dataKey="rate" stroke="var(--primary-500)" strokeWidth={2.5} fill="url(#retentionGradient)" dot={{ r: 3, fill: "var(--primary-500)", strokeWidth: 0 }} activeDot={{ r: 5 }} />
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
          formatter={(value: number) => [value, "Students"]}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}
          fill="var(--primary-200)"
          label={false}
        >
          {data.map((entry, index) => (
            <rect key={index} fill={entry.value === max ? "var(--primary-500)" : "var(--primary-200)"} />
          ))}
        </Bar>
      </RechartsBar>
    </ResponsiveContainer>
  );
}
```

> Note: The `<rect>` children on `<Bar>` won't work — Recharts uses a `Cell` component for per-bar colors. Step 2 fixes this.

- [ ] **Step 2: Fix per-bar color using Cell**

The Bar coloring needs `Cell` from recharts. Update the `BarChart` function body (the Bar and its children):

```tsx
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
```

And replace the `<Bar>` block inside `BarChart`:

```tsx
<Bar dataKey="value" radius={[4, 4, 0, 0]}>
  {data.map((entry, index) => (
    <Cell key={index} fill={entry.value === max ? "var(--primary-500)" : "var(--primary-200)"} />
  ))}
</Bar>
```

The full final `src/components/ui/Charts.tsx`:

```tsx
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

export function AreaChart({ data, height = 140 }: {
  data: { month: string; rate: number }[];
  height?: number;
}) {
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
          <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-100)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--neutral-500)" }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--neutral-500)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip
          contentStyle={{ border: "1px solid var(--neutral-200)", borderRadius: 8, fontSize: 13, boxShadow: "var(--shadow-xs)" }}
          formatter={(value: number) => [`${value}%`, "Retention"]}
        />
        <Area type="monotone" dataKey="rate" stroke="var(--primary-500)" strokeWidth={2.5} fill="url(#retentionGradient)" dot={{ r: 3, fill: "var(--primary-500)", strokeWidth: 0 }} activeDot={{ r: 5 }} />
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
          formatter={(value: number) => [value, "Students"]}
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
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors in `Charts.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Charts.tsx
git commit -m "feat: replace SVG charts with Recharts (AreaChart, BarChart)"
```

---

### Task 3: Add retention trend builder to charts-core.ts

**Files:**
- Modify: `src/lib/dashboard/charts-core.ts`

- [ ] **Step 1: Add `buildRetentionTrend` to `src/lib/dashboard/charts-core.ts`**

Append this function to the end of the file:

```typescript
export type RetentionAssessmentRow = {
  riskBand: string | null;
  computedAt: string | null;
};

export function buildRetentionTrend(assessments: RetentionAssessmentRow[]): { month: string; rate: number }[] {
  const now = new Date();
  const result: { month: string; rate: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleString("en", { month: "short" });
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const prefix = `${year}-${month}`;

    const inMonth = assessments.filter(
      (a) => a.computedAt != null && a.computedAt.startsWith(prefix)
    );

    if (inMonth.length === 0) {
      result.push({ month: monthLabel, rate: 0 });
      continue;
    }

    const retained = inMonth.filter(
      (a) => a.riskBand === "LOW" || a.riskBand === null
    ).length;

    result.push({
      month: monthLabel,
      rate: Math.round((retained / inMonth.length) * 100),
    });
  }

  return result;
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/dashboard/charts-core.ts
git commit -m "feat: add buildRetentionTrend to charts-core"
```

---

### Task 4: Query retention trend data in charts.ts

**Files:**
- Modify: `src/lib/dashboard/charts.ts`

- [ ] **Step 1: Update `src/lib/dashboard/charts.ts`** to fetch all RiskAssessment rows for retention trend and return trend data:

```typescript
import { getStudentRiskList } from "@/lib/students/risk";
import { db } from "@/lib/db/client";
import {
  buildAttendanceDistribution,
  buildRiskBreakdown,
  buildTopRecommendations,
  buildRetentionTrend,
  type RetentionAssessmentRow,
} from "./charts-core";

async function getRetentionAssessments(academyId: string): Promise<RetentionAssessmentRow[]> {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  const { data, error } = await db
    .from("Student")
    .select("riskAssessments:RiskAssessment(riskBand, computedAt)")
    .eq("academyId", academyId);

  if (error) throw new Error(`Failed to fetch retention data: ${error.message}`);

  return (data ?? []).flatMap(
    (s: { riskAssessments?: RetentionAssessmentRow[] | null }) =>
      s.riskAssessments ?? []
  );
}

export async function getDashboardCharts(academyId: string) {
  const [students, assessments] = await Promise.all([
    getStudentRiskList(academyId, { sort: "riskScore", direction: "desc" }),
    getRetentionAssessments(academyId),
  ]);

  const rows = students.map((student) => ({
    riskBand: student.riskBand as "HIGH" | "MEDIUM" | "LOW" | null,
    riskScore: student.riskScore,
    attendanceRate: student.attendanceRate,
    recommendedAction: student.recommendedAction,
    studentName: student.name,
  }));

  return {
    riskBreakdown: buildRiskBreakdown(rows),
    attendance: buildAttendanceDistribution(rows),
    recommendations: buildTopRecommendations(rows),
    retentionTrend: buildRetentionTrend(assessments),
  };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/dashboard/charts.ts
git commit -m "feat: add retention trend query to getDashboardCharts"
```

---

### Task 5: Update dashboard/page.tsx — wire data, fix statics

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

Three fixes:
1. `RETENTION_TREND` import + `AreaChart` props → `charts.retentionTrend`
2. `BarChart` props — old API was `values` + `labels`, new is `data: {label, value}[]`
3. Greeting "Good morning, Ayesha" → dynamic time-of-day greeting + academy name
4. `"3 pending"` → `{charts.recommendations.length} pending`

- [ ] **Step 1: Remove `RETENTION_TREND` import**

In `src/app/(dashboard)/dashboard/page.tsx`, remove line:
```typescript
import { RETENTION_TREND } from "@/lib/data";
```

- [ ] **Step 2: Add greeting helper and fix header**

Replace lines 35–45 (page header block) with:

```tsx
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="page-fade">
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>{greeting}, {dbUser.academy.name}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>
            Let&apos;s see who needs you today
          </h1>
        </div>
        <Link href="/uploads/new" style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "none", background: "var(--primary-500)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          Upload data
        </Link>
      </div>
```

Note: move the `const hour` / `const greeting` lines to just before the `return (` statement (after the `atRisk` await call).

- [ ] **Step 3: Fix AreaChart call**

Replace:
```tsx
<AreaChart values={RETENTION_TREND} />
```

With:
```tsx
<AreaChart data={charts.retentionTrend} />
```

- [ ] **Step 4: Fix BarChart call**

Replace:
```tsx
<BarChart values={charts.attendance.values} labels={charts.attendance.labels} />
```

With:
```tsx
<BarChart data={charts.attendance.labels.map((label, i) => ({ label, value: charts.attendance.values[i] }))} />
```

- [ ] **Step 5: Fix "3 pending" hardcode**

Replace:
```tsx
<div style={{ fontSize: 12, color: "var(--neutral-500)" }}>3 pending</div>
```

With:
```tsx
<div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{charts.recommendations.length} pending</div>
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

- [ ] **Step 7: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds, no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat: wire dynamic charts and fix static values in dashboard"
```

---

### Task 6: Remove unused static data from data.ts

**Files:**
- Modify: `src/lib/data.ts`

`RETENTION_TREND` is now unused. `STUDENTS` and `INTERVENTIONS` may still be used elsewhere — check first.

- [ ] **Step 1: Check usages**

```bash
grep -r "RETENTION_TREND\|STUDENTS\|INTERVENTIONS" src/ --include="*.ts" --include="*.tsx" -l
```

Expected: lists files still importing these. If `RETENTION_TREND` appears nowhere, remove it.

- [ ] **Step 2: Remove `RETENTION_TREND` export from `src/lib/data.ts`**

Delete the line:
```typescript
export const RETENTION_TREND = [89, 87, 90, 91, 88, 92, 93, 90, 94, 92, 93, 94];
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data.ts
git commit -m "chore: remove unused RETENTION_TREND static data"
```
