"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Building2, Globe, DollarSign, ArrowRight, Loader2 } from "lucide-react";
import countries from "world-countries";

const countryOptions = countries
  .map((item) => ({
    name: item.name.common,
    currency: Object.keys(item.currencies ?? {})[0] ?? "USD",
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleCountryChange(val: string) {
    const selected = countryOptions.find((item) => item.name === val);
    setCountry(val);
    setCurrency(selected?.currency ?? "USD");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/academy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, country, currency }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Image src="/assets/logo.svg" alt="Rakho AI" width={120} height={34} priority />
        <h1 className="text-2xl font-bold text-[var(--neutral-900)]" style={{ fontFamily: "var(--font-display)" }}>
          Set up your academy
        </h1>
        <p className="text-sm text-[var(--neutral-500)]">
          Tell us about your tutoring business to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white p-8 shadow-[var(--shadow-md)] flex flex-col gap-5">
        {/* Academy Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--neutral-700)]">
            Academy name
          </label>
          <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--neutral-200)] px-3.5 py-2.5 focus-within:border-[var(--primary-400)] focus-within:ring-2 focus-within:ring-[var(--primary-400)]/20">
            <Building2 size={16} className="shrink-0 text-[var(--neutral-400)]" />
            <input
              type="text"
              placeholder="e.g. Bright Future Academy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="flex-1 border-none bg-transparent text-sm text-[var(--neutral-800)] outline-none placeholder:text-[var(--neutral-400)]"
            />
          </div>
        </div>

        {/* Country */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--neutral-700)]">
            Country
          </label>
          <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--neutral-200)] px-3.5 py-2.5 focus-within:border-[var(--primary-400)] focus-within:ring-2 focus-within:ring-[var(--primary-400)]/20">
            <Globe size={16} className="shrink-0 text-[var(--neutral-400)]" />
            <select
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              required
              className="flex-1 border-none bg-transparent text-sm text-[var(--neutral-800)] outline-none"
            >
              <option value="" disabled>Select your country</option>
              {countryOptions.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Currency */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--neutral-700)]">
            Currency
          </label>
          <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3.5 py-2.5">
            <DollarSign size={16} className="shrink-0 text-[var(--neutral-400)]" />
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="Auto-filled from country"
              className="flex-1 border-none bg-transparent text-sm text-[var(--neutral-800)] outline-none placeholder:text-[var(--neutral-400)]"
            />
          </div>
          <p className="text-xs text-[var(--neutral-400)]">Auto-filled based on country. You can edit it.</p>
        </div>

        {error && (
          <p className="rounded-[var(--radius-md)] bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary-500)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-600)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              Continue to dashboard
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
