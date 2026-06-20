import React, { useEffect, useRef, useState } from "react";
import { api, apiUrl, getAuthToken } from "../lib/api";
import { useAuth } from "../App";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

export default function PartnerChat() {
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [items, setItems] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [liveState, setLiveState] = useState("connecting");
  const bottomRef = useRef(null);

  const load = () =>
    api.get("/chat/messages")
      .then(({ data }) => {
        setRoom(data.room);
        setItems(data.items || []);
      })
      .catch(() => {
        setRoom(null);
        setItems([]);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const id = window.setInterval(load, 8000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let ws;
    try {
      const apiBase = apiUrl("").replace(/\/api$/, "");
      const wsBase = apiBase.replace(/^http/, "ws");
      const token = getAuthToken();
      const qs = new URLSearchParams();
      if (token) qs.set("token", token);
      ws = new WebSocket(`${wsBase}/ws/live?${qs.toString()}`);
      ws.onopen = () => setLiveState("live");
      ws.onmessage = (event) => {
        if (event.data === "pong") return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "chat.message" && payload.item) {
            setItems((current) => {
              if (current.some((row) => row.message_id === payload.item.message_id)) return current;
              return [...current, payload.item];
            });
          }
        } catch {
          // Ignore non-JSON keepalive frames.
        }
      };
      ws.onerror = () => setLiveState("polling");
      ws.onclose = () => setLiveState((state) => (state === "live" ? "polling" : state));
    } catch {
      setLiveState("polling");
    }
    return () => {
      if (ws && ws.readyState <= 1) ws.close();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items.length]);

  const submit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await api.post("/chat/messages", { content });
      setContent("");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Message failed");
    }
  };

  if (loading) return <div className="font-mono text-xs text-ink-400 p-8">LOADING...</div>;

  return (
    <div className="space-y-10">
      <div>
        <div className="font-mono text-[10px] tracking-[0.28em] text-ink-400">§ PARTNER CHAT</div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tightest mt-3" data-testid="partner-chat-heading">
          Live context, <span className="text-accent">one thread.</span>
        </h1>
        <p className="font-serif text-lg text-ink-500 mt-2 max-w-xl">
          A persistent account-manager channel for urgent partnership decisions, workshop follow-ups, and placement operations.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-8 border border-line bg-bone-50 min-h-[560px] flex flex-col">
          <div className="p-6 border-b border-line flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] tracking-[0.24em] text-ink-400">ROOM</div>
              <div className="font-display text-2xl tracking-tight mt-1">{room?.room_id || "Partner room"}</div>
            </div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-accent">{liveState.toUpperCase()}</div>
          </div>
          <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[430px]">
            {items.map((item) => {
              const mine = item.sender_user_id === user?.user_id;
              return (
                <div key={item.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] border p-4 ${mine ? "border-accent bg-accent/5" : "border-line bg-bone-100"}`}>
                    <div className="font-mono text-[10px] tracking-[0.18em] text-ink-400">
                      {item.sender_name || "CareerOS"} · {item.sender_role || "team"} · {item.created_at?.slice(11, 16)}
                    </div>
                    <div className="font-serif text-sm text-ink-800 mt-2 whitespace-pre-wrap">{item.content}</div>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <div className="h-full grid place-items-center text-center p-12">
                <div>
                  <MessageSquare size={28} className="mx-auto text-accent" />
                  <div className="font-display text-2xl tracking-tight mt-4">No messages yet.</div>
                  <div className="font-serif text-ink-500 mt-1">Start the partner thread with a clear next action.</div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={submit} className="p-4 border-t border-line flex gap-3">
            <input value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Write a partner update..."
              className="flex-1 border border-line bg-bone-100 px-4 py-3 text-sm focus:outline-none focus:border-accent" />
            <button className="btn"><Send size={14} /> Send</button>
          </form>
        </div>
        <div className="col-span-12 lg:col-span-4 editorial bg-ink-900 text-bone-100 p-8">
          <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/60">OPERATING RULE</div>
          <div className="font-display text-3xl tracking-tight mt-4">Keep decisions attached to the institution.</div>
          <p className="font-serif text-bone-100/70 mt-4">
            Messages are stored in CareerOS, scoped by institution, and logged with sender role so later audits and reports retain context.
          </p>
          <div className="hairline my-6 border-bone-100/30" />
          <div className="font-mono text-[10px] tracking-[0.24em] text-bone-100/60">THREAD COUNT</div>
          <div className="font-display text-6xl tracking-tightest text-accent mt-2 tnum">{items.length}</div>
        </div>
      </div>
    </div>
  );
}
