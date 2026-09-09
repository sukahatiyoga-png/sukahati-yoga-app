import { useEffect, useState } from "react";
import { api, type RoomItem, type Teacher } from "../../lib/api";

export default function Resources() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [access, setAccess] = useState<{ name: string; value: string }[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);

  useEffect(() => {
    api.admin.teachers().then(setTeachers);
    api.admin.rooms().then(setRooms);
    api.admin.access().then(setAccess);
    api.admin.conflicts().then((r) => setConflicts(r.notes));
  }, []);

  return (
    <>
      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 20, margin: "22px 0 12px" }}>Teachers</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {teachers.map((t) => (
          <div key={t.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "15px 16px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: "none", width: 38, height: 38, borderRadius: 999, background: "var(--color-accent-300)", color: "var(--color-accent-900)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{t.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>{t.meta}</div>
            </div>
            <span className="tag tag-outline" style={{ flex: "none" }}>{t.load}</span>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 20, margin: "24px 0 12px" }}>Rooms and resources</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rooms.map((r) => (
          <div key={r.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "15px 16px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>{r.meta}</div>
            </div>
            <span className="tag tag-neutral" style={{ flex: "none" }}>{r.state}</span>
          </div>
        ))}
      </div>

      {conflicts.length > 0 && (
        <div style={{ marginTop: 16, background: "var(--color-accent-200)", borderRadius: "var(--radius-md)", padding: "15px 16px", display: "flex", gap: 11, alignItems: "flex-start" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-800)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 1 }}><path d="M12 4 3 19h18Z" /><path d="M12 10v4M12 17h.01" /></svg>
          <div style={{ flex: 1, fontSize: 12.5, color: "var(--color-accent-800)", lineHeight: 1.5 }}>{conflicts[0]}</div>
        </div>
      )}

      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 20, margin: "24px 0 12px" }}>Access and security</h2>
      <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        {access.map((a, i) => (
          <div key={a.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "13px 0", borderBottom: i < access.length - 1 ? "1px solid var(--color-divider)" : "none", fontSize: 13.5 }}>
            <span style={{ color: "var(--color-neutral-700)" }}>{a.name}</span><span style={{ fontWeight: 600, textAlign: "right" }}>{a.value}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 12, lineHeight: 1.5 }}>Every change to a booking, price or refund is written to the audit log with the staff account that made it.</div>
    </>
  );
}
