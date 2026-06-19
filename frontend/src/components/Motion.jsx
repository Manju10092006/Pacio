import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

gsap.registerPlugin(ScrollTrigger);

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// 1. PageTransition (Framer Motion analogue or simple CSS/GSAP reveal)
export function PageTransition({ children, className }) {
  const ref = useRef(null);
  useEffect(() => {
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
    );
  }, []);
  return <div ref={ref} className={cn("w-full", className)}>{children}</div>;
}

// 2. CounterAnimation
export function CounterAnimation({ value, duration = 1.5, className }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10) || 0;
    if (start === end) return;

    let totalMiliseconds = duration * 1000;
    let incrementTime = Math.abs(Math.floor(totalMiliseconds / end));
    if (incrementTime < 10) incrementTime = 10; // clamp speed

    let timer = setInterval(() => {
      start += Math.ceil(end / 100);
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span className={cn("tnum", className)} ref={ref}>{count}</span>;
}

// 3. RevealText
export function RevealText({ children, delay = 0, className }) {
  const ref = useRef(null);
  useEffect(() => {
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      }
    );
  }, [delay]);

  return (
    <div ref={ref} className={cn("opacity-0", className)}>
      {children}
    </div>
  );
}

// 4. RevealWords / Characters
export function RevealWords({ text, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = el.querySelectorAll(".word");
    gsap.fromTo(
      words,
      { opacity: 0, y: 15 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
        },
      }
    );
  }, [text]);

  const words = text.split(" ");
  return (
    <span ref={ref} className={cn("inline-block", className)}>
      {words.map((w, idx) => (
        <span key={idx} className="word inline-block mr-1.5 opacity-0">
          {w}
        </span>
      ))}
    </span>
  );
}

// 5. RevealLines
export function RevealLines({ text, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const lines = el.querySelectorAll(".line-span");
    gsap.fromTo(
      lines,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
        },
      }
    );
  }, [text]);

  // Mock splitting by lines by split lines with "|"
  const lines = text.split("|");
  return (
    <span ref={ref} className={cn("block", className)}>
      {lines.map((l, idx) => (
        <span key={idx} className="block overflow-hidden">
          <span className="line-span inline-block opacity-0">{l.trim()}</span>
        </span>
      ))}
    </span>
  );
}

// 6. RevealCards (staggered animation for grid columns)
export function RevealCards({ children, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cards = el.children;
    gsap.fromTo(
      cards,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
        },
      }
    );
  }, []);

  return (
    <div ref={ref} className={cn("grid", className)}>
      {children}
    </div>
  );
}

// 7. StaggerList
export function StaggerList({ children, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll(".stagger-item");
    gsap.fromTo(
      items,
      { opacity: 0, x: -10 },
      {
        opacity: 1,
        x: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
        },
      }
    );
  }, []);

  return (
    <div ref={ref} className={cn("space-y-2", className)}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            className: cn(child.props.className, "stagger-item opacity-0"),
          });
        }
        return child;
      })}
    </div>
  );
}

// 8. ScrollReveal (wraps scroll reveals)
export function ScrollReveal({ children, className }) {
  const ref = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      ref.current,
      { opacity: 0, scale: 0.98 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 80%",
        },
      }
    );
  }, []);

  return (
    <div ref={ref} className={cn("opacity-0", className)}>
      {children}
    </div>
  );
}

// 9. DashboardReveal (elegant entrance for dashboard KPIs)
export function DashboardReveal({ children, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll(".dash-reveal");
    gsap.fromTo(
      items,
      { opacity: 0, scale: 0.96, y: 15 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power3.out",
      }
    );
  }, []);

  return (
    <div ref={ref} className={cn("w-full", className)}>
      {children}
    </div>
  );
}
