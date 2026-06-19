import React from 'react';
import { ArrowRight } from 'lucide-react';
import { trustLogos } from '../../mock';

// Stylized wordmarks for the homepage trust grid.
const wordmarks = {
  'Mistral AI': (
    <span className="flex items-center gap-1">
      <span className="inline-block w-5 h-5 rounded-sm" style={{ background: 'linear-gradient(180deg, #e8400d 0%, #ffef99 100%)' }} />
      <span className="text-[19px] font-bold tracking-tight2 text-[#111111]">Mistral AI</span>
    </span>
  ),
  'Pylon': (
    <span className="text-[22px] font-medium tracking-[-0.04em] text-[#111111] italic">pylon</span>
  ),
  'Omni': (
    <span className="flex items-center gap-1.5">
      <span className="inline-block w-4 h-4 rounded-full ring-2 ring-[#111] ring-inset" />
      <span className="text-[20px] font-bold tracking-tight2 text-[#111111]">Omni</span>
    </span>
  ),
  'Wasabi': (
    <span className="text-[22px] font-black tracking-tight2 text-[#111111] uppercase">Wasabi</span>
  ),
  'Ceros': (
    <span className="text-[22px] font-medium tracking-[0.08em] text-[#111111] uppercase">CEROS</span>
  ),
  'CLARA': (
    <span className="text-[22px] font-bold tracking-[0.18em] text-[#111111]">CLARA</span>
  ),
  'Momentum': (
    <span className="flex items-center gap-1.5">
      <svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 2 L22 22 L2 22 Z" fill="#111" /></svg>
      <span className="text-[20px] font-medium tracking-tight2 text-[#111111]">Momentum</span>
    </span>
  ),
  'Cerebras': (
    <span className="text-[22px] font-medium tracking-tight2 text-[#111111]" style={{ fontStyle: 'italic' }}>Cerebras</span>
  ),
};

export default function TrustGrid() {
  return (
    <section className="bg-white py-24 border-y border-[#1111110a]">
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4f3ef] ring-1 ring-[#1111110a] text-[11px] uppercase tracking-eyebrow text-[#6d6c6b] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e8400d]" />
            Customers
          </div>
          <h2 className="mt-4 text-[32px] md:text-[44px] font-medium text-[#111111] leading-[1.05]" style={{ letterSpacing: '-0.04em' }}>
            Trusted by thousands of teams
          </h2>
          <p className="mt-3 text-[15px] text-[#6d6c6b]">High-performing placement teams use CareerOS to connect preparation with outcomes.</p>
        </div>

        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 border-t border-l border-[#1111110d]">
          {trustLogos.map((l) => (
            <a key={l.name} href="/login" className="group relative block text-center py-10 px-6 border-b border-r border-[#1111110d] hover:bg-[#f4f3ef] transition-colors">
              <div className="flex items-center justify-center h-10">
                {wordmarks[l.name] || <span className="text-[20px] font-bold tracking-tight2 text-[#111111]">{l.name}</span>}
              </div>
              <div className="mt-4 text-[12px] text-[#6d6c6b]">{l.migrated}</div>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#111111] opacity-0 group-hover:opacity-100 transition-opacity">
                See story <ArrowRight className="w-3 h-3" />
              </div>
            </a>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12px] text-[#6d6c6b]">
          <span>470+ seeded students</span>
          <span className="w-1 h-1 rounded-full bg-[#1111111a]" />
          <span>13 intelligence modules</span>
          <span className="w-1 h-1 rounded-full bg-[#1111111a]" />
          <span>455 Striver A2Z questions</span>
          <span className="w-1 h-1 rounded-full bg-[#1111111a]" />
          <span>4.8/5 average rating</span>
        </div>
      </div>
    </section>
  );
}
