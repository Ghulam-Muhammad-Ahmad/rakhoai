import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/signup`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.8 },
  ];
}
