import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, ArrowRight, CheckCircle2, ChevronRight, HelpCircle, Layers, Activity, Users, ShieldAlert, Code2, Briefcase, Database } from "lucide-react";
import { api } from "../lib/api";
import { Badge } from "../components/Primitives";

gsap.registerPlugin(ScrollTrigger);

/* Split text into characters for editorial reveals */
function splitChars(node) {
  if (!node || node.dataset.split === "1") return [];
  const text = node.textContent;
  node.textContent = "";
  const words = text.split(/(\s+)/);
  const spans = [];
  words.forEach((w) => {
    if (/^\s+$/.test(w)) {
      node.appendChild(document.createTextNode(w));
      return;
    }
    [...w].forEach((c) => {
      const s = document.createElement("span");
      s.className = "split-char inline-block";
      s.textContent = c;
      node.appendChild(s);
      spans.push(s);
    });
  });
  node.dataset.split = "1";
  return spans;
}

function NumberTicker({ value, decimals = 0, suffix = "", prefix = "", duration = 1.5 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const obj = { n: 0 };
    const tween = gsap.to(obj, {
      n: value,
      duration,
      ease: "power3.out",
      scrollTrigger: { trigger: ref.current, start: "top 90%" },
      onUpdate() {
        if (ref.current) {
          ref.current.textContent = prefix + obj.n.toFixed(decimals) + suffix;
        }
      },
    });
    return () => tween.kill();
  }, [value, decimals, suffix, prefix, duration]);
  return <span ref={ref} className="font-mono tnum">{prefix}0{suffix}</span>;
}

export default function Landing() {
  const heroH1Ref = useRef(null);
  const heroSubRef = useRef(null);
  const storyRef = useRef(null);
  const walkthroughRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [activeWalkthrough, setActiveWalkthrough] = useState(0);

  useEffect(() => {
    api.get("/public/landing-stats").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // HERO character stagger reveal
      const heroChars = splitChars(heroH1Ref.current);
      gsap.set(heroChars, { yPercent: 110, opacity: 0 });
      gsap.to(heroChars, {
        yPercent: 0,
        opacity: 1,
        duration: 1.2,
        ease: "power4.out",
        stagger: 0.01,
        delay: 0.1,
      });

      // Subhead lines reveal
      gsap.utils.toArray(".slice-line > span").forEach((el, i) => {
        gsap.fromTo(el, { yPercent: 105 }, {
          yPercent: 0,
          duration: 1,
          ease: "power3.out",
          delay: 0.5 + i * 0.08,
        });
      });

      // Standard scroll reveal triggers
      gsap.utils.toArray(".reveal-up").forEach((el) => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 92%" },
        });
      });

      // Pinned story timeline sequence
      const storySteps = gsap.utils.toArray(".story-step");
      if (storyRef.current && storySteps.length) {
        ScrollTrigger.create({
          trigger: storyRef.current,
          start: "top top",
          end: () => `+=${storySteps.length * 60}%`,
          pin: ".story-pin",
          pinSpacing: false,
        });
        storySteps.forEach((s) => {
          gsap.to(s, {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: s, start: "top 75%" },
          });
        });
      }
    });
    return () => ctx.revert();
  }, []);

  const walkthroughSteps = [
    {
      title: "Placement Command Center",
      role: "TPO / PLACEMENT OFFICERS",
      desc: "Live recruiter pipelines, real-time readiness scoring, drive health monitors, and predictive placement forecasts.",
      kpis: ["700+ Offers", "140+ Recruiters", "98% Drive Health"],
    },
    {
      title: "Student Placement Workspace",
      role: "STUDENTS",
      desc: "Personal placement OS: Striver A2Z DSA sheet progress, keyword-aware ATS resume builders, and mock interview reports.",
      kpis: ["DSA Analytics", "ATS Score Feedback", "AI Interview Rubrics"],
    },
    {
      title: "Faculty Coaching Dashboard",
      role: "FACULTY & MENTORS",
      desc: "Weak-student intervention queues, batch aptitude stats, and code compilation tracking.",
      kpis: ["Intervention Triggers", "Topic Speed & Accuracy", "DSA Comments"],
    },
    {
      title: "Recruiter Workspace",
      role: "PARTNER RECRUITERS",
      desc: "Qualified talent pool queries, instant shortlist builder, conversion funnels, and automated interview calendars.",
      kpis: ["Talent Screener", "ICS / Calendar Scheduling", "Recruiter CRM"],
    }
  ];

  return (
    <main className="bg-bone-100 text-ink-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-line">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="brand-logo">
            <div className="w-6 h-6 bg-ink grid place-items-center"><div className="w-1.5 h-1.5 bg-accent" /></div>
            <span className="font-display font-bold tracking-tight text-[14px]">CareerOS</span>
            <span className="font-mono text-[9px] tracking-[0.28em] text-ink-400 hidden md:inline">PLACEMENT · LAYER</span>
          </Link>
          <div className="hidden lg:flex items-center gap-7 text-xs font-mono tracking-wider uppercase">
            <a href="#spreadsheets" className="ink-link">Why spreadsheets fail</a>
            <a href="#story" className="ink-link">The struggles</a>
            <a href="#intelligence" className="ink-link">Intelligence</a>
            <a href="#walkthrough" className="ink-link">Product Walkthrough</a>
            <a href="#outcomes" className="ink-link">Outcomes</a>
          </div>
          <Link to="/login" data-testid="nav-login-btn" className="group btn py-2 px-4 text-xs font-mono uppercase">
            Sign In <ArrowUpRight size={13} className="group-hover:rotate-45 transition-transform" />
          </Link>
        </div>
      </nav>

      {/* Section 1: The Operating System For Placement Intelligence */}
      <section className="relative min-h-screen pt-28 pb-16 px-6 md:px-10 grain flex flex-col justify-between">
        <div className="max-w-[1440px] mx-auto w-full relative">
          <div className="flex items-center gap-3 mb-10 reveal-up" data-testid="hero-eyebrow-row">
            <span className="pill pill-accent">V3 INTELLIGENCE COMMAND ACTIVE</span>
            <span className="font-mono text-[10px] text-ink-400 tracking-[0.18em]">THE PLACEMENT LAYER</span>
          </div>

          <h1
            ref={heroH1Ref}
            data-testid="hero-h1"
            className="font-display font-black tracking-tightest leading-[0.88] text-[13vw] md:text-[9.5vw] lg:text-[8vw] uppercase"
          >
            The Operating System<br />For Placement Intelligence.
          </h1>

          <div className="mt-12 grid grid-cols-12 gap-8" ref={heroSubRef}>
            <div className="col-span-12 md:col-span-7">
              <div className="font-serif text-lg md:text-xl text-ink-700 leading-[1.45] max-w-xl">
                <span className="slice-line"><span>Colleges run training. Companies run hiring.</span></span>
                <span className="slice-line"><span>Between them sits a fog of spreadsheets,</span></span>
                <span className="slice-line"><span>WhatsApp groups, and quarterly PDFs.</span></span>
                <span className="slice-line"><span>CareerOS is the layer that makes it institutional.</span></span>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/login" data-testid="hero-cta-primary" className="group btn">
                  Open Command Center
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="#spreadsheets" data-testid="hero-cta-secondary" className="btn btn-ghost border border-line-strong">
                  Explore Narrative
                </a>
              </div>
            </div>

            <div className="col-span-12 md:col-span-5 md:col-start-8 self-end space-y-6 reveal-up">
              <div className="hairline" />
              <div className="grid grid-cols-2 gap-4">
                <div data-testid="hero-stat-offers">
                  <div className="font-mono text-[9px] tracking-[0.24em] text-ink-400">AY · 2025–26</div>
                  <div className="font-display text-4xl mt-2"><NumberTicker value={702} /></div>
                  <div className="text-xs text-ink-500 font-serif mt-1">offers across 148 recruiters</div>
                </div>
                <div data-testid="hero-stat-top">
                  <div className="font-mono text-[9px] tracking-[0.24em] text-ink-400">TOP OFFER</div>
                  <div className="font-display text-4xl mt-2"><NumberTicker value={80} prefix="₹" suffix="L" /></div>
                  <div className="text-xs text-ink-500 font-serif mt-1">Amazon · SDE</div>
                </div>
                <div data-testid="hero-stat-students">
                  <div className="font-mono text-[9px] tracking-[0.24em] text-ink-400">SEEDED RECORDS</div>
                  <div className="font-display text-4xl mt-2"><NumberTicker value={stats?.totals?.students || 470} /></div>
                  <div className="text-xs text-ink-500 font-serif mt-1">student analytics profiles</div>
                </div>
                <div data-testid="hero-stat-inst">
                  <div className="font-mono text-[9px] tracking-[0.24em] text-ink-400">PARTNER INSTITUTIONS</div>
                  <div className="font-display text-4xl mt-2"><NumberTicker value={stats?.totals?.institutions || 7} /></div>
                  <div className="text-xs text-ink-500 font-serif mt-1">fully scoped campus hubs</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live recruiter marquee */}
        <div className="mt-16 border-t border-line pt-4 overflow-hidden">
          <div className="font-mono text-[9px] tracking-[0.24em] text-ink-400 px-6 md:px-10 mb-2">PARTNER RECRUITERS · CONNECTED</div>
          <div className="overflow-hidden">
            <div className="flex marquee-track whitespace-nowrap will-change-transform">
              {[...Array(2)].map((_, k) => (
                <div key={k} className="flex items-center gap-14 px-8 shrink-0">
                  {["Amazon","Google","Microsoft","Salesforce","ServiceNow","Adobe","Goldman Sachs","Intuit","Walmart Global Tech","DE Shaw","Cisco","JP Morgan","Nvidia","Oracle","SAP","Atlassian","Uber","Deloitte","Accenture","TCS","Infosys","ZS Associates","Capgemini"].map((c) => (
                    <span key={`${k}-${c}`} className="font-display text-2xl md:text-3xl font-bold tracking-tight text-ink inline-flex items-center gap-3">
                      <span>{c.toUpperCase()}</span>
                      <span className="w-1.5 h-1.5 bg-accent" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Why spreadsheets fail */}
      <section id="spreadsheets" className="relative px-6 md:px-10 py-24 bg-paper border-t border-b border-line">
        <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-8 items-center">
          <div className="col-span-12 md:col-span-6 space-y-6">
            <Badge variant="solid">THE EXCEL PARADOX</Badge>
            <h2 className="font-display text-5xl tracking-tightest leading-[0.9] uppercase">
              Spreadsheets fail<br />under coordination.
            </h2>
            <p className="font-serif text-lg text-ink-600 max-w-lg leading-relaxed">
              When thousands of student details, interview slots, ATS logs, and recruiter feedback pipelines are updated simultaneously across departments, static sheets fall apart. Data gets out of date, messages get missed, and readiness remains completely invisible.
            </p>
          </div>
          <div className="col-span-12 md:col-span-6 grid grid-cols-2 gap-4">
            {[
              { title: "Disconnected Data", desc: "Training updates live in separate logs from hiring drives, resulting in manual entry lag." },
              { title: "Zero Telemetry", desc: "No tracker captures how long a student spent on a DSA challenge or their interview confidence delta." },
              { title: "Audit Exposure", desc: "Recruiter contacts, MOU expiry timers, and contract SLAs are lost in faculty memory." },
              { title: "Delayed Decisions", desc: "Placements happen, but forecasting reports take weeks to build and export manually." }
            ].map((col, idx) => (
              <div key={idx} className="border border-line-strong p-6 bg-bone-100/50 flex flex-col justify-between">
                <div className="w-6 h-6 bg-ink grid place-items-center text-bone font-mono text-[10px]">{idx + 1}</div>
                <div className="mt-6">
                  <h4 className="font-display text-lg tracking-tight uppercase font-bold">{col.title}</h4>
                  <p className="text-xs text-ink-500 font-serif mt-2 leading-relaxed">{col.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Why placement cells struggle */}
      <section id="story" ref={storyRef} className="relative px-6 md:px-10 py-24 bg-bone-50 border-b border-line">
        <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-8">
          <div className="story-pin col-span-12 md:col-span-4 self-start md:sticky md:top-24 h-fit">
            <div className="font-mono text-[9px] tracking-[0.28em] text-ink-400">§ THE CAMPUS CHALLENGE</div>
            <h2 className="font-display text-5xl md:text-6xl tracking-tightest mt-3 leading-[0.96] uppercase" data-testid="story-title">
              Why placement cells<br />struggle to scale.
            </h2>
            <p className="font-serif text-lg text-ink-500 mt-5 max-w-md">
              Placement administration isn't about lack of effort—it's about lack of an integrated operating environment.
            </p>
          </div>
          <div className="col-span-12 md:col-span-8 space-y-32 pt-8">
            {[
              { tag: "DISRUPTION · 01", title: "Gut-feel student assessments", body: "TPOs currently assess placement readiness using CGPA. But CGPA doesn't tell if a student can build a clean React layout, solve a complex array problem, or perform confidently in front of a senior technical panel." },
              { tag: "DISRUPTION · 02", title: "Unmeasurable training ROI", body: "Campus training programs cost lakhs of rupees, yet completion percentages and student progression rates are compiled manually weeks after the final drive has closed." },
              { tag: "DISRUPTION · 03", title: "Opaque recruiter relationships", body: "Drives are scheduled on the fly, resume PDF versions are sent back and forth via email, and the status of recruiter selection pipelines remains a black box until the final offers are hand-delivered." },
              { tag: "DISRUPTION · 04", title: "MOU compliance blindspots", body: "Institutional partnerships have active legal guidelines and revenue share clauses. When these live in file cabinets, renewals slip past and audit trails are nonexistent." },
            ].map((s, i) => (
              <div key={i} className="story-step opacity-0 translate-y-12" data-testid={`story-step-${i}`}>
                <div className="font-mono text-[9px] tracking-[0.28em] text-accent">{s.tag}</div>
                <h3 className="font-display text-4xl md:text-5xl tracking-tightest mt-3 leading-[0.96] uppercase">{s.title}</h3>
                <p className="font-serif text-lg text-ink-700 mt-4 max-w-xl">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Why readiness is invisible */}
      <section className="relative px-6 md:px-10 py-24 bg-paper border-b border-line">
        <div className="max-w-[1440px] mx-auto text-center space-y-6">
          <Badge variant="outline">THE LAGGING INDICATOR</Badge>
          <h2 className="font-display text-5xl md:text-7xl tracking-tightest uppercase leading-[0.95] max-w-4xl mx-auto">
            Why readiness is invisible<br />on the traditional roster.
          </h2>
          <p className="font-serif text-lg text-ink-500 max-w-2xl mx-auto">
            A student's CGPA is a lag score. It measures historical academic exam marks, not present market capabilities. True placement readiness is a composite algorithm that aggregates five live vectors.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-12 text-left">
            {[
              { l: "DSA Mastery", desc: "Problems completed across 18 core topics and 474 problems of Striver A2Z sheet." },
              { l: "ATS Score", desc: "A score on resume parser keyword density, format compatibility, and layout structure." },
              { l: "Aptitude Speed", desc: "Avg speed and accuracy tracked across Quant, Reasoning, and Verbal ability sessions." },
              { l: "Interview Rubric", desc: "Average confidence, communication, and technical depth scores from mock panels." },
              { l: "Consistency index", desc: "Frequency and progression of active preparation over a rolling 30-day window." }
            ].map((item, i) => (
              <div key={i} className="border border-line-strong p-6 bg-bone-100/50 flex flex-col justify-between">
                <span className="font-mono text-xs text-accent">VECTOR {String(i + 1).padStart(2, "0")}</span>
                <div className="mt-4">
                  <h4 className="font-display text-lg tracking-tight uppercase font-bold">{item.l}</h4>
                  <p className="text-xs text-ink-500 font-serif mt-2 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sections 5, 6, 7, 8: The Intelligence Canvas */}
      <section id="intelligence" className="relative px-6 md:px-10 py-24 bg-ink text-bone border-b border-line">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-12 gap-8 mb-14">
            <div className="col-span-12 md:col-span-6">
              <div className="font-mono text-[9px] tracking-[0.28em] text-bone/45">§ THE INTELLIGENCE MATRIX</div>
              <h2 className="font-display text-5xl md:text-7xl tracking-tightest mt-3 leading-[0.92] uppercase" data-testid="modules-title">
                One integrated canvas.<br /><span className="text-accent">Zero spreadsheets.</span>
              </h2>
            </div>
            <div className="col-span-12 md:col-span-5 md:col-start-8 self-end">
              <p className="font-serif text-lg text-bone/70" data-testid="modules-subtitle">
                CareerOS consolidates the entire placement operation into four key intelligence modules, each replacing dozens of manually compiled sheets.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            {/* Section 5: Student Intelligence */}
            <div className="col-span-12 md:col-span-6 border border-bone/15 p-8 flex flex-col justify-between min-h-[300px]" data-testid="module-01">
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs text-bone/45">MODULE 01 / STUDENT</span>
                <Users className="text-accent" size={20} />
              </div>
              <div>
                <h3 className="font-display text-3xl tracking-tight uppercase mt-8">Student Intelligence</h3>
                <p className="text-bone/60 text-sm font-serif mt-3">
                  Consolidated readiness index derived in real-time from active prep vectors. Connects student academic history directly with active placement eligibility.
                </p>
              </div>
            </div>

            {/* Section 6: Training Intelligence */}
            <div className="col-span-12 md:col-span-6 border border-bone/15 p-8 flex flex-col justify-between min-h-[300px]" data-testid="module-02">
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs text-bone/45">MODULE 02 / TRAINING</span>
                <Activity className="text-accent" size={20} />
              </div>
              <div>
                <h3 className="font-display text-3xl tracking-tight uppercase mt-8">Training Intelligence</h3>
                <p className="text-bone/60 text-sm font-serif mt-3">
                  Classroom training completion metrics, automatic weak-student intervention cues, and speed/accuracy analytics.
                </p>
              </div>
            </div>

            {/* Section 7: Recruiter Intelligence */}
            <div className="col-span-12 md:col-span-6 border border-bone/15 p-8 flex flex-col justify-between min-h-[300px]" data-testid="module-08">
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs text-bone/45">MODULE 03 / RECRUITER</span>
                <Briefcase className="text-accent" size={20} />
              </div>
              <div>
                <h3 className="font-display text-3xl tracking-tight uppercase mt-8">Recruiter Intelligence</h3>
                <p className="text-bone/60 text-sm font-serif mt-3">
                  Recruiter candidate discovery, automated calendar schedules, and selection funnels. Elevates the student pipeline into a professional recruitment workspace.
                </p>
              </div>
            </div>

            {/* Section 8: Placement Intelligence */}
            <div className="col-span-12 md:col-span-6 border border-bone/15 p-8 flex flex-col justify-between min-h-[300px]" data-testid="module-07">
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs text-bone/45">MODULE 04 / PLACEMENT</span>
                <Database className="text-accent" size={20} />
              </div>
              <div>
                <h3 className="font-display text-3xl tracking-tight uppercase mt-8">Placement Intelligence</h3>
                <p className="text-bone/60 text-sm font-serif mt-3">
                  A multi-year ledger of drives, CTC package ranges, and department-wise outcomes, delivering data-driven forecasting directly to the TPO command center.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 9: Pinned product walkthrough */}
      <section id="walkthrough" ref={walkthroughRef} className="relative px-6 md:px-10 py-24 bg-paper border-b border-line">
        <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-8 items-start">
          <div className="col-span-12 md:col-span-5 space-y-6 md:sticky md:top-24">
            <Badge variant="solid">PRODUCT TOUR</Badge>
            <h2 className="font-display text-5xl tracking-tightest leading-[0.9] uppercase">
              Role Workspaces
            </h2>
            <p className="font-serif text-lg text-ink-600 max-w-md">
              Every user role has an interface customized for their operational needs. Explore the four distinct interfaces.
            </p>
            <div className="space-y-2 pt-4">
              {walkthroughSteps.map((step, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveWalkthrough(idx)}
                  className={`w-full text-left p-4 border transition-all flex items-center justify-between font-mono text-xs uppercase tracking-wider ${
                    activeWalkthrough === idx
                      ? "bg-ink text-bone border-ink"
                      : "bg-bone-100 hover:bg-bone-200 border-line-strong"
                  }`}
                >
                  <span>{step.title}</span>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-12 md:col-span-7 border border-line-strong p-8 bg-bone-50/50 space-y-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">
              {walkthroughSteps[activeWalkthrough].role}
            </div>
            <h3 className="font-display text-3xl tracking-tight uppercase text-accent">
              {walkthroughSteps[activeWalkthrough].title}
            </h3>
            <p className="font-serif text-base text-ink-600 leading-relaxed">
              {walkthroughSteps[activeWalkthrough].desc}
            </p>

            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-line-strong">
              {walkthroughSteps[activeWalkthrough].kpis.map((kpi, i) => (
                <div key={i} className="border border-line bg-paper p-4 text-center">
                  <div className="font-mono text-[9px] text-ink-400">V3 STANDARD</div>
                  <div className="font-display text-lg mt-2 truncate font-bold">{kpi}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 10: Live metrics */}
      <section className="relative px-6 md:px-10 py-24 bg-bone-50 border-b border-line">
        <div className="max-w-[1440px] mx-auto text-center space-y-8">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ TELEMETRY STREAM · ACTIVE</div>
          <h2 className="font-display text-5xl md:text-7xl tracking-tightest uppercase leading-[0.95]">
            Placement metrics,<br />measured in real-time.
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto pt-8">
            <div className="border border-line-strong bg-paper p-8 text-center">
              <div className="font-mono text-[10px] text-ink-400 tracking-[0.24em]">SEEDED STUDENTS</div>
              <div className="font-display text-6xl mt-4 text-accent">
                <NumberTicker value={stats?.totals?.students || 470} />
              </div>
            </div>
            <div className="border border-line-strong bg-paper p-8 text-center">
              <div className="font-mono text-[10px] text-ink-400 tracking-[0.24em]">ACTIVE DRIVES</div>
              <div className="font-display text-6xl mt-4">
                <NumberTicker value={stats?.totals?.jobs || 65} />
              </div>
            </div>
            <div className="border border-line-strong bg-paper p-8 text-center">
              <div className="font-mono text-[10px] text-ink-400 tracking-[0.24em]">PARTNER INSTITUTIONS</div>
              <div className="font-display text-6xl mt-4">
                <NumberTicker value={stats?.totals?.institutions || 7} />
              </div>
            </div>
            <div className="border border-line-strong bg-paper p-8 text-center">
              <div className="font-mono text-[10px] text-ink-400 tracking-[0.24em]">COMPLETED OUTCOMES</div>
              <div className="font-display text-6xl mt-4">
                <NumberTicker value={955} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 11: Institution outcomes */}
      <section id="outcomes" className="px-6 md:px-10 py-24 bg-paper">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-12 gap-8 mb-10">
            <div className="col-span-12 md:col-span-6">
              <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ LIVE LEDGER</div>
              <h2 className="font-display text-5xl md:text-6xl tracking-tightest mt-3 uppercase">Top selections on record.</h2>
            </div>
            <div className="col-span-12 md:col-span-5 md:col-start-8 self-end">
              <p className="font-serif text-lg text-ink-700">Pulled live from the placement database. Sorted by all-time selections.</p>
            </div>
          </div>

          <div className="editorial border border-line-strong bg-paper">
            <div className="grid grid-cols-12 px-6 py-3 border-b border-line-strong bg-bone-100 font-mono text-[10px] tracking-[0.24em] text-ink-400 uppercase">
              <div className="col-span-1">#</div>
              <div className="col-span-5">RECRUITER</div>
              <div className="col-span-3 text-right">SELECTS · ALL TIME</div>
              <div className="col-span-3 text-right">MAX CTC</div>
            </div>
            {(stats?.top_recruiters || []).slice(0, 12).map((r, i) => (
              <div key={r.company} className="grid grid-cols-12 px-6 py-5 border-b border-line items-center hover:bg-bone-100/50 transition-colors group" data-testid={`recruiter-row-${i}`}>
                <div className="col-span-1 font-mono text-sm text-ink-400">{String(i + 1).padStart(2, "0")}</div>
                <div className="col-span-5 font-display text-2xl tracking-tight group-hover:text-accent transition-colors uppercase font-bold">{r.company}</div>
                <div className="col-span-3 text-right font-mono text-lg tnum">{r.selects}</div>
                <div className="col-span-3 text-right font-mono text-lg text-accent tnum font-bold">₹{r.max_ctc?.toFixed(1)}LPA</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 12: Final CTA */}
      <section id="cta" className="px-6 md:px-10 py-36 bg-ink text-bone relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto relative">
          <div className="font-mono text-[11px] tracking-[0.28em] text-bone/45">§ GET ACCESS</div>
          <h2 className="font-display text-6xl md:text-[8vw] tracking-tightest leading-[0.9] mt-6 max-w-5xl uppercase">
            Bring your placement cell<br /><span className="text-accent">into the present.</span>
          </h2>
          <p className="font-serif text-xl text-bone/70 mt-8 max-w-2xl">
            Verified institutional partners only. Onboarding takes 9 minutes — Google OAuth + super-admin approval.
          </p>
          <div className="mt-12 flex flex-wrap gap-4">
            <Link to="/login" data-testid="footer-cta-primary" className="inline-flex items-center gap-3 bg-accent text-bone px-8 py-5 text-base font-mono uppercase tracking-wider hover:bg-bone hover:text-ink transition-colors">
              Request access <ArrowUpRight size={18} />
            </Link>
            <a href="mailto:hello@careeros.app" className="inline-flex items-center gap-3 border border-bone/35 px-8 py-5 text-base font-mono uppercase tracking-wider hover:border-accent hover:text-accent transition-colors">
              Talk to founders
            </a>
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-10 py-10 border-t border-line bg-bone-100">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-ink grid place-items-center"><div className="w-1.5 h-1.5 bg-accent" /></div>
            <span className="font-mono text-[11px] tracking-[0.24em] text-ink-500">CAREEROS · PLATFORM LAYER · {new Date().getFullYear()}</span>
          </div>
          <div className="font-mono text-[11px] tracking-[0.24em] text-ink-400">DATA SEEDED FROM KMIT.IN/PLACEMENTS · 2017–2026</div>
        </div>
      </footer>
    </main>
  );
}
