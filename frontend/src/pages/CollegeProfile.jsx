import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../App";
import { toast } from "sonner";
import { Save, Edit3 } from "lucide-react";

export default function CollegeProfile() {
  const { user } = useAuth();
  const [college, setCollege] = useState(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});

  const cid = user?.college_id || "col_kmit_main";

  useEffect(() => {
    api.get(`/college/${cid}`).then(({ data }) => { setCollege(data); setForm(data); });
  }, [cid]);

  const save = async () => {
    try {
      await api.patch(`/college/${cid}`, form);
      setCollege(form);
      setEdit(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error("Update failed");
    }
  };

  if (!college) return <div className="text-ink-400 num-mono text-xs">LOADING…</div>;

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <div className="num-mono text-[11px] tracking-[0.28em] text-ink-400">FEATURE · 02</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">College profile</h1>
          <p className="font-serif text-lg text-ink-500 mt-2">Institutional identity, affiliations, and partnership configuration.</p>
        </div>
        {!edit ? (
          <button onClick={() => setEdit(true)} data-testid="edit-college-btn" className="inline-flex items-center gap-2 border border-ink-900 px-5 py-3 text-sm hover:bg-accent hover:text-bone-100 transition-colors">
            <Edit3 size={14} /> Edit profile
          </button>
        ) : (
          <button onClick={save} data-testid="save-college-btn" className="inline-flex items-center gap-2 bg-accent text-bone-100 px-5 py-3 text-sm hover:bg-accent transition-colors">
            <Save size={14} /> Save changes
          </button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-8 border border-line bg-bone-50 p-10">
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { k: "name", label: "Institution" },
              { k: "short_name", label: "Short name" },
              { k: "city", label: "City" },
              { k: "state", label: "State" },
              { k: "affiliated_university", label: "Affiliated university" },
              { k: "tpo_name", label: "TPO contact" },
              { k: "website", label: "Website" },
            ].map((f) => (
              <div key={f.k} data-testid={`profile-${f.k}`}>
                <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">{f.label.toUpperCase()}</div>
                {edit ? (
                  <input
                    value={form[f.k] || ""}
                    onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                    className="mt-2 w-full px-3 py-2 border border-line bg-bone-100 focus:outline-none focus:border-ink-900"
                  />
                ) : (
                  <div className="font-display text-2xl mt-2 tracking-tight">{college[f.k] || "—"}</div>
                )}
              </div>
            ))}
            <div className="md:col-span-2">
              <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">DEPARTMENTS</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(college.departments || []).map((d) => (
                  <span key={d} className="pill bg-bone-100">{d}</span>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">PARTNERSHIP</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(college.partnership_types || []).map((p) => (
                  <span key={p} className="pill bg-accent text-bone-100 border-ink-900">{p}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 space-y-6">
          <div className="border border-bone-100/12 bg-ink-900 text-bone-100 p-8">
            <div className="num-mono text-[10px] tracking-[0.24em] text-bone-100/40">PARTNERSHIP STATUS</div>
            <div className="font-display text-3xl mt-3">{college.approved ? "Active" : "Pending"}</div>
            <div className="text-bone-100/60 text-sm mt-2">Onboarded · {college.created_at?.slice(0, 10)}</div>
          </div>
          <div className="border border-bone-100/12 bg-bone-50 p-8">
            <div className="num-mono text-[10px] tracking-[0.24em] text-bone-100/45">ESTABLISHED</div>
            <div className="font-display text-3xl mt-3 num-mono">{college.established || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
