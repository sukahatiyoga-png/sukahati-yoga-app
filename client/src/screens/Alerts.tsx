import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api, type NotificationItem } from "../lib/api";
import { screenPad, h1, h2 } from "../styles/shared";
import Toggle from "../components/Toggle";

function Icon({ kind }: { kind: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "check") return <svg {...common}><path d="M20 6 9 17l-5-5" /></svg>;
  if (kind === "clock") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>;
  if (kind === "cal") return <svg {...common}><rect x="3.5" y="5" width="17" height="16" rx="4" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>;
  if (kind === "card") return <svg {...common}><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M2.5 10h19" /></svg>;
  return <svg {...common}><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 8.5a3 3 0 0 1 0 5" /></svg>;
}

export default function Alerts() {
  const { me, goTab } = useApp();
  const [alerts, setAlerts] = useState<NotificationItem[]>([]);
  const [prefs, setPrefs] = useState<{ id: string; name: string; note: string; on: boolean }[]>([]);

  function reload() {
    api.notifications().then(setAlerts);
    api.notificationPrefs().then(setPrefs);
  }
  useEffect(reload, [me.id]);

  const unread = alerts.filter((a) => a.unread).length;

  async function markRead(n: NotificationItem) {
    if (n.unread) { await api.markRead(n.id); reload(); }
    if (n.action === "bookings") goTab("bookings");
    else if (n.action === "packages") goTab("packages");
    else if (n.action === "book") goTab("book");
  }

  async function togglePref(p: { id: string }) {
    await api.toggleNotificationPref(p.id);
    reload();
  }

  return (
    <div style={screenPad}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>{unread > 0 ? `${unread} unread` : "All read"}</div>
          <h1 style={{ ...h1 }}>Notifications</h1>
        </div>
        {unread > 0 && (
          <button className="btn btn-ghost" style={{ flex: "none", padding: "8px 13px", fontSize: 12.5 }} onClick={() => api.markAllRead().then(reload)}>Mark read</button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
        {alerts.map((n) => (
          <div key={n.id} onClick={() => markRead(n)} style={{ borderRadius: "var(--radius-md)", padding: 15, display: "flex", gap: 12, alignItems: "flex-start", background: n.unread ? "var(--color-accent-100)" : "var(--color-neutral-100)", cursor: "pointer" }}>
            <div style={{ flex: "none", width: 36, height: 36, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: n.unread ? "var(--color-accent-500)" : "var(--color-neutral-300)", color: n.unread ? "#fff" : "var(--color-neutral-800)" }}>
              <Icon kind={n.kind} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <div style={{ flex: 1, fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{n.title}</div>
                <div style={{ flex: "none", fontSize: 11, color: "var(--color-neutral-600)" }}>{n.ago}</div>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--color-neutral-800)", marginTop: 4, lineHeight: 1.45 }}>{n.body}</div>
              <div style={{ display: "flex", gap: 7, alignItems: "center", marginTop: 9 }}>
                <span className="tag tag-neutral">{n.channel}</span>
                {n.action && (
                  <button className="btn btn-secondary" style={{ padding: "7px 13px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); markRead(n); }}>
                    {n.action === "bookings" ? "View booking" : n.action === "packages" ? "See packages" : "Claim place"}
                  </button>
                )}
              </div>
            </div>
            {n.unread && <span style={{ flex: "none", width: 9, height: 9, borderRadius: 999, background: "var(--color-accent-500)", marginTop: 5 }} />}
          </div>
        ))}
        {alerts.length === 0 && <div style={{ fontSize: 13.5, color: "var(--color-neutral-600)" }}>No notifications yet.</div>}
      </div>

      <h2 style={h2}>How we reach you</h2>
      <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        {prefs.map((p, i) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 0", borderBottom: i < prefs.length - 1 ? "1px solid var(--color-divider)" : "none" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--color-neutral-700)", marginTop: 2 }}>{p.note}</div>
            </div>
            <Toggle on={p.on} onClick={() => togglePref(p)} />
          </div>
        ))}
      </div>
    </div>
  );
}
