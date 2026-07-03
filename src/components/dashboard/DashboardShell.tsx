"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, MessageCircleHeart,
  Settings, Search, LogOut, Upload, GraduationCap,
  CalendarCheck, CreditCard, History,
  Menu, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard",     icon: LayoutDashboard,    label: "Risk overview" },
  { href: "/students",      icon: Users,              label: "Students" },
  { href: "/tutors",        icon: GraduationCap,      label: "Tutors" },
  { href: "/sessions",      icon: CalendarCheck,      label: "Sessions" },
  { href: "/payments",      icon: CreditCard,         label: "Payments" },
  { href: "/uploads/new",   icon: Upload,             label: "Upload data" },
  { href: "/uploads/history", icon: History,           label: "Import history" },
  { href: "/interventions", icon: MessageCircleHeart, label: "Interventions" },
];

const manageItems = [
  { href: "/settings", icon: Settings,  label: "Settings" },
];


function NavLink({ href, icon: Icon, label, exact = false, onNavigate }: { href: string; icon: React.ElementType; label: string; exact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-[9px] text-sm font-medium no-underline transition-all duration-[150ms] ${
        active
          ? "bg-[var(--primary-500)] text-white"
          : "text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]"
      }`}
    >
      <Icon size={18} className={active ? "text-white" : "text-[var(--neutral-400)]"} />
      <span className={`${
        active
          ? "text-white"
          : "text-[var(--neutral-600)]"
      }`}>{label}</span>
    </Link>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* backdrop, mobile only */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/40 lg:hidden ${open ? "block" : "hidden"}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-[var(--neutral-200)] bg-white px-3.5 py-5 transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-1.5 py-1">
          <Image src="/assets/logo.png" alt="Rakho AI" width={126} height={34} priority />
          <button
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--neutral-500)] hover:bg-[var(--neutral-100)] lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--neutral-400)]">
            Workspace
          </div>
          {navItems.map(({ href, icon, label }) => (
            <NavLink key={href} href={href} icon={icon} label={label} onNavigate={onClose} />
          ))}
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--neutral-400)]">
            Manage
          </div>
          {manageItems.map(({ href, icon, label }) => (
            <NavLink key={href} href={href} icon={icon} label={label} exact onNavigate={onClose} />
          ))}
        </div>
      </aside>
    </>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [initials, setInitials] = useState("");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      const fullName: string =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User";
      const userEmail = user.email ?? "";
      const parts = fullName.trim().split(" ");
      const abbr = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : fullName.slice(0, 2).toUpperCase();
      setName(fullName);
      setEmail(userEmail);
      setInitials(abbr);
    });
  }, []);

  return (
    <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-[var(--neutral-100)] bg-white/85 px-4 py-3.5 backdrop-blur-[10px] sm:px-6 lg:px-8">
      <button
        onClick={onMenu}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white text-[var(--neutral-600)] lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>
      <div className="flex flex-1 max-w-[480px] items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3.5 py-[9px] text-sm text-[var(--neutral-500)]">
        <Search size={16} />
        <input
          placeholder="Search students, centers, reports…"
          className="flex-1 border-none bg-transparent text-sm text-[var(--neutral-800)] outline-none placeholder:text-[var(--neutral-400)]"
          style={{ fontFamily: "inherit" }}
        />
        <span className="hidden font-mono text-[11px] text-[var(--neutral-400)] sm:inline">⌘ K</span>
      </div>

      <div className="flex-1" />

      <button
        onClick={async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          router.push("/login");
        }}
        title="Sign out"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white text-[var(--neutral-500)] hover:bg-red-50 hover:text-red-500 hover:border-red-200"
      >
        <LogOut size={16} />
      </button>

      <div className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-full pr-3 pl-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-100)] text-[12px] font-semibold text-[var(--accent-700)]">
          {initials || "…"}
        </div>
        <div className="hidden sm:block">
          <div className="text-[13px] font-semibold leading-tight text-[var(--neutral-800)]">
            {name || "Loading…"}
          </div>
          <div className="text-[11px] leading-tight text-[var(--neutral-500)]">
            {email}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setNavOpen(true)} />
        <main className="flex-1 overflow-x-hidden px-4 py-6 pb-12 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
