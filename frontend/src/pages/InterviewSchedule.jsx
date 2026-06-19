import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { CalendarPlus, Clock, MapPin, Trash2 } from "lucide-react";
import { useAuth } from "../App";
import { Button, Input, Select, Badge, DialogRoot, DialogContent, TabsRoot, TabsList, TabsTrigger, TabsContent } from "../components/Primitives";
import { PageTransition } from "../components/Motion";
import { Calendar } from "../components/Calendar";

const TYPES = ["Technical", "HR", "System Design", "Behavioral", "Final"];
const TYPE_COLOR = { Technical: "#0a0a0a", HR: "#4a5d3a", "System Design": "#c1440e", Behavioral: "#d4a017", Final: "#ff3b00" };

export default function InterviewSchedule() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState({
    student_id: "", company: "", role: "", type: "Technical",
    starts_at: "", duration_min: 45, location: "Online · Zoom", notes: "",
  });
  const [open, setOpen] = useState(false);

  const load = () => api.get("/interviews/schedule").then(({ data }) => setItems(data.items || []));
  
  useEffect(() => {
    load();
    if (user?.role !== "student") {
      if (user?.role === "recruiter") {
        api.get("/recruiters/me/talent-pool?min_cgpa=6.5&limit=120").then(({ data }) => setStudents(data.items || []));
      } else {
        api.get("/students").then(({ data }) => setStudents(data.items || []));
      }
      api.get("/jobs").then(({ data }) => setJobs(data.items || []));
    }
  }, [user]);

  const pickJob = (jobId) => {
    const job = jobs.find((j) => j.job_id === jobId);
    setForm({
      ...form,
      job_id: jobId || undefined,
      company: job?.company || form.company,
      role: job?.title || form.role,
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.starts_at) { toast.error("Pick student and time"); return; }
    try {
      const payload = { ...form, starts_at: new Date(form.starts_at).toISOString() };
      await api.post("/interviews/schedule", payload);
      toast.success("Interview scheduled · invite emailed with .ics");
      setOpen(false);
      setForm({ student_id: "", company: "", role: "", type: "Technical", starts_at: "", duration_min: 45, location: "Online · Zoom", notes: "" });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Schedule failed");
    }
  };

  const cancel = async (id) => {
    try { 
      await api.delete(`/interviews/schedule/${id}`); 
      toast.success("Cancelled"); 
      load(); 
    } catch { 
      toast.error("Cancel failed"); 
    }
  };

  const canSchedule = user?.role !== "student";

  // Format events for Calendar primitive
  const calendarEvents = React.useMemo(() => {
    return items
      .filter((i) => i.status !== "cancelled")
      .map((i) => ({
        ...i,
        date: i.starts_at,
        title: `${i.student_name} (${i.company})`,
        time: new Date(i.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
        meeting_link: i.location.includes("Zoom") || i.location.includes("Meet") ? "https://zoom.us/j/mock-meeting" : null
      }));
  }, [items]);

  return (
    <PageTransition className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ INTERVIEW · SCHEDULER</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="sched-heading">
            Every slot <span className="text-accent">on the calendar.</span>
          </h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
            In-app scheduling with .ics calendar invites + email + telegram nudge. The pipeline auto-advances to "Interview".
          </p>
        </div>
        {canSchedule && (
          <Button onClick={() => setOpen(true)} data-testid="new-interview-btn">
            <CalendarPlus size={14} /> Schedule new
          </Button>
        )}
      </div>

      {/* Schedule Dialog (Modal primitive) */}
      <DialogRoot open={open} onOpenChange={setOpen}>
        <DialogContent title="Schedule Interview Slot" className="max-w-2xl">
          <form onSubmit={submit} className="space-y-4" data-testid="sched-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-ink-500 uppercase">Pick student</label>
                <Select 
                  value={form.student_id} 
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                  data-testid="sched-student" 
                  required
                >
                  <option value="">Select student…</option>
                  {students.slice(0, 200).map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.name} · {s.roll_number} ({s.department})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-ink-500 uppercase">Link Job Drive (Optional)</label>
                <Select 
                  value={form.job_id || ""} 
                  onChange={(e) => pickJob(e.target.value)}
                >
                  <option value="">Select job drive…</option>
                  {jobs.map((j) => (
                    <option key={j.job_id} value={j.job_id}>
                      {j.company} · {j.title}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-ink-500 uppercase">Company</label>
                <Input 
                  value={form.company} 
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  data-testid="sched-company" 
                  placeholder="e.g. Amazon" 
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-ink-500 uppercase">Role</label>
                <Input 
                  value={form.role} 
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  data-testid="sched-role" 
                  placeholder="e.g. SDE-1" 
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-ink-500 uppercase">Type</label>
                <Select 
                  value={form.type} 
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  data-testid="sched-type"
                >
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-ink-500 uppercase">Date & Time</label>
                <Input 
                  type="datetime-local" 
                  value={form.starts_at} 
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  data-testid="sched-when" 
                  required 
                  className="py-2.5"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-ink-500 uppercase">Duration (mins)</label>
                <Input 
                  type="number" 
                  min="1" 
                  value={form.duration_min} 
                  onChange={(e) => setForm({ ...form, duration_min: parseInt(e.target.value || "45") })}
                  data-testid="sched-duration" 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-ink-500 uppercase">Location / Link</label>
                <Input 
                  value={form.location} 
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  data-testid="sched-location" 
                  placeholder="Zoom / In-person" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-mono text-ink-500 uppercase">Notes (Panel, Guidelines)</label>
              <Input 
                value={form.notes} 
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                data-testid="sched-notes" 
                placeholder="Write panel details, prep links..." 
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-line">
              <Button type="submit" data-testid="sched-submit" className="flex-1">
                Schedule + Invite
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </DialogRoot>

      {/* Main View System */}
      <TabsRoot defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">CALENDAR GRID</TabsTrigger>
          <TabsTrigger value="timeline">LIST TIMELINE</TabsTrigger>
        </TabsList>

        {/* 1. Calendar Grid View */}
        <TabsContent value="calendar">
          <Calendar events={calendarEvents} onEventClick={(e) => {
            toast.info(`Interview: ${e.student_name} with ${e.company} at ${e.time}`);
          }} />
        </TabsContent>

        {/* 2. Timeline List View */}
        <TabsContent value="timeline">
          <div className="editorial p-8 bg-paper" data-testid="sched-list">
            <div className="border-b border-line pb-4 mb-6">
              <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">UPCOMING · {items.filter((i) => i.status !== "cancelled").length}</div>
              <h3 className="font-display text-2xl tracking-tight mt-1 uppercase">Interview Queue</h3>
            </div>
            {items.length === 0 && <div className="py-12 text-center text-ink-400 italic font-mono text-xs">No interviews scheduled yet.</div>}
            
            <div className="divide-y divide-line">
              {items.map((it) => (
                <div key={it.interview_id} className="grid grid-cols-12 py-5 items-center gap-4" data-testid={`sched-${it.interview_id}`}>
                  <div className="col-span-12 md:col-span-2 font-mono text-xs">
                    <div className="text-ink-400 tracking-[0.18em]">{new Date(it.starts_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }).toUpperCase()}</div>
                    <div className="font-display text-2xl text-ink-900 tnum">{new Date(it.starts_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <div className="font-display text-base font-semibold">{it.student_name}</div>
                    <div className="text-xs text-ink-400 font-mono">{it.roll_number} · {it.department}</div>
                  </div>
                  <div className="col-span-12 md:col-span-2">
                    <div className="font-display text-lg tracking-tight uppercase">{it.company}</div>
                    <div className="text-xs text-ink-500 font-serif">{it.role}</div>
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <Badge variant="outline" style={{ color: TYPE_COLOR[it.type], borderColor: TYPE_COLOR[it.type] }}>{it.type}</Badge>
                    <div className="text-xs text-ink-500 mt-2 flex items-center gap-1 font-serif"><MapPin size={10} /> {it.location}</div>
                  </div>
                  <div className="col-span-6 md:col-span-1 text-right font-mono text-xs">
                    <Clock size={12} className="inline mr-1" /> {it.duration_min}m
                  </div>
                  <div className="col-span-12 md:col-span-1 text-right">
                    {it.status === "cancelled" ? (
                      <Badge variant="danger">CANCELLED</Badge>
                    ) : canSchedule ? (
                      <button onClick={() => cancel(it.interview_id)} data-testid={`cancel-${it.interview_id}`} className="text-ink/50 hover:text-accent p-1 transition-colors border border-transparent hover:border-line">
                        <Trash2 size={14} />
                      </button>
                    ) : <Badge variant="success">SCHEDULED</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </TabsRoot>
    </PageTransition>
  );
}
