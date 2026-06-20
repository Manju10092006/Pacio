import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../App";
import { toast } from "sonner";
import { Plus, X, Users, Calendar, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const emptyForm = { topic: "", date: "", duration_hours: 1, faculty_emails: "" };

export default function FDPManagement() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = () =>
    api.get("/fdp/sessions")
      .then(({ data }) => setSessions(data.items || data || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const schedule = async (e) => {
    e.preventDefault();
    if (!form.topic || !form.date) { toast.error("Topic and date are required"); return; }
    setSubmitting(true);
    try {
      const faculty_ids = form.faculty_emails
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await api.post("/fdp/schedule", {
        topic: form.topic,
        date: new Date(form.date).toISOString(),
        duration_hours: Number(form.duration_hours),
        faculty_ids,
        institution_id: user?.institution_id,
      });
      toast.success("FDP session scheduled");
      setForm(emptyForm);
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to schedule session");
    } finally {
      setSubmitting(false);
    }
  };

  const markAttendance = async (session_id, attendees) => {
    try {
      await api.post("/fdp/attendance", { session_id, attendees });
      toast.success("Attendance updated");
      setSelected((curr) => curr && curr.session_id === session_id ? { ...curr, attendees } : curr);
      load();
    } catch {
      toast.error("Could not update attendance");
    }
  };

  const totalSessions = sessions.length;
  const avgAttendance = totalSessions
    ? Math.round(sessions.reduce((a, s) => a + (s.attendance_pct || 0), 0) / totalSessions)
    : 0;
  const completedCount = sessions.filter((s) => s.status === "completed").length;
  const completionRate = totalSessions ? Math.round((completedCount / totalSessions) * 100) : 0;

  if (loading) return <div className="font-mono text-xs text-ink-400 p-8">LOADING…</div>;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ FACULTY DEVELOPMENT</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="fdp-heading">
            FDP <span className="text-accent">Sessions</span>
          </h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">Schedule, track, and manage faculty development programs.</p>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="btn" data-testid="fdp-schedule-btn">
          {open ? <X size={14} /> : <Plus size={14} />} {open ? "Close" : "Schedule session"}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-12 gap-3" data-testid="fdp-stats">
        {[
          { label: "TOTAL SESSIONS", value: totalSessions, icon: Calendar },
          { label: "AVG ATTENDANCE", value: `${avgAttendance}%`, icon: Users },
          { label: "COMPLETION RATE", value: `${completionRate}%`, icon: CheckCircle },
        ].map((card) => (
          <div key={card.label} className="col-span-12 md:col-span-4 editorial p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label}</div>
                <div className="font-display text-5xl tracking-tightest mt-3 tnum">{card.value}</div>
              </div>
              <card.icon size={20} className="text-ink-300" />
            </div>
          </div>
        ))}
      </div>

      {/* FDP Analytics Visuals */}
      {totalSessions > 0 && (
        <div className="grid grid-cols-12 gap-3 border border-line bg-bone-50 p-6" data-testid="fdp-analytics">
          <div className="col-span-12 md:col-span-8 h-64">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-4">ATTENDANCE TREND PER SESSION</div>
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessions}>
                  <XAxis dataKey="topic" stroke="#0a0a0a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#0a0a0a" fontSize={10} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "#F4F0E8", border: "1px solid #0a0a0a" }} />
                  <Bar dataKey="attendance_pct" name="Attendance %" fill="#c1440e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="col-span-12 md:col-span-4 flex flex-col justify-between p-4 bg-bone-100/50 border border-line/60">
            <div>
              <div className="font-mono text-[9px] tracking-widest text-ink-400">FACULTY ENGAGEMENT</div>
              <h4 className="font-display text-xl mt-1 tracking-tight font-bold">Hours & Participation</h4>
              <div className="space-y-4 mt-6">
                <div>
                  <div className="text-xs text-ink-500 font-serif">Total Training Delivered</div>
                  <div className="font-display text-3xl font-bold tnum mt-0.5">
                    {sessions.reduce((a, s) => a + (s.duration_hours || 0), 0)} hrs
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ink-500 font-serif">Average Duration per Session</div>
                  <div className="font-display text-xl font-bold tnum mt-0.5">
                    {(sessions.reduce((a, s) => a + (s.duration_hours || 0), 0) / Math.max(1, totalSessions)).toFixed(1)} hrs
                  </div>
                </div>
              </div>
            </div>
            <div className="font-mono text-[9px] text-ink-400 pt-3 border-t border-line/30">
              Computed from live registry logs
            </div>
          </div>
        </div>
      )}

      {/* Schedule form */}
      {open && (
        <form onSubmit={schedule} className="editorial p-6 grid grid-cols-12 gap-3" data-testid="fdp-form">
          <div className="col-span-12">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-3">SCHEDULE NEW SESSION</div>
          </div>
          <input
            value={form.topic} onChange={(e) => setField("topic", e.target.value)}
            placeholder="Session topic" required data-testid="fdp-topic"
            className="col-span-12 md:col-span-4 px-3 py-2.5 border border-line bg-bone-50 focus:outline-none focus:border-accent"
          />
          <div className="col-span-12 md:col-span-2">
            <div className="flex items-center gap-2 border border-line px-3 py-2.5 bg-bone-50">
              <Calendar size={14} className="text-ink-400" />
              <input
                type="date" value={form.date} onChange={(e) => setField("date", e.target.value)}
                data-testid="fdp-date" className="bg-transparent focus:outline-none w-full"
              />
            </div>
          </div>
          <input
            value={form.duration_hours} onChange={(e) => setField("duration_hours", e.target.value)}
            type="number" min="1" step="0.5" placeholder="Hours" data-testid="fdp-duration"
            className="col-span-6 md:col-span-1 px-3 py-2.5 border border-line bg-bone-50 focus:outline-none focus:border-accent"
          />
          <input
            value={form.faculty_emails} onChange={(e) => setField("faculty_emails", e.target.value)}
            placeholder="Faculty emails (comma-separated)" data-testid="fdp-faculty"
            className="col-span-12 md:col-span-3 px-3 py-2.5 border border-line bg-bone-50 focus:outline-none focus:border-accent"
          />
          <button type="submit" disabled={submitting} className="col-span-12 md:col-span-2 btn justify-center" data-testid="fdp-submit">
            {submitting ? "Scheduling…" : "Schedule"}
          </button>
        </form>
      )}

      {/* Sessions table + detail */}
      <div className="grid grid-cols-12 gap-3">
        <div className={`${selected ? "col-span-12 lg:col-span-7" : "col-span-12"} border border-line bg-bone-50`} data-testid="fdp-table">
          <div className="p-6 border-b border-line">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">ALL SESSIONS / {totalSessions}</div>
            <h3 className="font-display text-2xl tracking-tight mt-1">Session registry</h3>
          </div>
          <div className="grid grid-cols-12 px-6 py-3 border-b border-line font-mono text-[10px] tracking-[0.2em] text-ink-400">
            <div className="col-span-3">TOPIC</div>
            <div className="col-span-2">DATE</div>
            <div className="col-span-1">HOURS</div>
            <div className="col-span-2">FACULTY</div>
            <div className="col-span-2">ATTENDANCE</div>
            <div className="col-span-2 text-right">STATUS</div>
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            {sessions.map((s, i) => (
              <div
                key={s.session_id || i}
                onClick={() => setSelected(s)}
                className={`grid grid-cols-12 px-6 py-3 border-b border-line items-center text-sm cursor-pointer transition-colors ${selected?.session_id === s.session_id ? "bg-accent/5 border-l-2 border-l-accent" : "hover:bg-bone-100"}`}
                data-testid={`fdp-session-${i}`}
              >
                <div className="col-span-3 font-medium">{s.topic}</div>
                <div className="col-span-2 font-mono text-xs">{s.date?.slice(0, 10)}</div>
                <div className="col-span-1 font-mono text-xs tnum">{s.duration_hours}h</div>
                <div className="col-span-2 font-mono text-xs tnum">{s.faculty_count || 0}</div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-bone-300 relative">
                      <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${s.attendance_pct || 0}%` }} />
                    </div>
                    <span className="font-mono text-xs tnum w-10 text-right">{s.attendance_pct || 0}%</span>
                  </div>
                </div>
                <div className="col-span-2 text-right">
                  <span className="font-mono text-[10px] tracking-[0.2em] px-2 py-0.5 border border-line">
                    {(s.status || "scheduled").toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
            {sessions.length === 0 && <div className="p-12 text-center text-ink-400">No FDP sessions found.</div>}
          </div>
        </div>

        {/* Attendance detail panel */}
        {selected && (
          <div className="col-span-12 lg:col-span-5 editorial bg-ink-900 text-bone-100 p-8" data-testid="fdp-detail">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/60">SESSION DETAIL</div>
                <h3 className="font-display text-2xl tracking-tight mt-2">{selected.topic}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-bone-100/60 hover:text-bone-100">
                <X size={16} />
              </button>
            </div>
            <div className="hairline my-6 border-bone-100/30" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/60">DATE</div>
                <div className="font-display text-xl mt-1">{selected.date?.slice(0, 10)}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/60">DURATION</div>
                <div className="font-display text-xl mt-1 tnum">{selected.duration_hours}h</div>
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/60">ATTENDANCE</div>
                <div className="font-display text-xl mt-1 text-accent tnum">{selected.attendance_pct || 0}%</div>
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/60">STATUS</div>
                <div className="font-display text-xl mt-1">{(selected.status || "scheduled").toUpperCase()}</div>
              </div>
            </div>
            <div className="hairline my-6 border-bone-100/30" />
            <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/60 mb-4">ATTENDEES</div>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {(selected.attendees || []).map((a, i) => (
                <div key={a.faculty_id || i} className="flex items-center justify-between py-2 border-b border-bone-100/10">
                  <span className="text-sm">{a.name || a.faculty_id}</span>
                  <button
                    onClick={() => {
                      const updated = selected.attendees.map((att, idx) =>
                        idx === i ? { ...att, present: !att.present } : att
                      );
                      markAttendance(selected.session_id, updated);
                    }}
                    className={`font-mono text-[10px] cursor-pointer hover:text-accent transition-colors ${a.present ? "text-accent" : "text-bone-100/40"}`}
                  >
                    {a.present ? "● PRESENT" : "○ ABSENT"}
                  </button>
                </div>
              ))}
              {(!selected.attendees || selected.attendees.length === 0) && (
                <div className="text-sm text-bone-100/40">No attendance data recorded.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
