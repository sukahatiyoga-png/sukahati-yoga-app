import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { api, type BookingAdmin } from "../../lib/api";
import { money } from "../../lib/format";

const FILTERS = ["All", "Pending", "Confirmed", "Unpaid"];

export default function BookingsAdmin() {
  const { flash } = useApp();
  const [filter, setFilter] = useState("All");
  const [bookings, setBookings] = useState<BookingAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    setError(null);
    api.adminBookings(filter === "All" ? undefined : filter).then(setBookings).catch((e) => setError(e instanceof Error ? e.message : "Could not load bookings"));
  }
  useEffect(reload, [filter]);

  async function confirm(b: BookingAdmin) {
    await api.confirmBooking(b.id);
    flash(b.name.split(" ")[0] + " confirmed · email and push sent");
    reload();
  }
  async function decline(b: BookingAdmin) {
    await api.declineBooking(b.id);
    flash(b.name.split(" ")[0] + " declined · guest notified");
    reload();
  }
  async function refund(b: BookingAdmin) {
    await api.refundBooking(b.id);
    flash(money(b.amountMinor) + " refunded to " + b.name.split(" ")[0]);
    reload();
  }
  async function remind(b: BookingAdmin) {
    await api.remindBooking(b.id);
    flash("Reminder sent to " + b.name.split(" ")[0]);
  }
  async function cancel(b: BookingAdmin) {
    if (!window.confirm(`Cancel ${b.name}'s booking? ${b.paid ? "Any payment will be refunded." : ""}`)) return;
    await api.cancelBooking(b.id);
    flash(b.name.split(" ")[0] + "'s booking cancelled");
    reload();
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginTop: 20, overflow: "auto", paddingBottom: 4 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ flex: "none", border: 0, borderRadius: 999, padding: "9px 15px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, background: filter === f ? "var(--color-accent-500)" : "var(--color-neutral-100)", color: filter === f ? "#fff" : "var(--color-text)" }}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <div style={{ marginTop: 16, fontSize: 13.5, color: "var(--color-accent-700)", background: "var(--color-accent-100)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 16 }}>
        {!error && bookings.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No bookings match this filter.</div>}
        {bookings.map((b) => (
          <div key={b.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: 16, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: "none", width: 40, height: 40, borderRadius: 999, background: "var(--color-accent-2-300)", color: "var(--color-accent-2-900)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13.5 }}>{b.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 3 }}>{b.meta}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
                  <span className="tag tag-outline">{b.pkg}</span>
                  {b.paid ? <span className="tag tag-accent-2">Paid {money(b.amountMinor)}</span> : <span className="tag tag-accent">Due {money(b.amountMinor)}</span>}
                </div>
              </div>
              <div style={{ flex: "none", fontSize: 11.5, fontWeight: 700, color: "var(--color-neutral-600)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{b.status}</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 13 }}>
              {b.isPending ? (
                <>
                  <button className="btn btn-ghost" style={{ flex: 1, padding: "10px 0", fontSize: 13 }} onClick={() => decline(b)}>Decline</button>
                  <button className="btn btn-primary" style={{ flex: 1.4, padding: "10px 0", fontSize: 13 }} onClick={() => confirm(b)}>Confirm</button>
                </>
              ) : b.isConfirmed ? (
                <>
                  <button className="btn btn-ghost" style={{ flex: 1, padding: "10px 0", fontSize: 13 }} onClick={() => refund(b)}>Refund</button>
                  <button className="btn btn-secondary" style={{ flex: 1, padding: "10px 0", fontSize: 13 }} onClick={() => remind(b)}>Send reminder</button>
                  <button className="btn btn-ghost" style={{ flex: 1, padding: "10px 0", fontSize: 13, color: "var(--color-accent-700)" }} onClick={() => cancel(b)}>Cancel</button>
                </>
              ) : b.status !== "cancelled" ? (
                <button className="btn btn-ghost" style={{ flex: 1, padding: "10px 0", fontSize: 13, color: "var(--color-accent-700)" }} onClick={() => cancel(b)}>Cancel</button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
