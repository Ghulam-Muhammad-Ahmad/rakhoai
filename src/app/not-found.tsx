import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF7] px-6 text-center">
      <p className="text-5xl font-bold text-[#0F766E]">404</p>
      <h2 className="mt-4 text-xl font-semibold text-[#1F2937]">Page not found</h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg bg-[#0F766E] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0c5d57]"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
