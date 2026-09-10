import { useEffect, useState } from "react";
import { api, type Customer, type CustomerBookingDetail, type CustomerDetail } from "../../lib/api";
import { money } from "../../lib/format";

export default function Customers() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (selectedId) return <CustomerDetailView id={selectedId} onBack={() => setSelectedId(null)} />;
  return <CustomerList onSelect={setSelectedId} />;
}

function CustomerList({ onSelect }: { onSelect: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => { api.admin.customers(q || undefined).then(setCustomers); }, [q]);

  return (
    <>
      <div className="field" style={{ marginTop: 20 }}>
        <label htmlFor="cq">Find a customer</label>
        <input className="input" id="cq" placeholder="Name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {customers.map((c) => (
          <div key={c.id} onClick={() => onSelect(c.id)} style={{ cursor: "pointer", background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "15px 16px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: "none", width: 40, height: 40, borderRadius: 999, background: "var(--color-accent-2-300)", color: "var(--color-accent-2-900)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13.5 }}>{c.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>{c.meta}</div>
            </div>
            <div style={{ flex: "none", textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{money(c.spendMinor)}</div>
              <div style={{ fontSize: 11, color: "var(--color-neutral-600)", marginTop: 2 }}>lifetime</div>
            </div>
          </div>
        ))}
        {customers.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No customers found.</div>}
      </div>
    </>
  );
}

const TABS = ["Overview", "Bookings", "Notes"] as const;
type Tab = (typeof TABS)[number];

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--color-divider)", fontSize: 13.5 }}>
      <span style={{ color: "var(--color-neutral-700)" }}>{label}</span><span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function CustomerDetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    api.admin.customerDetail(id).then((c) => { setCustomer(c); setNotes(c.adminNotes || ""); });
  }
  useEffect(reload, [id]);

  async function saveNotes() {
    setSaving(true);
    try { await api.admin.setCustomerNotes(id, notes); } finally { setSaving(false); }
  }

  if (!customer) return null;
  const initials = customer.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <>
      <button className="btn btn-ghost" style={{ marginTop: 20, padding: "6px 4px", fontSize: 13 }} onClick={onBack}>← All customers</button>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
        <div style={{ flex: "none", width: 56, height: 56, borderRadius: 999, background: "var(--color-accent-2-300)", color: "var(--color-accent-2-900)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18 }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 22 }}>{customer.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 2 }}>{customer.email}</div>
        </div>
        <div style={{ flex: "none", textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>{money(customer.stats.spendMinor)}</div>
          <div style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>lifetime spend</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 18, overflow: "auto", paddingBottom: 4 }}>
        {TABS.map((t) => (
          <button
            key={t} onClick={() => setTab(t)}
            style={{ flex: "none", border: 0, borderRadius: 999, padding: "9px 15px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, background: tab === t ? "var(--color-accent-500)" : "var(--color-neutral-100)", color: tab === t ? "#fff" : "var(--color-text)" }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 20 }}>
            <StatCard value={customer.stats.classesAttended} label="Classes attended" />
            <StatCard value={customer.stats.noShows} label="No-shows" />
            <StatCard value={customer.points} label="Loyalty points" />
          </div>

          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 19, margin: "22px 0 6px" }}>Contact</h2>
          <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
            <Row label="Email" value={customer.email} />
            <Row label="Phone" value={customer.phone} />
            <Row label="Signed up with" value={customer.authProvider} />
            <Row label="Member since" value={new Date(customer.memberSince).toLocaleDateString()} />
            <Row label="Referral code" value={customer.referralCode} />
          </div>

          {customer.preferences && (
            <>
              <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 19, margin: "22px 0 6px" }}>Preferences</h2>
              <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
                <Row label="Usual level" value={customer.preferences.usualLevel} />
                <Row label="Preferred time" value={customer.preferences.preferredTime} />
                <Row label="Meal preference" value={customer.preferences.mealPreference} />
              </div>
            </>
          )}
        </div>
      )}

      {tab === "Bookings" && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 8 }}>Upcoming ({customer.bookings.upcoming.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {customer.bookings.upcoming.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No upcoming bookings.</div>}
            {customer.bookings.upcoming.map((b) => <BookingCard key={b.id} b={b} />)}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14.5, margin: "22px 0 8px" }}>Past ({customer.bookings.past.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {customer.bookings.past.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No past bookings.</div>}
            {customer.bookings.past.map((b) => <BookingCard key={b.id} b={b} />)}
          </div>
        </div>
      )}

      {tab === "Notes" && (
        <div style={{ marginTop: 18 }}>
          <div className="field">
            <label htmlFor="cn">Internal admin notes</label>
            <textarea className="input" id="cn" style={{ borderRadius: "var(--radius-md)", minHeight: 140, padding: "12px 16px", resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ marginTop: 10, padding: "10px 18px" }} disabled={saving} onClick={saveNotes}>{saving ? "Saving…" : "Save notes"}</button>
        </div>
      )}
    </>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: 16 }}>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--color-neutral-700)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function BookingCard({ b }: { b: CustomerBookingDetail }) {
  return (
    <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{b.title}</div>
          <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>{b.meta} · {b.reference}</div>
        </div>
        <span className="tag tag-outline" style={{ flex: "none", textTransform: "capitalize" }}>{b.status}</span>
      </div>
      <div style={{ marginTop: 10 }}>
        <Row label="Package" value={b.packageName} />
        <Row label="Guests" value={b.guestCount} />
        <Row label="Level" value={b.level} />
        <Row label="Special requests" value={b.specialRequests} />
        <Row label="Total" value={money(b.totalMinor)} />
        <Row label="Paid" value={money(b.amountPaidMinor)} />
        {b.balanceMinor > 0 && <Row label="Balance due" value={money(b.balanceMinor)} />}
        {b.addons.length > 0 && <Row label="Add-ons" value={b.addons.map((a) => `${a.name} ×${a.quantity}`).join(", ")} />}
        <Row label="Booked" value={new Date(b.createdAt).toLocaleString()} />
        <Row label="Checked in" value={b.checkedInAt ? new Date(b.checkedInAt).toLocaleString() : null} />
        <Row label="Cancelled" value={b.cancelledAt ? new Date(b.cancelledAt).toLocaleString() : null} />
      </div>
    </div>
  );
}
