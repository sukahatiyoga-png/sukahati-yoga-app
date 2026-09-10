import type { ReactNode } from "react";
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
import TeacherRegistrations from "./TeacherRegistrations";
import ScanCheckin from "./ScanCheckin";

function Icon({ d, d2 }: { d: string; d2?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}

const NAV: { id: AdminSection; name: string; icon: ReactNode }[] = [
  { id: "dash", name: "Dashboard", icon: <Icon d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /> },
  { id: "cal", name: "Calendar", icon: <Icon d="M3.5 5h17v16h-17z" d2="M8 3v4M16 3v4M3.5 10h17" /> },
  { id: "bookings", name: "Bookings", icon: <Icon d="M3.5 5h17v16h-17z" d2="M8 3v4M16 3v4M3.5 10h17" /> },
  { id: "scan", name: "Scan Check-in", icon: <Icon d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" d2="M4 12h16" /> },
  { id: "customers", name: "Customers", icon: <Icon d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" d2="M4 21a8 8 0 0 1 16 0" /> },
  { id: "packages", name: "Packages", icon: <Icon d="M12 3 3 7.5l9 4.5 9-4.5Z" d2="M3 7.5v9L12 21l9-4.5v-9" /> },
  { id: "teacherReg", name: "Teacher Registrations", icon: <Icon d="M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" d2="M2 21a7 7 0 0 1 14 0M17 8h5M19.5 5.5v5" /> },
  { id: "reports", name: "Reports", icon: <Icon d="M4 20V10M12 20V4M20 20v-7" /> },
  { id: "promos", name: "Promotions", icon: <Icon d="m20 12-8 8-9-9V4h7l10 10Z" d2="M7 7.01 7.01 7" /> },
  { id: "resources", name: "Resources", icon: <Icon d="M14.7 6.3a4 4 0 0 1-5.3 5.3L4 17v3h3l5.4-5.4a4 4 0 0 1 5.3-5.3l-3 3-2-2 3-3Z" /> },
];

export default function AdminShell({ asec, setAsec, openPackageEditSheet }: {
  asec: AdminSection; setAsec: (s: AdminSection) => void; openPackageEditSheet: (pkg: Pkg | null) => void;
}) {
  const { exitAdmin } = useApp();
  const title = NAV.find((n) => n.id === asec)?.name || "Dashboard";

  return (
    <div className="admin-shell">
      <nav className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Sukahati Yoga</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 19, marginTop: 3 }}>Studio Admin</div>
        </div>
        {NAV.map((n) => (
          <button key={n.id} className={`admin-nav-btn${asec === n.id ? " active" : ""}`} onClick={() => setAsec(n.id)}>
            {n.icon}<span>{n.name}</span>
          </button>
        ))}
        <div className="admin-sidebar-footer">
          <button className="admin-nav-btn" onClick={exitAdmin}>
            <Icon d="M9 5 4 12l5 7M4 12h16" /><span>Exit to customer app</span>
          </button>
        </div>
      </nav>

      <main className="admin-main">
        <div className="admin-main-inner">
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 32, lineHeight: 1.06, margin: 0 }}>{title}</h1>
          {asec === "dash" && <Dashboard setAsec={setAsec} />}
          {asec === "cal" && <CalendarSection />}
          {asec === "bookings" && <BookingsAdmin />}
          {asec === "scan" && <ScanCheckin />}
          {asec === "customers" && <Customers />}
          {asec === "packages" && <PackagesAdmin openPackageEditSheet={openPackageEditSheet} />}
          {asec === "teacherReg" && <TeacherRegistrations />}
          {asec === "reports" && <Reports />}
          {asec === "promos" && <Promotions />}
          {asec === "resources" && <Resources />}
        </div>
      </main>
    </div>
  );
}
