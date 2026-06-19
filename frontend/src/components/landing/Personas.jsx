import React, { useState } from 'react';
import { ArrowRight, Plus, Target, Clock, Rocket, Zap, BarChart3, Megaphone, TrendingUp, CheckCircle2 } from 'lucide-react';
import { personas } from '../../mock';

const personaVisuals = {
  sellers: {
    bg: '#ffd7f0',
    accent: '#e8400d',
    title: 'My day',
    items: [
      { icon: Target, label: 'Weak topics due', value: '3' },
      { icon: Clock, label: 'Practice streak', value: '12d' },
      { icon: CheckCircle2, label: 'Mock tests done', value: '7' },
    ],
  },
  leaders: {
    bg: '#e2ddfd',
    accent: '#10054d',
    title: 'Team performance',
    items: [
      { icon: TrendingUp, label: 'Applied to interview', value: '3.2x' },
      { icon: Rocket, label: 'Drives active', value: '6 of 6' },
      { icon: BarChart3, label: 'Offer value', value: '2.4Cr' },
    ],
  },
  founders: {
    bg: '#ffef99',
    accent: '#e8400d',
    title: 'Coaching this quarter',
    items: [
      { icon: Rocket, label: 'Risk reduced', value: '3x' },
      { icon: Target, label: 'Weak students', value: '184' },
      { icon: CheckCircle2, label: 'Reviews done', value: '42' },
    ],
  },
  revops: {
    bg: '#b7efb2',
    accent: '#10054d',
    title: 'Operations health',
    items: [
      { icon: Zap, label: 'Placement lift', value: '+30%' },
      { icon: BarChart3, label: 'Data accuracy', value: '99.4%' },
      { icon: CheckCircle2, label: 'Students tracked', value: '1,284' },
    ],
  },
  marketers: {
    bg: '#e2ddfd',
    accent: '#e8400d',
    title: 'Campaigns running',
    items: [
      { icon: Megaphone, label: 'Open roles', value: '12' },
      { icon: TrendingUp, label: 'Shortlist lift', value: '+48%' },
      { icon: Target, label: 'Interview rate', value: '36%' },
    ],
  },
};

export default function Personas() {
  const [active, setActive] = useState('sellers');
  const current = personas.find((p) => p.key === active);
  const v = personaVisuals[active];

  return (
    <section className="relative bg-white py-24 overflow-hidden">
      <div className="absolute right-0 top-20 w-[480px] h-[480px] pointer-events-none opacity-50" style={{
        background: 'radial-gradient(circle, rgba(232, 64, 13, 0.12) 0%, rgba(255,255,255,0) 70%)'
      }} />
      <div className="relative max-w-[1200px] mx-auto px-5">
        <h2 className="font-display font-medium text-[#111111] leading-[1.02] text-[40px] md:text-[60px] max-w-3xl" style={{ letterSpacing: '-0.045em' }}>
          Built for every placement role
        </h2>

        {/* Tabs desktop */}
        <div className="hidden md:flex mt-12 gap-2 flex-wrap">
          {personas.map((p) => (
            <button
              key={p.key}
              onClick={() => setActive(p.key)}
              className={`px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
                active === p.key
                  ? 'bg-[#111111] text-white shadow-card-xl'
                  : 'bg-[#f4f3ef] text-[#111111] hover:bg-[#ecebea]'
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>

        {/* Active panel - desktop */}
        <div key={active} className="hidden md:grid mt-6 grid-cols-[1.05fr_1fr] gap-8 items-stretch bg-[#f4f3ef] rounded-3xl p-8 md:p-12 animate-in fade-in duration-300">
          <div className="flex flex-col">
            <div className="text-[12px] uppercase tracking-eyebrow text-[#6d6c6b] font-medium mb-3">
              For {current.title}
            </div>
            <h3 className="font-display font-medium text-[#111111] leading-[1.05] text-[34px] md:text-[44px]" style={{ letterSpacing: '-0.04em' }}>
              {current.heading}
            </h3>
            <a href="/login" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-[#111111] hover:underline">
              {current.link} <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <div className="mt-auto pt-8 grid sm:grid-cols-2 gap-6">
              {current.points.map((pt) => (
                <div key={pt.h}>
                  <h4 className="text-[18px] font-medium text-[#111111] tracking-tight2 leading-snug">{pt.h}</h4>
                  <p className="mt-2 text-[14px] text-[#6d6c6b] leading-relaxed">{pt.p}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right visual panel */}
          <div className="relative rounded-2xl bg-white ring-subtle overflow-hidden">
            <div className="absolute inset-0" style={{
              background: `radial-gradient(60% 80% at 30% 20%, ${v.bg}cc 0%, transparent 60%), radial-gradient(70% 70% at 100% 100%, ${v.bg}80 0%, transparent 60%), #ffffff`
            }} />
            <div className="relative p-6 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-eyebrow text-[#6d6c6b] font-medium">{v.title}</div>
                <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white ring-1 ring-[#1111110d]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b7efb2]" /> Live
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {v.items.map((it, i) => {
                  const I = it.icon;
                  return (
                    <div key={i} className="rounded-xl bg-white ring-1 ring-[#1111110d] p-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: v.bg }}>
                        <I className="w-3.5 h-3.5 text-[#111111]" />
                      </div>
                      <div className="mt-3 text-[22px] font-medium text-[#111111] leading-none" style={{ letterSpacing: '-0.03em' }}>{it.value}</div>
                      <div className="mt-1 text-[10px] text-[#6d6c6b]">{it.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Activity feed */}
              <div className="mt-4 flex-1 rounded-xl bg-white ring-1 ring-[#1111110d] p-3 overflow-hidden">
                <div className="text-[10px] uppercase tracking-eyebrow text-[#6d6c6b] mb-2">Activity</div>
                <div className="space-y-1.5">
                  {[
                    { d: 'AI', t: 'Flagged 18 students for aptitude coaching' },
                    { d: '2h', t: 'Interview slot booked with Google panel' },
                    { d: '4h', t: 'Rahul crossed 80 readiness' },
                    { d: '1d', t: 'MOU renewal moved to approval' },
                  ].map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <span className="inline-flex items-center justify-center text-[9px] font-medium px-1.5 py-0.5 rounded text-[#111111]" style={{ background: v.bg }}>
                        {a.d}
                      </span>
                      <span className="text-[#111111] truncate">{a.t}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA chip */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg ring-1 ring-[#1111110d] text-[11px] text-[#6d6c6b] truncate">
                  Ask CareerOS: "Find cloud-ready students for Google"
                </div>
                <button className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#111111] text-white text-[11px] font-medium">
                  Run <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile accordion */}
        <div className="md:hidden mt-8 space-y-3">
          {personas.map((p) => (
            <details key={p.key} className="bg-[#f4f3ef] rounded-xl p-5">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span>
                  <div className="text-[12px] uppercase tracking-eyebrow text-[#6d6c6b]">{p.title}</div>
                  <div className="text-[20px] font-medium text-[#111111] tracking-tight2 mt-1">{p.heading}</div>
                </span>
                <Plus className="w-5 h-5 text-[#111111]" />
              </summary>
              <div className="mt-4 space-y-4">
                {p.points.map((pt) => (
                  <div key={pt.h}>
                    <h4 className="text-[15px] font-medium text-[#111111]">{pt.h}</h4>
                    <p className="mt-1 text-[13px] text-[#6d6c6b]">{pt.p}</p>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
