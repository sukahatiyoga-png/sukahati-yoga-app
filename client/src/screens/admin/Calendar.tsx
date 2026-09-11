import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { api, type CalendarSession } from "../../lib/api";
import { buildDays } from "../../lib/dates";

const VIEWS = ["Day", "Week", "Month"];

export default function CalendarSection() {
  const { flash } = useApp();
  const days = buildDays(14, -3);
  const [dayId, setDayId] = useState(days[3].id);
  const [view, setView] = useState("Day");
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    api.admin.calendar(dayId).then(setSessions);
    api.admin.conflicts().then((r) => setConflicts(r.notes));
  }
  useEffect(reload, [dayId]);

  function startEdit(s: CalendarSession) {
    setEditingId(s.id);
    setEditTitle(s.title);
    setEditCapacity(String(s.capacity));
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      await api.admin.updateSession(editingId, { title: editTitle, capacity: Number(editCapacity) || 1 });
      flash("Session updated");
      setEditingId(null);
      reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function cancelSession(s: CalendarSession) {
    if (!window.confirm(`Cancel ${s.title}? Booked guests will be notified.`)) return;
    const r = await api.admin.cancelSession(s.id);
    flash(`Session cancelled · ${r.guestsNotified} guest(s) notified`);
    reload();
  }

  async function blockDate() {
    const r = await api.admin.blockDay(dayId);
    flash(`${r.sessionsBlocked} sessions blocked · ${r.guestsNotified} guests notified`);
    reload();
  }

  async function addSession() {
    try {
      await api.admin.addSession({ date: dayId, title: "New Session", startTime: "12:00", durationMinutes: 60, capacity: 10 });
      flash("New session added");
      reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not add session");
    }
  }

  return (
    <>
      <div className="seg" style={{ width: "100%", marginTop: 20 }}>
        {VIEWS.map((v) => (
          <button key={v} className={`seg-opt ${view === v ? "active" : ""}`} style={{ flex: 1 }} onClick={() => setView(v)}>{v}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16, overflow: "auto", paddingBottom: 4 }}>
        {days.map((d) => (
          <button
            key={d.id}
            onClick={() => setDayId(d.id)}
            style={{ flex: "none", width: 54, border: 0, borderRadius: 20, padding: "11px 0", cursor: "pointer", fontFamily: "var(--font-body)", textAlign: "center", background: dayId === d.id ? "var(--color-accent-500)" : "var(--color-neutral-100)", color: dayId === d.id ? "#fff" : "var(--color-text)" }}
          >
            <div style={{ fontSize: 10.5, letterSpacing: "0.06em", opacity: 0.78 }}>{d.dow}</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 19, lineHeight: 1.2, marginTop: 3 }}>{d.num}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 18 }}>
        {sessions.map((c) => (
          <div key={c.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "15px 16px", opacity: c.status === "cancelled" ? 0.55 : 1 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: "none", width: 52 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{c.time}</div>
                <div style={{ fontSize: 11, color: "var(--color-neutral-600)", letterSpacing: "0.06em" }}>{c.ampm}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0, borderLeft: "2px solid var(--color-accent-300)", paddingLeft: 13 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{c.title}{c.status === "cancelled" && " · Cancelled"}</div>
                <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>{c.assign}</div>
              </div>
              <div style={{ flex: "none", fontSize: 12, fontWeight: 600, color: "var(--color-neutral-700)" }}>{c.load}</div>
            </div>
            <div style={{ height: 7, borderRadius: 999, background: "var(--color-neutral-200)", marginTop: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, width: c.pct, background: c.pctRaw >= 100 ? "var(--color-accent-600)" : "var(--color-accent-2-500)" }} />
            </div>

            {editingId === c.id ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input" style={{ flex: 2 }} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  <input className="input" type="number" min={1} style={{ flex: 1 }} value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn btn-ghost" style={{ flex: 1, padding: "8px 0", fontSize: 12.5 }} onClick={() => setEditingId(null)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1, padding: "8px 0", fontSize: 12.5 }} disabled={saving} onClick={saveEdit}>{saving ? "Saving…" : "Save"}</button>
                </div>
              </div>
            ) : c.status !== "cancelled" && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-secondary" style={{ flex: 1, padding: "8px 0", fontSize: 12.5 }} onClick={() => startEdit(c)}>Edit</button>
                <button className="btn btn-ghost" style={{ flex: 1, padding: "8px 0", fontSize: 12.5, color: "var(--color-accent-700)" }} onClick={() => cancelSession(c)}>Cancel session</button>
              </div>
            )}
          </div>
        ))}
        {sessions.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No sessions on this date.</div>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="btn btn-secondary" style={{ flex: 1, padding: "13px 0", fontSize: 13.5 }} onClick={blockDate}>Block this date</button>
        <button className="btn btn-secondary" style={{ flex: 1, padding: "13px 0", fontSize: 13.5 }} onClick={addSession}>Add session</button>
      </div>

      {conflicts.length > 0 && (
        <div style={{ marginTop: 16, background: "var(--color-accent-200)", borderRadius: "var(--radius-md)", padding: "15px 16px", display: "flex", gap: 11, alignItems: "flex-start" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-800)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 1 }}><path d="M12 4 3 19h18Z" /><path d="M12 10v4M12 17h.01" /></svg>
          <div style={{ flex: 1, fontSize: 12.5, color: "var(--color-accent-800)", lineHeight: 1.5 }}>{conflicts[0]}</div>
        </div>
      )}
      <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 12, lineHeight: 1.5 }}>Capacity and instructor conflicts are checked before any change is saved.</div>
    </>
  );
}
