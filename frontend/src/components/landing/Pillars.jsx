import React from 'react';
import { Database, Send, Inbox, Brain, Search, Filter, Mail, Phone, Linkedin, CheckCircle2, AlertCircle, Sparkles, TrendingUp, MessageSquare } from 'lucide-react';
import { pillars, cabifyQuote } from '../../mock';

const tileMap = {
  blush: { bg: '#ffd7f0', icon: Database },
  mint: { bg: '#b7efb2', icon: Send },
  yellow: { bg: '#ffef99', icon: Inbox },
  lilac: { bg: '#e2ddfd', icon: Brain },
};

// Product mock: Lead Generation / Search
const LeadGenMock = () => (
  <div className="relative rounded-xl ring-subtle bg-white overflow-hidden h-[280px]">
    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,215,240,0.35) 0%, #ffffff 70%)' }} />
    <div className="relative p-4">
      {/* search bar */}
      <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-white ring-1 ring-[#1111110d]">
        <Search className="w-3.5 h-3.5 text-[#6d6c6b]" />
        <div className="text-[12px] text-[#111111] font-medium">CSE students - Python - 75+ readiness</div>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[#6d6c6b]">
          <Filter className="w-3 h-3" /> 6 filters
        </span>
      </div>
      <div className="mt-3 text-[10px] uppercase tracking-eyebrow text-[#6d6c6b] flex items-center justify-between">
        <span>284 eligible student profiles</span>
        <span className="inline-flex items-center gap-1 text-[#111111]"><Sparkles className="w-3 h-3" /> AI ranked</span>
      </div>
      <div className="mt-2 space-y-1.5">
        {[
          { n: 'Rahul Pillai', r: 'CSE - AI/ML', sig: 'ATS 86', t: 'pink' },
          { n: 'Ananya Rao', r: 'ECE - Data', sig: 'DSA 92', t: 'mint' },
          { n: 'Priya Patel', r: 'IT - Cloud', sig: 'Mock ready', t: 'lilac' },
          { n: 'Arjun Menon', r: 'CSE - Backend', sig: 'CGPA 8.7', t: 'yellow' },
        ].map((p, i) => (
          <div key={i} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-white ring-1 ring-[#1111110d]">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-[#111111]" style={{ background: ({pink:'#ffd7f0',mint:'#b7efb2',lilac:'#e2ddfd',yellow:'#ffef99'})[p.t] }}>
              {p.n.split(' ').map(x=>x[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-[#111111] truncate">{p.n}</div>
              <div className="text-[10px] text-[#6d6c6b] truncate">{p.r}</div>
            </div>
            <div className="text-[9px] font-medium px-1.5 py-0.5 rounded-md text-[#111111]" style={{ background: ({pink:'#ffd7f0',mint:'#b7efb2',lilac:'#e2ddfd',yellow:'#ffef99'})[p.t] }}>{p.sig}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Product mock: Multichannel Engagement / Sequence
const EngagementMock = () => (
  <div className="relative rounded-xl ring-subtle bg-white overflow-hidden h-[280px]">
    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(183,239,178,0.35) 0%, #ffffff 70%)' }} />
    <div className="relative p-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-medium text-[#111111]">Google Drive - Stage 3 of 7</div>
        <div className="text-[10px] text-[#6d6c6b]">62% conversion</div>
      </div>
      <div className="mt-3 grid grid-cols-[24px_1fr] gap-x-3 gap-y-2">
        {[
          { ch: 'email', icon: Mail, title: 'Eligibility verified', meta: 'Day 1 - 289 applied', state: 'done' },
          { ch: 'social', icon: Linkedin, title: 'Assessment shortlist', meta: 'Day 2 - 178 eligible', state: 'done' },
          { ch: 'voice', icon: Phone, title: 'Interview scheduling', meta: 'Day 4 - 72 slots', state: 'active' },
          { ch: 'email', icon: Mail, title: 'Panel feedback', meta: 'Day 6', state: 'idle' },
          { ch: 'social', icon: MessageSquare, title: 'Offer release', meta: 'Day 9', state: 'idle' },
        ].map((s, i) => {
          const I = s.icon;
          const state = s.state;
          return (
            <React.Fragment key={i}>
              <div className="relative flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${state==='done' ? 'bg-[#111111] text-white' : state==='active' ? 'bg-[#b7efb2] text-[#111111] ring-2 ring-[#111111]' : 'bg-white ring-1 ring-[#1111111a] text-[#6d6c6b]'}`}>
                  <I className="w-3 h-3" />
                </div>
                {i < 4 && <div className="w-px flex-1 bg-[#1111111a] mt-0.5" style={{ minHeight: 12 }} />}
              </div>
              <div className="pb-1">
                <div className="text-[11px] font-medium text-[#111111]">{s.title}</div>
                <div className="text-[10px] text-[#6d6c6b] flex items-center gap-1.5">
                  <span>{s.meta}</span>
                  {state==='active' && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#b7efb2] text-[#111111] font-medium">running</span>}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  </div>
);

// Product mock: Deliverability
const DeliverabilityMock = () => (
  <div className="relative rounded-xl ring-subtle bg-white overflow-hidden h-[280px]">
    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,239,153,0.35) 0%, #ffffff 70%)' }} />
    <div className="relative p-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-medium text-[#111111]">Institution Health Center</div>
        <div className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-[#b7efb2] text-[#111111] font-medium">
          <CheckCircle2 className="w-2.5 h-2.5" /> Healthy
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { v: '82%', l: 'Readiness' },
          { v: '74%', l: 'Placed' },
          { v: '18', l: 'Risk' },
        ].map((s, i) => (
          <div key={i} className="rounded-lg ring-1 ring-[#1111110d] p-2.5">
            <div className="text-[18px] font-medium text-[#111111] tracking-tight2 leading-none">{s.v}</div>
            <div className="text-[10px] text-[#6d6c6b] mt-1">{s.l}</div>
          </div>
        ))}
      </div>
      {/* bar chart */}
      <div className="mt-3 rounded-lg ring-1 ring-[#1111110d] p-2.5">
        <div className="text-[10px] text-[#6d6c6b] mb-1.5">Placement readiness - last 14 days</div>
        <div className="flex items-end gap-1 h-12">
          {[40, 55, 48, 62, 70, 58, 78, 82, 75, 88, 92, 80, 95, 90].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 13 ? '#111111' : '#ffef99' }} />
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex items-center gap-1 text-[10px] text-[#6d6c6b]">
          <AlertCircle className="w-2.5 h-2.5 text-[#e8400d]" />
          Coaching sprint recommended for ECE aptitude
        </div>
      </div>
    </div>
  </div>
);

// Product mock: CareerOS Copilot
const IntelligenceMock = () => (
  <div className="relative rounded-xl ring-subtle bg-white overflow-hidden h-[280px]">
    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(226,221,253,0.45) 0%, #ffffff 70%)' }} />
    <div className="relative p-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-[#10054d] flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
        <div className="text-[12px] font-medium text-[#111111]">CareerOS Copilot</div>
        <div className="ml-auto text-[10px] text-[#6d6c6b]">Today - 14 new signals</div>
      </div>
      <div className="mt-3 rounded-lg ring-1 ring-[#1111110d] p-2.5 bg-white">
        <div className="text-[10px] uppercase tracking-eyebrow text-[#6d6c6b] mb-1">Today's top opportunity</div>
        <div className="text-[12px] font-medium text-[#111111] leading-snug">Google cloud role needs Python, CN, and ATS keywords - 42 students are near-ready.</div>
        <div className="mt-2 flex items-center gap-1.5">
          <button className="text-[10px] px-2 py-1 rounded-md bg-[#111111] text-white font-medium">Create shortlist</button>
          <button className="text-[10px] px-2 py-1 rounded-md ring-1 ring-[#1111111a] text-[#111111] font-medium">Skip</button>
        </div>
      </div>
      <div className="mt-2 space-y-1.5">
        {[
          { tag: 'Aptitude', txt: 'Blood Relations accuracy dropped in section B', tone: '#ffd7f0' },
          { tag: 'ATS', txt: 'Missing Kubernetes keyword for cloud role', tone: '#b7efb2' },
          { tag: 'Interview', txt: 'Confidence improved after mock round', tone: '#ffef99' },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg ring-1 ring-[#1111110d] bg-white">
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded text-[#111111]" style={{ background: s.tone }}>{s.tag}</span>
            <div className="text-[11px] text-[#111111] truncate flex-1">{s.txt}</div>
            <TrendingUp className="w-3 h-3 text-[#6d6c6b]" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const mockMap = [LeadGenMock, EngagementMock, DeliverabilityMock, IntelligenceMock];

export default function Pillars() {
  return (
    <section className="relative bg-white py-24 overflow-hidden">
      {/* atmospheric cool gradient corner */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:
          'radial-gradient(70% 60% at 100% 0%, rgba(226, 221, 253, 0.7) 0%, rgba(183, 239, 178, 0.3) 40%, rgba(255,255,255,0) 70%), radial-gradient(50% 50% at 0% 100%, rgba(255, 215, 240, 0.4) 0%, rgba(255,255,255,0) 70%), #ffffff'
      }} />
      <div className="relative max-w-[1200px] mx-auto px-5">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="font-display font-medium text-[#111111] leading-[1.02] text-[40px] md:text-[60px]" style={{ letterSpacing: '-0.045em' }}>
            All-in-one platform to run placement intelligence
          </h2>
          <p className="mt-5 text-[18px] text-[#6d6c6b] tracking-tight2">
            Give every placement team the power to prepare, forecast, coach, shortlist, and report with confidence.
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-2 gap-5">
          {pillars.map((p, i) => {
            const tile = tileMap[p.tile];
            const Icon = tile.icon;
            const MockComp = mockMap[i];
            return (
              <div key={p.title} className="rounded-2xl bg-white ring-subtle p-6 md:p-8 hover:shadow-card-xl transition-shadow group">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: tile.bg }}>
                    <Icon className="w-5 h-5 text-[#111111]" strokeWidth={2} />
                  </div>
                  <div className="text-[12px] font-medium tracking-eyebrow uppercase text-[#6d6c6b]">{p.eyebrow}</div>
                </div>
                <h3 className="mt-5 text-[26px] md:text-[32px] font-medium text-[#111111] leading-[1.05]" style={{ letterSpacing: '-0.035em' }}>
                  {p.title}
                </h3>
                <p className="mt-3 text-[15px] text-[#6d6c6b] leading-relaxed">{p.desc}</p>
                <div className="mt-6">
                  <MockComp />
                </div>
              </div>
            );
          })}
        </div>

        {/* Cabify quote */}
        <div className="mt-20 max-w-3xl mx-auto text-center">
          <p className="text-[24px] md:text-[38px] font-medium text-[#111111] leading-[1.1]" style={{ letterSpacing: '-0.04em' }}>
            "{cabifyQuote.quote}"
          </p>
          <div className="mt-6 pt-6 border-t border-[#1111111a] flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffef99] to-[#b7efb2] flex items-center justify-center text-[13px] font-bold text-[#111111]">AG</div>
            <div className="text-left">
              <div className="text-[14px] font-medium text-[#111111]">{cabifyQuote.name}</div>
              <div className="text-[12px] text-[#6d6c6b]">{cabifyQuote.role} - {cabifyQuote.company}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
