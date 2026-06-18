import React, { useEffect, useState, useRef } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Upload, FileText, Calendar } from "lucide-react";

export default function MOU() {
  const [mou, setMou] = useState(null);
  const [file, setFile] = useState(null);
  const [expiresOn, setExpiresOn] = useState("");
  const [partnership, setPartnership] = useState("CRT");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const load = () => api.get("/mou").then(({ data }) => setMou(data)).catch(() => setMou(null));

  useEffect(() => { load(); }, []);

  const upload = async (e) => {
    e.preventDefault();
    if (!file || !expiresOn) { toast.error("Choose file and renewal date"); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("expires_on", new Date(expiresOn).toISOString());
    fd.append("partnership_type", partnership);
    try {
      await api.post("/mou/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("MOU uploaded");
      setFile(null); setExpiresOn(""); load();
    } catch {
      toast.error("Upload failed");
    } finally { setUploading(false); }
  };

  const days = mou?.days_until_renewal;
  const urgent = days != null && days < 90;

  return (
    <div className="space-y-10">
      <div>
        <div className="num-mono text-[11px] tracking-[0.28em] text-ink-400">FEATURE · 07</div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">MOU · partnership</h1>
        <p className="font-serif text-lg text-ink-500 mt-2">Document vault, renewal countdown, seat utilization, revenue share.</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Renewal countdown */}
        <div className={`col-span-12 md:col-span-7 border p-10 ${urgent ? "border-accent bg-accent/5" : "border-line bg-bone-50"}`} data-testid="mou-countdown">
          <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">DAYS UNTIL RENEWAL</div>
          <div className="font-display text-[10vw] md:text-[8vw] lg:text-[7vw] tracking-tightest leading-[0.85] mt-4">
            <span className="num-mono">{days != null ? days : "—"}</span>
          </div>
          <div className="text-ink-500 mt-2">Renewal due · {mou?.expires_on?.slice(0, 10) || "—"}</div>
          <div className="hairline my-8" />
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">PARTNERSHIP</div>
              <div className="font-display text-xl mt-2">{mou?.partnership_type || "—"}</div>
            </div>
            <div>
              <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">SEATS</div>
              <div className="font-display text-xl mt-2">{mou?.seats_used || 0} / {mou?.seats_purchased || 0}</div>
            </div>
            <div>
              <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">ACCRUED SHARE</div>
              <div className="font-display text-xl mt-2 text-accent">₹{((mou?.accrued_share_inr || 0) / 100000).toFixed(2)} L</div>
            </div>
          </div>
        </div>

        {/* Document on file */}
        <div className="col-span-12 md:col-span-5 border border-bone-100/12 bg-ink-900 text-bone-100 p-10" data-testid="mou-doc">
          <div className="num-mono text-[10px] tracking-[0.24em] text-bone-100/40">DOCUMENT ON FILE</div>
          <FileText size={32} className="mt-4 text-accent" />
          <div className="font-display text-2xl tracking-tight mt-4 break-all">{mou?.document_name || "No file uploaded"}</div>
          <div className="text-bone-100/60 text-sm mt-2">{mou?.document_size_kb || 0} KB · signed {mou?.signed_on?.slice(0, 10)}</div>
          <div className="hairline my-8 border-bone-100/20" />
          <div className="num-mono text-[10px] tracking-[0.24em] text-bone-100/40">PAYOUT</div>
          <div className="font-serif text-lg mt-2">{mou?.payout_status || "—"}</div>
        </div>

        {/* Upload zone */}
        <form onSubmit={upload} className="col-span-12 border-2 border-dashed border-ink-900/20 p-12 bg-bone-50 hover:border-accent transition-colors" data-testid="mou-upload-form">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1">
              <div className="num-mono text-[10px] tracking-[0.24em] text-bone-100/45">REPLACE OR ADD MOU</div>
              <h3 className="font-display text-3xl tracking-tight mt-2">Drag · drop · or click to upload</h3>
              <button type="button" onClick={() => inputRef.current.click()} className="mt-4 inline-flex items-center gap-2 border border-ink-900 px-4 py-2 text-sm hover:bg-accent hover:text-bone-100 transition-colors" data-testid="mou-file-btn">
                <Upload size={14} /> {file ? file.name : "Choose file"}
              </button>
              <input ref={inputRef} type="file" hidden onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.doc,.docx" data-testid="mou-file-input" />
            </div>
            <div>
              <div className="num-mono text-[10px] tracking-[0.24em] text-bone-100/45">RENEWAL DATE</div>
              <div className="mt-2 flex items-center gap-2 border border-bone-100/12 px-3 py-2 bg-bone-100">
                <Calendar size={14} className="text-bone-100/45" />
                <input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} data-testid="mou-date-input" className="bg-transparent focus:outline-none" />
              </div>
            </div>
            <div>
              <div className="num-mono text-[10px] tracking-[0.24em] text-bone-100/45">TYPE</div>
              <select value={partnership} onChange={(e) => setPartnership(e.target.value)} className="mt-2 px-3 py-2 border border-bone-100/12 bg-bone-100" data-testid="mou-type-input">
                <option>CRT</option><option>FDP</option><option>External Placement Partner</option><option>Multi-program</option>
              </select>
            </div>
            <button type="submit" disabled={uploading} data-testid="mou-upload-btn" className="bg-accent text-bone-100 px-7 py-4 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50">
              {uploading ? "Uploading…" : "Upload MOU"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
