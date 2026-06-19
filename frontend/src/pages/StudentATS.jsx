import React, { useEffect, useState, useRef } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function StudentATS() {
  const [latest, setLatest] = useState(null);
  const [versions, setVersions] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const [compareId1, setCompareId1] = useState("");
  const [compareId2, setCompareId2] = useState("");

  useEffect(() => {
    if (versions.length >= 2) {
      setCompareId1(versions[1].resume_id);
      setCompareId2(versions[0].resume_id);
    }
  }, [versions]);

  const load = async () => {
    try {
      const [latestRes, versionsRes, heatmapRes] = await Promise.allSettled([
        api.get("/ats/me/latest"),
        api.get("/ats/resume-versions"),
        api.get("/ats/heatmap"),
      ]);
      if (latestRes.status === "fulfilled") setLatest(latestRes.value.data);
      if (versionsRes.status === "fulfilled") setVersions(versionsRes.value.data?.items || []);
      if (heatmapRes.status === "fulfilled") setHeatmap(heatmapRes.value.data?.keywords || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post("/ats/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Resume uploaded and scored");
      await load();
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const report = latest?.report || latest || {};
  const score = report.ats_score || report.score || 0;
  const scoreColor = score >= 80 ? "#0a0a0a" : score >= 60 ? "#d4a017" : "#ff3b00";

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-8 editorial p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">YOUR RESUME · ATS TRACKER</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">Resume intelligence.</h1>
          <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">ATS score, keyword gaps, version history, and recruiter compatibility for your resume.</p>
        </div>
        <div className="col-span-12 md:col-span-4 editorial bg-ink-900 text-bone-100 p-10">
          <div className="font-mono text-[10px] tracking-[0.28em] text-bone-100/40">CURRENT ATS SCORE</div>
          <div className="font-display text-[8vw] md:text-[6vw] tracking-tightest leading-[0.9] tnum" style={{ color: scoreColor }}>{score}</div>
          <div className="text-bone-100/60 text-sm">{versions.length} version{versions.length !== 1 ? "s" : ""} tracked</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {[
          { label: "Keyword Match", value: `${report.keyword_score || 0}%`, sub: "role keyword coverage" },
          { label: "Format Score", value: `${report.format_score || 0}%`, sub: "ATS parser quality" },
          { label: "Versions", value: versions.length, sub: "resume iterations" },
          { label: "Missing Keywords", value: (report.missing_keywords || []).length, sub: "gaps detected" },
        ].map(card => (
          <div key={card.label} className="col-span-12 md:col-span-3 editorial p-6">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">{card.label.toUpperCase()}</div>
            <div className="font-display text-5xl tracking-tightest mt-3 tnum">{card.value}</div>
            <div className="text-sm text-ink-500 mt-2">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-5 editorial p-8 bg-ink-900 text-bone-100">
          <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/40">UPLOAD NEW RESUME</div>
          <p className="text-sm text-bone-100/60 mt-3">Upload a PDF resume to get an updated ATS score and keyword analysis.</p>
          <label className={`mt-6 block border-2 border-dashed border-bone-100/20 p-8 text-center cursor-pointer hover:border-accent transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
            <div className="font-mono text-sm text-bone-100/60">{uploading ? "SCORING..." : "DROP PDF OR CLICK"}</div>
          </label>
        </div>
        <div className="col-span-12 md:col-span-7 editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">MISSING KEYWORDS</div>
          <div className="mt-5 flex flex-wrap gap-2">
            {(report.missing_keywords || []).map(kw => (
              <span key={kw} className="px-3 py-1 bg-bone-100 border border-line text-sm font-mono">{kw}</span>
            ))}
            {(report.missing_keywords || []).length === 0 && <div className="text-sm text-ink-400">No gaps detected</div>}
          </div>
          {(report.recommendations || report.improvement_suggestions || []).length > 0 && (
            <div className="mt-8">
              <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">IMPROVEMENT SUGGESTIONS</div>
              <div className="mt-3 space-y-2">
                {(report.recommendations || report.improvement_suggestions || []).map((s, i) => (
                  <div key={i} className="text-sm text-ink-600 flex gap-2"><span className="text-accent">→</span> {typeof s === "string" ? s : s.text || s.suggestion}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {heatmap.length > 0 && (
        <div className="editorial p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">KEYWORD HEATMAP</div>
          <div className="mt-5 space-y-3">
            {heatmap.slice(0, 10).map(k => (
              <div key={k.keyword}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{k.keyword}</span>
                  <span className="font-mono text-ink-400">{k.coverage_gap_pct || k.gap || 0}% gap</span>
                </div>
                <div className="mt-2 h-1.5 bg-bone-300 relative">
                  <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${Math.min(100, k.coverage_gap_pct || k.gap || 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {versions.length > 1 && (
        <div className="editorial p-8" data-testid="ats-compare-section">
          <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">COMPARE VERSIONS</div>
          <h3 className="font-display text-2xl tracking-tight mt-1 mb-4">Side-by-Side Version Comparison</h3>
          
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <div className="space-y-1">
              <label className="block font-mono text-[10px] text-ink-400">VERSION A (BASE)</label>
              <select 
                value={compareId1} 
                onChange={(e) => setCompareId1(e.target.value)} 
                className="bg-bone-50 border border-line p-2 text-sm font-mono focus:outline-none"
              >
                <option value="">Select version...</option>
                {versions.map((v, i) => (
                  <option key={v.resume_id} value={v.resume_id}>
                    v{v.version || versions.length - i} ({v.uploaded_filename || "Resume"})
                  </option>
                ))}
              </select>
            </div>
            <div className="font-mono text-xl text-ink-400">VS</div>
            <div className="space-y-1">
              <label className="block font-mono text-[10px] text-ink-400">VERSION B (TARGET)</label>
              <select 
                value={compareId2} 
                onChange={(e) => setCompareId2(e.target.value)} 
                className="bg-bone-50 border border-line p-2 text-sm font-mono focus:outline-none"
              >
                <option value="">Select version...</option>
                {versions.map((v, i) => (
                  <option key={v.resume_id} value={v.resume_id}>
                    v{v.version || versions.length - i} ({v.uploaded_filename || "Resume"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(() => {
            const ver1 = versions.find(v => v.resume_id === compareId1);
            const ver2 = versions.find(v => v.resume_id === compareId2);
            if (!ver1 || !ver2) {
              return <div className="text-sm text-ink-400">Please select two different versions to compare.</div>;
            }
            // Chronologically order: v1 is the older version (lower version number)
            let v1 = ver1;
            let v2 = ver2;
            if (ver1.version > ver2.version) {
              v1 = ver2;
              v2 = ver1;
            }

            const score1 = v1.ats_score || v1.score || 0;
            const score2 = v2.ats_score || v2.score || 0;
            const delta = score2 - score1;

            const kw1 = v1.missing_keywords || [];
            const kw2 = v2.missing_keywords || [];

            const resolvedKeywords = kw1.filter(kw => !kw2.includes(kw));
            const stillMissingKeywords = kw2;
            const newlyMissingKeywords = kw2.filter(kw => !kw1.includes(kw));

            return (
              <div className="grid grid-cols-12 gap-6 border-t border-line pt-6">
                <div className="col-span-12 md:col-span-4 border-r border-line pr-6 space-y-4">
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">ATS SCORE DELTA</div>
                    <div className="flex items-baseline gap-3 mt-2">
                      <span className="font-display text-4xl tnum">{score1} → {score2}</span>
                      <span className={`font-mono text-xl font-bold tnum`} style={{ color: delta > 0 ? "#22c55e" : delta < 0 ? "#ff3b00" : "#888" }}>
                        ({delta > 0 ? "+" : ""}{delta})
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm pt-2">
                    <div>
                      <span className="text-ink-400 font-mono block text-xs">v{v1.version} KEYWORD</span>
                      <span className="font-mono font-semibold">{v1.keyword_score || 0}%</span>
                    </div>
                    <div>
                      <span className="text-ink-400 font-mono block text-xs">v{v2.version} KEYWORD</span>
                      <span className="font-mono font-semibold">{v2.keyword_score || 0}%</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-ink-400 font-mono block text-xs">v{v1.version} FORMAT</span>
                      <span className="font-mono font-semibold">{v1.format_score || 0}%</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-ink-400 font-mono block text-xs">v{v2.version} FORMAT</span>
                      <span className="font-mono font-semibold">{v2.format_score || 0}%</span>
                    </div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-4 border-r border-line px-2 md:px-6">
                  <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 text-emerald-600 mb-3">RESOLVED KEYWORDS (MISSING IN v{v1.version} BUT FOUND IN v{v2.version})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {resolvedKeywords.map(kw => (
                      <span key={kw} className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800">{kw}</span>
                    ))}
                    {resolvedKeywords.length === 0 && <span className="text-xs text-ink-400">None</span>}
                  </div>
                </div>

                <div className="col-span-12 md:col-span-4 px-2 md:pl-6">
                  <div className="font-mono text-[10px] tracking-[0.24em] text-rose-600 mb-3">STILL MISSING KEYWORDS IN v{v2.version}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {stillMissingKeywords.map(kw => (
                      <span key={kw} className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-xs font-mono text-rose-800">{kw}</span>
                    ))}
                    {stillMissingKeywords.length === 0 && <span className="text-xs text-ink-400">None</span>}
                  </div>
                  
                  {newlyMissingKeywords.length > 0 && (
                    <div className="mt-4">
                      <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400 mb-2">NEWLY MISSING IN v{v2.version}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {newlyMissingKeywords.map(kw => (
                          <span key={kw} className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-xs font-mono text-amber-800">{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {versions.length > 0 && (
        <div className="editorial">
          <div className="p-6 border-b border-line">
            <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">RESUME VERSION HISTORY</div>
          </div>
          <div className="grid grid-cols-12 px-6 py-3 border-b border-line font-mono text-[10px] tracking-[0.24em] text-ink-400">
            <div className="col-span-1">VER</div>
            <div className="col-span-3">DATE</div>
            <div className="col-span-2 text-right">ATS</div>
            <div className="col-span-2 text-right">KEYWORD</div>
            <div className="col-span-2 text-right">FORMAT</div>
            <div className="col-span-2 text-right">DELTA</div>
          </div>
          {versions.map((v, i) => {
            const prev = versions[i + 1];
            const delta = prev ? (v.ats_score || v.score || 0) - (prev.ats_score || prev.score || 0) : 0;
            return (
              <div key={v.resume_id || i} className="grid grid-cols-12 px-6 py-3 border-b border-line items-center text-sm hover:bg-bone-200 transition-colors">
                <div className="col-span-1 font-display text-xl tnum">v{v.version || versions.length - i}</div>
                <div className="col-span-3 font-mono text-xs text-ink-500">{v.upload_date || v.created_at || "—"}</div>
                <div className="col-span-2 text-right font-display text-xl tnum" style={{ color: (v.ats_score || v.score || 0) >= 80 ? "#0a0a0a" : (v.ats_score || v.score || 0) >= 60 ? "#d4a017" : "#ff3b00" }}>{v.ats_score || v.score || 0}</div>
                <div className="col-span-2 text-right font-mono tnum">{v.keyword_score || 0}%</div>
                <div className="col-span-2 text-right font-mono tnum">{v.format_score || 0}%</div>
                <div className="col-span-2 text-right font-mono tnum" style={{ color: delta > 0 ? "#22c55e" : delta < 0 ? "#ff3b00" : "#888" }}>{delta > 0 ? "+" : ""}{delta}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
