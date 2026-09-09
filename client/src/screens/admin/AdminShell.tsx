import { useApp } from "../../context/AppContext";
import type { AdminSection } from "../../context/AppContext";
import type { Pkg } from "../../lib/api";
import Dashboard from "./Dashboard";
import CalendarSection from "./Calendar";
import BookingsAdmin from "./BookingsAdmin";
import Customers from "./Customers";
import PackagesAdmin from "./PackagesAdmin";
import Reports from "./Reports";
import Promotions from "./Promotions";
import Resources from "./Resources";

const NAV: { id: AdminSection; name: string }[] = [
  { id: "dash", name: "Dashboard" }, { id: "cal", name: "Calendar" }, { id: "bookings", name: "Bookings" },
  { id: "customers", name: "Customers" }, { id: "packages", name: "Packages" }, { id: "reports", name: "Reports" },
  { id: "promos", name: "Promotions" }, { id: "resources", name: "Resources" },
];

export default function AdminShell({ asec, setAsec, openPackageEditSheet }: {
  asec: AdminSection; setAsec: (s: AdminSection) => void; openPackageEditSheet: (pkg: Pkg | null) => void;
}) {
  const { exitAdmin } = useApp();
  const title = NAV.find((n) => n.id === asec)?.name || "Dashboard";

  return (
    <div style={{ padding: "58px 0 28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Studio admin · Sukahati</div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 30, lineHeight: 1.06, margin: "8px 0 0" }}>{title}</h1>
        </div>
        <button className="btn btn-ghost" style={{ flex: "none", padding: "9px 14px", fontSize: 12.5 }} onClick={exitAdmin}>Exit</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16, overflow: "auto", padding: "0 20px 4px" }}>
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setAsec(n.id)}
            style={{ flex: "none", border: 0, borderRadius: 999, padding: "10px 16px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, background: asec === n.id ? "var(--color-accent-500)" : "var(--color-neutral-100)", color: asec === n.id ? "#fff" : "var(--color-text)" }}
          >
            {n.name}
          </button>
        ))}
      </div>

      <div style={{ padding: "0 20px" }}>
        {asec === "dash" && <Dashboard setAsec={setAsec} />}
        {asec === "cal" && <CalendarSection />}
        {asec === "bookings" && <BookingsAdmin />}
        {asec === "customers" && <Customers />}
        {asec === "packages" && <PackagesAdmin openPackageEditSheet={openPackageEditSheet} />}
        {asec === "reports" && <Reports />}
        {asec === "promos" && <Promotions />}
        {asec === "resources" && <Resources />}
      </div>
    </div>
  );
}
