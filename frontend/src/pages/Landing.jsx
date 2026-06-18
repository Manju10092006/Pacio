import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowUpRight, ArrowRight, ChevronRight, FileText, Users, Target, Building2,
  LineChart, Zap, ShieldCheck, Sparkles,
} from "lucide-react";
import { api } from "../lib/api";
import { RECRUITERS, logoUrl } from "../lib/logos";

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ */
/*  Twinkling starfield (cobalt stars over cream paper)                */
/* ------------------------------------------------------------------ */
function Starfield({ density = 70 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    for (let i = 0; i < density; i++) {
      const s = document.createElement("span");
      s.className = "star";
      const size = Math.random() < 0.15 ? 3 : Math.random() < 0.5 ? 2 : 1;
      s.style.width = `${size}px`;
      s.style.height = `${size}px`;
      s.style.left = `${Math.random() * 100}%`;
      s.style.top = `${Math.random() * 100}%`;
      s.style.opacity = 0;
      el.appendChild(s);
      gsap.to(s, {
        opacity: Math.random() * 0.85 + 0.15,
        duration: 1 + Math.random() * 1.4,
        delay: Math.random() * 1.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(s, {
        scale: 1 + Math.random() * 0.6,
        duration: 2 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
  }, [density]);
  return <div ref={ref} className="absolute inset-0 pointer-events-none" data-testid="starfield" />;
}

/* ------------------------------------------------------------------ */
/*  Animated counter                                                   */
/* ------------------------------------------------------------------ */
function NumberTicker({ value, decimals = 0, suffix = "", prefix = "", duration = 1.8 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const obj = { n: 0 };
    const tween = gsap.to(obj, {
      n: value,
      duration,
      ease: "power3.out",
      scrollTrigger: { trigger: ref.current, start: "top 88%", once: true },
      onUpdate() {
        if (ref.current) ref.current.textContent = prefix + obj.n.toFixed(decimals) + suffix;
      },
    });
    return () => tween.kill();
  }, [value, decimals, suffix, prefix, duration]);
  return <span ref={ref} className="num-mono tabular-nums">{prefix}0{suffix}</span>;
}

/* ------------------------------------------------------------------ */
/*  Magnetic CTA button                                                */
/* ------------------------------------------------------------------ */
function MagneticButton({ children, className = "", ...rest }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * 0.2;
    const y = (e.clientY - (r.top + r.height / 2)) * 0.2;
    gsap.to(el, { x, y, duration: 0.4, ease: "power3.out" });
  };
  const onLeave = () => gsap.to(ref.current, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
  return (
    <span ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`magnetic inline-flex ${className}`} {...rest}>
      {children}
    </span>
  );
}

/* ============================================================ */
/*  Landing page                                                 */
/* ============================================================ */
export default function Landing() {
  const heroRef = useRef(null);
  const pinSectionRef = useRef(null);
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get("/public/landing-stats").then(({ data }) => setStats(data)).catch(() => {}); }, []);

  // GSAP master timeline + scroll choreography
  useEffect(() => {
    const ctx = gsap.context(() => {
      /* Hero — staggered slice reveals */
      const slices = gsap.utils.toArray(".slice-line > span");
      gsap.set(slices, { yPercent: 110 });
      slices.forEach((el, i) => {
        gsap.to(el, { yPercent: 0, duration: 1.2, ease: "expo.out", delay: 0.2 + i * 0.12 });
      });

      /* Hero side panel & metrics drift in */
      gsap.fromTo(".hero-side > *",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.12, delay: 0.7 }
      );

      /* Reveal-up universal */
      gsap.utils.toArray(".reveal-up").forEach((el) => {
        gsap.to(el, {
          opacity: 1, y: 0, duration: 1.05, ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      /* Pinned 7-feature reveal */
      const cards = gsap.utils.toArray(".feature-card");
      if (pinSectionRef.current && cards.length) {
        ScrollTrigger.create({
          trigger: pinSectionRef.current,
          start: "top top",
          end: () => `+=${cards.length * 70}%`,
          pin: ".pin-left",
          pinSpacing: false,
        });
        cards.forEach((card, i) => {
          gsap.fromTo(card, { opacity: 0.2, x: 60 },
            { opacity: 1, x: 0, duration: 0.9, ease: "expo.out",
              scrollTrigger: { trigger: card, start: "top 78%", once: true }});
        });
      }

      /* Parallax depth on year tiles */
      gsap.utils.toArray(".decade-card").forEach((c, i) => {
        gsap.to(c, {
          y: -28 - (i % 3) * 14,
          ease: "none",
          scrollTrigger: { trigger: c, start: "top bottom", end: "bottom top", scrub: 0.6 },
        });
      });

      /* Hero scroll: subtle scale-down on H1 */
      gsap.to(".hero-h1", {
        scale: 0.96, opacity: 0.65,
        ease: "none",
        scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true },
      });

      /* CTA section grid pulse */
      gsap.to(".cta-grid", {
        backgroundPosition: "60px 60px",
        ease: "none",
        scrollTrigger: { trigger: ".cta-grid", start: "top bottom", end: "bottom top", scrub: 1 },
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <main className="bg-bone-100 text-ink-900 overflow-x-hidden">
      {/* ==================== TOP NAV ==================== */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-bone-100/75 border-b border-line">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="brand-logo">
            <div className="w-7 h-7 bg-ink-900 grid place-items-center">
              <div className="w-2 h-2 bg-accent" />
            </div>
            <span className="font-display font-bold tracking-tightest text-[15px]">CareerOS</span>
            <span className="num-mono text-[10px] tracking-[0.24em] text-ink-400 hidden md:inline">CAMPUS · INTELLIGENCE</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="ink-link">Platform</a>
            <a href="#intelligence" className="ink-link">Intelligence</a>
            <a href="#data" className="ink-link">Live data</a>
            <a href="#cta" className="ink-link">For institutions</a>
          </div>
          <MagneticButton>
            <Link to="/login" data-testid="nav-login-btn" className="group flex items-center gap-2 bg-ink-900 text-bone-100 px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors duration-300">
              Sign in
              <ArrowUpRight size={14} className="group-hover:rotate-45 transition-transform" />
            </Link>
          </MagneticButton>
        </div>
      </nav>

      {/* ==================== HERO ==================== */}
      <section ref={heroRef} className="relative min-h-screen pt-32 pb-16 px-6 md:px-12 spotlight grain overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 grid-paper opacity-50" />
        <Starfield density={90} />

        <div className="max-w-[1440px] mx-auto relative">
          {/* Top meta */}
          <div className="flex items-center gap-3 mb-10 reveal-up" style={{ opacity: 1, transform: "none" }}>
            <span className="pill pill-accent inline-flex items-center gap-2" data-testid="hero-eyebrow">
              <Sparkles size={11} /> v1.0 · KMIT pilot live
            </span>
            <span className="num-mono text-[11px] text-ink-400 tracking-[0.22em]">SKILL TANK / CAMPUS OS</span>
            <span className="ml-auto hidden md:flex items-center gap-2 num-mono text-[11px] text-ink-400 tracking-[0.18em]">
              <span className="w-2 h-2 bg-accent rounded-full animate-twinkle" /> LIVE · {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>

          {/* Big editorial H1 */}
          <h1 className="hero-h1 font-display font-black tracking-tightest leading-[0.84] text-[14vw] md:text-[10.2vw] lg:text-[8.6vw]" data-testid="hero-h1">
            <span className="slice-line"><span>The operating</span></span>
            <span className="slice-line"><span>system for</span></span>
            <span className="slice-line">
              <span>
                <span className="ital" data-testid="hero-ital">placement</span> intelligence.
              </span>
            </span>
          </h1>

          {/* Subhead + CTAs + side stats */}
          <div className="mt-14 grid grid-cols-12 gap-8">
            <div className="col-span-12 md:col-span-7 reveal-up" style={{ opacity: 1, transform: "none" }}>
              <p className="font-serif text-xl md:text-2xl text-ink-700 max-w-2xl leading-[1.4]" data-testid="hero-subhead">
                A command center for TPOs, HODs and placement leaders. CareerOS turns
                scattered spreadsheets into a single source of truth — measuring
                <em className="italic font-serif text-accent"> who is placement-ready</em>, which programs work, and where the next <span className="num-mono">₹80&nbsp;L</span> offer is coming from.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <MagneticButton>
                  <Link to="/login" data-testid="hero-cta-primary" className="group inline-flex items-center gap-3 bg-ink-900 text-bone-100 px-7 py-4 text-sm font-medium hover:bg-accent transition-colors">
                    Open the command center
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </MagneticButton>
                <a href="#features" data-testid="hero-cta-secondary" className="inline-flex items-center gap-2 px-7 py-4 text-sm font-medium border border-ink-900/25 hover:border-ink-900 transition-colors">
                  See the system tour
                  <ChevronRight size={14} />
                </a>
              </div>
            </div>
            <div className="hero-side col-span-12 md:col-span-5 md:col-start-9 self-end space-y-6">
              <div className="hairline" />
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">YEAR · 2025–26</div>
                  <div className="font-display text-5xl mt-2"><NumberTicker value={702} /></div>
                  <div className="text-sm text-ink-500 mt-1">Offers tracked across 148 recruiters</div>
                </div>
                <div>
                  <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">TOP OFFER</div>
                  <div className="font-display text-5xl mt-2"><NumberTicker value={80} prefix="₹" suffix="L" /></div>
                  <div className="text-sm text-ink-500 mt-1">Amazon · Software Dev Engineer</div>
                </div>
              </div>
              <div className="hairline" />
              <div className="grid grid-cols-3 gap-3 num-mono text-[11px] tracking-[0.16em] text-ink-500">
                <span>● 9 YEARS</span>
                <span>● 4 DEPTS</span>
                <span>● 148 COS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logo marquee */}
        <div className="mt-24 relative">
          <div className="px-6 md:px-12 flex items-baseline justify-between mb-5">
            <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">02 / CUSTOMERS</div>
            <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">{stats?.top_recruiters?.length || 18} INSTITUTIONS · 14 STATES</div>
          </div>
          <div className="max-w-[1440px] mx-auto px-6 md:px-12">
            <p className="font-display text-3xl md:text-5xl tracking-tightest leading-[1.05] max-w-3xl reveal-up" data-testid="customers-headline">
              Trusted by placement teams hiring into <span className="ital">the most selective</span> companies on earth.
            </p>
          </div>
          <div className="mt-10 overflow-hidden">
            <div className="flex marquee-track whitespace-nowrap items-center">
              {[...Array(2)].map((_, k) => (
                <div key={k} className="flex items-center gap-16 px-8 shrink-0">
                  {RECRUITERS.map((r) => (
                    <img
                      key={`${k}-${r.slug}`}
                      src={logoUrl(r.slug, "0E0E10")}
                      alt={r.name}
                      className="logo-ink h-7 md:h-8 shrink-0"
                      loading="lazy"
                      onError={(e) => { e.target.outerHTML = `<span class="font-display text-2xl tracking-tight">${r.name}</span>`; }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== MANIFESTO ==================== */}
      <section className="relative px-6 md:px-12 py-32 border-y border-line bg-bone-50">
        <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-3">
            <div className="num-mono text-[11px] tracking-[0.28em] text-ink-400">§01 · WHY</div>
          </div>
          <div className="col-span-12 md:col-span-9">
            <p className="font-display text-3xl md:text-5xl tracking-tightest leading-[1.05] reveal-up" data-testid="manifesto-text">
              Colleges run training. Companies run hiring.{" "}
              <span className="text-ink-400">Between them lies a fog of spreadsheets, screenshots, and quarterly reports.</span>{" "}
              CareerOS replaces that fog with a real-time operating layer — so placement decisions stop being annual, and start being <span className="ital">institutional</span>.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== DECADE OF DATA ==================== */}
      <section id="data" className="relative px-6 md:px-12 py-32 overflow-hidden">
        <div className="absolute inset-0 grid-paper opacity-40 pointer-events-none" />
        <div className="max-w-[1440px] mx-auto relative">
          <div className="flex flex-col md:flex-row items-baseline justify-between gap-6 mb-16">
            <div>
              <div className="num-mono text-[11px] tracking-[0.28em] text-ink-400">§02 · INSTITUTIONAL LIVE FEED</div>
              <h2 className="font-display text-5xl md:text-7xl tracking-tightest mt-3 reveal-up max-w-3xl">
                A decade of placements. <span className="ital">On one canvas.</span>
              </h2>
            </div>
            <Link to="/login" className="inline-flex items-center gap-2 num-mono text-xs tracking-[0.2em] text-ink-700 hover:text-accent">
              VIEW FULL DATASET <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {(stats?.years || []).slice(0, 9).reverse().slice(-9).map((y, i) => (
              <div key={y.academic_year} className="decade-card col-span-12 sm:col-span-6 md:col-span-4 bento-card border border-line p-8 bg-bone-50 relative">
                <div className="absolute top-3 right-4 num-mono text-[9px] tracking-[0.24em] text-ink-400">{String(i + 1).padStart(2, "0")} / 09</div>
                <div className="num-mono text-[11px] text-ink-400 tracking-[0.2em]">AY {y.academic_year}</div>
                <div className="font-display text-6xl mt-4 tracking-tightest"><NumberTicker value={y.offers} /></div>
                <div className="text-sm text-ink-500">offers from {y.companies} recruiters</div>
                <div className="hairline my-6" />
                <div className="flex items-end justify-between">
                  <div>
                    <div className="num-mono text-[10px] text-ink-400 tracking-[0.24em]">AVG</div>
                    <div className="font-display text-2xl mt-1"><NumberTicker value={y.avg_lpa} decimals={2} prefix="₹" suffix="L" /></div>
                  </div>
                  <div className="text-right">
                    <div className="num-mono text-[10px] text-ink-400 tracking-[0.24em]">TOP · {y.top_company?.toUpperCase()}</div>
                    <div className="font-display text-2xl mt-1 text-accent"><NumberTicker value={y.top_offer_lpa} decimals={1} prefix="₹" suffix="L" /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PINNED 7 FEATURES ==================== */}
      <section id="features" ref={pinSectionRef} className="relative px-6 md:px-12 py-32 bg-ink-900 text-bone-100">
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "linear-gradient(135deg, transparent 49.5%, #1538C8 49.5%, #1538C8 50.5%, transparent 50.5%)",
          backgroundSize: "80px 80px",
        }} />
        <div className="max-w-[1440px] mx-auto relative grid grid-cols-12 gap-8">
          <div className="pin-left col-span-12 md:col-span-5 self-start md:sticky md:top-32 h-fit">
            <div className="num-mono text-[11px] tracking-[0.28em] text-bone-100/40">§03 · THE PLATFORM</div>
            <h2 className="font-display text-5xl md:text-6xl tracking-tightest mt-4">
              Seven modules. <span className="ital">One operating system.</span>
            </h2>
            <p className="font-serif text-lg text-bone-100/70 mt-6 max-w-md">
              Each module replaces a manual workflow that placement cells run on spreadsheets, group chats, or memory. Together they form an institutional command center.
            </p>
            <div className="mt-10 hairline border-bone-100/15" />
            <div className="mt-6 num-mono text-[11px] tracking-[0.18em] text-bone-100/45">SCROLL TO EXPLORE EACH MODULE ↓</div>
          </div>

          <div className="col-span-12 md:col-span-7 space-y-8">
            {[
              { num: "01", icon: <ShieldCheck size={18} />, title: "Verified TPO onboarding", body: "Institutional gatekeeping with super-admin approval. Only verified partners ever see your data.", testid: "feature-1" },
              { num: "02", icon: <Building2 size={18} />, title: "Living college profile", body: "Institution, university, departments, partnership types — a permanent record of your institutional shape.", testid: "feature-2" },
              { num: "03", icon: <Users size={18} />, title: "Student roster intelligence", body: "Every enrolled student, every batch. Bulk filter by department, status, placement outcome.", testid: "feature-3" },
              { num: "04", icon: <Target size={18} />, title: "Program & cohort tracking", body: "CRT, Interview Master, FDP, DSA mastery — see who is in, who is on track, who is drifting.", testid: "feature-4" },
              { num: "05", icon: <LineChart size={18} />, title: "Placement outcomes dashboard", body: "Year over year offers, recruiter mix, CTC distribution, department win-rates. The chart your management deck needed.", testid: "feature-5" },
              { num: "06", icon: <Zap size={18} />, title: "Training completion telemetry", body: "Module-level progress, average completion, intervention triggers. Stop guessing if training works.", testid: "feature-6" },
              { num: "07", icon: <FileText size={18} />, title: "MOU & partnership vault", body: "Documents, renewal countdowns, seat utilization, revenue share. Your partnership lifecycle, audit-ready.", testid: "feature-7" },
            ].map((f) => (
              <div key={f.num} className="feature-card border border-bone-100/15 hover:border-accent transition-colors p-8 bg-ink-800/40 backdrop-blur-sm" data-testid={f.testid}>
                <div className="flex items-start gap-6">
                  <div className="num-mono text-sm text-bone-100/40 tracking-[0.2em] pt-1">§{f.num}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 text-accent">{f.icon}<span className="num-mono text-[10px] tracking-[0.24em] uppercase">module</span></div>
                    <h3 className="font-display text-3xl tracking-tightest">{f.title}</h3>
                    <p className="text-bone-100/70 mt-3 max-w-xl">{f.body}</p>
                  </div>
                  <ChevronRight className="text-bone-100/30 self-center" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== INTELLIGENCE / RECRUITER LEDGER ==================== */}
      <section id="intelligence" className="px-6 md:px-12 py-32 bg-bone-100">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-12 gap-8 mb-16">
            <div className="col-span-12 md:col-span-5">
              <div className="num-mono text-[11px] tracking-[0.28em] text-ink-400">§04 · HIRING PARTNERS</div>
              <h2 className="font-display text-5xl md:text-6xl tracking-tightest mt-4 reveal-up">
                Partnership <span className="ital">outcomes.</span>
              </h2>
            </div>
            <div className="col-span-12 md:col-span-6 md:col-start-7 self-end">
              <p className="font-serif text-lg text-ink-700 reveal-up">A live ledger of every selection — sorted, ranked, and queryable. Pulled directly from institutional placement records.</p>
            </div>
          </div>

          <div className="border border-line bg-bone-50">
            <div className="grid grid-cols-12 px-8 py-4 border-b border-line num-mono text-[10px] tracking-[0.24em] text-ink-400">
              <div className="col-span-1">#</div>
              <div className="col-span-1"></div>
              <div className="col-span-4">RECRUITER</div>
              <div className="col-span-3 text-right">ALL-TIME SELECTS</div>
              <div className="col-span-3 text-right">MAX CTC</div>
            </div>
            {(stats?.top_recruiters || []).slice(0, 10).map((r, i) => {
              const slug = r.company.toLowerCase().replace(/[^a-z]/g, "");
              return (
                <div key={r.company} className="grid grid-cols-12 px-8 py-5 border-b border-line items-center hover:bg-bone-200 transition-colors group" data-testid={`recruiter-row-${i}`}>
                  <div className="col-span-1 num-mono text-sm text-ink-400">{String(i + 1).padStart(2, "0")}</div>
                  <div className="col-span-1">
                    <img src={logoUrl(slug, "0E0E10")} alt={r.company} className="h-5 logo-ink" onError={(e) => { e.target.style.display = "none"; }} />
                  </div>
                  <div className="col-span-4 font-display text-2xl tracking-tightest">{r.company}</div>
                  <div className="col-span-3 text-right num-mono text-lg">{r.selects}</div>
                  <div className="col-span-3 text-right num-mono text-lg text-accent group-hover:translate-x-1 transition-transform">₹{r.max_ctc?.toFixed(1)}L</div>
                </div>
              );
            })}
            {(!stats || stats.top_recruiters?.length === 0) && (
              <div className="px-8 py-12 text-center text-ink-400">Loading institutional dataset…</div>
            )}
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section id="cta" className="relative px-6 md:px-12 py-40 bg-ink-900 text-bone-100 overflow-hidden">
        <div className="absolute inset-0 cta-grid opacity-10" style={{
          backgroundImage: "linear-gradient(135deg, transparent 49.5%, #1538C8 49.5%, #1538C8 50.5%, transparent 50.5%)",
          backgroundSize: "60px 60px",
        }} />
        <div className="max-w-[1440px] mx-auto relative">
          <div className="num-mono text-[11px] tracking-[0.28em] text-bone-100/45">§05 · GET ACCESS</div>
          <h2 className="font-display text-6xl md:text-[8.6vw] tracking-tightest leading-[0.9] mt-6 max-w-5xl reveal-up">
            Bring your placement cell <br /><span className="ital">into the present.</span>
          </h2>
          <p className="font-serif text-xl text-bone-100/70 mt-8 max-w-2xl reveal-up">
            Onboarding takes 9 minutes. Verified institutional partners only — protected by Google OAuth and super-admin gating.
          </p>
          <div className="mt-12 flex flex-wrap gap-4">
            <MagneticButton>
              <Link to="/login" data-testid="footer-cta-primary" className="inline-flex items-center gap-3 bg-accent text-bone-100 px-8 py-5 text-base font-medium hover:bg-bone-100 hover:text-ink-900 transition-colors">
                Request institutional access
                <ArrowUpRight size={18} />
              </Link>
            </MagneticButton>
            <a href="mailto:hello@careeros.app" className="inline-flex items-center gap-3 border border-bone-100/30 px-8 py-5 text-base font-medium hover:border-accent hover:text-accent transition-colors">
              Talk to founders
            </a>
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-12 py-12 border-t border-line bg-bone-100">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-ink-900 grid place-items-center"><div className="w-1.5 h-1.5 bg-accent" /></div>
            <span className="num-mono text-[11px] tracking-[0.24em] text-ink-500">CAREEROS · SKILL TANK · {new Date().getFullYear()}</span>
          </div>
          <div className="num-mono text-[11px] tracking-[0.24em] text-ink-400">DATA SEEDED FROM KMIT.IN/PLACEMENTS · 2017–2026</div>
        </div>
      </footer>
    </main>
  );
}
