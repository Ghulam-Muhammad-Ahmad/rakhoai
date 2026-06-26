"use client";

import { useFormStatus } from "react-dom";

/** Submit button that stays disabled + shows a pending label for the whole
 *  form action, including the redirect navigation to the next screen.
 *  `useFormStatus` clears itself if the action redirects back to the same route
 *  (e.g. validation error), so no manual reset is needed. */
export function SubmitButton({ idle, pending: pendingLabel }: { idle: string; pending: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-2 w-full py-3.5 rounded-sm text-white text-[15px] font-semibold border-0 cursor-pointer transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: pending ? "#94A3B8" : "#0F766E" }}
    >
      {pending ? pendingLabel : idle}
    </button>
  );
}
