import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../App";
import { Calendar, MapPin, Plus, X } from "lucide-react";
import { toast } from "sonner";

const emptyJob = {
  company: "",
  title: "",
  ctc_lpa: 8,
  openings: 5,
  eligibility_cgpa: 7,
  location: "Hyderabad",
  institutions: ["inst_kmit"],
  stream_filter: "Engineering",
};

export default function Jobs() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyJob);
  const canCreate = ["recruiter", "tpo", "institution_admin", "super_admin"].includes(user?.role);

  const load = () => api.get("/jobs?status=open").then(({ data }) => setItems(data.items || []));
  useEffect(() => { load(); }, []);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        ctc_lpa: Number(form.ctc_lpa),
        openings: Number(form.openings),
        eligibility_cgpa: Number(form.eligibility_cgpa),
        drive_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      await api.post("/jobs", payload);
      toast.success("Drive created");
      setOpen(false);
      setForm(emptyJob);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not create drive");
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">ACTIVE DRIVES</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="jobs-heading">
            {items.length} open <span className="text-accent">opportunities.</span>
          </h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">Recruiter drives currently accepting applications.</p>
        </div>
        {canCreate && (
          <button onClick={() => setOpen((v) => !v)} className="btn" data-testid="new-job-btn">
            {open ? <X size={14} /> : <Plus size={14} />} {open ? "Close" : "Create drive"}
          </button>
        )}
      </div>

      {open && canCreate && (
        <form onSubmit={submit} className="editorial p-6 grid grid-cols-12 gap-3" data-testid="job-form">
          <input value={form.company} onChange={(e) => setField("company", e.target.value)}
            placeholder={user?.role === "recruiter" ? "Company (optional)" : "Company"} data-testid="job-company"
            className="col-span-12 md:col-span-3 px-3 py-2.5 border border-line bg-bone-50" />
          <input value={form.title} onChange={(e) => setField("title", e.target.value)}
            placeholder="Role title" data-testid="job-title" required
            className="col-span-12 md:col-span-3 px-3 py-2.5 border border-line bg-bone-50" />
          <input value={form.location} onChange={(e) => setField("location", e.target.value)}
            placeholder="Location" data-testid="job-location"
            className="col-span-12 md:col-span-2 px-3 py-2.5 border border-line bg-bone-50" />
          <input value={form.ctc_lpa} onChange={(e) => setField("ctc_lpa", e.target.value)} type="number" step="0.1"
            placeholder="CTC LPA" data-testid="job-ctc"
            className="col-span-6 md:col-span-1 px-3 py-2.5 border border-line bg-bone-50" />
          <input value={form.openings} onChange={(e) => setField("openings", e.target.value)} type="number"
            placeholder="Openings" data-testid="job-openings"
            className="col-span-6 md:col-span-1 px-3 py-2.5 border border-line bg-bone-50" />
          <input value={form.eligibility_cgpa} onChange={(e) => setField("eligibility_cgpa", e.target.value)} type="number" step="0.1"
            placeholder="Min CGPA" data-testid="job-cgpa"
            className="col-span-6 md:col-span-1 px-3 py-2.5 border border-line bg-bone-50" />
          <button type="submit" className="col-span-6 md:col-span-1 btn justify-center" data-testid="job-submit">Create</button>
        </form>
      )}

      <div className="grid grid-cols-12 gap-3" data-testid="jobs-grid">
        {items.map((j, i) => (
          <div key={j.job_id} className="col-span-12 md:col-span-6 lg:col-span-4 editorial p-7 group hover:border-ink-900 transition-colors" data-testid={`job-${i}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{j.status?.toUpperCase()} / {j.location}</div>
                <div className="font-display text-2xl mt-1 tracking-tight group-hover:text-accent transition-colors">{j.company}</div>
                <div className="text-sm text-ink-700 mt-1">{j.title}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">CTC</div>
                <div className="font-display text-2xl tnum text-accent">{j.ctc_lpa}L</div>
              </div>
            </div>
            <div className="hairline my-5" />
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div><div className="font-mono text-[10px] text-ink-400 tracking-[0.18em]">OPENINGS</div><div className="font-display text-xl tnum mt-0.5">{j.openings}</div></div>
              <div><div className="font-mono text-[10px] text-ink-400 tracking-[0.18em]">APPLIED</div><div className="font-display text-xl tnum mt-0.5">{j.applied_count}</div></div>
              <div><div className="font-mono text-[10px] text-ink-400 tracking-[0.18em]">MIN CGPA</div><div className="font-display text-xl tnum mt-0.5">{j.eligibility_cgpa}</div></div>
            </div>
            <div className="mt-5 flex items-center gap-4 text-xs text-ink-500">
              <span className="inline-flex items-center gap-1.5"><Calendar size={12} /> {j.drive_date?.slice(0, 10)}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin size={12} /> {j.location}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
