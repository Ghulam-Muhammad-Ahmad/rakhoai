import Image from "next/image";
import Link from "next/link";
import { Activity, MessageCircleHeart, Layers, Check } from "lucide-react";

function Header() {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--neutral-100)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, paddingBottom: 16 }}>
        <Link href="/" style={{ display: "flex" }}>
          <Image src="/assets/logo.svg" alt="Rakho AI" width={120} height={34} priority />
        </Link>
        <nav style={{ display: "flex", gap: 28 }}>
          {["Features", "How it works", "Pricing", "Stories"].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(" ", "")}`} style={{ fontSize: 14, fontWeight: 500, color: "var(--neutral-700)", textDecoration: "none" }}>{l}</a>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/dashboard" style={{ fontSize: 14, fontWeight: 500, padding: "10px 16px", borderRadius: "var(--radius-md)", color: "var(--neutral-700)", textDecoration: "none" }}>Sign in</Link>
          <Link href="/dashboard" style={{ fontSize: 14, fontWeight: 500, padding: "10px 16px", borderRadius: "var(--radius-md)", background: "var(--primary-500)", color: "#fff", textDecoration: "none" }}>Book a walkthrough</Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section style={{ position: "relative", padding: "100px 0 80px", background: "var(--primary-50)", overflow: "hidden" }}>
      <svg style={{ position: "absolute", right: -80, top: 40, width: 520, opacity: 0.16, color: "var(--primary-500)", pointerEvents: "none" }} viewBox="0 0 240 200" fill="none">
        <g stroke="currentColor" strokeWidth="1.4" fill="none">
          <path d="M120 30 C 70 50 50 100 70 150 C 90 185 150 180 170 145 C 190 110 180 60 130 32"/>
          <path d="M120 55 C 90 70 80 105 95 135 C 110 160 145 158 158 132 C 170 105 160 70 128 56"/>
          <path d="M120 80 C 105 90 100 110 110 130 C 122 148 140 142 145 122 C 150 100 138 82 122 80"/>
        </g>
      </svg>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 48, alignItems: "center", position: "relative" }}>
        <div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--primary-600)", marginBottom: 18, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--primary-100)", borderRadius: "var(--radius-full)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "var(--radius-full)", background: "var(--primary-500)" }} />
            For tutoring centers
          </span>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 60, lineHeight: 1.05, letterSpacing: "-0.025em", color: "var(--neutral-900)", margin: "0 0 22px" }}>
            Stop losing{" "}
            <span style={{ position: "relative", whiteSpace: "nowrap" }}>
              students
              <svg style={{ position: "absolute", left: -4, right: -4, bottom: -16, width: "calc(100% + 8px)" }} viewBox="0 0 320 60" preserveAspectRatio="none">
                <path d="M8 38 C 60 24, 130 22, 200 32 S 300 44, 312 28" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" fill="none"/>
              </svg>
            </span>
            <br />you&apos;ve already won.
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.55, color: "var(--neutral-600)", maxWidth: 560, margin: "0 0 32px" }}>
            Rakho AI watches your roster the way a senior ops lead would — quietly, every day — and tells you which students need a call this week. Built for tutoring businesses across South Asia, the Gulf, and beyond.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/dashboard" style={{ fontSize: 15, fontWeight: 500, padding: "14px 22px", borderRadius: 12, background: "var(--primary-500)", color: "#fff", textDecoration: "none" }}>Book a walkthrough</Link>
            <Link href="/dashboard" style={{ fontSize: 15, fontWeight: 500, padding: "14px 22px", borderRadius: 12, background: "#fff", color: "var(--neutral-800)", border: "1px solid var(--neutral-200)", textDecoration: "none" }}>See a sample report</Link>
          </div>
          <div style={{ marginTop: 26, fontSize: 13, color: "var(--neutral-500)", display: "flex", alignItems: "center", gap: 16 }}>
            <span><strong style={{ color: "var(--neutral-800)" }}>1,200+</strong> tutoring centers</span>
            <span>·</span>
            <span>Pakistan · India · UAE · Nigeria · Philippines</span>
          </div>
        </div>

        {/* Dashboard preview card */}
        <div style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: 22, padding: 22, boxShadow: "0 24px 60px rgba(15,23,42,0.08), 0 4px 12px rgba(15,23,42,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--neutral-900)" }}>Watching the door</div>
            <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>This week</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { lbl: "Total", v: "1,248", d: "+4.2%", warn: false },
              { lbl: "At risk", v: "24",    d: "+3",    warn: true  },
              { lbl: "Retention", v: "93%",  d: "+2.0%", warn: false },
            ].map(t => (
              <div key={t.lbl} style={{ background: t.warn ? "#FEF2F2" : "var(--neutral-50)", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 11, color: "var(--neutral-500)", marginBottom: 4 }}>{t.lbl}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 500, color: "var(--neutral-900)", letterSpacing: "-0.01em" }}>{t.v}</div>
                <div style={{ fontSize: 11, color: t.warn ? "var(--error)" : "var(--success)", fontWeight: 600, marginTop: 2 }}>{t.d}</div>
              </div>
            ))}
          </div>
          {[
            { i: "SS", bg: "var(--primary-100)", fg: "var(--primary-700)", n: "Saanvi Sharma",  b: "62% attendance",  badgeBg: "#FEE2E2", badgeFg: "#B91C1C", l: "High"     },
            { i: "IP", bg: "#FFE4E6",             fg: "#9F1239",           n: "Ibrahim Patel",  b: "Fee overdue 14d", badgeBg: "#FEE2E2", badgeFg: "#B91C1C", l: "Critical" },
            { i: "AK", bg: "var(--accent-100)",   fg: "var(--accent-700)", n: "Ayaan Khan",     b: "Late 22 min · Sun", badgeBg: "#FEF3C7", badgeFg: "#B45309", l: "Medium" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? "1px solid var(--neutral-100)" : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", background: r.bg, color: r.fg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 12 }}>{r.i}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--neutral-900)" }}>{r.n}</div>
                <div style={{ fontSize: 12, color: "var(--neutral-500)" }}>{r.b}</div>
              </div>
              <span style={{ background: r.badgeBg, color: r.badgeFg, padding: "3px 9px", borderRadius: "var(--radius-full)", fontWeight: 600, fontSize: 11 }}>{r.l}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  const logos = ["Bright Future", "Pioneer Academy", "Vidya Bhavan", "Al-Falah Tutors", "Pinnacle Coaching", "Lyceum Hub"];
  return (
    <section style={{ padding: "48px 0", borderTop: "1px solid var(--neutral-100)", borderBottom: "1px solid var(--neutral-100)", background: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--neutral-500)", fontWeight: 600, textAlign: "center", marginBottom: 22 }}>Trusted by tutoring centers across five markets</div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 56, flexWrap: "wrap" }}>
          {logos.map(l => (
            <div key={l} style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 20, color: "var(--neutral-400)", letterSpacing: "-0.01em" }}>{l}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const feats = [
    { Icon: Activity,           title: "Risk overview",          body: "One screen for every center. See who's safe, who's slipping, who's halfway out — sorted the way a good ops lead would sort it.", accent: false, rose: false },
    { Icon: MessageCircleHeart, title: "AI-drafted nudges",      body: "Polite WhatsApp drafts, in the right language, ready for a single click. You stay in control — Rakho never sends without you.", accent: true, rose: false },
    { Icon: Layers,             title: "Multi-center analytics", body: "Compare branches, batches, and tutors. Find the cohorts where students stay — and the ones where they don't.", accent: false, rose: true },
  ];
  return (
    <section id="features" style={{ padding: "88px 0", background: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--primary-600)", marginBottom: 14 }}>Features</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 44, letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--neutral-900)", margin: "0 0 16px", maxWidth: 720 }}>A second pair of eyes on every student.</h2>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--neutral-600)", maxWidth: 640, margin: "0 0 48px" }}>Rakho reads attendance, fees, and engagement signals across your branches and quietly flags who's drifting — before they're gone.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {feats.map(f => (
            <div key={f.title} style={{ background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: 18, padding: 28 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, marginBottom: 18,
                background: f.rose ? "#FEE2E2" : f.accent ? "var(--accent-100)" : "var(--primary-100)",
                color: f.rose ? "#B91C1C" : f.accent ? "var(--accent-700)" : "var(--primary-700)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <f.Icon size={22} />
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 22, letterSpacing: "-0.01em", color: "var(--neutral-900)", margin: "0 0 8px" }}>{f.title}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--neutral-600)", margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Import your roster",     body: "Drop in a CSV from your existing system, or connect WhatsApp Business and we'll pull from there. Most centers do this once." },
    { n: "02", title: "We watch quietly",        body: "Attendance, fees, engagement signals — Rakho reads all of it daily and assigns each student a calm, explainable risk score." },
    { n: "03", title: "You act on what matters", body: "Each Monday, you get a short list — names, reasons, and a suggested next step for each. No dashboards to dig through." },
  ];
  return (
    <section id="howitworks" style={{ padding: "88px 0", background: "var(--neutral-50)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--primary-600)", marginBottom: 14 }}>How it works</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 44, letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--neutral-900)", margin: "0 0 48px", maxWidth: 720 }}>Set up in a morning. Quietly useful by afternoon.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {steps.map(s => (
            <div key={s.n} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 500, color: "var(--accent-500)", lineHeight: 1, letterSpacing: "-0.02em" }}>{s.n}</div>
              <h4 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--neutral-900)" }}>{s.title}</h4>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--neutral-600)", margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section id="stories" style={{ padding: "88px 0", background: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ background: "var(--primary-500)", color: "#fff", borderRadius: 24, padding: 64, display: "grid", gridTemplateColumns: "1fr 240px", gap: 48, position: "relative", overflow: "hidden", alignItems: "center" }}>
          <svg style={{ position: "absolute", left: -60, bottom: -60, width: 320, opacity: 0.14, color: "#fff", pointerEvents: "none" }} viewBox="0 0 240 200" fill="none">
            <g stroke="currentColor" strokeWidth="1.4" fill="none">
              <path d="M120 30 C 70 50 50 100 70 150 C 90 185 150 180 170 145 C 190 110 180 60 130 32"/>
              <path d="M120 55 C 90 70 80 105 95 135 C 110 160 145 158 158 132 C 170 105 160 70 128 56"/>
            </g>
          </svg>
          <div style={{ position: "relative" }}>
            <blockquote style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 30, lineHeight: 1.35, letterSpacing: "-0.01em", margin: 0 }}>
              &ldquo;We used to lose six students a month and only notice at fee time. Now we know on Monday, and most of them stay.&rdquo;
            </blockquote>
            <div style={{ marginTop: 28 }}>
              <strong style={{ display: "block", fontWeight: 600, fontSize: 15 }}>Ayesha Yousuf</strong>
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 14 }}>Owner · Bright Future Academy · Karachi (3 branches, 312 students)</span>
            </div>
          </div>
          <div style={{ width: 220, height: 280, borderRadius: 18, background: "var(--accent-500)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 88, color: "#fff", fontWeight: 500, flexShrink: 0 }}>A</div>
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
    <section id="pricing" style={{ padding: "88px 0", background: "var(--neutral-50)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--primary-600)", marginBottom: 14 }}>Pricing</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 44, letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--neutral-900)", margin: "0 auto 16px" }}>One price. Every branch. No per-student fees.</h2>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--neutral-600)", maxWidth: 640, margin: "0 auto" }}>We don&apos;t punish you for growing. Add as many students as you&apos;d like — your bill stays the same.</p>
        </div>
        <div style={{ maxWidth: 760, margin: "0 auto", background: "#fff", border: "1px solid var(--neutral-200)", borderRadius: 22, padding: 40, boxShadow: "var(--shadow-sm)", position: "relative" }}>
          <span style={{ position: "absolute", top: -14, right: 32, background: "var(--accent-500)", color: "#fff", padding: "5px 14px", borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em" }}>Most centers</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 6px", color: "var(--neutral-900)" }}>Rakho · Pro</h3>
              <p style={{ color: "var(--neutral-500)", margin: "4px 0 0", fontSize: 15 }}>For tutoring businesses with 50+ students.</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                {features.map(f => (
                  <li key={f} style={{ display: "flex", gap: 10, fontSize: 15, color: "var(--neutral-700)", alignItems: "center" }}>
                    <Check size={18} color="var(--primary-500)" style={{ flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 56, fontWeight: 500, letterSpacing: "-0.03em", color: "var(--neutral-900)", display: "flex", alignItems: "baseline", gap: 6, justifyContent: "center" }}>
                ₹14,999<small style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 500, color: "var(--neutral-500)" }}>/month</small>
              </div>
              <div style={{ fontSize: 13, color: "var(--neutral-500)", margin: "4px 0 22px" }}>or ₨ 39,000 · AED 590 · ₦ 99,000 · ₱ 9,800</div>
              <Link href="/dashboard" style={{ display: "block", textAlign: "center", fontSize: 15, fontWeight: 500, padding: "14px 22px", borderRadius: 12, background: "var(--primary-500)", color: "#fff", textDecoration: "none" }}>Book a walkthrough</Link>
              <div style={{ fontSize: 12, color: "var(--neutral-500)", marginTop: 12 }}>30-day pilot. No card.</div>
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
    <footer style={{ background: "var(--neutral-900)", color: "var(--neutral-300)", padding: "56px 0 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 48, marginBottom: 40 }}>
          <div>
            <Image src="/assets/logo-light.svg" alt="Rakho AI" width={120} height={34} style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--neutral-400)", maxWidth: 320, margin: 0 }}>Rakho AI helps tutoring businesses keep the students they&apos;ve already won. Built for South Asia, the Gulf, and beyond.</p>
          </div>
          {sections.map(s => (
            <div key={s.title}>
              <h5 style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "#fff", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.title}</h5>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
                {s.links.map(l => <li key={l}><a href="#" style={{ color: "var(--neutral-300)", textDecoration: "none" }}>{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ paddingTop: 24, borderTop: "1px solid var(--neutral-700)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--neutral-500)" }}>
          <span>© 2026 Rakho AI · Karachi · Bengaluru · Dubai</span>
          <div style={{ display: "flex", gap: 14, fontFamily: "var(--font-mono)" }}>
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
