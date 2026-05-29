import Image from "next/image";
import Link from "next/link";
import { Activity, MessageCircleHeart, Layers, Check } from "lucide-react";

function Header() {
  return (
    <header className="sticky top-0 z-10 bg-white/85 backdrop-blur-[10px] border-b border-[var(--neutral-100)]">
      <div className="max-w-[1200px] mx-auto px-8 flex items-center justify-between py-4">
        <Link href="/" className="flex">
          <Image src="/assets/logo.png" alt="Rakho AI" width={126} height={34} priority />
        </Link>
        <nav className="flex gap-7">
          {["Features", "How it works", "Pricing", "Stories"].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(" ", "")}`} className="text-sm font-medium text-[var(--neutral-700)] no-underline">{l}</a>
          ))}
        </nav>
        <div className="flex gap-2.5 items-center">
          <Link href="/login" className="text-sm font-medium px-4 py-2.5 rounded-[var(--radius-md)] text-[var(--neutral-700)] no-underline">Sign in</Link>
          <Link href="/signup" className="text-sm font-medium px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--primary-500)] text-white no-underline">Book a walkthrough</Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative bg-[var(--primary-50)] overflow-hidden" style={{ padding: "100px 0 80px" }}>
      <svg className="absolute right-[-80px] top-10 w-[520px] opacity-[0.16] text-[var(--primary-500)] pointer-events-none" viewBox="0 0 240 200" fill="none">
        <g stroke="currentColor" strokeWidth="1.4" fill="none">
          <path d="M120 30 C 70 50 50 100 70 150 C 90 185 150 180 170 145 C 190 110 180 60 130 32"/>
          <path d="M120 55 C 90 70 80 105 95 135 C 110 160 145 158 158 132 C 170 105 160 70 128 56"/>
          <path d="M120 80 C 105 90 100 110 110 130 C 122 148 140 142 145 122 C 150 100 138 82 122 80"/>
        </g>
      </svg>

      <div className="max-w-[1200px] mx-auto px-8 grid gap-12 items-center relative" style={{ gridTemplateColumns: "1.1fr 1fr" }}>
        <div>
          <span className="font-[var(--font-body)] text-[13px] font-semibold tracking-[0.06em] uppercase text-[var(--primary-600)] mb-[18px] inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--primary-100)] rounded-[var(--radius-full)]">
            <span className="w-1.5 h-1.5 rounded-[var(--radius-full)] bg-[var(--primary-500)]" />
            For tutoring centers
          </span>
          <h1 className="font-[var(--font-display)] font-medium text-[60px] leading-[1.05] tracking-[-0.025em] text-[var(--neutral-900)] mt-0 mb-[22px]">
            Stop losing{" "}
            <span className="relative whitespace-nowrap">
              students
              <svg className="absolute bottom-[-16px] w-[calc(100%+8px)]" style={{ left: -4, right: -4 }} viewBox="0 0 320 60" preserveAspectRatio="none">
                <path d="M8 38 C 60 24, 130 22, 200 32 S 300 44, 312 28" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" fill="none"/>
              </svg>
            </span>
            <br />you&apos;ve already won.
          </h1>
          <p className="text-[19px] leading-[1.55] text-[var(--neutral-600)] max-w-[560px] mt-0 mb-8">
            Rakho AI watches your roster the way a senior ops lead would — quietly, every day — and tells you which students need a call this week. Built for tutoring businesses across South Asia, the Gulf, and beyond.
          </p>
          <div className="flex gap-3 items-center">
            <Link href="/signup" className="text-[15px] font-medium px-[22px] py-3.5 rounded-xl bg-[var(--primary-500)] text-white no-underline">Book a walkthrough</Link>
            <Link href="#features" className="text-[15px] font-medium px-[22px] py-3.5 rounded-xl bg-white text-[var(--neutral-800)] border border-[var(--neutral-200)] no-underline">See a sample report</Link>
          </div>
          <div className="mt-6 text-[13px] text-[var(--neutral-500)] flex items-center gap-4">
            <span>Built for tutoring businesses</span>
            <span>·</span>
            <span>Pakistan · India · UAE · Nigeria · Philippines</span>
          </div>
        </div>

        {/* Dashboard preview card */}
        <div className="bg-white border border-[var(--neutral-200)] rounded-[22px] p-[22px] shadow-[0_24px_60px_rgba(15,23,42,0.08),0_4px_12px_rgba(15,23,42,0.04)]">
          <div className="flex justify-between items-center mb-4">
            <div className="font-[var(--font-display)] text-[18px] font-medium text-[var(--neutral-900)]">Watching the door</div>
            <div className="text-xs text-[var(--neutral-500)]">This week</div>
          </div>
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {[
              { lbl: "Total",     v: "1,248", d: "+4.2%", warn: false },
              { lbl: "At risk",   v: "24",    d: "+3",    warn: true  },
              { lbl: "Retention", v: "93%",   d: "+2.0%", warn: false },
            ].map(t => (
              <div key={t.lbl} className={`${t.warn ? "bg-red-50" : "bg-[var(--neutral-50)]"} rounded-xl p-3`}>
                <div className="text-[11px] text-[var(--neutral-500)] mb-1">{t.lbl}</div>
                <div className="font-[var(--font-display)] text-2xl font-medium text-[var(--neutral-900)] tracking-[-0.01em]">{t.v}</div>
                <div className={`text-[11px] font-semibold mt-0.5 ${t.warn ? "text-[var(--error)]" : "text-[var(--success)]"}`}>{t.d}</div>
              </div>
            ))}
          </div>
          {[
            { i: "SS", bg: "var(--primary-100)", fg: "var(--primary-700)", n: "Saanvi Sharma",  b: "62% attendance",    badgeBg: "#FEE2E2", badgeFg: "#B91C1C", l: "High"     },
            { i: "IP", bg: "#FFE4E6",             fg: "#9F1239",           n: "Ibrahim Patel",  b: "Fee overdue 14d",   badgeBg: "#FEE2E2", badgeFg: "#B91C1C", l: "Critical" },
            { i: "AK", bg: "var(--accent-100)",   fg: "var(--accent-700)", n: "Ayaan Khan",     b: "Late 22 min · Sun", badgeBg: "#FEF3C7", badgeFg: "#B45309", l: "Medium"   },
          ].map((r, i) => (
            <div key={i} className={`flex items-center gap-3 py-2.5 ${i < 2 ? "border-b border-[var(--neutral-100)]" : ""}`}>
              <div
                className="w-8 h-8 rounded-[var(--radius-full)] flex items-center justify-center font-semibold text-xs flex-shrink-0"
                style={{ background: r.bg, color: r.fg }}
              >{r.i}</div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-[var(--neutral-900)]">{r.n}</div>
                <div className="text-xs text-[var(--neutral-500)]">{r.b}</div>
              </div>
              <span
                className="px-[9px] py-[3px] rounded-[var(--radius-full)] font-semibold text-[11px]"
                style={{ background: r.badgeBg, color: r.badgeFg }}
              >{r.l}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  const placeholders = ["Your Academy Name", "Your Academy Name", "Your Academy Name", "Your Academy Name"];
  return (
    <section className="py-12 border-t border-b border-[var(--neutral-100)] bg-white">
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="text-xs uppercase tracking-[0.08em] text-[var(--neutral-500)] font-semibold text-center mb-[22px]">Designed for tutoring centers across South Asia and beyond</div>
        <div className="flex justify-center items-center gap-14 flex-wrap">
          {placeholders.map((l, i) => (
            <div key={i} className="font-[var(--font-display)] font-medium text-xl text-[var(--neutral-300)] tracking-[-0.01em]">{l}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const feats = [
    { Icon: Activity,           title: "Risk overview",          body: "One screen for every center. See who’s safe, who’s slipping, who’s halfway out — sorted the way a good ops lead would sort it.", accent: false, rose: false },
    { Icon: MessageCircleHeart, title: "AI-drafted nudges",      body: "Polite WhatsApp drafts, in the right language, ready for a single click. You stay in control — Rakho never sends without you.", accent: true, rose: false },
    { Icon: Layers,             title: "Multi-center analytics", body: "Compare branches, batches, and tutors. Find the cohorts where students stay — and the ones where they don’t.", accent: false, rose: true },
  ];
  return (
    <section id="features" className="bg-white" style={{ padding: "88px 0" }}>
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="text-xs font-semibold tracking-[0.08em] uppercase text-[var(--primary-600)] mb-3.5">Features</div>
        <h2 className="font-[var(--font-display)] font-medium text-[44px] tracking-[-0.02em] leading-[1.1] text-[var(--neutral-900)] mt-0 mb-4 max-w-[720px]">A second pair of eyes on every student.</h2>
        <p className="text-[18px] leading-[1.6] text-[var(--neutral-600)] max-w-[640px] mt-0 mb-12">Rakho reads attendance, fees, and engagement signals across your branches and quietly flags who&apos;s drifting — before they’re gone.</p>
        <div className="grid grid-cols-3 gap-5">
          {feats.map(f => (
            <div key={f.title} className="bg-white border border-[var(--neutral-200)] rounded-[18px] p-7">
              <div className={`w-12 h-12 rounded-xl mb-[18px] flex items-center justify-center ${f.rose ? "bg-red-100 text-red-700" : f.accent ? "bg-[var(--accent-100)] text-[var(--accent-700)]" : "bg-[var(--primary-100)] text-[var(--primary-700)]"}`}>
                <f.Icon size={22} />
              </div>
              <h3 className="font-[var(--font-display)] font-medium text-[22px] tracking-[-0.01em] text-[var(--neutral-900)] mt-0 mb-2">{f.title}</h3>
              <p className="text-[15px] leading-[1.55] text-[var(--neutral-600)] m-0">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Import your roster",     body: "Drop in a CSV from your existing system, or connect WhatsApp Business and we’ll pull from there. Most centers do this once." },
    { n: "02", title: "We watch quietly",        body: "Attendance, fees, engagement signals — Rakho reads all of it daily and assigns each student a calm, explainable risk score." },
    { n: "03", title: "You act on what matters", body: "Each Monday, you get a short list — names, reasons, and a suggested next step for each. No dashboards to dig through." },
  ];
  return (
    <section id="howitworks" className="bg-[var(--neutral-50)]" style={{ padding: "88px 0" }}>
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="text-xs font-semibold tracking-[0.08em] uppercase text-[var(--primary-600)] mb-3.5">How it works</div>
        <h2 className="font-[var(--font-display)] font-medium text-[44px] tracking-[-0.02em] leading-[1.1] text-[var(--neutral-900)] mt-0 mb-12 max-w-[720px]">Set up in a morning. Quietly useful by afternoon.</h2>
        <div className="grid grid-cols-3 gap-6">
          {steps.map(s => (
            <div key={s.n} className="flex flex-col gap-3">
              <div className="font-[var(--font-display)] text-[38px] font-medium text-[var(--accent-500)] leading-none tracking-[-0.02em]">{s.n}</div>
              <h4 className="font-[var(--font-display)] text-[22px] font-medium tracking-[-0.01em] text-[var(--neutral-900)]">{s.title}</h4>
              <p className="text-[15px] leading-[1.6] text-[var(--neutral-600)] m-0">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section id="stories" className="bg-white" style={{ padding: "88px 0" }}>
      <div className="max-w-[1200px] mx-auto px-8">
        {/* TODO: replace with a real customer quote */}
        <div
          className="bg-[var(--primary-500)] text-white rounded-[24px] p-16 relative overflow-hidden items-center"
          style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 48 }}
        >
          <svg className="absolute left-[-60px] bottom-[-60px] w-[320px] opacity-[0.14] text-white pointer-events-none" viewBox="0 0 240 200" fill="none">
            <g stroke="currentColor" strokeWidth="1.4" fill="none">
              <path d="M120 30 C 70 50 50 100 70 150 C 90 185 150 180 170 145 C 190 110 180 60 130 32"/>
              <path d="M120 55 C 90 70 80 105 95 135 C 110 160 145 158 158 132 C 170 105 160 70 128 56"/>
            </g>
          </svg>
          <div className="relative">
            <blockquote className="font-[var(--font-display)] font-normal text-[30px] leading-[1.35] tracking-[-0.01em] m-0">
              &ldquo;We used to lose six students a month and only notice at fee time. Now we know on Monday, and most of them stay.&rdquo;
            </blockquote>
            <div className="mt-7">
              <strong className="block font-semibold text-[15px]">Your Name Here</strong>
              <span className="text-white/75 text-[14px]">Academy &middot; City</span>
            </div>
          </div>
          <div className="w-[220px] h-[280px] rounded-[18px] bg-[var(--accent-500)] flex items-center justify-center font-[var(--font-display)] text-[88px] text-white font-medium flex-shrink-0">A</div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const features = [
    "Unlimited students & tutors",
    "AI-drafted WhatsApp nudges",
    "Up to 6 branches",
    "Monthly retention PDF for owners",
    "WhatsApp + email support in 4 languages",
  ];
  return (
    <section id="pricing" className="bg-[var(--neutral-50)]" style={{ padding: "88px 0" }}>
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="text-center mb-12">
          <div className="text-xs font-semibold tracking-[0.08em] uppercase text-[var(--primary-600)] mb-3.5">Pricing</div>
          <h2 className="font-[var(--font-display)] font-medium text-[44px] tracking-[-0.02em] leading-[1.1] text-[var(--neutral-900)] mt-0 mb-4 mx-auto">One price. Every branch. No per-student fees.</h2>
          <p className="text-[18px] leading-[1.6] text-[var(--neutral-600)] max-w-[640px] mx-auto m-0">We don&apos;t punish you for growing. Add as many students as you&apos;d like — your bill stays the same.</p>
        </div>
        <div className="max-w-[760px] mx-auto bg-white border border-[var(--neutral-200)] rounded-[22px] p-10 shadow-[var(--shadow-sm)] relative">
          <span className="absolute top-[-14px] right-8 bg-[var(--accent-500)] text-white px-3.5 py-[5px] rounded-[var(--radius-full)] text-xs font-semibold tracking-[0.04em]">Most centers</span>
          <div className="grid gap-8 items-center" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <h3 className="font-[var(--font-display)] text-[32px] font-medium tracking-[-0.02em] mt-0 mb-1.5 text-[var(--neutral-900)]">Rakho &middot; Pro</h3>
              <p className="text-[var(--neutral-500)] mt-1 mb-0 text-[15px]">For tutoring businesses with 50+ students.</p>
              <ul className="list-none p-0 mt-[18px] mb-6 flex flex-col gap-2.5">
                {features.map(f => (
                  <li key={f} className="flex gap-2.5 text-[15px] text-[var(--neutral-700)] items-center">
                    <Check size={18} color="var(--primary-500)" className="flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <div className="font-[var(--font-display)] text-[56px] font-medium tracking-[-0.03em] text-[var(--neutral-900)] flex items-baseline gap-1.5 justify-center">
                &#8377;14,999<small className="font-[var(--font-body)] text-[15px] font-medium text-[var(--neutral-500)]">/month</small>
              </div>
              <div className="text-[13px] text-[var(--neutral-500)] mt-1 mb-[22px]">or &#8360; 39,000 &middot; AED 590 &middot; &#8358; 99,000 &middot; &#8369; 9,800</div>
              <Link href="/signup" className="block text-center text-[15px] font-medium px-[22px] py-3.5 rounded-xl bg-[var(--primary-500)] text-white no-underline">Book a walkthrough</Link>
              <div className="text-xs text-[var(--neutral-500)] mt-3">30-day pilot. No card.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const sections = [
    { title: "Product",   links: ["Risk overview", "Interventions", "Reports", "Integrations"] },
    { title: "Company",   links: ["About", "Customers", "Careers", "Contact"] },
    { title: "Resources", links: ["Retention guide", "Help center", "WhatsApp templates", "Status"] },
  ];
  return (
    <footer className="bg-[var(--neutral-900)] text-[var(--neutral-300)]" style={{ padding: "56px 0 32px" }}>
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="grid gap-12 mb-10" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr" }}>
          <div>
            <Image src="/assets/logo.png" alt="Rakho AI" width={126} height={34} className="mb-4" />
            <p className="text-[14px] leading-[1.6] text-[var(--neutral-400)] max-w-[320px] m-0">Rakho AI helps tutoring businesses keep the students they&apos;ve already won. Built for South Asia, the Gulf, and beyond.</p>
          </div>
          {sections.map(s => (
            <div key={s.title}>
              <h5 className="font-[var(--font-body)] text-[13px] font-semibold text-white mt-0 mb-3.5 uppercase tracking-[0.06em]">{s.title}</h5>
              <ul className="list-none p-0 m-0 flex flex-col gap-2 text-[14px]">
                {s.links.map(l => (
                  <li key={l}>
                    <a href="#" aria-label={`${l} (coming soon)`} className="text-[var(--neutral-300)] no-underline">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-[var(--neutral-700)] flex justify-between items-center text-[13px] text-[var(--neutral-500)]">
          <span>&#169; 2026 Rakho AI &middot; Karachi &middot; Bengaluru &middot; Dubai</span>
          <div className="flex gap-3.5 font-[var(--font-mono)]">
            {["₹", "₨", "AED", "₦", "₱"].map(c => <span key={c}>{c}</span>)}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingPage() {
  return (
    <>
      <Header />
      <Hero />
      <Trust />
      <Features />
      <HowItWorks />
      <Testimonial />
      <Pricing />
      <Footer />
    </>
  );
}
