"use client";
import { useState } from "react";
import { MessageCircleHeart, Lightbulb, Bug } from "lucide-react";

const TYPES = [
  { value: "feedback", label: "Feedback", icon: MessageCircleHeart },
  { value: "feature",  label: "Feature request", icon: Lightbulb },
  { value: "bug",      label: "Bug report", icon: Bug },
] as const;

export default function FeedbackPage() {
  const [type, setType] = useState<string>("feedback");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title, body }),
    });
    if (res.ok) {
      setStatus("done");
      setTitle("");
      setBody("");
      setType("feedback");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-[var(--neutral-800)]">Feedback &amp; requests</h1>
      <p className="mt-1 text-sm text-[var(--neutral-500)]">
        Tell us what&apos;s working, what you&apos;d like next, or report a bug. We read every one.
      </p>

      {status === "done" && (
        <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--success-200,#a7f3d0)] bg-[var(--success-50,#ecfdf5)] px-4 py-3 text-sm text-[var(--success-700,#047857)]">
          Thanks — submitted. Want to add another?
        </div>
      )}

      <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          {TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium transition-all ${
                type === value
                  ? "border-[var(--primary-500)] bg-[var(--primary-500)] text-white"
                  : "border-[var(--neutral-200)] bg-white text-[var(--neutral-600)] hover:bg-[var(--neutral-50)]"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <input
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary"
          className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3.5 py-2.5 text-sm text-[var(--neutral-800)] outline-none focus:border-[var(--primary-500)]"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Details (optional) — steps to reproduce, what you expected, etc."
          rows={6}
          className="resize-y rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3.5 py-2.5 text-sm text-[var(--neutral-800)] outline-none focus:border-[var(--primary-500)]"
        />

        {status === "error" && <p className="text-sm text-[var(--high-risk,#dc2626)]">{error}</p>}

        <button
          type="submit"
          disabled={status === "sending" || !title.trim()}
          className="self-start rounded-[var(--radius-md)] bg-[var(--primary-500)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
