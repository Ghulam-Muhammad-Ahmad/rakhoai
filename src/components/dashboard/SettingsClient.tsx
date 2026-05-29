"use client";

import type { ElementType, FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  Globe2,
  Loader2,
  LockKeyhole,
  Mail,
  Save,
} from "lucide-react";
import countries from "world-countries";
import { createClient } from "@/lib/supabase/client";

type SettingsClientProps = {
  academy: {
    name: string;
    country: string;
    currency: string;
  };
  ownerEmail: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

const countryOptions = countries
  .map((item) => ({
    name: item.name.common,
    currency: Object.keys(item.currencies ?? {})[0] ?? "USD",
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

function getApiErrorMessage(value: unknown) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "Something went wrong. Please try again.";

  const error = (value as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const fieldErrors = (error as { fieldErrors?: Record<string, string[]> }).fieldErrors;
    if (fieldErrors) {
      const first = Object.values(fieldErrors).flat()[0];
      if (first) return first;
    }
  }

  return "Something went wrong. Please try again.";
}

function NoticeMessage({ notice }: { notice: Notice }) {
  const isSuccess = notice.type === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={`flex items-start gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
      role={isSuccess ? "status" : "alert"}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{notice.message}</span>
    </div>
  );
}

function FieldShell({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-[var(--neutral-700)]">{label}</span>
      <span className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3.5 py-2.5 transition-colors focus-within:border-[var(--primary-400)] focus-within:ring-2 focus-within:ring-[var(--primary-400)]/20">
        <Icon size={16} className="shrink-0 text-[var(--neutral-400)]" />
        {children}
      </span>
    </label>
  );
}

export function SettingsClient({ academy, ownerEmail }: SettingsClientProps) {
  const router = useRouter();
  const initialProfile = useMemo(
    () => ({
      name: academy.name,
      country: academy.country,
      currency: academy.currency,
    }),
    [academy.country, academy.currency, academy.name]
  );

  const [name, setName] = useState(initialProfile.name);
  const [country, setCountry] = useState(initialProfile.country);
  const [currency, setCurrency] = useState(initialProfile.currency);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileNotice, setProfileNotice] = useState<Notice | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<Notice | null>(null);

  function handleCountryChange(value: string) {
    const selected = countryOptions.find((item) => item.name === value);
    setCountry(value);
    setCurrency(selected?.currency ?? "USD");
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileNotice(null);

    const trimmedName = name.trim();
    const trimmedCountry = country.trim();
    const trimmedCurrency = currency.trim().toUpperCase();

    if (!trimmedName || !trimmedCountry || !trimmedCurrency) {
      setProfileNotice({ type: "error", message: "Academy name, country, and currency are required." });
      return;
    }

    setProfileLoading(true);
    try {
      const response = await fetch("/api/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          country: trimmedCountry,
          currency: trimmedCurrency,
        }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        setProfileNotice({ type: "error", message: getApiErrorMessage(data) });
        return;
      }

      setName(trimmedName);
      setCountry(trimmedCountry);
      setCurrency(trimmedCurrency);
      setProfileNotice({ type: "success", message: "Workspace profile updated." });
      router.refresh();
    } catch {
      setProfileNotice({ type: "error", message: "Network error. Please try again." });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordNotice(null);

    if (password.length < 6) {
      setPasswordNotice({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }

    if (password !== confirmPassword) {
      setPasswordNotice({ type: "error", message: "Passwords do not match." });
      return;
    }

    setPasswordLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setPasswordNotice({ type: "error", message: error.message });
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setPasswordNotice({ type: "success", message: "Password updated." });
    } catch {
      setPasswordNotice({ type: "error", message: "Unable to update password. Please try again." });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="page-fade max-w-[920px]">
      <div className="mb-7">
        <div className="text-sm text-[var(--neutral-500)]">Workspace preferences</div>
        <h1 className="mt-1 text-[32px] font-medium leading-tight text-[var(--neutral-900)]" style={{ fontFamily: "var(--font-display)" }}>
          Settings
        </h1>
      </div>

      <div className="grid gap-5">
        <section className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-xs)]">
          <div className="border-b border-[var(--neutral-100)] px-5 py-4">
            <div className="text-base font-bold text-[var(--neutral-900)]">Profile</div>
            <div className="mt-1 text-sm text-[var(--neutral-500)]">Academy and currency settings used across the dashboard.</div>
          </div>

          <form onSubmit={handleProfileSubmit} className="grid gap-6 px-5 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldShell label="Academy name" icon={Building2}>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      className="min-w-0 flex-1 border-none bg-transparent text-sm text-[var(--neutral-800)] outline-none placeholder:text-[var(--neutral-400)]"
                      placeholder="e.g. Bright Future Academy"
                    />
                  </FieldShell>

                  <FieldShell label="Country" icon={Globe2}>
                    <select
                      value={country}
                      onChange={(event) => handleCountryChange(event.target.value)}
                      required
                      className="min-w-0 flex-1 border-none bg-transparent text-sm text-[var(--neutral-800)] outline-none"
                    >
                      <option value="" disabled>
                        Select your country
                      </option>
                      {countryOptions.map((item) => (
                        <option key={item.name} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </FieldShell>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
                  <FieldShell label="Currency code" icon={CreditCard}>
                    <input
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                      required
                      maxLength={6}
                      className="min-w-0 flex-1 border-none bg-transparent text-sm uppercase text-[var(--neutral-800)] outline-none placeholder:text-[var(--neutral-400)]"
                      placeholder="USD"
                    />
                  </FieldShell>

                  <div className="flex items-end">
                    <div className="w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3.5 py-2.5 text-sm text-[var(--neutral-600)]">
                      Auto-filled from country, editable before saving.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--neutral-100)] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-[var(--neutral-500)]">
                <Mail size={16} className="shrink-0 text-[var(--neutral-400)]" />
                <span className="min-w-0 truncate">{ownerEmail}</span>
              </div>
              <button
                type="submit"
                disabled={profileLoading}
                className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary-500)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-600)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save profile
              </button>
            </div>

            {profileNotice && <NoticeMessage notice={profileNotice} />}
          </form>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-xs)]">
          <div className="border-b border-[var(--neutral-100)] px-5 py-4">
            <div className="text-base font-bold text-[var(--neutral-900)]">Change password</div>
            <div className="mt-1 text-sm text-[var(--neutral-500)]">Update the password for the signed-in owner account.</div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="grid gap-4 px-5 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldShell label="New password" icon={LockKeyhole}>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  className="min-w-0 flex-1 border-none bg-transparent text-sm text-[var(--neutral-800)] outline-none placeholder:text-[var(--neutral-400)]"
                  placeholder="At least 6 characters"
                />
              </FieldShell>

              <FieldShell label="Confirm password" icon={LockKeyhole}>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  className="min-w-0 flex-1 border-none bg-transparent text-sm text-[var(--neutral-800)] outline-none placeholder:text-[var(--neutral-400)]"
                  placeholder="Repeat new password"
                />
              </FieldShell>
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--neutral-100)] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--neutral-500)]">You may need to use the new password the next time you sign in.</p>
              <button
                type="submit"
                disabled={passwordLoading}
                className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--neutral-800)] transition-colors hover:bg-[var(--neutral-50)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {passwordLoading ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
                Update password
              </button>
            </div>

            {passwordNotice && <NoticeMessage notice={passwordNotice} />}
          </form>
        </section>
      </div>
    </div>
  );
}
