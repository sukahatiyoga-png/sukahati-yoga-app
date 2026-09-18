import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api, type EnquirySummary, type EnquiryThread } from "../lib/api";

const STATUS_LABEL: Record<string, string> = { open: "Awaiting reply", replied: "Replied", closed: "Closed" };
const STATUS_TAG_CLASS: Record<string, string> = { open: "tag-accent", replied: "tag-accent-2", closed: "tag-neutral" };

export default function Enquiries({ onClose }: { onClose: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "var(--color-bg)", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "18px 20px 14px", borderBottom: "1px solid var(--color-divider)" }}>
        <button
          onClick={() => (selectedId || composing ? (setSelectedId(null), setComposing(false)) : onClose())}
          style={{ flex: "none", width: 36, height: 36, borderRadius: 999, border: 0, background: "var(--color-neutral-100)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
        </button>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>
          {composing ? "New enquiry" : selectedId ? "Enquiry" : "Contact us"}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {composing && <ComposeView onSent={(id) => { setComposing(false); setSelectedId(id); }} />}
        {!composing && selectedId && <ThreadView id={selectedId} />}
        {!composing && !selectedId && <ListView onSelect={setSelectedId} onNew={() => setComposing(true)} />}
      </div>
    </div>
  );
}

function ListView({ onSelect, onNew }: { onSelect: (id: string) => void; onNew: () => void }) {
  const { flash } = useApp();
  const [rows, setRows] = useState<EnquirySummary[]>([]);
  useEffect(() => { api.enquiries.list().then(setRows).catch((err) => flash(err instanceof Error ? err.message : "Could not load enquiries")); }, [flash]);

  return (
    <div style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 13.5, color: "var(--color-neutral-700)", lineHeight: 1.5 }}>
        Have a question for the studio? Send us a message and we'll reply here.
      </div>
      <button className="btn btn-primary btn-block" style={{ marginTop: 16, padding: "14px 0" }} onClick={onNew}>New enquiry</button>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
        {rows.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No enquiries yet.</div>}
        {rows.map((r) => (
          <div key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: "pointer", background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.subject || "Enquiry"}</div>
              <span className={`tag ${STATUS_TAG_CLASS[r.status] || "tag-neutral"}`} style={{ flex: "none" }}>{STATUS_LABEL[r.status] || r.status}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.lastMessage}</div>
            <div style={{ fontSize: 11, color: "var(--color-neutral-500)", marginTop: 5 }}>{new Date(r.lastAt).toLocaleString("en-MY", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComposeView({ onSent }: { onSent: (id: string) => void }) {
  const { flash } = useApp();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!message.trim()) return;
    setBusy(true);
    try {
      const e = await api.enquiries.create({ subject: subject.trim() || undefined, message: message.trim() });
      flash("Enquiry sent — we'll reply here");
      onSent(e.id);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not send enquiry");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: "18px 20px" }}>
      <div className="field">
        <label htmlFor="eq-subject">Subject (optional)</label>
        <input className="input" id="eq-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="eq-message">Message</label>
        <textarea
          className="input" id="eq-message" style={{ borderRadius: "var(--radius-md)", minHeight: 140, padding: "12px 16px", resize: "vertical" }}
          value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?"
        />
      </div>
      <button className="btn btn-primary btn-block" style={{ marginTop: 18, padding: "14px 0" }} disabled={busy || !message.trim()} onClick={send}>
        {busy ? "Sending…" : "Send"}
      </button>
    </div>
  );
}

function ThreadView({ id }: { id: string }) {
  const { flash } = useApp();
  const [thread, setThread] = useState<EnquiryThread | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  function reload() { api.enquiries.detail(id).then(setThread).catch((err) => flash(err instanceof Error ? err.message : "Could not load enquiry")); }
  useEffect(reload, [id]);

  async function send() {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      const t = await api.enquiries.reply(id, reply.trim());
      setThread(t);
      setReply("");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not send reply");
    } finally {
      setBusy(false);
    }
  }

  if (!thread) return null;

  return (
    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", minHeight: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{thread.subject || "Enquiry"}</div>
        <span className={`tag ${STATUS_TAG_CLASS[thread.status] || "tag-neutral"}`} style={{ flex: "none" }}>{STATUS_LABEL[thread.status] || thread.status}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18, flex: 1 }}>
        {thread.messages.map((m) => (
          <div key={m.id} style={{ alignSelf: m.isStaff ? "flex-start" : "flex-end", maxWidth: "82%" }}>
            <div style={{
              background: m.isStaff ? "var(--color-neutral-100)" : "var(--color-accent-500)",
              color: m.isStaff ? "var(--color-text)" : "#fff",
              borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 13.5, lineHeight: 1.5,
            }}>
              {m.body}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--color-neutral-500)", marginTop: 4, textAlign: m.isStaff ? "left" : "right" }}>
              {m.isStaff ? "Sukahati Yoga" : "You"} · {new Date(m.createdAt).toLocaleString("en-MY", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 18, position: "sticky", bottom: 0, paddingBottom: 4, background: "var(--color-bg)" }}>
        <input className="input" style={{ flex: 1 }} placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="btn btn-primary" style={{ flex: "none", padding: "0 18px" }} disabled={busy || !reply.trim()} onClick={send}>Send</button>
      </div>
    </div>
  );
}
