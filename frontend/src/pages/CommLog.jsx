import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../App";
import { toast } from "sonner";
import { Plus, X, Pencil, Trash2, MessageSquare, Calendar, StickyNote, ArrowUpRight } from "lucide-react";

const TYPES = ["all", "meeting", "note", "follow_up", "comment"];
const TYPE_LABELS = { all: "All", meeting: "Meetings", note: "Notes", follow_up: "Follow-ups", comment: "Comments" };
const TYPE_ICONS = { meeting: Calendar, note: StickyNote, follow_up: ArrowUpRight, comment: MessageSquare };
const emptyForm = { type: "meeting", subject: "", summary: "" };

export default function CommLog() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("table");

  const load = () =>
    api.get("/comm-log")
      .then(({ data }) => setItems(data.items || data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const filtered = items.filter(
    (i) =>
      (filter === "all" || i.type === filter) &&
      (i.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.summary || "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject) { toast.error("Subject is required"); return; }
    setSubmitting(true);
    try {
      if (editId) {
        await api.patch(`/comm-log/${editId}`, { subject: form.subject, summary: form.summary });
        toast.success("Entry updated");
      } else {
        await api.post("/comm-log", { ...form, by: user?.name || user?.email });
        toast.success("Entry created");
      }
      setForm(emptyForm);
      setAdding(false);
      setEditId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item) => {
    setForm({ type: item.type, subject: item.subject, summary: item.summary || "" });
    setEditId(item.log_id);
    setAdding(true);
  };

  const remove = async (log_id) => {
    try {
      await api.delete(`/comm-log/${log_id}`);
      toast.success("Entry deleted");
      load();
    } catch {
      toast.error("Could not delete");
    }
  };

  if (loading) return <div className="font-mono text-xs text-ink-400 p-8">LOADING…</div>;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ COMMUNICATION LOG</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="comm-log-heading">
            Partnership <span className="text-accent">Touchpoints</span>
          </h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">Track meetings, notes, and follow-ups across partnerships.</p>
        </div>
        <button
          onClick={() => { setAdding((v) => !v); setEditId(null); setForm(emptyForm); }}
          className="btn" data-testid="comm-log-add-btn"
        >
          {adding ? <X size={14} /> : <Plus size={14} />} {adding ? "Close" : "Add entry"}
        </button>
      </div>

      {/* Search and Filters toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Filter pills */}
        <div className="flex flex-wrap gap-2" data-testid="comm-log-filters">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`font-mono text-[10px] tracking-[0.2em] px-4 py-2 border transition-colors ${filter === t ? "border-ink-900 bg-ink-900 text-bone-100" : "border-line bg-bone-50 text-ink-500 hover:border-ink-900"}`}
              data-testid={`comm-filter-${t}`}
            >
              {TYPE_LABELS[t].toUpperCase()} {t !== "all" && <span className="ml-1 tnum">({items.filter((i) => i.type === t).length})</span>}
            </button>
          ))}
        </div>

        {/* Search input + View mode toggle */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-line bg-bone-50 focus:outline-none focus:border-accent text-xs font-mono w-full md:w-48"
          />

          <div className="flex items-center gap-2 border border-line p-1 bg-bone-50">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 font-mono text-[9px] tracking-widest transition-colors ${viewMode === "table" ? "bg-ink text-bone-100" : "text-ink-400 hover:text-ink-900"}`}
            >
              TABLE
            </button>
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1 font-mono text-[9px] tracking-widest transition-colors ${viewMode === "timeline" ? "bg-ink text-bone-100" : "text-ink-400 hover:text-ink-900"}`}
            >
              TIMELINE
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit form */}
      {adding && (
        <form onSubmit={submit} className="editorial p-6 grid grid-cols-12 gap-3" data-testid="comm-log-form">
          <div className="col-span-12">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-3">
              {editId ? "EDIT ENTRY" : "NEW ENTRY"}
            </div>
          </div>
          <select
            value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="col-span-12 md:col-span-2 px-3 py-2.5 border border-line bg-bone-50"
            data-testid="comm-log-type" disabled={!!editId}
          >
            {TYPES.filter((t) => t !== "all").map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
          <input
            value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Subject" required data-testid="comm-log-subject"
            className="col-span-12 md:col-span-4 px-3 py-2.5 border border-line bg-bone-50 focus:outline-none focus:border-accent"
          />
          <textarea
            value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder="Summary / notes" data-testid="comm-log-summary" rows={1}
            className="col-span-12 md:col-span-4 px-3 py-2.5 border border-line bg-bone-50 focus:outline-none focus:border-accent font-serif"
          />
          <button type="submit" disabled={submitting} className="col-span-12 md:col-span-2 btn justify-center" data-testid="comm-log-submit">
            {submitting ? "Saving…" : editId ? "Update" : "Create"}
          </button>
        </form>
      )}

      {viewMode === "timeline" ? (
        <div className="relative border-l border-line ml-4 md:ml-8 py-4 pl-6 md:pl-8 space-y-6">
          {filtered.map((item, i) => {
            const Icon = TYPE_ICONS[item.type] || MessageSquare;
            return (
              <div key={item.log_id || i} className="relative" data-testid={`comm-log-timeline-row-${i}`}>
                {/* Node dot */}
                <div className="absolute -left-[31px] md:-left-[39px] top-1.5 w-5 h-5 rounded-full border border-line bg-bone-100 grid place-items-center text-ink-900 shadow-sm z-10">
                  <Icon size={10} />
                </div>
                {/* Content Card */}
                <div className="editorial p-6 border border-line bg-bone-50 hover:border-accent transition-colors space-y-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[9px] tracking-[0.2em] px-2 py-0.5 border border-line uppercase bg-paper">
                        {item.type}
                      </span>
                      <span className="font-mono text-xs text-ink-400">{item.created_at?.slice(0, 10)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(item)} className="text-ink-400 hover:text-ink-900 transition-colors" data-testid={`comm-edit-${i}`}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => remove(item.log_id)} className="text-ink-400 hover:text-accent transition-colors" data-testid={`comm-delete-${i}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-display text-lg tracking-tight font-bold">{item.subject}</h4>
                  <p className="font-serif text-sm text-ink-700 whitespace-pre-wrap">{item.summary}</p>
                  <div className="pt-2 border-t border-line/30 flex items-center justify-between text-xs font-mono text-ink-400">
                    <span>Logged by: {item.by || "—"}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-12 text-center text-ink-400 font-serif border border-line bg-bone-50">No entries found matching criteria.</div>
          )}
        </div>
      ) : (
        /* Log table */
        <div className="border border-line bg-bone-50" data-testid="comm-log-table">
          <div className="p-6 border-b border-line">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">
              {filter === "all" ? "ALL ENTRIES" : TYPE_LABELS[filter].toUpperCase()} / {filtered.length}
            </div>
            <h3 className="font-display text-2xl tracking-tight mt-1">Communication registry</h3>
          </div>
          <div className="grid grid-cols-12 px-6 py-3 border-b border-line font-mono text-[10px] tracking-[0.2em] text-ink-400">
            <div className="col-span-2">DATE</div>
            <div className="col-span-2">TYPE</div>
            <div className="col-span-3">SUBJECT</div>
            <div className="col-span-3">SUMMARY</div>
            <div className="col-span-1">BY</div>
            <div className="col-span-1 text-right">ACTIONS</div>
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y divide-line">
            {filtered.map((item, i) => {
              const Icon = TYPE_ICONS[item.type] || MessageSquare;
              return (
                <div key={item.log_id || i} className="grid grid-cols-12 px-6 py-3 items-center text-sm hover:bg-bone-100 transition-colors" data-testid={`comm-log-row-${i}`}>
                  <div className="col-span-2 font-mono text-xs">{item.created_at?.slice(0, 10) || "—"}</div>
                  <div className="col-span-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] px-2 py-0.5 border border-line">
                      <Icon size={10} /> {(item.type || "—").toUpperCase()}
                    </span>
                  </div>
                  <div className="col-span-3 font-medium">{item.subject}</div>
                  <div className="col-span-3 font-serif text-ink-600 truncate">{item.summary || "—"}</div>
                  <div className="col-span-1 font-mono text-xs text-ink-400">{item.by || "—"}</div>
                  <div className="col-span-1 flex gap-2 justify-end">
                    <button onClick={() => startEdit(item)} className="text-ink-400 hover:text-ink-900 transition-colors" data-testid={`comm-edit-${i}`}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => remove(item.log_id)} className="text-ink-400 hover:text-accent transition-colors" data-testid={`comm-delete-${i}`}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="p-12 text-center text-ink-400">No entries found.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
