import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Check, X, Bell } from "lucide-react";

export default function AdminPanel() {
  const [pending, setPending] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [notifs, setNotifs] = useState([]);

  const load = async () => {
    const [p, c, n] = await Promise.all([
      api.get("/admin/pending-signups"),
      api.get("/admin/colleges"),
      api.get("/admin/notifications"),
    ]);
    setPending(p.data.items); setColleges(c.data.items); setNotifs(n.data.items);
  };

  useEffect(() => { load().catch(() => toast.error("Admin only")); }, []);

  const approve = async (id) => { await api.post(`/admin/approve/${id}`); toast.success("Approved"); load(); };
  const reject = async (id) => { await api.post(`/admin/reject/${id}`); toast.success("Rejected"); load(); };
  const testNotif = async () => { await api.post("/admin/test-notification"); toast.success("Fan-out triggered"); load(); };

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <div className="num-mono text-[11px] tracking-[0.28em] text-accent">SUPER ADMIN · CONTROL</div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3">Platform command</h1>
          <p className="font-serif text-lg text-ink-500 mt-2">Approve partners. Monitor every fan-out. Override data when needed.</p>
        </div>
        <button onClick={testNotif} data-testid="test-notif-btn" className="inline-flex items-center gap-2 border border-ink-900 px-5 py-3 text-sm hover:bg-accent hover:text-bone-100 transition-colors">
          <Bell size={14} /> Trigger test fan-out
        </button>
      </div>

      {/* Pending approvals */}
      <div className="border border-line bg-bone-50" data-testid="pending-table">
        <div className="p-6 border-b border-line">
          <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">PENDING APPROVALS · {pending.length}</div>
          <h3 className="font-display text-2xl tracking-tight mt-1">Awaiting institutional verification</h3>
        </div>
        {pending.length === 0 ? (
          <div className="px-6 py-12 text-center text-ink-400">All caught up. Inbox zero.</div>
        ) : (
          <div className="divide-y divide-line">
            {pending.map((u) => (
              <div key={u.user_id} className="grid grid-cols-12 px-6 py-5 items-center" data-testid={`pending-${u.user_id}`}>
                <div className="col-span-4">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-ink-500">{u.email}</div>
                </div>
                <div className="col-span-4">
                  <div className="font-display text-lg">{u.college?.name || "—"}</div>
                  <div className="text-xs text-ink-400">{u.college?.affiliated_university || ""}</div>
                </div>
                <div className="col-span-2 num-mono text-xs uppercase">{u.role}</div>
                <div className="col-span-2 flex justify-end gap-2">
                  <button onClick={() => approve(u.user_id)} data-testid={`approve-${u.user_id}`} className="inline-flex items-center gap-1.5 bg-accent text-bone-100 px-3 py-1.5 text-xs hover:bg-accent transition-colors">
                    <Check size={12} /> Approve
                  </button>
                  <button onClick={() => reject(u.user_id)} data-testid={`reject-${u.user_id}`} className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs hover:border-ink-900">
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All colleges */}
      <div className="border border-line bg-bone-50" data-testid="colleges-table">
        <div className="p-6 border-b border-line">
          <div className="num-mono text-[10px] tracking-[0.24em] text-ink-400">PARTNER COLLEGES · {colleges.length}</div>
          <h3 className="font-display text-2xl tracking-tight mt-1">Institutional partners</h3>
        </div>
        <div className="grid grid-cols-12 px-6 py-3 border-b border-line num-mono text-[10px] tracking-[0.24em] text-ink-400">
          <div className="col-span-4">COLLEGE</div>
          <div className="col-span-3">UNIVERSITY</div>
          <div className="col-span-3">DEPTS</div>
          <div className="col-span-2 text-right">STATUS</div>
        </div>
        {colleges.map((c) => (
          <div key={c.college_id} className="grid grid-cols-12 px-6 py-4 border-b border-line items-center text-sm">
            <div className="col-span-4">
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-ink-400">{c.city || ""} {c.state || ""}</div>
            </div>
            <div className="col-span-3 text-ink-500">{c.affiliated_university || "—"}</div>
            <div className="col-span-3 flex flex-wrap gap-1">
              {(c.departments || []).slice(0, 3).map((d) => <span key={d} className="pill bg-bone-100">{d}</span>)}
            </div>
            <div className="col-span-2 text-right num-mono text-xs">
              {c.approved ? <span className="text-accent">● ACTIVE</span> : <span className="text-ink-400">○ PENDING</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Notification log */}
      <div className="border border-bone-100/12 bg-ink-900 text-bone-100" data-testid="notif-log">
        <div className="p-6 border-b border-bone-100/15">
          <div className="num-mono text-[10px] tracking-[0.24em] text-bone-100/40">NOTIFICATION FAN-OUT · {notifs.length}</div>
          <h3 className="font-display text-2xl tracking-tight mt-1">Live activity feed</h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto divide-y divide-bone-100/10">
          {notifs.length === 0 && <div className="p-8 text-center text-bone-100/40 text-sm">No notifications yet. Trigger a test fan-out.</div>}
          {notifs.map((n, i) => (
            <div key={i} className="grid grid-cols-12 px-6 py-3 text-sm items-center" data-testid={`notif-${i}`}>
              <div className="col-span-2 num-mono text-[10px] tracking-[0.18em] text-bone-100/40">{n.created_at?.slice(11, 19)}</div>
              <div className="col-span-2 num-mono text-[10px] uppercase tracking-[0.16em] text-accent">{n.channel}</div>
              <div className="col-span-3 text-bone-100/80">{n.event}</div>
              <div className="col-span-3 text-bone-100/60 truncate">{n.subject}</div>
              <div className="col-span-2 text-right num-mono text-[10px] uppercase">
                {n.status === "sent" ? <span className="text-accent">● {n.status}</span> : <span className="text-bone-100/40">○ {n.status}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
