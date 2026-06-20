import React, { useEffect, useState } from "react";
import { Volume2, Square } from "lucide-react";

/**
 * AI voice narration using the browser's built-in Speech Synthesis API.
 * Zero dependency, zero cost, works offline. Reads a summary aloud.
 * Styled to match the CareerOS editorial system.
 */
export default function VoiceSummary({ text, label = "Narrate" }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) setSupported(false);
    return () => {
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* noop */ }
    };
  }, []);

  const toggle = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new window.SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    u.pitch = 1;
    u.lang = "en-IN";
    const voices = window.speechSynthesis.getVoices();
    const en = voices.find((v) => /en[-_]?(IN|GB|US)/i.test(v.lang)) || voices.find((v) => v.lang && v.lang.startsWith("en"));
    if (en) u.voice = en;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={speaking ? "Stop narration" : "Listen to AI summary"}
      data-testid="voice-narrate-btn"
      className={`inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] uppercase border px-3 py-2 transition-colors ${
        speaking ? "bg-ink-900 text-bone-100 border-ink-900" : "border-line hover:border-ink-900"
      }`}
    >
      {speaking ? <><Square size={12} /> Stop</> : <><Volume2 size={12} /> {label}</>}
    </button>
  );
}
