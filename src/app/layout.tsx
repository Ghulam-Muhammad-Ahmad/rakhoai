import type { Metadata } from "next";
import "./globals.css";
import "react-loading-skeleton/dist/skeleton.css";
import { ClarityInit } from "@/components/Clarity";

export const metadata: Metadata = {
  title: "Rakho AI — Student Retention Analytics",
  description: "AI-powered student retention analytics for tutoring businesses.",
  icons: {
    icon: "/assets/favicon.ico",
    shortcut: "/assets/favicon.ico",
    apple: "/assets/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClarityInit />
        {children}
      </body>
    </html>
  );
}
