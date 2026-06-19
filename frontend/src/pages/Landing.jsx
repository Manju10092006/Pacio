import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Observer } from "gsap/Observer";
import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Database,
  FileText,
  GraduationCap,
  Layers3,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "../lib/api";
import { Badge } from "../components/Primitives";

gsap.registerPlugin(ScrollTrigger, Observer);

const modules = [
  { icon: GraduationCap, title: "Student OS", copy: "Readiness, DSA, aptitude, ATS, interviews, applications, and schedule in one workspace.", signal: "Personal placement cockpit" },
  { icon: Users, title: "Faculty Studio", copy: "Weak-topic detection, batch comparisons, intervention queues, comments, and coaching history.", signal: "Mentor intelligence" },
  { icon: BriefcaseBusiness, title: "Recruiter Cloud", copy: "Talent discovery, saved filters, candidate matching, shortlists, and conversion analytics.", signal: "Who to interview next" },
  { icon: ShieldCheck, title: "Institution Control", copy: "Department health, placement forecasting, audit logs, MOU context, and board-ready reports.", signal: "Mission control" },
  { icon: Brain, title: "Readiness Engine", copy: "A dynamic score across DSA, aptitude, ATS, interviews, CGPA, and consistency.", signal: "Algorithmic placement signal" },
  { icon: Database, title: "Placement Ledger", copy: "Every drive, stage, offer, package, department trend, and recruiter conversion connected.", signal: "Single source of truth" },
];

const brokenStack = ["Excel", "WhatsApp", "Google Sheets", "Manual PDFs", "Email threads", "Untracked calls"];

const walkthrough = [
  {
    eyebrow: "01 / STUDENT",
    title: "Practice without leaving CareerOS.",
    copy: "Students move from readiness diagnosis to DSA solving, aptitude tests, ATS resume improvements, mock interviews, and applications inside one preparation loop.",
    stats: ["455 DSA problems", "Timed aptitude room", "Mock interview recording"],
  },
  {
    eyebrow: "02 / FACULTY",
    title: "Coach the exact students who need attention.",
    copy: "Faculty see weak topics, low consistency, revision due lists, interview gaps, and department-level risk cohorts with drill-downs.",
    stats: ["Weak-topic queue", "Batch analytics", "Faculty comments"],
  },
  {
    eyebrow: "03 / TPO",
    title: "Run placements as a command center.",
    copy: "TPOs monitor recruiter drives, applications, readiness forecasts, department health, reports, and communication from a single operational map.",
    stats: ["Pipeline tracking", "Forecasting", "Reports engine"],
  },
  {
    eyebrow: "04 / RECRUITER",
    title: "Find the next best candidate instantly.",
    copy: "Recruiters filter talent by skills, readiness, CGPA, department, ATS fit, interview scores, and placement intent.",
    stats: ["Talent matching", "Saved filters", "Shortlists"],
  },
];

function number(value, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n.toLocaleString() : fallback;
}

function Counter({ value, suffix = "", prefix = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    const obj = { n: 0 };
    const tween = gsap.to(obj, {
      n: Number(value) || 0,
      duration: 1.7,
      ease: "power3.out",
      scrollTrigger: { trigger: ref.current, start: "top 88%" },
      onUpdate: () => {
        if (ref.current) ref.current.textContent = `${prefix}${Math.round(obj.n).toLocaleString()}${suffix}`;
      },
    });
    return () => tween.kill();
  }, [value, suffix, prefix]);
  return <span ref={ref}>0{suffix}</span>;
}

function ProductWindow({ compact = false }) {
  return (
    <div className="aurora-card p-4 md:p-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--signal)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--violet)]" />
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">CareerOS Intelligence Layer</div>
      </div>

      <div className="grid grid-cols-12 gap-3 pt-4 text-white">
        <div className="col-span-12 lg:col-span-4 rounded-[8px] border border-white/10 bg-white/[0.055] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">Readiness</div>
          <div className="mt-4 flex items-end gap-3">
            <div className="font-display text-6xl leading-none text-accent">87</div>
            <div className="pb-2 text-sm text-white/55">dynamic score</div>
          </div>
          <div className="mt-5 space-y-2">
            {[
              ["DSA", 76, "bg-accent"],
              ["ATS", 91, "bg-[var(--signal)]"],
              ["Interview", 84, "bg-[var(--violet)]"],
            ].map(([label, pct, color]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between font-mono text-[10px] uppercase text-white/50"><span>{label}</span><span>{pct}%</span></div>
                <div className="h-1.5 rounded-full bg-white/10"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 rounded-[8px] border border-white/10 bg-white/[0.055] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">Placement Funnel</div>
              <div className="font-display text-2xl tracking-tight">Every candidate, every stage.</div>
            </div>
            <Badge variant="signal">Live</Badge>
          </div>
          <div className="mt-5 grid grid-cols-5 gap-2">
            {["Applied", "Shortlist", "Assess", "Interview", "Offer"].map((stage, i) => (
              <div key={stage} className="rounded-[8px] border border-white/10 bg-black/15 p-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">{stage}</div>
                <div className="mt-3 h-24 rounded bg-white/10 p-1 flex items-end">
                  <div className="w-full rounded bg-gradient-to-t from-accent via-[var(--signal)] to-[var(--violet)]" style={{ height: `${82 - i * 12}%` }} />
                </div>
                <div className="mt-2 font-display text-xl">{[238, 142, 91, 54, 27][i]}</div>
              </div>
            ))}
          </div>
        </div>

        {!compact && (
          <>
            <div className="col-span-12 md:col-span-6 rounded-[8px] border border-white/10 bg-white/[0.055] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">Risk Queue</div>
              <div className="mt-4 space-y-2">
                {["Low aptitude speed", "ATS keyword gap", "Interview confidence"].map((item, i) => (
                  <div key={item} className="flex items-center justify-between rounded-[8px] border border-white/10 bg-black/15 px-3 py-2 text-sm">
                    <span>{item}</span>
                    <span className="font-mono text-[10px] text-accent">P{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-12 md:col-span-6 rounded-[8px] border border-white/10 bg-white/[0.055] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">Recruiter Match</div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {["Google", "DE Shaw", "Adobe"].map((company, i) => (
                  <div key={company} className="rounded-[8px] border border-white/10 bg-black/15 p-3">
                    <div className="font-display text-sm">{company}</div>
                    <div className="mt-3 font-mono text-[10px] text-white/45">fit</div>
                    <div className="font-display text-2xl text-[var(--signal)]">{[92, 88, 84][i]}%</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Landing() {
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const walkthroughRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    api.get("/public/landing-stats").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const chars = heroRef.current?.querySelectorAll(".hero-char") || [];
      gsap.fromTo(chars, { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, ease: "power4.out", stagger: 0.008 });

      gsap.utils.toArray(".reveal-lift").forEach((el) => {
        gsap.fromTo(el, { opacity: 0, y: 32 }, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 86%" },
        });
      });

      gsap.utils.toArray(".float-panel").forEach((el, i) => {
        gsap.to(el, { y: i % 2 ? 16 : -16, duration: 3.5 + i, repeat: -1, yoyo: true, ease: "sine.inOut" });
      });

      if (walkthroughRef.current) {
        const cards = gsap.utils.toArray(".walk-card");
        ScrollTrigger.create({
          trigger: walkthroughRef.current,
          start: "top top",
          end: "+=280%",
          pin: ".walk-pin",
          onUpdate: (self) => {
            const index = Math.min(cards.length - 1, Math.floor(self.progress * cards.length));
            setActiveStep(index);
          },
        });
      }

      Observer.create({
        target: window,
        type: "pointer,touch",
        onMove: (self) => {
          const x = (self.x / window.innerWidth - 0.5) * 14;
          const y = (self.y / window.innerHeight - 0.5) * 14;
          gsap.to(".hero-orbit", { x, y, duration: 0.6, ease: "power3.out" });
        },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const headline = useMemo(() => "The Operating System For Placement Intelligence.", []);
  const totals = stats?.totals || {};
  const topRecruiters = stats?.top_recruiters?.slice(0, 8) || [
    { company: "Amazon", selects: 42, max_ctc: 80 },
    { company: "Google", selects: 38, max_ctc: 52 },
    { company: "Microsoft", selects: 31, max_ctc: 44 },
    { company: "Adobe", selects: 28, max_ctc: 38 },
  ];

  return (
    <main ref={rootRef} className="overflow-hidden bg-bone text-ink">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#071015]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-5 md:px-8">
          <Link to="/" className="flex items-center gap-3 text-white">
            <div className="grid h-9 w-9 place-items-center rounded-[8px] border border-white/12 bg-white/10">
              <Sparkles size={17} className="text-accent" />
            </div>
            <div>
              <div className="font-display text-sm font-bold tracking-tight">CareerOS</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/42">Placement Intelligence</div>
            </div>
          </Link>
          <div className="hidden items-center gap-7 font-mono text-[10px] uppercase tracking-[0.22em] text-white/54 lg:flex">
            <a className="magnetic-link" href="#collapse">Why systems fail</a>
            <a className="magnetic-link" href="#layer">Intelligence layer</a>
            <a className="magnetic-link" href="#walkthrough">Walkthrough</a>
            <a className="magnetic-link" href="#metrics">Live metrics</a>
          </div>
          <Link to="/login" className="btn border-white/15 bg-white text-ink hover:border-accent hover:bg-accent hover:text-white">
            Open App <ArrowUpRight size={15} />
          </Link>
        </div>
      </nav>

      <section ref={heroRef} className="premium-hero px-5 pb-12 pt-28 text-white md:px-8">
        <div className="relative z-10 mx-auto grid max-w-[1480px] grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7">
            <div className="reveal-lift mb-8 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/12 bg-white/8 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/62 backdrop-blur">V3 enterprise layer</span>
              <span className="rounded-full border border-[rgba(0,167,167,.34)] bg-[rgba(0,167,167,.12)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--signal)]">Live campus telemetry</span>
            </div>
            <h1 className="max-w-5xl overflow-hidden font-display text-[13vw] font-black uppercase leading-[0.84] tracking-tight md:text-[8vw] lg:text-[6.8vw]">
              {headline.split("").map((char, index) => (
                <span key={`${char}-${index}`} className="hero-char inline-block">{char === " " ? "\u00a0" : char}</span>
              ))}
            </h1>
            <p className="reveal-lift mt-8 max-w-2xl font-serif text-xl leading-relaxed text-white/68">
              CareerOS connects preparation, coaching, recruitment, applications, interviews, reports, audit trails, and institution-wide placement forecasting into one decision system.
            </p>
            <div className="reveal-lift mt-10 flex flex-wrap items-center gap-3">
              <Link to="/login" className="btn bg-accent text-white hover:bg-white hover:text-ink">
                Deploy CareerOS <ArrowRight size={16} />
              </Link>
              <a href="#walkthrough" className="btn btn-ghost border-white/16 text-white hover:bg-white hover:text-ink">
                Watch product story
              </a>
            </div>
          </div>

          <div className="hero-orbit col-span-12 lg:col-span-5 lg:pt-12">
            <ProductWindow />
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-16 max-w-[1480px] overflow-hidden border-y border-white/10 py-5">
          <div className="marquee-track flex w-max gap-12 whitespace-nowrap">
            {[...topRecruiters, ...topRecruiters].map((r, i) => (
              <div key={`${r.company}-${i}`} className="flex items-center gap-4 text-white/72">
                <span className="font-display text-2xl uppercase tracking-tight">{r.company}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent">{r.selects} hires / {Number(r.max_ctc || 0).toFixed(1)}L</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="collapse" className="border-b border-line bg-paper px-5 py-28 md:px-8">
        <div className="mx-auto grid max-w-[1480px] grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-5">
            <Badge variant="danger">The old stack collapses</Badge>
            <h2 className="mt-5 font-display text-5xl uppercase leading-[0.92] tracking-tight md:text-7xl">Spreadsheets were never built for placement intelligence.</h2>
          </div>
          <div className="col-span-12 lg:col-span-7">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {brokenStack.map((item, i) => (
                <div key={item} className="reveal-lift bento-tile flex min-h-[160px] flex-col justify-between p-6">
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink/35">Disconnected / {String(i + 1).padStart(2, "0")}</div>
                  <div>
                    <div className="font-display text-2xl uppercase tracking-tight">{item}</div>
                    <div className="mt-2 text-sm text-ink/52">Cannot explain readiness, risk, conversion, or who needs attention now.</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="layer" className="px-5 py-28 md:px-8">
        <div className="mx-auto max-w-[1480px]">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-6">
              <Badge variant="signal">Everything connects</Badge>
              <h2 className="mt-5 font-display text-5xl uppercase leading-[0.92] tracking-tight md:text-7xl">One intelligence layer for every role.</h2>
            </div>
            <div className="col-span-12 lg:col-span-5 lg:col-start-8">
              <p className="font-serif text-xl leading-relaxed text-ink/62">
                The product is built around decisions, not dashboards. Every module answers a real operational question for students, faculty, TPOs, institutions, and recruiters.
              </p>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-12 gap-4">
            {modules.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={`reveal-lift bento-tile data-glow p-7 ${i === 0 || i === 4 ? "col-span-12 lg:col-span-6" : "col-span-12 md:col-span-6 lg:col-span-3"}`}>
                  <div className="flex items-start justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-[8px] bg-ink text-bone"><Icon size={19} /></div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent">{item.signal}</span>
                  </div>
                  <div className="mt-10">
                    <h3 className="font-display text-3xl uppercase tracking-tight">{item.title}</h3>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-ink/58">{item.copy}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="walkthrough" ref={walkthroughRef} className="relative bg-[#071015] px-5 py-28 text-white md:px-8">
        <div className="walk-pin mx-auto grid max-w-[1480px] grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-5">
            <Badge variant="accent">Pinned walkthrough</Badge>
            <h2 className="mt-5 font-display text-5xl uppercase leading-[0.92] tracking-tight md:text-7xl">A product OS, not a dashboard.</h2>
            <div className="story-rail mt-10 space-y-8">
              {walkthrough.map((step, i) => (
                <button key={step.title} onClick={() => setActiveStep(i)} className={`story-node block text-left transition-opacity ${activeStep === i ? "opacity-100" : "opacity-38"}`}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent">{step.eyebrow}</div>
                  <div className="mt-1 font-display text-2xl uppercase tracking-tight">{step.title}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-12 lg:col-span-7">
            <div className="walk-card aurora-card p-6 md:p-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/45">{walkthrough[activeStep].eyebrow}</div>
              <h3 className="mt-4 font-display text-4xl uppercase leading-tight tracking-tight text-white md:text-6xl">{walkthrough[activeStep].title}</h3>
              <p className="mt-5 max-w-2xl font-serif text-lg leading-relaxed text-white/62">{walkthrough[activeStep].copy}</p>
              <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
                {walkthrough[activeStep].stats.map((stat) => (
                  <div key={stat} className="rounded-[8px] border border-white/10 bg-white/[0.06] p-4">
                    <CheckCircle2 size={17} className="text-[var(--signal)]" />
                    <div className="mt-3 font-display text-xl tracking-tight">{stat}</div>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <ProductWindow compact />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="metrics" className="border-b border-line bg-paper px-5 py-28 md:px-8">
        <div className="mx-auto max-w-[1480px]">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-5">
              <Badge variant="violet">Live operating metrics</Badge>
              <h2 className="mt-5 font-display text-5xl uppercase leading-[0.92] tracking-tight md:text-7xl">Measure the campus machine in real time.</h2>
            </div>
            <div className="col-span-12 grid grid-cols-2 gap-4 lg:col-span-7 md:grid-cols-4">
              {[
                ["Students", totals.students || 470, Users],
                ["Institutions", totals.institutions || 7, Layers3],
                ["Open drives", totals.jobs || 65, CalendarClock],
                ["Applications", totals.applications || 880, FileText],
              ].map(([label, value, Icon]) => (
                <div key={label} className="reveal-lift bento-tile p-6">
                  <Icon size={20} className="text-accent" />
                  <div className="mt-8 font-display text-5xl tracking-tight"><Counter value={value} /></div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/42">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 premium-table">
            <div className="grid grid-cols-12 border-b border-line bg-bone-100 px-6 py-4 font-mono text-[10px] uppercase tracking-[0.24em] text-ink/45">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Recruiter</div>
              <div className="col-span-3 text-right">Selections</div>
              <div className="col-span-3 text-right">Max package</div>
            </div>
            {topRecruiters.map((r, i) => (
              <div key={r.company} className="grid grid-cols-12 items-center border-b border-line px-6 py-5 last:border-b-0">
                <div className="col-span-1 font-mono text-sm text-ink/36">{String(i + 1).padStart(2, "0")}</div>
                <div className="col-span-5 font-display text-2xl uppercase tracking-tight">{r.company}</div>
                <div className="col-span-3 text-right font-mono text-lg">{number(r.selects)}</div>
                <div className="col-span-3 text-right font-mono text-lg text-accent">{Number(r.max_ctc || 0).toFixed(1)}L</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="premium-hero min-h-[76vh] px-5 py-28 text-white md:px-8">
        <div className="relative z-10 mx-auto max-w-[1480px]">
          <div className="max-w-5xl">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/42">Deploy CareerOS</div>
            <h2 className="mt-6 font-display text-[13vw] uppercase leading-[0.84] tracking-tight md:text-[8vw] lg:text-[6.5vw]">
              Build the placement cell of the next decade.
            </h2>
            <p className="mt-8 max-w-2xl font-serif text-xl leading-relaxed text-white/62">
              Give every student, faculty member, recruiter, TPO, and institution admin a real operating system for placement intelligence.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/login" className="btn bg-white text-ink hover:bg-accent hover:text-white">Enter CareerOS <ArrowRight size={16} /></Link>
              <a href="mailto:hello@careeros.app" className="btn btn-ghost border-white/15 text-white hover:bg-white hover:text-ink">Talk to founders</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-[1480px] flex-col justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.24em] text-ink/45 md:flex-row">
          <span>CareerOS / Placement Intelligence Layer</span>
          <span>Students / Faculty / TPO / Recruiters / Institutions</span>
        </div>
      </footer>
    </main>
  );
}
