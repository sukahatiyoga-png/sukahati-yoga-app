import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { AdminSection } from "../../context/AppContext";
import { api, type CheckinItem, type Dashboard as DashboardData } from "../../lib/api";
import { money } from "../../lib/format";

export default function Dashboard({ setAsec }: { setAsec: (s: AdminSection) => void }) {
  const { flash } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [checkins, setCheckins] = useState<CheckinItem[]>([]);

  function reload() {
    api.admin.dashboard().then(setData);
    api.admin.checkins().then(setCheckins);
  }
  useEffect(reload, []);

  async function act(todo: DashboardData["todo"][number]) {
    if (todo.kind === "review-pending") setAsec("bookings");
    else if (todo.kind === "chase-unpaid") setAsec("bookings");
    else if (todo.kind === "raise-capacity" && todo.sessionId) {
      const r = await api.admin.raiseCapacity(todo.sessionId);
      flash(`Capacity raised to ${r.capacity} · waitlist notified`);
      reload();
    }
  }

  async function scan(c: CheckinItem) {
    await api.checkin(c.id);
    flash(c.name.split(" ")[0] + " checked in");
    reload();
  }

  if (!data) return null;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 20 }}>
        <div style={{ background: "var(--color-accent-200)", borderRadius: "var(--radius-md)", padding: 16 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 27, lineHeight: 1 }}>{data.bookingsToday}</div>
          <div style={{ fontSize: 12, color: "var(--color-accent-800)", marginTop: 4 }}>Bookings today</div>
        </div>
        <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: 16 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 27, lineHeight: 1 }}>{money(data.revenueTodayMinor)}</div>
          <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 4 }}>Revenue today</div>
        </div>
        <div style={{ background: "var(--color-accent-2-200)", borderRadius: "var(--radius-md)", padding: 16 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 27, lineHeight: 1 }}>{data.occupancyPct}%</div>
          <div style={{ fontSize: 12, color: "var(--color-accent-2-900)", marginTop: 4 }}>Occupancy</div>
        </div>
        <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: 16 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 27, lineHeight: 1 }}>{data.pendingPayments}</div>
          <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 4 }}>Pending payments</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <div style={{ flex: 1, background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "14px 16px", display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>{data.cancellationsThisWeek}</span>
          <span style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>cancellations this week</span>
        </div>
        <div style={{ flex: 1, background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "14px 16px", display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>{data.waitlistCount}</span>
          <span style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>on waitlists</span>
        </div>
      </div>

      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 20, margin: "26px 0 12px" }}>Needs you now</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.todo.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>Nothing needs attention right now.</div>}
        {data.todo.map((t) => (
          <div key={t.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "15px 16px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.25 }}>{t.title}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 3 }}>{t.body}</div>
            </div>
            <button className="btn btn-primary" style={{ flex: "none", padding: "8px 14px", fontSize: 12 }} onClick={() => act(t)}>{t.cta}</button>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 20, margin: "26px 0 12px" }}>Today's check-in</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {checkins.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No sessions with bookings today.</div>}
        {checkins.map((c) => (
          <div key={c.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: "none", width: 38, height: 38, borderRadius: 999, background: "var(--color-accent-2-300)", color: "var(--color-accent-2-900)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{c.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>{c.meta}</div>
            </div>
            {c.checkedIn ? (
              <span className="tag tag-accent-2" style={{ flex: "none" }}>In</span>
            ) : (
              <button className="btn btn-secondary" style={{ flex: "none", padding: "7px 12px", fontSize: 12 }} onClick={() => scan(c)}>Scan QR</button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
