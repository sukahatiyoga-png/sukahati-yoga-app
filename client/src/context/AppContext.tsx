import { createContext, useContext } from "react";
import type { Me } from "../lib/api";

export type Tab = "home" | "search" | "packages" | "book" | "bookings" | "alerts" | "profile";
export type AdminSection = "dash" | "cal" | "bookings" | "customers" | "packages" | "retreats" | "reports" | "promos" | "resources" | "teacherReg" | "scan" | "activity";

export interface BookPreset {
  sessionId?: string;
  packageId?: string;
  dayId?: string;
  token: number;
}

export interface AppCtx {
  me: Me;
  refreshMe: () => void;
  flash: (msg: string) => void;
  goTab: (tab: Tab) => void;
  goBook: (preset?: Partial<BookPreset>) => void;
  goAdmin: () => void;
  exitAdmin: () => void;
  logout: () => void;
  openPackageSheet: (id: string) => void;
  openQrSheet: (booking: { title: string; meta: string; ref: string; qrToken: string }) => void;
  closeSheet: () => void;
}

export const AppContext = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppContext.Provider");
  return ctx;
}
