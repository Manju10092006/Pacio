import React from 'react';
import { footerCols } from '../../mock';
import { Twitter, Linkedin, Youtube, Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#1111111a]">
      <div className="max-w-[1200px] mx-auto px-5 pt-20 pb-10">
        <div className="grid lg:grid-cols-[1.4fr_2.5fr] gap-10">
          <div>
            <div className="flex items-center gap-1.5">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none"><path d="M16 2 L30 28 L24 28 L21.5 23 L10.5 23 L8 28 L2 28 Z M13 18 L19 18 L16 11.5 Z" fill="#111111"/><circle cx="26" cy="6" r="2.5" fill="#e8400d"/></svg>
              <span className="text-[17px] font-medium tracking-tight2 text-[#111111]">CareerOS</span>
            </div>
            <p className="mt-5 text-[14px] text-[#6d6c6b] max-w-[320px]">
              The placement intelligence operating system for students, faculty, TPOs, institutions, recruiters, and super admins.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[Twitter, Linkedin, Youtube, Github].map((Icon, i) => (
                <a key={i} href="/login" className="w-9 h-9 rounded-full ring-subtle flex items-center justify-center hover:bg-[#f4f3ef] transition-colors">
                  <Icon className="w-4 h-4 text-[#111111]" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {footerCols.map((c) => (
              <div key={c.title}>
                <div className="text-[12px] font-medium uppercase tracking-eyebrow text-[#6d6c6b]">{c.title}</div>
                <ul className="mt-4 space-y-3">
                  {c.links.map((l) => (
                    <li key={l}>
                      <a href="/login" className="text-[14px] text-[#111111] hover:underline">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-[#1111111a] flex flex-wrap items-center justify-between gap-4">
          <div className="text-[12px] text-[#6d6c6b]">© 2026 CareerOS. All rights reserved.</div>
          <div className="flex items-center gap-5 text-[12px] text-[#6d6c6b]">
            <a href="/login" className="hover:text-[#111111]">Privacy</a>
            <a href="/login" className="hover:text-[#111111]">Terms</a>
            <a href="/login" className="hover:text-[#111111]">Cookies</a>
            <a href="/login" className="hover:text-[#111111]">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
