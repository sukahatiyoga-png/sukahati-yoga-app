import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api, type ActivePass, type BookingCustomer } from "../lib/api";
import { money } from "../lib/format";
import { screenPad, kicker, h1, h2 } from "../styles/shared";

export default function Bookings() {
  const { me, flash, openQrSheet } = useApp();
  const [pass, setPass] = useState<ActivePass | null>(null);
  const [upcoming, setUpcoming] = useState<BookingCustomer[]>([]);
  const [past, setPast] = useState<BookingCustomer[]>([]);

  function reload() {
    api.activePass(me.id).then(setPass);
    api.myBookings().then((r) => { setUpcoming(r.upcoming); setPast(r.past); });
  }
  useEffect(reload, [me.id]);

  async function cancel(b: BookingCustomer) {
    await api.cancelBooking(b.id);
    flash(`${b.title} cancelled · refund in 3 days`);
    reload();
  }
  async function pay(b: BookingCustomer) {
    await api.payBalance(b.id, "card");
    flash("Balance paid · receipt emailed");
    reload();
  }

  return (
    <div style={screenPad}>
      <div style={kicker}>{me.name}</div>
      <h1 style={{ ...h1, marginBottom: 16 }}>My bookings</h1>

      {pass && (
        <div style={{ background: "var(--color-accent-200)", borderRadius: "var(--radius-lg)", padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{pass.packageName}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-accent-800)" }}>{pass.daysLeft} days left</div>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "var(--color-accent-300)", marginTop: 12, overflow: "hidden" }}>
            <div style={{ width: `${pass.pct}%`, height: "100%", background: "var(--color-accent-600)", borderRadius: 999 }} />
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-accent-800)", marginTop: 9 }}>Ends {pass.endLabel}</div>
        </div>
      )}

      <h2 style={h2}>Upcoming</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {upcoming.length === 0 && <div style={{ fontSize: 13.5, color: "var(--color-neutral-600)" }}>Nothing booked yet.</div>}
        {upcoming.map((b) => (
          <div key={b.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: 16, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", cursor: "pointer" }} onClick={() => openQrSheet({ title: b.title, meta: b.meta, ref: b.ref })}>
              <div style={{ flex: "none", width: 50, textAlign: "center" }}>
                <div style={{ fontSize: 10.5, letterSpacing: "0.06em", color: "var(--color-neutral-600)" }}>{b.mon}</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 21, lineHeight: 1.1 }}>{b.day}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0, borderLeft: "2px solid var(--color-accent-300)", paddingLeft: 13 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{b.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 2 }}>{b.meta}</div>
              </div>
              <span className={`tag ${b.confirmed ? "tag-accent-2" : "tag-accent"}`} style={{ flex: "none" }}>{b.confirmed ? "Confirmed" : "Pending"}</span>
            </div>
            {b.balanceMinor ? (
              <div style={{ marginTop: 12, background: "var(--color-accent-100)", borderRadius: "var(--radius-md)", padding: "11px 13px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: "var(--color-accent-800)", fontWeight: 600 }}>Balance due {money(b.balanceMinor)}</span>
                <button className="btn btn-primary" style={{ flex: "none", padding: "7px 14px", fontSize: 12 }} onClick={() => pay(b)}>Pay</button>
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-ghost" style={{ flex: 1, padding: "10px 0", fontSize: 13 }} onClick={() => cancel(b)}>Cancel</button>
              <button className="btn btn-secondary" style={{ flex: 1, padding: "10px 0", fontSize: 13 }} onClick={() => openQrSheet({ title: b.title, meta: b.meta, ref: b.ref })}>Show QR</button>
            </div>
          </div>
        ))}
      </div>

      <h2 style={h2}>Past</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: 0.62 }}>
        {past.length === 0 && <div style={{ fontSize: 13.5, color: "var(--color-neutral-600)" }}>No past classes yet.</div>}
        {past.map((b) => (
          <div key={b.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "14px 16px", display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ flex: "none", width: 50, textAlign: "center" }}>
              <div style={{ fontSize: 10.5, letterSpacing: "0.06em", color: "var(--color-neutral-600)" }}>{b.mon}</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, lineHeight: 1.1 }}>{b.day}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0, borderLeft: "2px solid var(--color-neutral-300)", paddingLeft: 13 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{b.title}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>{b.meta} · {b.cancelled ? "cancelled" : "attended"}</div>
            </div>
            <button className="btn btn-ghost" style={{ flex: "none", padding: "6px 11px", fontSize: 11.5 }}>Receipt</button>
          </div>
        ))}
      </div>
    </div>
  );
}
