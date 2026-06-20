import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { CalendarPlus, CheckCircle2, Clock3, XCircle } from "lucide-react";

const emptyForm = { title: "", type: "workshop", preferred_date: "", attendees: 60, notes: "" };
const STATUSES = ["requested", "reviewing", "approved", "scheduled", "declined"];

export default function WorkshopRequests() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get("/workshops")
      .then(({ data }) => {
        setItems(data.items || []);
        setSummary(data.summary || {});
      })
      .catch(() => {
        setItems([]);
        setSummary({});
      })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => items.filter((item) => filter === "all" || item.status === filter),
    [items, filter]
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Workshop title is required");
    try {
      await api.post("/workshops", {
        ...form,
        attendees: Number(form.attendees || 0),
        preferred_date: form.preferred_date ? new Date(form.preferred_date).toISOString() : null,
      });
      toast.success("Workshop request submitted");
      setForm(emptyForm);
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not submit request");
    }
  };

  const updateStatus = async (workshop_id, status) => {
    try {
      await api.patch(`/workshops/${workshop_id}/status`, { status });
      toast.success(`Workshop moved to ${status}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not update workshop");
    }
  };

  if (loading) return <div className="font-mono text-xs text-ink-400 p-8">LOADING...</div>;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ WORKSHOP REQUESTS</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="workshops-heading">
            Skill programs, <span className="text-accent">approved fast.</span>
          </h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
            Request workshops, review demand, and move sessions from idea to scheduled delivery.
          </p>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="btn" data-testid="workshop-new-btn">
          <CalendarPlus size={14} /> {open ? "Close" : "Request workshop"}
        </button>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {[
          { label: "TOTAL", value: summary.total || 0, icon: CalendarPlus },
          { label: "IN REVIEW", value: (summary.requested || 0) + (summary.reviewing || 0), icon: Clock3 },
          { label: "APPROVED", value: (summary.approved || 0) + (summary.scheduled || 0), icon: CheckCircle2 },
          { label: "DECLINED", value: summary.declined || 0, icon: XCircle },
        ].map((card) => (
          <div key={card.label} className="col-span-6 lg:col-span-3 editorial p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label}</div>
                <div className="font-display text-5xl tracking-tightest mt-3 tnum">{card.value}</div>
              </div>
              <card.icon size={18} className="text-accent" />
            </div>
          </div>
        ))}
      </div>

      {open && (
        <form onSubmit={submit} className="editorial p-6 grid grid-cols-12 gap-3" data-testid="workshop-form">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Workshop title" className="col-span-12 md:col-span-4 px-3 py-2.5 border border-line bg-bone-50" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="col-span-6 md:col-span-2 px-3 py-2.5 border border-line bg-bone-50">
            <option value="workshop">Workshop</option>
            <option value="bootcamp">Bootcamp</option>
            <option value="hackathon">Hackathon</option>
            <option value="webinar">Webinar</option>
          </select>
          <input type="date" value={form.preferred_date} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
            className="col-span-6 md:col-span-2 px-3 py-2.5 border border-line bg-bone-50" />
          <input type="number" min="1" value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })}
            className="col-span-6 md:col-span-1 px-3 py-2.5 border border-line bg-bone-50" />
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes / target skills" className="col-span-12 md:col-span-3 px-3 py-2.5 border border-line bg-bone-50" />
          <button className="col-span-12 md:col-span-2 btn justify-center">Submit</button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {["all", ...STATUSES].map((status) => (
          <button key={status} onClick={() => setFilter(status)}
            className={`font-mono text-[10px] tracking-[0.2em] px-4 py-2 border ${filter === status ? "bg-ink-900 text-bone-100 border-ink-900" : "bg-bone-50 border-line text-ink-500"}`}>
            {status.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="border border-line bg-bone-50">
        <div className="grid grid-cols-12 px-6 py-3 border-b border-line font-mono text-[10px] tracking-[0.2em] text-ink-400">
          <div className="col-span-3">PROGRAM</div>
          <div className="col-span-2">TYPE</div>
          <div className="col-span-2">DATE</div>
          <div className="col-span-1">SEATS</div>
          <div className="col-span-2">STATUS</div>
          <div className="col-span-2 text-right">MOVE</div>
        </div>
        {filtered.map((item, i) => (
          <div key={item.workshop_id} className="grid grid-cols-12 px-6 py-4 border-b border-line items-center text-sm" data-testid={`workshop-row-${i}`}>
            <div className="col-span-3 font-medium">{item.title}</div>
            <div className="col-span-2 font-mono text-xs uppercase">{item.type}</div>
            <div className="col-span-2 font-mono text-xs">{item.preferred_date?.slice(0, 10) || "TBD"}</div>
            <div className="col-span-1 font-mono text-xs tnum">{item.attendees}</div>
            <div className="col-span-2"><span className="pill">{item.status}</span></div>
            <div className="col-span-2 flex justify-end gap-2">
              {STATUSES.filter((s) => s !== item.status).slice(0, 3).map((status) => (
                <button key={status} onClick={() => updateStatus(item.workshop_id, status)}
                  className="font-mono text-[9px] px-2 py-1 border border-line hover:border-accent">
                  {status}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-12 text-center text-ink-400">No workshop requests yet.</div>}
      </div>
    </div>
  );
}
