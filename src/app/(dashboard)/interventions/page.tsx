"use client";
import { useState } from "react";
import { Filter, Sparkles } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { INTERVENTIONS, type Intervention } from "@/lib/data";

const extra: Intervention[] = [
  { id: 4, student: "Maya Reyes",  initials: "MR", tone: "primary",
    text: "Maya hasn't completed homework in 3 sessions. Consider asking her tutor to review difficulty.",
    suggested: "Tutor review", when: "Suggested today" },
  { id: 5, student: "Ayaan Khan",  initials: "AK", tone: "accent",
    text: "Ayaan's attendance dipped slightly this week. A check-in question in the next class can usually catch it early.",
    suggested: "In-class check-in", when: "Suggested yesterday" },
];

const allPending = [...INTERVENTIONS, ...extra];

const sent = [
  { who: "Saanvi · parent", channel: "WhatsApp", body: "Assalam o alaikum, this is from Bright Future. Just a quick check on Saanvi…", time: "Today · 11:24 am", status: "Delivered · read" },
  { who: "Ibrahim · owner",  channel: "Call",     body: "Outbound call · 4 min 12 sec",                                                   time: "Yesterday · 6:30 pm", status: "Recovered · attended Mon class" },
];

export default function InterventionsPage() {
  const [tab, setTab] = useState<"pending" | "sent">("pending");

  return (
    <div className="page-fade">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--neutral-500)" }}>This week</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.02em", margin: "4px 0 0" }}>Interventions</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--neutral-200)", background: "#fff", color: "var(--neutral-800)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Filter size={14} /> Filter
          </button>
          <button style={{ fontSize: 14, fontWeight: 500, padding: "9px 14px", borderRadius: "var(--radius-md)", border: "none", background: "var(--primary-500)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={14} /> Draft new
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--neutral-200)", marginBottom: 18 }}>
        {[
          { key: "pending", label: "Pending · 5" },
          { key: "sent",    label: "Sent · 12"   },
          { key: "snoozed", label: "Snoozed · 2" },
          { key: "all",     label: "All"          },
        ].map(t => (
          <div
            key={t.key}
            onClick={() => t.key === "pending" || t.key === "sent" ? setTab(t.key as "pending" | "sent") : undefined}
            style={{
              padding: "10px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer",
              color: tab === t.key ? "var(--primary-600)" : "var(--neutral-500)",
              borderBottom: tab === t.key ? "2px solid var(--primary-500)" : "2px solid transparent",
            }}
          >{t.label}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Pending interventions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {allPending.map(iv => (
            <div key={iv.id} style={{ background: "var(--primary-50)", border: "1px solid var(--primary-100)", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", background: "var(--primary-500)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 13 }}>R</div>
              <div style={{ flex: 1, fontSize: 14, color: "var(--neutral-800)", lineHeight: 1.55 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar initials={iv.initials} tone={iv.tone} size="sm" />
                  <strong style={{ color: "var(--neutral-900)", fontWeight: 600 }}>{iv.student}</strong>
                  <span style={{ color: "var(--neutral-500)" }}>· {iv.suggested}</span>
                </div>
                <div style={{ marginTop: 8 }}>{iv.text}</div>
                <span style={{ display: "block", fontSize: 12, color: "var(--neutral-500)", marginTop: 6 }}>{iv.when}</span>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button style={{ fontSize: 13, fontWeight: 500, padding: "7px 11px", borderRadius: "var(--radius-md)", border: "none", background: "var(--primary-500)", color: "#fff", cursor: "pointer" }}>Approve</button>
                  <button style={{ fontSize: 13, fontWeight: 500, padding: "7px 11px", borderRadius: "var(--radius-md)", border: "none", background: "transparent", color: "var(--neutral-700)", cursor: "pointer" }}>Edit</button>
                  <button style={{ fontSize: 13, fontWeight: 500, padding: "7px 11px", borderRadius: "var(--radius-md)", border: "none", background: "transparent", color: "var(--neutral-700)", cursor: "pointer" }}>Snooze</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sent */}
        <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-xs)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--neutral-900)" }}>Sent recently</div>
            <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>12 this week</div>
          </div>
          {sent.map((s, i) => (
            <div key={i} style={{ padding: "14px 0", borderBottom: i < sent.length - 1 ? "1px solid var(--neutral-100)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 12, color: "var(--neutral-500)" }}>
                <span style={{ background: "var(--primary-50)", color: "var(--primary-700)", padding: "3px 9px", borderRadius: "var(--radius-full)", fontWeight: 600, fontSize: 11 }}>{s.channel}</span>
                <span>{s.who}</span>
                <span style={{ marginLeft: "auto" }}>{s.time}</span>
              </div>
              <div style={{ fontSize: 14, color: "var(--neutral-800)", lineHeight: 1.5 }}>{s.body}</div>
              <div style={{ fontSize: 12, color: "var(--success)", marginTop: 6, fontWeight: 500 }}>✓ {s.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
