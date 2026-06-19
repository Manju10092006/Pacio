import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { CheckCircle2, Circle, Plus, Minus } from "lucide-react";

export default function StudentDSA() {
  const [d, setD] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form states for logging attempt
  const [formStatus, setFormStatus] = useState("attempted");
  const [formTimeTaken, setFormTimeTaken] = useState("");
  const [formLanguage, setFormLanguage] = useState("");
  const [formApproach, setFormApproach] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [submittingAttempt, setSubmittingAttempt] = useState(false);

  const load = async () => {
    const [{ data: dashboard }, { data: questionProgress }] = await Promise.all([
      api.get("/me/dashboard"),
      api.get("/me/dsa/questions"),
    ]);
    setD({ ...dashboard, dsa_question_progress: questionProgress });
  };
  useEffect(() => { load(); }, []);

  const adjust = async (topic_code, delta) => {
    try {
      await api.post("/me/dsa/toggle", { topic_code, delta });
      load();
    } catch {}
  };

  const submitAttempt = async (e) => {
    e.preventDefault();
    const studentId = d?.dsa_question_progress?.student_id;
    if (!selectedQuestion || !studentId) return;
    setSubmittingAttempt(true);
    try {
      const qid = selectedQuestion.question_id;

      // 1. POST new attempt
      await api.post(`/dsa/student/${studentId}/attempt`, {
        question_id: qid,
        status: formStatus,
        time_taken: formTimeTaken ? parseInt(formTimeTaken, 10) : null,
        language: formLanguage,
        approach: formApproach,
        notes: formNotes,
      });

      // 2. PATCH question solved status (so dashboard / solved stats are updated)
      await api.patch(`/me/dsa/questions/${qid}`, {
        solved: formStatus === "solved",
        attempted: true,
        mastery: formStatus === "solved" ? 85 : 35,
        notes: formNotes,
      });

      // 3. Clear/reset form inputs
      setFormTimeTaken("");
      setFormApproach("");
      setFormNotes("");

      // 4. Reload all info
      await load();
      await loadQuestionDetails(qid);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const loadQuestionDetails = async (questionId) => {
    const studentId = d?.dsa_question_progress?.student_id;
    if (!studentId) return;
    setLoadingDetails(true);
    try {
      const [attemptsRes, commentsRes] = await Promise.all([
        api.get(`/dsa/student/${studentId}/attempts?question_id=${questionId}`),
        api.get(`/dsa/student/${studentId}/comments`),
      ]);
      setAttempts(attemptsRes.data?.attempts || []);
      const questionComments = (commentsRes.data?.comments || []).filter(
        (c) => c.question_id === questionId
      );
      setComments(questionComments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (!d) return <div className="font-mono text-xs text-ink-400">LOADING…</div>;
  const solved = d.dsa.reduce((a, t) => a + t.solved, 0);
  const pct = Math.round((solved / d.dsa_total) * 100);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-8 editorial p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ DSA · STRIVER A2Z</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="sdsa-heading">
            Your <span className="text-accent">solve sheet.</span>
          </h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
            Click + as you solve each problem. CareerOS updates your readiness in real time.
          </p>
        </div>
        <div className="col-span-12 md:col-span-4 editorial bg-ink-900 text-bone-100 p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-bone-100/40">TOTAL · SOLVED</div>
          <div className="font-display text-[8vw] md:text-[6vw] tracking-tightest leading-[0.9] tnum">{solved}</div>
          <div className="text-bone-100/60 text-sm">/ {d.dsa_total} problems · {pct}%</div>
          <div className="mt-4 h-2 bg-bone-100/10 relative">
            <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3" data-testid="sdsa-topics">
        {d.dsa.map((t) => {
          const p = Math.round((t.solved / t.total) * 100);
          const topicDetail = d.dsa_question_progress?.topics?.find((row) => row.topic_code === t.topic_code);
          const questions = topicDetail?.questions || [];
          return (
            <div key={t.topic_code} className="col-span-12 md:col-span-6 lg:col-span-4 editorial p-6" data-testid={`sdsa-${t.topic_code}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.2em] text-ink-400">{t.topic_code}</div>
                  <div className="font-display text-xl tracking-tight mt-1">{t.topic_name}</div>
                </div>
                <div className="font-display text-3xl tnum">{p}%</div>
              </div>
              <div className="mt-4 h-1.5 bg-bone-300 relative">
                <div className="absolute inset-y-0 left-0" style={{ width: `${p}%`, background: p >= 80 ? "#0a0a0a" : p >= 40 ? "#d4a017" : "#ff3b00" }} />
              </div>
              <div className="mt-5 flex items-center justify-between">
                <div className="font-mono text-sm tnum">{t.solved}<span className="text-ink-400">/{t.total}</span></div>
                <div className="flex items-center gap-1">
                  <button onClick={() => adjust(t.topic_code, -1)} data-testid={`sdsa-minus-${t.topic_code}`} className="w-9 h-9 border border-line bg-bone-50 hover:bg-ink-900 hover:text-bone-100 transition-colors grid place-items-center">
                    <Minus size={14} />
                  </button>
                  <button onClick={() => adjust(t.topic_code, 1)} data-testid={`sdsa-plus-${t.topic_code}`} className="w-9 h-9 bg-ink-900 text-bone-100 hover:bg-accent transition-colors grid place-items-center">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-5 border-t border-line pt-4">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[10px] tracking-[0.18em] text-ink-400">QUESTION QUEUE</div>
                  <div className="font-mono text-[10px] text-ink-500 tnum">{topicDetail?.attempted || 0} attempted</div>
                </div>
                <div className="mt-3 max-h-64 overflow-y-auto pr-1 space-y-1" data-testid={`sdsa-questions-${t.topic_code}`}>
                  {questions.map((question) => (
                    <button
                      key={question.question_id}
                      onClick={() => {
                        setSelectedQuestion(question);
                        setFormStatus(question.solved ? "solved" : "attempted");
                        loadQuestionDetails(question.question_id);
                      }}
                      className="w-full grid grid-cols-[20px_1fr_auto] gap-2 items-center text-left px-2 py-2 border border-transparent hover:border-line hover:bg-bone-100 transition-colors"
                      data-testid={`sdsa-question-${question.question_id}`}
                    >
                      {question.solved ? <CheckCircle2 size={16} className="text-accent" /> : <Circle size={16} className="text-ink-300" />}
                      <span className={`text-sm leading-snug ${question.solved ? "text-ink-900" : "text-ink-500"}`}>{question.title}</span>
                      <span className="font-mono text-[10px] text-ink-400">{question.difficulty}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedQuestion && (
        <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm z-50 flex justify-end" onClick={() => setSelectedQuestion(null)}>
          <div
            className="w-full max-w-xl bg-bone-50 border-l border-line h-full flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-line flex items-start justify-between bg-bone-100">
              <div>
                <div className="font-mono text-[10px] tracking-[0.2em] text-ink-400">QUESTION DETAIL</div>
                <h3 className="font-display text-2xl tracking-tight mt-1">{selectedQuestion.title}</h3>
                <div className="mt-2 flex gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 bg-bone-200 text-ink-600 border border-line">{selectedQuestion.difficulty}</span>
                  <span className="font-mono text-xs px-2 py-0.5 bg-bone-200 text-ink-600 border border-line">{selectedQuestion.topic_code}</span>
                  {selectedQuestion.solved ? (
                    <span className="font-mono text-xs px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200">SOLVED</span>
                  ) : (
                    <span className="font-mono text-xs px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200">UNSOLVED</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedQuestion(null)}
                className="font-mono text-xs text-ink-400 hover:text-ink-900 border border-line px-2 py-1 bg-bone-50 transition-colors"
              >
                CLOSE
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
              <form onSubmit={submitAttempt} className="space-y-4 border border-line p-5 bg-bone-100">
                <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">LOG NEW ATTEMPT</div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-ink-500 mb-1">STATUS</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full bg-bone-50 border border-line p-2 text-sm focus:outline-none"
                      required
                    >
                      <option value="attempted">Attempted</option>
                      <option value="solved">Solved</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-ink-500 mb-1">TIME TAKEN (MINUTES)</label>
                    <input
                      type="number"
                      min="1"
                      value={formTimeTaken}
                      onChange={(e) => setFormTimeTaken(e.target.value)}
                      placeholder="e.g. 25"
                      className="w-full bg-bone-50 border border-line p-2 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-ink-500 mb-1">LANGUAGE</label>
                    <input
                      type="text"
                      value={formLanguage}
                      onChange={(e) => setFormLanguage(e.target.value)}
                      placeholder="e.g. Python, C++"
                      className="w-full bg-bone-50 border border-line p-2 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-ink-500 mb-1">APPROACH</label>
                    <input
                      type="text"
                      value={formApproach}
                      onChange={(e) => setFormApproach(e.target.value)}
                      placeholder="e.g. Two Pointer, BFS"
                      className="w-full bg-bone-50 border border-line p-2 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-ink-500 mb-1">NOTES</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Write any difficulties, complexities, or learning points..."
                    className="w-full bg-bone-50 border border-line p-2 text-sm focus:outline-none h-16 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAttempt}
                  className="w-full py-2 bg-ink-900 text-bone-100 hover:bg-accent hover:text-ink-900 transition-colors font-mono text-xs disabled:opacity-50"
                >
                  {submittingAttempt ? "RECORDING..." : "RECORD ATTEMPT"}
                </button>
              </form>

              <div className="space-y-3">
                <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">ATTEMPT HISTORY</div>
                {loadingDetails ? (
                  <div className="text-xs text-ink-400 font-mono">LOADING HISTORY…</div>
                ) : attempts.length === 0 ? (
                  <div className="text-xs text-ink-400 font-mono">No attempts logged yet.</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {attempts.map((att) => (
                      <div key={att.attempt_id} className="p-3 border border-line bg-bone-50 text-xs font-mono space-y-1">
                        <div className="flex justify-between items-center">
                          <span className={`px-1.5 py-0.5 text-[9px] ${att.status === "solved" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
                            {att.status.toUpperCase()}
                          </span>
                          <span className="text-ink-400 text-[10px]">
                            {att.created_at ? new Date(att.created_at).toLocaleDateString() : ""}
                          </span>
                        </div>
                        {att.time_taken && (
                          <div><span className="text-ink-400">TIME:</span> {att.time_taken} mins</div>
                        )}
                        {att.language && (
                          <div><span className="text-ink-400">LANGUAGE:</span> {att.language}</div>
                        )}
                        {att.approach && (
                          <div><span className="text-ink-400">APPROACH:</span> {att.approach}</div>
                        )}
                        {att.notes && (
                          <div className="text-ink-600 mt-1 border-t border-line/50 pt-1 italic">"{att.notes}"</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">FACULTY COMMENTS</div>
                {loadingDetails ? (
                  <div className="text-xs text-ink-400 font-mono">LOADING COMMENTS…</div>
                ) : comments.length === 0 ? (
                  <div className="text-xs text-ink-400 font-mono">No comments from faculty yet.</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {comments.map((cmt) => (
                      <div key={cmt.comment_id} className="p-3 border border-line bg-accent/5 text-xs font-mono space-y-1">
                        <div className="flex justify-between items-center text-ink-500 font-semibold">
                          <span>{cmt.faculty_name || "Faculty"}</span>
                          <span className="text-[10px] font-normal">
                            {cmt.created_at ? new Date(cmt.created_at).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <div className="text-ink-700 mt-1">{cmt.body || cmt.comment}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
