import { useCallback, useEffect, useRef, useState } from "react";
import Toast from "./components/Toast";
import TabBar from "./components/TabBar";
import PackageSheet from "./components/PackageSheet";
import QrSheet from "./components/QrSheet";
import PackageEditSheet from "./components/PackageEditSheet";
import { AppContext, type AdminSection, type Tab } from "./context/AppContext";
import { api, type Me, type Pkg } from "./lib/api";

import Home from "./screens/Home";
import Search from "./screens/Search";
import Packages from "./screens/Packages";
import BookFlow, { type BookDraft, initialDraft } from "./screens/BookFlow";
import Bookings from "./screens/Bookings";
import Alerts from "./screens/Alerts";
import Profile from "./screens/Profile";
import AdminShell from "./screens/admin/AdminShell";

type SheetState =
  | { kind: "pkg"; id: string }
  | { kind: "qr"; booking: { title: string; meta: string; ref: string } }
  | { kind: "pkgEdit"; pkg: Pkg | null }
  | null;

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [mode, setMode] = useState<"customer" | "admin">("customer");
  const [tab, setTab] = useState<Tab>("home");
  const [asec, setAsec] = useState<AdminSection>("dash");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toast, setToastMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<BookDraft>(initialDraft());
  const [refreshTick, setRefreshTick] = useState(0);
  const toastTimer = useRef<number | undefined>(undefined);

  const loadMe = useCallback(() => {
    api.me().then(setMe).catch((e) => console.error(e));
  }, []);
  useEffect(loadMe, [loadMe]);

  const flash = useCallback((msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const refreshMe = useCallback(() => {
    setRefreshTick((n) => n + 1);
    loadMe();
  }, [loadMe]);

  const goTab = useCallback((t: Tab) => {
    setTab(t);
    setSheet(null);
  }, []);

  const goBook = useCallback((preset?: { sessionId?: string; packageId?: string; dayId?: string }) => {
    setDraft(initialDraft(preset));
    setTab("book");
    setSheet(null);
  }, []);

  const goAdmin = useCallback(() => { setMode("admin"); setSheet(null); }, []);
  const exitAdmin = useCallback(() => { setMode("customer"); setTab("home"); setSheet(null); }, []);
  const openPackageSheet = useCallback((id: string) => setSheet({ kind: "pkg", id }), []);
  const openQrSheet = useCallback((booking: { title: string; meta: string; ref: string }) => setSheet({ kind: "qr", booking }), []);
  const openPackageEditSheet = useCallback((pkg: Pkg | null) => setSheet({ kind: "pkgEdit", pkg }), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  if (!me) {
    return (
      <div style={{ color: "#645c50", fontFamily: "system-ui" }}>Loading Sukahati…</div>
    );
  }

  const ctx = {
    me, refreshMe, flash, goTab, goBook, goAdmin, exitAdmin,
    openPackageSheet, openQrSheet, closeSheet,
  };

  return (
    <AppContext.Provider value={ctx}>
      <div style={{ position: "relative", height: "100dvh", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "var(--font-body)", overflow: "hidden", boxShadow: "0 0 40px rgba(46,43,37,0.12)" }}>
        <div style={{ flex: 1, overflow: "auto" }}>
          {mode === "customer" && tab === "home" && <Home key={refreshTick} />}
          {mode === "customer" && tab === "search" && <Search />}
          {mode === "customer" && tab === "packages" && <Packages />}
          {mode === "customer" && tab === "book" && <BookFlow draft={draft} setDraft={setDraft} onDone={() => setRefreshTick((n) => n + 1)} />}
          {mode === "customer" && tab === "bookings" && <Bookings key={refreshTick} />}
          {mode === "customer" && tab === "alerts" && <Alerts />}
          {mode === "customer" && tab === "profile" && <Profile />}
          {mode === "admin" && <AdminShell key={refreshTick} asec={asec} setAsec={setAsec} openPackageEditSheet={openPackageEditSheet} />}
        </div>

        {mode === "customer" && tab !== "book" && <TabBar tab={tab} />}

        <Toast message={toast} />

        {sheet?.kind === "pkg" && <PackageSheet id={sheet.id} onBook={(packageId) => goBook({ packageId })} />}
        {sheet?.kind === "qr" && <QrSheet booking={sheet.booking} />}
        {sheet?.kind === "pkgEdit" && (
          <PackageEditSheet pkg={sheet.pkg} onSaved={() => { setSheet(null); setRefreshTick((n) => n + 1); }} />
        )}
      </div>
    </AppContext.Provider>
  );
}
