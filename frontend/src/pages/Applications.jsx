import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../App";
import { toast } from "sonner";
import { Briefcase, Trash2, ArrowLeft, ArrowRight, Table, Kanban, Bookmark, ExternalLink, MapPin, Search, CheckCircle, X, ShieldAlert } from "lucide-react";

const STAGES = ["Applied", "Shortlisted", "Assessment", "Interview", "Selected", "Rejected"];
const STAGE_COLOR = { 
  Applied: "#0a0a0a", 
  Shortlisted: "#d4a017", 
  Assessment: "#6b7280", 
  Interview: "#c1440e", 
  Selected: "#4a5d3a", 
  Rejected: "#9a9a9a" 
};

export default function Applications() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [stage, setStage] = useState("");
  
  // Student Saved Jobs states
  const [savedJobs, setSavedJobs] = useState([]);
  const [studentTab, setStudentTab] = useState("my_applications"); // "my_applications" | "saved_opportunities"
  
  // Recruiter/TPO view mode state
  const [viewMode, setViewMode] = useState("table"); // "table" | "kanban"

  // Advanced Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  // Bulk Actions
  const [selectedAppIds, setSelectedAppIds] = useState([]);

  // Candidate Review Panel
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [candidateDetail, setCandidateDetail] = useState(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [recruiterNotes, setRecruiterNotes] = useState("");
  const [updatingNotes, setUpdatingNotes] = useState(false);

  const load = (s = stage) => {
    const q = s ? `?stage=${s}` : "";
    api.get(`/applications${q}`).then(({ data }) => setD(data));
  };

  const loadSavedJobs = async () => {
    try {
      const { data } = await api.get("/saved-jobs");
      setSavedJobs(data.items || data || []);
    } catch (e) {
      console.warn("Failed to load saved jobs", e);
    }
  };

  useEffect(() => {
    load("");
    if (user?.role === "student") {
      loadSavedJobs();
    }
  }, [user]);

  // Load candidate details when clicked
  useEffect(() => {
    if (!selectedCandidateId) {
      setCandidateDetail(null);
      setRecruiterNotes("");
      return;
    }
    setCandidateLoading(true);
    const app = d?.items?.find(i => i.student_id === selectedCandidateId || i.application_id === selectedCandidateId);
    setRecruiterNotes(app?.recruiter_notes || app?.notes || "");

    api.get(`/students/${app?.student_id || selectedCandidateId}`)
      .then(({ data }) => {
        setCandidateDetail({
          ...data,
          application: app
        });
      })
      .catch(() => {
        toast.error("Failed to load candidate details");
      })
      .finally(() => {
        setCandidateLoading(false);
      });
  }, [selectedCandidateId]);

  const advance = async (id, next) => {
    try {
      await api.patch(`/applications/${id}`, { stage: next });
      toast.success(`Moved to ${next}`);
      // Update local state dynamically
      setD(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(item => 
            item.application_id === id ? { ...item, stage: next } : item
          )
        };
      });
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  const moveStage = (id, currentStage, direction) => {
    const idx = STAGES.indexOf(currentStage);
    const nextIdx = idx + direction;
    if (nextIdx >= 0 && nextIdx < STAGES.length) {
      advance(id, STAGES[nextIdx]);
    }
  };

  const handleDeleteSavedJob = async (jobId) => {
    try {
      await api.delete(`/saved-jobs/${jobId}`);
      toast.success("Bookmark removed");
      loadSavedJobs();
    } catch (e) {
      toast.error("Failed to delete bookmark");
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) {
      await advance(id, targetStage);
    }
  };

  // Bulk Actions helpers
  const toggleSelectApp = (id) => {
    setSelectedAppIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filteredList) => {
    if (selectedAppIds.length === filteredList.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(filteredList.map(x => x.application_id));
    }
  };

  const bulkMoveStage = async (targetStage) => {
    if (selectedAppIds.length === 0) return;
    try {
      await Promise.all(
        selectedAppIds.map(id => api.patch(`/applications/${id}`, { stage: targetStage }))
      );
      toast.success(`Moved ${selectedAppIds.length} candidates to ${targetStage}`);
      setSelectedAppIds([]);
      load();
    } catch {
      toast.error("Bulk transition failed");
    }
  };

  const handleSaveNotes = async () => {
    if (!candidateDetail?.application) return;
    setUpdatingNotes(true);
    try {
      const appId = candidateDetail.application.application_id;
      await api.patch(`/applications/${appId}`, { recruiter_notes: recruiterNotes, notes: recruiterNotes });
      toast.success("Recruiter notes saved");
      // Update local item
      setD(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.application_id === appId ? { ...item, recruiter_notes: recruiterNotes, notes: recruiterNotes } : item
        )
      }));
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setUpdatingNotes(false);
    }
  };

  if (!d) return <div className="font-mono text-xs text-ink-400 p-8">LOADING PIPELINE…</div>;

  const isStudent = user?.role === "student";

  // Filter items
  const filteredItems = (d.items || []).filter(item => {
    const matchesSearch = 
      item.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.roll_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = !deptFilter || item.department === deptFilter;
    const matchesStage = !stage || item.stage === stage;
    return matchesSearch && matchesDept && (viewMode === "kanban" ? true : matchesStage);
  });

  const departments = Array.from(new Set((d.items || []).map(i => i.department).filter(Boolean)));

  return (
    <div className="space-y-10 relative">
      <div>
        <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">
          {isStudent ? "STUDENT CAREER CENTER" : "§ APPLICATION PIPELINE"}
        </div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="apps-heading">
          {isStudent ? "Track Applications" : "Every candidate, "}
          <span className="text-accent">{isStudent ? "& Opportunities" : "every stage."}</span>
        </h1>
      </div>

      {isStudent ? (
        /* Student Tabs */
        <div className="flex border-b border-line">
          <button
            onClick={() => setStudentTab("my_applications")}
            className={`px-6 py-3 font-mono text-[10px] tracking-[0.24em] border-r border-line transition-all ${
              studentTab === "my_applications"
                ? "bg-bone-100 border-t-2 border-t-accent text-accent font-bold"
                : "text-ink-400 hover:text-ink-900"
            }`}
          >
            MY APPLICATIONS ({d.items?.length || 0})
          </button>
          <button
            onClick={() => {
              setStudentTab("saved_opportunities");
              loadSavedJobs();
            }}
            className={`px-6 py-3 font-mono text-[10px] tracking-[0.24em] border-r border-line transition-all ${
              studentTab === "saved_opportunities"
                ? "bg-bone-100 border-t-2 border-t-accent text-accent font-bold"
                : "text-ink-400 hover:text-ink-900"
            }`}
          >
            SAVED OPPORTUNITIES ({savedJobs.length})
          </button>
        </div>
      ) : (
        /* Recruiter/TPO View Mode and Filters toolbar */
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">
              VIEW: {viewMode.toUpperCase()}
            </div>
            <div className="flex gap-1.5 border border-line p-0.5 bg-bone-50">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1 font-mono text-[9px] tracking-widest ${
                  viewMode === "table" ? "bg-ink-900 text-bone-100 font-bold" : "text-ink-400 hover:text-ink-900"
                }`}
              >
                TABLE
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`px-3 py-1 font-mono text-[9px] tracking-widest ${
                  viewMode === "kanban" ? "bg-ink-900 text-bone-100 font-bold" : "text-ink-400 hover:text-ink-900"
                }`}
              >
                KANBAN
              </button>
            </div>
          </div>

          {/* Search & filters */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search candidate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 border border-line bg-bone-50 focus:outline-none focus:border-accent text-xs font-mono w-full md:w-44"
            />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 border border-line bg-bone-50 focus:outline-none text-xs font-mono w-full md:w-36"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Analytics (Recruiters/TPOs or Student Applications overview) */}
      {!isStudent && d.analytics && (
        <div className="grid grid-cols-12 gap-3" data-testid="apps-analytics">
          {[
            { label: "Active", value: d.analytics.active, sub: "not terminal" },
            { label: "Conversion", value: `${d.analytics.conversion_rate}%`, sub: "selected / total" },
            { label: "Interview rate", value: `${d.analytics.interview_rate}%`, sub: "current stage" },
            { label: "Drop rate", value: `${d.analytics.drop_rate}%`, sub: "rejected / total" },
          ].map((card) => (
            <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6">
              <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
              <div className="font-display text-5xl tracking-tightest mt-3 tnum">{card.value}</div>
              <div className="text-sm text-ink-500 mt-2">{card.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recruiter / TPO Layout Options */}
      {!isStudent && (
        <>
          {viewMode === "table" ? (
            <>
              {/* Pipeline counts */}
              <div className="grid grid-cols-12 gap-3" data-testid="apps-pipeline">
                {STAGES.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStage(s === stage ? "" : s);
                      load(s === stage ? "" : s);
                    }}
                    className={`col-span-12 md:col-span-2 lg:col-span-2 editorial p-6 text-left transition-all ${
                      stage === s ? "border-ink-900 border-2" : ""
                    }`}
                    data-testid={`pipeline-${s}`}
                  >
                    <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{s.toUpperCase()}</div>
                    <div className="font-display text-5xl mt-3 tnum" style={{ color: STAGE_COLOR[s] }}>
                      {d.pipeline?.[s] || 0}
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => {
                    setStage("");
                    load("");
                  }}
                  className={`col-span-12 md:col-span-2 editorial p-6 text-left ${
                    !stage ? "border-ink-900 border-2" : ""
                  }`}
                >
                  <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">ALL</div>
                  <div className="font-display text-5xl mt-3 tnum">
                    {Object.values(d.pipeline || {}).reduce((a, b) => a + b, 0)}
                  </div>
                </button>
              </div>

              {/* Rows */}
              <div className="editorial">
                <div className="grid grid-cols-12 px-6 py-3 border-b border-line font-mono text-[10px] tracking-[0.24em] text-ink-400 items-center">
                  <div className="col-span-1">
                    <input
                      type="checkbox"
                      checked={filteredItems.length > 0 && selectedAppIds.length === filteredItems.length}
                      onChange={() => toggleSelectAll(filteredItems)}
                    />
                  </div>
                  <div className="col-span-2">STUDENT</div>
                  <div className="col-span-2">ROLL</div>
                  <div className="col-span-2">COMPANY</div>
                  <div className="col-span-2">ROLE</div>
                  <div className="col-span-1 text-right">CTC</div>
                  <div className="col-span-2 text-right">STAGE</div>
                </div>
                {filteredItems.map((a) => (
                  <div
                    key={a.application_id}
                    className="grid grid-cols-12 px-6 py-4 border-b border-line items-center text-sm hover:bg-bone-200 transition-colors"
                    data-testid={`app-${a.application_id}`}
                  >
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={selectedAppIds.includes(a.application_id)}
                        onChange={() => toggleSelectApp(a.application_id)}
                      />
                    </div>
                    <div 
                      className="col-span-2 cursor-pointer group"
                      onClick={() => setSelectedCandidateId(a.student_id)}
                    >
                      <div className="font-medium group-hover:text-accent transition-colors">{a.student_name}</div>
                      <div className="font-mono text-[10px] text-ink-400">{a.department}</div>
                    </div>
                    <div className="col-span-2 font-mono text-xs tnum">{a.roll_number}</div>
                    <div className="col-span-2 font-display tracking-tight">{a.company}</div>
                    <div className="col-span-2 text-ink-500 text-xs">{a.job_title}</div>
                    <div className="col-span-1 text-right font-mono text-accent tnum">
                      ₹{a.ctc_lpa?.toFixed(1)}L
                    </div>
                    <div className="col-span-2 text-right">
                      <select
                        value={a.stage}
                        onChange={(e) => advance(a.application_id, e.target.value)}
                        data-testid={`stage-${a.application_id}`}
                        className="font-mono text-[10px] tracking-[0.16em] uppercase border border-line bg-bone-50 px-2 py-1.5 focus:outline-none"
                        style={{ color: STAGE_COLOR[a.stage] }}
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <div className="p-12 text-center text-ink-400 font-serif">No candidates found matching filters.</div>
                )}
              </div>
            </>
          ) : (
            /* Kanban Board view */
            <div className="grid grid-cols-12 gap-3 overflow-x-auto pb-4 select-none">
              {STAGES.map((colStage) => {
                const colItems = filteredItems.filter((item) => item.stage === colStage);
                return (
                  <div
                    key={colStage}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, colStage)}
                    className="col-span-12 md:col-span-4 lg:col-span-2 border border-line bg-bone-50 min-h-[500px] flex flex-col"
                  >
                    {/* Header */}
                    <div className="p-4 border-b border-line bg-paper flex items-center justify-between">
                      <span className="font-mono text-[10px] tracking-widest font-bold">
                        {colStage.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 border border-line bg-bone-100 tnum">
                        {colItems.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                      {colItems.map((item) => (
                        <div
                          key={item.application_id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.application_id)}
                          className="p-4 border border-line bg-paper hover:border-accent transition-all space-y-2.5 shadow-sm cursor-grab active:cursor-grabbing relative group"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <input
                              type="checkbox"
                              checked={selectedAppIds.includes(item.application_id)}
                              onChange={() => toggleSelectApp(item.application_id)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div 
                                onClick={() => setSelectedCandidateId(item.student_id)}
                                className="font-display text-sm font-bold tracking-tight cursor-pointer hover:text-accent transition-colors truncate"
                              >
                                {item.student_name}
                              </div>
                              <div className="font-mono text-[9px] tracking-wider text-ink-400 truncate">
                                {item.department}
                              </div>
                            </div>
                          </div>

                          <div className="text-xs">
                            <div className="font-semibold text-ink-700">{item.company}</div>
                            <div className="text-ink-500 text-[11px] truncate">{item.job_title}</div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-line">
                            <span className="font-mono text-xs text-accent font-bold tnum">
                              ₹{item.ctc_lpa?.toFixed(1)}L
                            </span>
                            
                            <div className="flex gap-1">
                              <button
                                onClick={() => moveStage(item.application_id, item.stage, -1)}
                                disabled={colStage === STAGES[0]}
                                className="p-1 border border-line bg-bone-50 hover:bg-bone-100 disabled:opacity-30"
                              >
                                <ArrowLeft size={10} />
                              </button>
                              <button
                                onClick={() => moveStage(item.application_id, item.stage, 1)}
                                disabled={colStage === STAGES[STAGES.length - 1]}
                                className="p-1 border border-line bg-bone-50 hover:bg-bone-100 disabled:opacity-30"
                              >
                                <ArrowRight size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedAppIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-ink-900 text-bone-100 px-6 py-4 border border-accent shadow-2xl z-40 flex items-center gap-6 font-mono text-xs max-w-lg w-full justify-between">
          <div>
            <span className="text-accent font-bold">{selectedAppIds.length}</span> selected
          </div>
          <div className="flex items-center gap-3">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  bulkMoveStage(e.target.value);
                  e.target.value = "";
                }
              }}
              className="bg-ink-850 border border-bone-100/30 text-bone-100 px-3 py-1.5 focus:outline-none text-[10px] tracking-wider font-bold"
            >
              <option value="">Move to Stage...</option>
              {STAGES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
            <button
              onClick={() => setSelectedAppIds([])}
              className="text-bone-100/60 hover:text-bone-100 px-2 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CANDIDATE REVIEW PANEL (Slide-out Sheet) */}
      {selectedCandidateId && (
        <div 
          className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm z-50 flex justify-end"
          onClick={() => setSelectedCandidateId(null)}
        >
          <div 
            className="w-full max-w-md bg-bone-50 border-l border-line h-full flex flex-col justify-between p-8 overflow-y-auto shadow-2xl animate-[slidein_.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
            data-testid="candidate-drawer"
          >
            {candidateLoading ? (
              <div className="font-mono text-xs text-ink-400 p-8">Loading details...</div>
            ) : candidateDetail ? (
              <div className="space-y-6 flex flex-col h-full justify-between">
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-[9px] tracking-widest text-ink-400 uppercase">Candidate review</div>
                      <h2 className="font-display text-3xl tracking-tight mt-1">{candidateDetail.student?.name}</h2>
                      <div className="text-xs text-ink-500 font-mono mt-1">{candidateDetail.student?.roll_number}</div>
                    </div>
                    <button 
                      onClick={() => setSelectedCandidateId(null)}
                      className="p-1 border border-line hover:border-accent text-ink-400 hover:text-accent bg-paper"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-y border-line py-4">
                    <div>
                      <div className="font-mono text-[9px] tracking-wider text-ink-400 uppercase">Department</div>
                      <div className="font-display text-base font-bold mt-0.5">{candidateDetail.student?.department}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] tracking-wider text-ink-400 uppercase">CGPA</div>
                      <div className="font-display text-base font-bold mt-0.5">{candidateDetail.student?.cgpa}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] tracking-wider text-ink-400 uppercase">Readiness Score</div>
                      <div className="font-display text-xl text-accent font-bold mt-0.5">{candidateDetail.student?.readiness_score}/100</div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] tracking-wider text-ink-400 uppercase">Batch</div>
                      <div className="font-display text-base font-bold mt-0.5">{candidateDetail.student?.batch}</div>
                    </div>
                  </div>

                  {/* Skills tags */}
                  <div>
                    <div className="font-mono text-[9px] tracking-wider text-ink-400 uppercase mb-2">Technical Skills</div>
                    <div className="flex flex-wrap gap-1">
                      {(candidateDetail.student?.skills || []).map((sk, idx) => (
                        <span key={idx} className="font-mono text-[10px] px-2 py-0.5 border border-line bg-paper text-ink-800">
                          {typeof sk === "string" ? sk : sk.name}
                        </span>
                      ))}
                      {(candidateDetail.student?.skills || []).length === 0 && (
                        <span className="text-xs text-ink-400 font-serif">No skills listed.</span>
                      )}
                    </div>
                  </div>

                  {/* Applications lists */}
                  <div>
                    <div className="font-mono text-[9px] tracking-wider text-ink-400 uppercase mb-2">Other Applications</div>
                    <div className="space-y-2 max-h-[140px] overflow-y-auto">
                      {candidateDetail.applications?.map((app) => (
                        <div key={app.application_id} className="flex justify-between items-center text-xs p-2.5 border border-line bg-paper">
                          <div>
                            <span className="font-bold">{app.company}</span>
                            <span className="text-ink-400 ml-2">{app.job_title}</span>
                          </div>
                          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-line/60" style={{ color: STAGE_COLOR[app.stage] }}>
                            {app.stage}
                          </span>
                        </div>
                      ))}
                      {candidateDetail.applications?.length === 0 && (
                        <span className="text-xs text-ink-400 font-serif">No other applications.</span>
                      )}
                    </div>
                  </div>

                  {/* Recruiter Notes input */}
                  <div className="space-y-2">
                    <div className="font-mono text-[9px] tracking-wider text-ink-400 uppercase">Recruiter Notes / Comments</div>
                    <textarea
                      value={recruiterNotes}
                      onChange={(e) => setRecruiterNotes(e.target.value)}
                      placeholder="Add assessment notes, interview feedback..."
                      rows={4}
                      className="w-full p-3 border border-line bg-paper text-sm font-serif focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-between">
                  <span className="text-xs font-mono text-ink-400">Auto-saved on submit</span>
                  <button
                    onClick={handleSaveNotes}
                    disabled={updatingNotes}
                    className="btn px-4 py-2 text-xs font-bold font-mono tracking-wider justify-center"
                  >
                    {updatingNotes ? "Saving..." : "Save notes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="font-serif text-sm text-ink-400 flex items-center gap-2"><ShieldAlert size={16} /> Load failed.</div>
            )}
          </div>
        </div>
      )}

      {/* Student View Options */}
      {isStudent && (
        <>
          {studentTab === "my_applications" ? (
            <div className="editorial">
              <div className="grid grid-cols-12 px-6 py-3 border-b border-line font-mono text-[10px] tracking-[0.24em] text-ink-400">
                <div className="col-span-4">COMPANY</div>
                <div className="col-span-4">ROLE</div>
                <div className="col-span-2 text-right">CTC</div>
                <div className="col-span-2 text-right">STATUS</div>
              </div>
              {d.items.map((a) => (
                <div
                  key={a.application_id}
                  className="grid grid-cols-12 px-6 py-4 border-b border-line items-center text-sm hover:bg-bone-200 transition-colors"
                >
                  <div className="col-span-4 font-display text-lg tracking-tight">
                    {a.company}
                  </div>
                  <div className="col-span-4 text-ink-500 text-xs">
                    {a.job_title}
                  </div>
                  <div className="col-span-2 text-right font-mono text-accent tnum">
                    ₹{a.ctc_lpa?.toFixed(1)}L
                  </div>
                  <div className="col-span-2 text-right">
                    <span
                      className="font-mono text-[9px] tracking-widest px-2.5 py-1 border"
                      style={{ color: STAGE_COLOR[a.stage], borderColor: STAGE_COLOR[a.stage] }}
                    >
                      {a.stage.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
              {d.items.length === 0 && (
                <div className="p-16 text-center text-xs font-mono text-ink-400">
                  No active applications. Explore drives to apply!
                </div>
              )}
            </div>
          ) : (
            /* Saved Opportunities list */
            <div className="grid grid-cols-12 gap-3">
              {savedJobs.map((job) => (
                <div
                  key={job.job_id}
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
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-line">
                    <button
                      onClick={() => handleDeleteSavedJob(job.job_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-line bg-bone-50 hover:bg-[#c1440e] hover:text-bone-100 hover:border-[#c1440e] text-[10px] font-mono tracking-wider text-ink-600 transition-all"
                    >
                      <Trash2 size={10} /> REMOVE
                    </button>

                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-mono tracking-wider text-ink-400 hover:text-accent transition-colors"
                      >
                        APPLY ON SOURCE <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {savedJobs.length === 0 && (
                <div className="col-span-12 p-16 text-center text-xs font-mono border border-dashed border-line text-ink-400 bg-bone-50">
                  No saved opportunities. Bookmark jobs from the Job Discovery tab to see them here!
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
