import type { Tab } from "../context/AppContext";

export interface Route { mode: "customer" | "admin"; tab: Tab }

const TAB_PATHS: Record<string, Tab> = {
  "/": "home",
  "/home": "home",
  "/search": "search",
  "/packages": "packages",
  "/book": "book",
  "/bookings": "bookings",
  "/alerts": "alerts",
  "/profile": "profile",
};

export function parseRoute(pathname: string): Route {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return { mode: "admin", tab: "home" };
  }
  return { mode: "customer", tab: TAB_PATHS[pathname] || "home" };
}

export function pathFor(mode: "customer" | "admin", tab: Tab): string {
  if (mode === "admin") return "/admin";
  return tab === "home" ? "/" : "/" + tab;
}
