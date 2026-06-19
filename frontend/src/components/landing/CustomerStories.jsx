import React from 'react';
import { ArrowRight } from 'lucide-react';
import { customerStats, featuredTestimonials } from '../../mock';

const tileColors = ['#ffd7f0', '#b7efb2', '#ffef99', '#e2ddfd', '#ffd7f0', '#b7efb2'];

export default function CustomerStories() {
  return (
    <section className="bg-white py-24">
      <div className="max-w-[1200px] mx-auto px-5">
        <h2 className="font-display font-medium text-[#111111] tracking-display leading-[1.05] text-[36px] md:text-[52px] text-center">
          Real results from real customers
        </h2>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-4">
          {customerStats.map((c, i) => (
            <a key={c.company} href="/login" className="relative group rounded-2xl p-6 md:p-7 overflow-hidden ring-subtle hover:shadow-card-xl transition-shadow" style={{ background: tileColors[i] }}>
              <div className="text-[44px] md:text-[52px] font-medium text-[#111111] tracking-hero leading-none">{c.metric}</div>
              <div className="mt-1 text-[14px] text-[#111111]/70">{c.label}</div>
              <div className="mt-8 flex items-end justify-between">
                <div className="text-[16px] font-bold tracking-tight2 text-[#111111]">{c.company}</div>
                <div className="inline-flex items-center gap-1 text-[13px] text-[#111111] opacity-80 group-hover:opacity-100">
                  Read story <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* 3 featured testimonials */}
        <div className="mt-16 grid md:grid-cols-3 gap-5">
          {featuredTestimonials.map((t) => (
            <div key={t.name} className="rounded-2xl ring-subtle p-6 bg-white">
              <p className="text-[17px] md:text-[19px] font-medium text-[#111111] tracking-tight2 leading-snug">
                "{t.quote}"
              </p>
              <div className="mt-5 pt-5 border-t border-[#1111111a] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#e2ddfd] to-[#ffd7f0] flex items-center justify-center text-[12px] font-bold text-[#111111]">
                  {t.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#111111] truncate">{t.name}</div>
                  <div className="text-[11px] text-[#6d6c6b] truncate">{t.role}</div>
                </div>
                <div className="text-[12px] font-bold tracking-tight2 text-[#111111] truncate max-w-[100px] text-right">{t.company}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
