import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Vercel/Cloudflare set these in production
  const headerCountry =
    req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry");

  if (headerCountry && /^[A-Z]{2}$/.test(headerCountry)) {
    return NextResponse.json({ country: headerCountry });
  }

  // Dev fallback: server-side IP lookup (not subject to browser CSP)
  try {
    const res = await fetch("http://ip-api.com/json/?fields=status,countryCode", {
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && typeof data.countryCode === "string" && /^[A-Z]{2}$/.test(data.countryCode)) {
        return NextResponse.json({ country: data.countryCode });
      }
    }
  } catch {
    // fall through
  }

  return NextResponse.json({ country: null });
}
