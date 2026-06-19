import React from 'react';
import { ArrowRight } from 'lucide-react';
import { blogPosts } from '../../mock';

export default function Blog() {
  return (
    <section className="bg-white py-24">
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <h2 className="font-display font-medium text-[#111111] tracking-display leading-[1.05] text-[32px] md:text-[44px]">
            Placement intelligence playbooks
          </h2>
          <a href="/login" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#111111] hover:underline">
            View all articles <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {blogPosts.map((b) => (
            <a key={b.title} href="/login" className="group rounded-2xl ring-subtle bg-white overflow-hidden hover:shadow-card-xl transition-shadow">
              <div className="aspect-[16/10] relative" style={{ background: b.color }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-[18px] font-medium text-[#111111]/70 tracking-tight2 px-6 text-center leading-tight">
                    {b.tag === 'Reports' ? 'Board reports' : b.tag === 'Product' ? 'CareerOS V3' : b.tag === 'Recruiters' ? 'Talent match' : 'Training signals'}
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="text-[11px] uppercase tracking-eyebrow text-[#6d6c6b]">
                  {b.tag} - {b.date}
                </div>
                <h3 className="mt-2 text-[16px] font-medium text-[#111111] tracking-tight2 leading-snug group-hover:underline">
                  {b.title}
                </h3>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
