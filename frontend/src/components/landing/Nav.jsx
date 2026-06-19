import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { navLinks } from '../../mock';

const Logo = () => (
  <a href="/" className="flex items-center gap-1.5" aria-label="CareerOS">
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2 L30 28 L24 28 L21.5 23 L10.5 23 L8 28 L2 28 Z M13 18 L19 18 L16 11.5 Z" fill="#111111"/>
      <circle cx="26" cy="6" r="2.5" fill="#e8400d"/>
    </svg>
    <span className="text-[17px] font-medium tracking-tight2 text-[#111111]">CareerOS</span>
  </a>
);

export default function Nav() {
  const [open, setOpen] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed top-3 left-0 right-0 z-50 px-4 flex justify-center">
      <nav
        className={`w-full max-w-[1200px] bg-white rounded-[14px] ring-subtle transition-all duration-300 ${scrolled ? 'shadow-card-xl' : ''}`}
        onMouseLeave={() => setOpen(null)}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-6">
            <Logo />
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((l) => (
                <div
                  key={l.label}
                  className="relative"
                  onMouseEnter={() => l.hasDropdown && setOpen(l.label)}
                >
                  <button className="flex items-center gap-1 px-3 py-2 text-[14px] font-medium text-[#111111] hover:bg-[#f4f3ef] rounded-lg transition-colors">
                    {l.label}
                    {l.hasDropdown && (
                      <ChevronDown className="w-3.5 h-3.5 text-[#6d6c6b]" strokeWidth={2} />
                    )}
                  </button>
                  {l.hasDropdown && open === l.label && (
                    <div className="absolute left-0 top-full mt-2 w-[320px] bg-white rounded-xl ring-subtle shadow-card-xl p-2 z-50">
                      {l.items.map((it) => (
                        <a
                          key={it.title}
                          href="/login"
                          className="block px-3 py-2.5 rounded-lg hover:bg-[#f4f3ef] transition-colors"
                        >
                          <div className="text-[14px] font-medium text-[#111111]">{it.title}</div>
                          <div className="text-[12px] text-[#6d6c6b] mt-0.5">{it.desc}</div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/login" className="hidden sm:inline-flex items-center px-3.5 py-2 text-[14px] font-medium text-[#111111] bg-white border border-[#111111] rounded-lg hover:bg-[#f4f3ef] transition-colors">
              Open app
            </a>
            <a href="/login" className="inline-flex items-center px-3.5 py-2 text-[14px] font-medium text-white bg-[#111111] rounded-lg hover:bg-[#272625] transition-colors">
              Request demo
            </a>
          </div>
        </div>
      </nav>
    </div>
  );
}
