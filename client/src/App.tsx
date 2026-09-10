import { useCallback, useEffect, useRef, useState } from "react";
import Toast from "./components/Toast";
import TabBar from "./components/TabBar";
import PackageSheet from "./components/PackageSheet";
import QrSheet from "./components/QrSheet";
import PackageEditSheet from "./components/PackageEditSheet";
import { AppContext, type AdminSection, type Tab } from "./context/AppContext";
import { api, clearToken, getToken, type Me, type Pkg } from "./lib/api";
import { parseRoute, pathFor } from "./lib/routes";

import Auth from "./screens/Auth";
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

const initialRoute = parseRoute(window.location.pathname);

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [authed, setAuthed] = useState(!!getToken());
  const [checkingAuth, setCheckingAuth] = useState(!!getToken());
  const [mode, setMode] = useState<"customer" | "admin">(initialRoute.mode);
  const [tab, setTab] = useState<Tab>(initialRoute.tab);
  const [asec, setAsec] = useState<AdminSection>("dash");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toast, setToastMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<BookDraft>(initialDraft());
  const [refreshTick, setRefreshTick] = useState(0);
  const toastTimer = useRef<number | undefined>(undefined);

  const logout = useCallback(() => {
    clearToken();
    setMe(null);
    setAuthed(false);
    setMode("customer");
    setTab("home");
    history.pushState(null, "", pathFor("customer", "home"));
  }, []);

  const loadMe = useCallback(() => {
    if (!getToken()) { setCheckingAuth(false); return; }
    api.me().then(setMe).catch(() => { clearToken(); setAuthed(false); }).finally(() => setCheckingAuth(false));
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
    history.pushState(null, "", pathFor("customer", t));
  }, []);

  const goBook = useCallback((preset?: { sessionId?: string; packageId?: string; dayId?: string }) => {
    setDraft(initialDraft(preset));
    setTab("book");
    setSheet(null);
    history.pushState(null, "", pathFor("customer", "book"));
  }, []);

  const goAdmin = useCallback(() => {
    setMode("admin");
    setSheet(null);
    history.pushState(null, "", pathFor("admin", "home"));
  }, []);
  const exitAdmin = useCallback(() => {
    setMode("customer");
    setTab("home");
    setSheet(null);
    history.pushState(null, "", pathFor("customer", "home"));
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const r = parseRoute(window.location.pathname);
      setMode(r.mode);
      setTab(r.tab);
      setSheet(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const openPackageSheet = useCallback((id: string) => setSheet({ kind: "pkg", id }), []);
  const openQrSheet = useCallback((booking: { title: string; meta: string; ref: string }) => setSheet({ kind: "qr", booking }), []);
  const openPackageEditSheet = useCallback((pkg: Pkg | null) => setSheet({ kind: "pkgEdit", pkg }), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  if (checkingAuth) {
    return (
      <div style={{ color: "#645c50", fontFamily: "system-ui" }}>Loading Sukahati…</div>
    );
  }

  if (!authed) {
    return <Auth onAuthed={() => { setAuthed(true); setCheckingAuth(true); loadMe(); }} />;
  }

  if (!me) {
    return (
      <div style={{ color: "#645c50", fontFamily: "system-ui" }}>Loading Sukahati…</div>
    );
  }

  const ctx = {
    me, refreshMe, flash, goTab, goBook, goAdmin, exitAdmin, logout,
    openPackageSheet, openQrSheet, closeSheet,
  };

  if (mode === "admin") {
    return (
      <AppContext.Provider value={ctx}>
        <div style={{ position: "relative", height: "100dvh", width: "100%", background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "var(--font-body)", overflow: "hidden" }}>
          <AdminShell key={refreshTick} asec={asec} setAsec={setAsec} openPackageEditSheet={openPackageEditSheet} />

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

  return (
    <AppContext.Provider value={ctx}>
      <div style={{ position: "relative", height: "100dvh", width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "var(--font-body)", overflow: "hidden" }}>
        <div style={{ flex: 1, overflow: "auto" }}>
          {tab === "home" && <Home key={refreshTick} />}
          {tab === "search" && <Search />}
          {tab === "packages" && <Packages />}
          {tab === "book" && <BookFlow draft={draft} setDraft={setDraft} onDone={() => setRefreshTick((n) => n + 1)} />}
          {tab === "bookings" && <Bookings key={refreshTick} />}
          {tab === "alerts" && <Alerts />}
          {tab === "profile" && <Profile />}
        </div>

        {tab !== "book" && <TabBar tab={tab} />}

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
