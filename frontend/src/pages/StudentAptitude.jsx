import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { Progress, Select } from "../components/Primitives";
import { PageTransition, CounterAnimation, DashboardReveal } from "../components/Motion";
import { Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Clock, Flag, Play, Send } from "lucide-react";
import { toast } from "sonner";

const fmt = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default function StudentAptitude() {
  const [prep, setPrep] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [config, setConfig] = useState({ mode: "sectional", section_code: "QUANT", question_count: 12, duration_minutes: 20 });
  const [session, setSession] = useState(null);
  const [active, setActive] = useState(0);
  const [answers, setAnswers] = useState({});
  const [reviewLater, setReviewLater] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [remaining, setRemaining] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  const load = async () => {
    const [prepRes, attemptsRes] = await Promise.all([
      api.get("/me/aptitude/questions"),
      api.get("/me/aptitude/attempts"),
    ]);
    setPrep(prepRes.data);
    setAttempts(attemptsRes.data.items || []);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!session || analysis) return undefined;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          submitTest(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, analysis]);

  const activeQuestion = session?.questions?.[active];
  const sections = prep?.sections || [];
  const overall = prep?.overall || {};
  const answered = useMemo(() => Object.keys(answers).filter((key) => answers[key] !== "").length, [answers]);

  const startTest = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const { data } = await api.post("/me/aptitude/tests/start", config);
    setSession(data);
    setActive(0);
    setAnswers({});
    setReviewLater([]);
    setBookmarks([]);
    setAnalysis(null);
    setRemaining((data.duration_minutes || config.duration_minutes) * 60);
    toast.success("Assessment started");
  };

  const submitTest = async (auto = false) => {
    if (!session || analysis || submitting) return;
    setSubmitting(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Math.max(1, (session.duration_minutes * 60) - remaining);
    try {
      const { data } = await api.post(`/me/aptitude/tests/${session.test_id}/submit`, {
        answers,
        review_later: reviewLater,
        bookmarks,
        elapsed_seconds: auto ? session.duration_minutes * 60 : elapsed,
      });
      setAnalysis(data);
      setRemaining(0);
      await load();
      toast.success(auto ? "Time is up. Test auto-submitted." : "Test submitted");
    } finally {
      setSubmitting(false);
    }
  };

  if (!prep) return <div className="font-mono text-xs text-ink-400 p-8">LOADING APTITUDE...</div>;

  return (
    <PageTransition className="space-y-10">
      <DashboardReveal className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-8 editorial p-10 dash-reveal">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">APTITUDE PREPARATION SYSTEM</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">Practice. Test. Improve.</h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
            Take timed sectional or full mock tests across quant, reasoning, verbal, DI, and technical MCQs.
          </p>
        </div>
        <div className="col-span-12 md:col-span-4 editorial bg-ink text-bone p-10 dash-reveal">
          <div className="font-mono text-[10px] tracking-[0.28em] text-bone/45">APTITUDE READINESS</div>
          <div className="font-display text-[8vw] md:text-[6vw] leading-[0.9] tnum text-accent">
            <CounterAnimation value={overall.score || 0} />%
          </div>
          <div className="text-bone/60 text-sm mt-1">{overall.solved || 0}/{overall.total || 0} questions solved</div>
          <div className="mt-6"><Progress value={overall.score || 0} /></div>
        </div>
      </DashboardReveal>

      {!session && <DashboardReveal className="grid grid-cols-12 gap-4">
        {sections.map((sec) => (
          <div key={sec.section_code} className="col-span-12 md:col-span-6 lg:col-span-3 editorial p-6 dash-reveal">
            <div className="font-mono text-[10px] tracking-[0.2em] text-ink-400">{sec.section_code}</div>
            <div className="font-display text-xl mt-1">{sec.section_name}</div>
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div><div className="font-mono text-[9px] text-ink-400">ACC</div><div className="font-display text-2xl tnum text-accent">{sec.accuracy || 0}%</div></div>
              <div><div className="font-mono text-[9px] text-ink-400">TIME</div><div className="font-display text-2xl tnum">{sec.avg_time || 0}s</div></div>
              <div><div className="font-mono text-[9px] text-ink-400">MASTERY</div><div className="font-display text-2xl tnum">{sec.mastery || 0}</div></div>
            </div>
            <div className="mt-5"><Progress value={sec.total ? Math.round((sec.solved / sec.total) * 100) : 0} /></div>
          </div>
        ))}
      </DashboardReveal>}

      <div className="grid grid-cols-12 gap-4">
        <div className={`${session ? "hidden" : "col-span-12 lg:col-span-4"} editorial p-8`}>
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">START ASSESSMENT</div>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <label className="text-xs font-mono text-ink-500">MODE
              <Select value={config.mode} onChange={(e) => setConfig({ ...config, mode: e.target.value })} className="mt-1">
                <option value="sectional">Sectional Test</option>
                <option value="mock">Full Mock Test</option>
              </Select>
            </label>
            <label className="text-xs font-mono text-ink-500">SECTION
              <Select value={config.section_code} onChange={(e) => setConfig({ ...config, section_code: e.target.value })} disabled={config.mode === "mock"} className="mt-1">
                {sections.map((sec) => <option key={sec.section_code} value={sec.section_code}>{sec.section_name}</option>)}
              </Select>
            </label>
            <label className="text-xs font-mono text-ink-500">QUESTIONS
              <input className="mt-1 w-full border border-line bg-bone-50 px-3 py-2" type="number" value={config.question_count} onChange={(e) => setConfig({ ...config, question_count: Number(e.target.value) })} />
            </label>
            <label className="text-xs font-mono text-ink-500">MINUTES
              <input className="mt-1 w-full border border-line bg-bone-50 px-3 py-2" type="number" value={config.duration_minutes} onChange={(e) => setConfig({ ...config, duration_minutes: Number(e.target.value) })} />
            </label>
          </div>
          <button onClick={startTest} className="btn mt-5 w-full justify-center py-3 text-xs"><Play size={14} /> Start Test</button>
          <div className="mt-8">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">RECENT ATTEMPTS</div>
            <div className="mt-3 space-y-2">
              {attempts.slice(0, 5).map((a) => (
                <div key={a.attempt_id} className="border border-line bg-bone-50 p-3 text-sm flex justify-between">
                  <span>{a.mode}</span><span className="font-display text-accent tnum">{a.score_pct}%</span>
                </div>
              ))}
              {attempts.length === 0 && <div className="text-xs text-ink-400">No tests taken yet.</div>}
            </div>
          </div>
        </div>

        <div className={`${session ? "col-span-12" : "col-span-12 lg:col-span-8"} editorial p-0 overflow-hidden`} data-testid="aptitude-test-engine">
          {!session ? (
            <div className="p-10 text-center text-ink-400 font-serif">Start a test to open the timed assessment room.</div>
          ) : (
            <div className="grid grid-cols-12 min-h-[620px]">
              <div className="col-span-12 md:col-span-8 p-8">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{session.mode.toUpperCase()} / Q{active + 1}</div>
                    <div className="font-display text-2xl mt-1">{activeQuestion?.title}</div>
                  </div>
                  <div className={`flex items-center gap-2 font-mono text-sm ${analysis ? "text-accent" : ""}`}><Clock size={15} /> {analysis ? "SUBMITTED" : fmt(remaining)}</div>
                </div>
                <div className="mt-8 font-serif text-xl text-ink-700">{activeQuestion?.prompt}</div>
                <div className="mt-8 space-y-3">
                  {(activeQuestion?.options || []).map((option, index) => (
                    <button
                      type="button"
                      key={option}
                      disabled={!!analysis}
                      onClick={() => setAnswers((current) => ({ ...current, [activeQuestion.question_id]: index }))}
                      className={`w-full border-2 px-5 py-4 text-left transition-colors grid grid-cols-[28px_1fr_auto] items-center gap-3 ${answers[activeQuestion.question_id] === index ? "border-accent bg-accent text-bone shadow-[inset_0_0_0_1px_rgba(255,255,255,.25)]" : "border-line bg-bone-50 hover:border-ink"}`}
                    >
                      <span className="font-mono text-xs">{String.fromCharCode(65 + index)}</span>
                      <span>{option}</span>
                      {answers[activeQuestion.question_id] === index && <CheckCircle2 size={17} />}
                    </button>
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="btn justify-center py-3 text-xs"
                    disabled={active === 0}
                    onClick={() => setActive((index) => Math.max(0, index - 1))}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    type="button"
                    className="btn justify-center py-3 text-xs"
                    disabled={active >= session.questions.length - 1}
                    onClick={() => setActive((index) => Math.min(session.questions.length - 1, index + 1))}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
                {analysis && (
                  <div className="mt-8 border border-line bg-bone-50 p-5">
                    <div className="font-display text-3xl tnum text-accent">{analysis.score_pct}%</div>
                    <div className="text-sm text-ink-500">Accuracy {analysis.accuracy_pct}% / Avg time {analysis.avg_time_sec}s</div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {(analysis.weak_areas || []).map((w) => (
                        <div key={w.name} className="border border-line bg-paper p-3 text-sm">
                          <div className="font-medium">{w.name}</div>
                          <div className="font-mono text-xs text-ink-400">accuracy {w.accuracy}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="col-span-12 md:col-span-4 bg-bone-100/60 border-l border-line p-6">
                <div className="grid grid-cols-5 gap-2">
                  {session.questions.map((q, index) => (
                    <button type="button" key={q.question_id} onClick={() => setActive(index)} className={`h-10 border text-xs font-mono ${active === index ? "bg-ink text-bone" : answers[q.question_id] !== undefined ? "bg-accent text-bone border-accent" : "bg-paper border-line"}`}>
                      {index + 1}
                    </button>
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button type="button" className="btn justify-center py-2 text-[10px]" disabled={!!analysis} onClick={() => setReviewLater((list) => list.includes(activeQuestion.question_id) ? list.filter((id) => id !== activeQuestion.question_id) : [...list, activeQuestion.question_id])}><Flag size={13} /> Review</button>
                  <button type="button" className="btn justify-center py-2 text-[10px]" disabled={!!analysis} onClick={() => setBookmarks((list) => list.includes(activeQuestion.question_id) ? list.filter((id) => id !== activeQuestion.question_id) : [...list, activeQuestion.question_id])}><Bookmark size={13} /> Bookmark</button>
                </div>
                <div className="mt-6 text-sm text-ink-500">{answered}/{session.questions.length} answered / {reviewLater.length} review / {bookmarks.length} bookmarks</div>
                <button type="button" disabled={!!analysis || submitting} onClick={() => submitTest(false)} className="btn mt-6 w-full justify-center py-3 text-xs"><Send size={14} /> {submitting ? "Submitting..." : analysis ? "Submitted" : "Submit Test"}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
