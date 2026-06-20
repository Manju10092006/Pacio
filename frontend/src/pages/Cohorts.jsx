import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { downloadBulkCertificates } from "../components/BulkCertificates";
import { CERTIFICATE_TYPES } from "../lib/certificateRenderer";

export default function Cohorts() {
  const [data, setData] = useState(null);
  const [activeCohort, setActiveCohort] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [bulkCertType, setBulkCertType] = useState("CRT");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => { api.get("/cohorts").then(({ data }) => setData(data)); }, []);

  const triggerBulkGen = async (cohort) => {
    setActiveCohort(cohort);
    setLoadingStudents(true);
    setStudents([]);
    if (cohort.program_code === "CRT") setBulkCertType("CRT");
    else if (cohort.program_code === "FDP") setBulkCertType("FDP");
    else setBulkCertType("CRT");
    
    try {
      const { data } = await api.get(`/admin/cohorts/${cohort.program_code}/students`);
      setStudents(data.items || []);
    } catch (err) {
      toast.error("Failed to load students in cohort");
      setActiveCohort(null);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleBulkDownload = async () => {
    if (students.length === 0) {
      toast.error("No students to generate certificates for.");
      return;
    }
    setIsGenerating(true);
    try {
      const certTypeData = {
        code: bulkCertType,
        title: CERTIFICATE_TYPES[bulkCertType].title,
        description: CERTIFICATE_TYPES[bulkCertType].description,
      };
      await downloadBulkCertificates(students, certTypeData);
      toast.success("Bulk PDF generated and download started!");
      setActiveCohort(null);
    } catch (err) {
      toast.error("Error generating bulk PDF");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <div className="num-mono text-[11px] tracking-[0.28em] text-ink-400">FEATURE · 04</div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">Programs · cohorts</h1>
        <p className="font-serif text-lg text-ink-500 mt-2">CRT · Interview Master · FDP · DSA · Aptitude — your training portfolio in real-time.</p>
      </div>

      <div className="grid grid-cols-12 gap-6" data-testid="cohort-grid">
        {(data?.items || []).map((c, i) => {
          const ring = c.completion_pct;
          return (
            <div key={c.cohort_id} className="col-span-12 md:col-span-6 lg:col-span-4 border border-line bg-bone-50 p-8 bento-card" data-testid={`cohort-${c.program_code}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">PROGRAM · {c.program_code}</div>
                  <h3 className="font-display text-3xl tracking-tight mt-2">{c.program_name}</h3>
                  <div className="text-sm text-ink-500 mt-1">{c.batch_label}</div>
                </div>
                <ProgressRing pct={ring} />
              </div>
              <div className="hairline my-6" />
              <div className="grid grid-cols-3 gap-4">
                <Stat label="Enrolled" value={c.enrolled_count} />
                <Stat label="Modules" value={c.modules_total} />
                <Stat label="Instructor" value={c.instructor?.split(" ")[0] + " " + (c.instructor?.split(" ")[1] || "")} mono={false} small />
              </div>
              {c.seats_purchased !== undefined && (
                <>
                  <div className="hairline my-4" />
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <div className="text-[9px] tracking-[0.2em] text-ink-400 uppercase">Seats (Used / Total)</div>
                      <div className="font-semibold mt-1">{c.seats_used} / {c.seats_purchased}</div>
                    </div>
                    <div>
                      <div className="text-[9px] tracking-[0.2em] text-ink-400 uppercase">Budget (Spent / Allocated)</div>
                      <div className="font-semibold mt-1 text-accent">₹{c.budget_spent?.toLocaleString()} / ₹{c.budget_allocation?.toLocaleString()}</div>
                    </div>
                  </div>
                </>
              )}
              <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400 mt-6">
                {c.start_date?.slice(0, 10)} → {c.end_date?.slice(0, 10)}
              </div>
              <button
                onClick={() => triggerBulkGen(c)}
                className="mt-5 w-full btn bg-ink hover:bg-ink-800 text-bone-100 text-xs py-2"
              >
                Bulk Certificates
              </button>
            </div>
          );
        })}
      </div>

      {activeCohort && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm">
          <div className="relative max-w-md w-full border border-line bg-bone-50 p-8 shadow-2xl">
            <button
              onClick={() => setActiveCohort(null)}
              className="absolute top-4 right-4 text-xs font-mono tracking-widest text-ink-400 hover:text-accent uppercase cursor-pointer"
            >
              [ Close ]
            </button>
            <div className="space-y-6">
              <div>
                <div className="font-mono text-[9px] tracking-[0.2em] text-ink-400 uppercase">Bulk Generation</div>
                <h3 className="font-display text-2xl tracking-tight mt-1 truncate">{activeCohort.program_name}</h3>
                <p className="text-xs text-ink-500 font-serif mt-1">Generate co-branded credentials in a single compiled PDF file.</p>
              </div>

              {loadingStudents ? (
                <div className="font-mono text-xs text-ink-400 py-4">Loading cohort students list…</div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-bone-100 p-3 text-xs font-mono">
                    <span className="text-ink-400">Total Enrolled:</span> <span className="font-semibold text-ink-800">{students.length} students</span>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono text-ink-500 uppercase tracking-wider">Certificate Type</label>
                    <select
                      value={bulkCertType}
                      onChange={(e) => setBulkCertType(e.target.value)}
                      className="w-full border border-line bg-bone-100 p-2 text-xs focus:outline-none"
                    >
                      <option value="CRT">CRT Certificate</option>
                      <option value="FDP">FDP Certificate</option>
                      <option value="WORKSHOP">Workshop Certificate</option>
                      <option value="HACKATHON">Hackathon Certificate</option>
                      <option value="INTERNSHIP">Internship Certificate</option>
                      <option value="PLACEMENT">Placement Achievement</option>
                    </select>
                  </div>

                  <button
                    onClick={handleBulkDownload}
                    disabled={isGenerating || students.length === 0}
                    className="w-full btn bg-accent text-bone-100 hover:bg-accent/90 text-xs py-2.5 flex items-center justify-center gap-2 mt-4"
                  >
                    {isGenerating ? "Compiling PDF..." : `Generate ${students.length} Certificates`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, mono = true, small }) {
  return (
    <div>
      <div className="num-mono text-[9px] tracking-[0.24em] text-ink-400">{label.toUpperCase()}</div>
      <div className={`${mono ? "num-mono" : "font-display"} ${small ? "text-base" : "text-2xl"} mt-1`}>{value}</div>
    </div>
  );
}

function ProgressRing({ pct }) {
  const r = 30; const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div className="relative w-[80px] h-[80px]">
      <svg viewBox="0 0 80 80" className="w-full h-full">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(17,17,17,0.1)" strokeWidth="4" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1538C8" strokeWidth="4"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform="rotate(-90 40 40)" />
      </svg>
      <div className="absolute inset-0 grid place-items-center num-mono text-sm font-semibold">{Math.round(pct)}%</div>
    </div>
  );
}
