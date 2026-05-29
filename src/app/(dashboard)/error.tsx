"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h2 className="text-xl font-semibold text-[#1F2937]">Something went wrong</h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        We couldn&apos;t load this view. This is usually temporary — please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-[#0F766E] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0c5d57]"
      >
        Try again
      </button>
    </div>
  );
}
