import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../App";
import { Calendar, MapPin, Plus, X, Search, Bookmark, ExternalLink, Briefcase } from "lucide-react";
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

const CITY_CHIPS = [
  { label: "ALL INDIA", value: "India" },
  { label: "HYDERABAD", value: "Hyderabad" },
  { label: "BANGALORE", value: "Bangalore" },
  { label: "CHENNAI", value: "Chennai" },
  { label: "PUNE", value: "Pune" },
  { label: "MUMBAI", value: "Mumbai" },
  { label: "DELHI", value: "Delhi" },
];

export default function Jobs() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyJob);
  const [tab, setTab] = useState("on_campus");

  // Job Discovery states
  const [keywords, setKeywords] = useState("developer");
  const [location, setLocation] = useState("India");
  const [discoveryJobs, setDiscoveryJobs] = useState([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());

  const canCreate = ["recruiter", "tpo", "institution_admin", "super_admin"].includes(user?.role);

  const load = () => api.get("/jobs?status=open").then(({ data }) => setItems(data.items || []));

  useEffect(() => {
    load();
  }, []);

  const loadSavedJobsIndex = async () => {
    try {
      const { data } = await api.get("/saved-jobs");
      setSavedIds(new Set((data || []).map((j) => j.job_id)));
    } catch (e) {
      console.warn("Failed to load saved jobs index", e);
    }
  };

  const searchDiscovery = async (kw = keywords, loc = location) => {
    setDiscoveryLoading(true);
    try {
      const { data } = await api.get(
        `/jobs/discover?keywords=${encodeURIComponent(kw)}&location=${encodeURIComponent(loc)}`
      );
      setDiscoveryJobs(data.jobs || []);
    } catch (err) {
      toast.error("Failed to discover external jobs.");
    } finally {
      setDiscoveryLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "discovery") {
      loadSavedJobsIndex();
      searchDiscovery(keywords, location);
    }
  }, [tab]);

  const handleCityChipClick = (cityVal) => {
    setLocation(cityVal);
    searchDiscovery(keywords, cityVal);
  };

  const handleSaveJob = async (job) => {
    try {
      const payload = {
        id: String(job.id),
        title: job.title,
        company: job.company,
        location: job.location || "India",
        salary: job.salary || "Not specified",
        jobType: job.type || "Full-time",
        logo: job.logo || "",
        url: job.link || "",
      };
      await api.post("/saved-jobs", payload);
      toast.success("Opportunity bookmarked!");
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.add(payload.id);
        return next;
      });
    } catch (e) {
      toast.error("Failed to bookmark job.");
    }
  };

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
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">PLACEMENT PORTAL</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="jobs-heading">
            {tab === "on_campus" ? `${items.length} open drives` : "Job Discovery"}
          </h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
            {tab === "on_campus"
              ? "On-campus recruiter drives currently accepting student applications."
              : "Discover thousands of external opportunities indexed via Jooble API."}
          </p>
        </div>
        {tab === "on_campus" && canCreate && (
          <button onClick={() => setOpen((v) => !v)} className="btn" data-testid="new-job-btn">
            {open ? <X size={14} /> : <Plus size={14} />} {open ? "Close" : "Create drive"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line">
        <button
          onClick={() => setTab("on_campus")}
          className={`px-6 py-3 font-mono text-[10px] tracking-[0.24em] border-r border-line transition-all ${
            tab === "on_campus"
              ? "bg-bone-100 border-t-2 border-t-accent text-accent font-bold"
              : "text-ink-400 hover:text-ink-900"
          }`}
        >
          ON-CAMPUS DRIVES
        </button>
        <button
          onClick={() => setTab("discovery")}
          className={`px-6 py-3 font-mono text-[10px] tracking-[0.24em] border-r border-line transition-all ${
            tab === "discovery"
              ? "bg-bone-100 border-t-2 border-t-accent text-accent font-bold"
              : "text-ink-400 hover:text-ink-900"
          }`}
        >
          JOB DISCOVERY
        </button>
      </div>

      {tab === "on_campus" ? (
        <>
          {open && canCreate && (
            <form onSubmit={submit} className="editorial p-6 grid grid-cols-12 gap-3" data-testid="job-form">
              <input
                value={form.company}
                onChange={(e) => setField("company", e.target.value)}
                placeholder={user?.role === "recruiter" ? "Company (optional)" : "Company"}
                data-testid="job-company"
                className="col-span-12 md:col-span-3 px-3 py-2.5 border border-line bg-bone-50 text-sm focus:outline-none focus:border-accent"
              />
              <input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Role title"
                data-testid="job-title"
                required
                className="col-span-12 md:col-span-3 px-3 py-2.5 border border-line bg-bone-50 text-sm focus:outline-none focus:border-accent"
              />
              <input
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="Location"
                data-testid="job-location"
                className="col-span-12 md:col-span-2 px-3 py-2.5 border border-line bg-bone-50 text-sm focus:outline-none focus:border-accent"
              />
              <input
                value={form.ctc_lpa}
                onChange={(e) => setField("ctc_lpa", e.target.value)}
                type="number"
                step="0.1"
                placeholder="CTC LPA"
                data-testid="job-ctc"
                className="col-span-6 md:col-span-1 px-3 py-2.5 border border-line bg-bone-50 text-sm focus:outline-none focus:border-accent"
              />
              <input
                value={form.openings}
                onChange={(e) => setField("openings", e.target.value)}
                type="number"
                placeholder="Openings"
                data-testid="job-openings"
                className="col-span-6 md:col-span-1 px-3 py-2.5 border border-line bg-bone-50 text-sm focus:outline-none focus:border-accent"
              />
              <input
                value={form.eligibility_cgpa}
                onChange={(e) => setField("eligibility_cgpa", e.target.value)}
                type="number"
                step="0.1"
                placeholder="Min CGPA"
                data-testid="job-cgpa"
                className="col-span-6 md:col-span-1 px-3 py-2.5 border border-line bg-bone-50 text-sm focus:outline-none focus:border-accent"
              />
              <button type="submit" className="col-span-6 md:col-span-1 btn justify-center" data-testid="job-submit">
                Create
              </button>
            </form>
          )}

          <div className="grid grid-cols-12 gap-3" data-testid="jobs-grid">
            {items.map((j, i) => (
              <div
                key={j.job_id}
                className="col-span-12 md:col-span-6 lg:col-span-4 editorial p-7 group hover:border-ink-900 transition-colors"
                data-testid={`job-${i}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">
                      {j.status?.toUpperCase()} / {j.location}
                    </div>
                    <div className="font-display text-2xl mt-1 tracking-tight group-hover:text-accent transition-colors">
                      {j.company}
                    </div>
                    <div className="text-sm text-ink-700 mt-1">{j.title}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">CTC</div>
                    <div className="font-display text-2xl tnum text-accent">{j.ctc_lpa}L</div>
                  </div>
                </div>
                <div className="hairline my-5" />
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="font-mono text-[10px] text-ink-400 tracking-[0.18em]">OPENINGS</div>
                    <div className="font-display text-xl tnum mt-0.5">{j.openings}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-ink-400 tracking-[0.18em]">APPLIED</div>
                    <div className="font-display text-xl tnum mt-0.5">{j.applied_count}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-ink-400 tracking-[0.18em]">MIN CGPA</div>
                    <div className="font-display text-xl tnum mt-0.5">{j.eligibility_cgpa}</div>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-4 text-xs text-ink-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={12} /> {j.drive_date?.slice(0, 10)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={12} /> {j.location}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* JOB DISCOVERY TAB */
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex border border-line bg-paper">
              <span className="px-3 flex items-center text-ink-400 border-r border-line bg-bone-100">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Search jobs (e.g. React, Python, ML Intern)..."
                className="w-full px-4 py-3 bg-transparent text-sm focus:outline-none"
              />
            </div>
            
            <div className="flex border border-line bg-paper">
              <span className="px-3 flex items-center text-ink-400 border-r border-line bg-bone-100">
                <MapPin size={16} />
              </span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Country or City"
                className="w-48 px-4 py-3 bg-transparent text-sm focus:outline-none"
              />
            </div>
            
            <button
              onClick={() => searchDiscovery(keywords, location)}
              disabled={discoveryLoading}
              className="btn px-8 py-3 text-xs justify-center"
            >
              {discoveryLoading ? "Searching..." : "Search"}
            </button>
          </div>

          {/* City Chips */}
          <div className="flex flex-wrap gap-2">
            {CITY_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => handleCityChipClick(chip.value)}
                className={`font-mono text-[9px] tracking-widest px-3 py-1.5 border transition-all ${
                  location.toLowerCase() === chip.value.toLowerCase()
                    ? "bg-accent border-accent text-bone-100 font-bold"
                    : "border-line bg-bone-50 hover:bg-bone-100 text-ink-600"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {discoveryLoading ? (
            <div className="p-16 text-center text-xs font-mono text-ink-400">DISCOVERING JOBS VIA JOOBLE API...</div>
          ) : (
            <div className="grid grid-cols-12 gap-3">
              {discoveryJobs.map((job, idx) => {
                const isSaved = savedIds.has(String(job.id));
                return (
                  <div
                    key={job.id || idx}
                    className="col-span-12 md:col-span-6 editorial p-6 flex flex-col justify-between hover:border-ink-900 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">
                            {job.company || "COMPANY"}
                          </div>
                          <h4 className="font-display text-xl tracking-tight mt-1">
                            {job.title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-ink-500 mt-2 font-mono">
                            <MapPin size={11} /> {job.location || "India"}
                            {job.salary && <span className="text-accent ml-2">· {job.salary}</span>}
                          </div>
                        </div>
                        <Briefcase size={20} className="text-ink-200" />
                      </div>
                      
                      <div className="hairline my-4" />
                      
                      <p
                        className="font-serif text-xs text-ink-600 leading-relaxed mb-4"
                        dangerouslySetInnerHTML={{ __html: job.snippet || "" }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-line">
                      <button
                        onClick={() => handleSaveJob(job)}
                        disabled={isSaved}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-[10px] font-mono tracking-wider transition-all ${
                          isSaved
                            ? "bg-accent border-accent text-bone-100 font-bold"
                            : "border-line bg-bone-50 hover:bg-bone-100 text-ink-600"
                        }`}
                      >
                        <Bookmark size={10} /> {isSaved ? "SAVED" : "SAVE JOB"}
                      </button>
                      
                      {job.link && (
                        <a
                          href={job.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-mono tracking-wider text-ink-400 hover:text-accent transition-colors"
                        >
                          APPLY SOURCE <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
              {discoveryJobs.length === 0 && (
                <div className="col-span-12 p-16 text-center text-xs font-mono border border-dashed border-line text-ink-400 bg-bone-50">
                  No discovery results. Try searching for different keywords or location.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
