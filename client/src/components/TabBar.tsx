import { useEffect, useState, type ReactNode } from "react";
import { useApp } from "../context/AppContext";
import type { Tab } from "../context/AppContext";
import { api } from "../lib/api";

const ITEMS: { id: Tab; label: string; icon: (c: string) => ReactNode }[] = [
  { id: "home", label: "Home", icon: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
  ) },
  { id: "search", label: "Search", icon: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
  ) },
  { id: "packages", label: "Packages", icon: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 3 7.5l9 4.5 9-4.5Z" /><path d="M3 12.5 12 17l9-4.5" /><path d="M3 17 12 21.5 21 17" /></svg>
  ) },
  { id: "bookings", label: "Bookings", icon: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="4" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>
  ) },
  { id: "alerts", label: "Alerts", icon: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" /><path d="M10.5 20a2 2 0 0 0 3 0" /></svg>
  ) },
];

export default function TabBar({ tab }: { tab: Tab }) {
  const { goTab } = useApp();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.notifications().then((list) => setUnread(list.filter((n) => n.unread).length)).catch(() => {});
  }, [tab]);

  const on = "var(--color-accent-700)";
  const off = "var(--color-neutral-600)";

  return (
    <div style={{ flex: "none", background: "var(--color-neutral-100)", borderTop: "1px solid var(--color-divider)", borderRadius: "26px 26px 0 0", padding: "10px 6px 30px", display: "flex", gap: 2 }}>
      {ITEMS.map((item) => {
        const active = tab === item.id;
        const c = active ? on : off;
        return (
          <button
            key={item.id}
            onClick={() => goTab(item.id)}
            style={{ flex: 1, background: "none", border: 0, padding: "8px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 600, cursor: "pointer", color: c, position: "relative" }}
          >
            {item.icon(c)}
            {item.label}
            {item.id === "alerts" && unread > 0 && (
              <span style={{ position: "absolute", top: 3, right: 10, minWidth: 17, height: 17, borderRadius: 999, background: "var(--color-accent-500)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                {unread}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
