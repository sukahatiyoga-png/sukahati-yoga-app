import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { api, type AdminEnquiryRow, type AdminEnquiryThread } from "../../lib/api";

const STATUS_FILTERS = ["All", "Open", "Replied", "Closed"];
const STATUS_TAG_CLASS: Record<string, string> = { open: "tag-accent", replied: "tag-accent-2", closed: "tag-neutral" };

export default function Enquiries() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (selectedId) return <EnquiryDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  return <EnquiryList onSelect={setSelectedId} />;
}

function EnquiryList({ onSelect }: { onSelect: (id: string) => void }) {
  const { flash } = useApp();
  const [rows, setRows] = useState<AdminEnquiryRow[]>([]);
  const [status, setStatus] = useState("All");

  useEffect(() => {
    api.adminEnquiries.list(status === "All" ? undefined : status.toLowerCase()).then(setRows)
      .catch((e) => flash(e instanceof Error ? e.message : "Couldn't load enquiries"));
  }, [status, flash]);

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginTop: 20, overflow: "auto", paddingBottom: 4 }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f} onClick={() => setStatus(f)}
            style={{ flex: "none", border: 0, borderRadius: 999, padding: "9px 15px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, background: status === f ? "var(--color-accent-500)" : "var(--color-neutral-100)", color: status === f ? "#fff" : "var(--color-text)" }}
          >
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {rows.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No enquiries match this filter.</div>}
        {rows.map((r) => (
          <div key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: "pointer", background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "15px 16px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: "none", width: 40, height: 40, borderRadius: 999, background: "var(--color-accent-2-300)", color: "var(--color-accent-2-900)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13.5 }}>{r.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.subject || "Enquiry"} <span style={{ fontWeight: 400, color: "var(--color-neutral-600)" }}>· {r.userName}</span></div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.lastMessage}</div>
            </div>
            <span className={`tag ${STATUS_TAG_CLASS[r.status] || "tag-neutral"}`} style={{ flex: "none", textTransform: "capitalize" }}>{r.status}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function EnquiryDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { flash } = useApp();
  const [thread, setThread] = useState<AdminEnquiryThread | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  function reload() { api.adminEnquiries.detail(id).then(setThread).catch((e) => flash(e instanceof Error ? e.message : "Couldn't load enquiry")); }
  useEffect(reload, [id]);

  async function send() {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      const t = await api.adminEnquiries.reply(id, reply.trim());
      setThread(t);
      setReply("");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: string) {
    await api.adminEnquiries.setStatus(id, status);
    reload();
  }

  if (!thread) return null;

  return (
    <>
      <button className="btn btn-ghost" style={{ marginTop: 20, padding: "6px 4px", fontSize: 13 }} onClick={onBack}>← All enquiries</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginTop: 14 }}>
        <div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 21 }}>{thread.subject || "Enquiry"}</div>
          <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 3 }}>{thread.userName} · {thread.userEmail}{thread.userPhone ? ` · ${thread.userPhone}` : ""}</div>
        </div>
        <span className={`tag ${STATUS_TAG_CLASS[thread.status] || "tag-neutral"}`} style={{ flex: "none", textTransform: "capitalize" }}>{thread.status}</span>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
        {["open", "replied", "closed"].map((s) => (
          <button key={s} className={s === thread.status ? "btn btn-primary" : "btn btn-secondary"} style={{ padding: "7px 13px", fontSize: 12, textTransform: "capitalize" }} onClick={() => setStatus(s)}>{s}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
        {thread.messages.map((m) => (
          <div key={m.id} style={{ alignSelf: m.isStaff ? "flex-end" : "flex-start", maxWidth: "78%" }}>
            <div style={{
              background: m.isStaff ? "var(--color-accent-500)" : "var(--color-neutral-100)",
              color: m.isStaff ? "#fff" : "var(--color-text)",
              borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 13.5, lineHeight: 1.5,
            }}>
              {m.body}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--color-neutral-500)", marginTop: 4 }}>
              {m.isStaff ? "You (staff)" : thread.userName} · {new Date(m.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <input className="input" style={{ flex: 1 }} placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="btn btn-primary" style={{ flex: "none", padding: "0 18px" }} disabled={busy || !reply.trim()} onClick={send}>Send</button>
      </div>
    </>
  );
}
