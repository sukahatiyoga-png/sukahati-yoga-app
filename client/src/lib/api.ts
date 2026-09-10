const BASE = "/api";
const TOKEN_KEY = "sukahati_token";

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const get = <T>(path: string) => req<T>(path);
const post = <T>(path: string, body?: unknown) => req<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
const patch = <T>(path: string, body?: unknown) => req<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
const put = <T>(path: string, body?: unknown) => req<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined });

// ── Types ──────────────────────────────────────────────────────────────

export interface Me {
  id: string; name: string; email: string; phone: string; memberSince: string;
  authProvider: string; points: number; classesAttended: number; friendsReferred: number;
  referralCode: string; role: string;
  preferences: { usualLevel: string | null; preferredTime: string | null; mealPreference: string | null; savedPaymentLabel: string } | null;
}

export interface Pkg {
  id: string; name: string; kind: string; priceMinor: number; currency: string;
  unit: string; capacity: string; sold: number; revenueMinor: number;
  active: boolean; recommended: boolean; badge: string;
  desc: string; long: string; goodFor: string; cat: string; dur: string; rating: string;
  valid: string; cancel: string; incl: string[]; excl: string[]; sortOrder: number;
  retreat: { startsOn: string; endsOn: string; totalPlaces: number; placesLeft: number; earlyBirdUntil: string | null; earlyBirdSaveMinor: number } | null;
}

export interface ActivePass { packageName: string; daysLeft: number; pct: number; endLabel: string; startedAt: string }

export interface SessionSlot {
  id: string; time: string; ampm: string; title: string; teacher: string;
  teacherName: string; roomName: string; spots: number; cap: number; seatsTaken: number;
  cat: string; dur: string; rating: string; price: number; startsAt: string; status: string;
}

export interface Addon { id: string; name: string; priceMinor: number }

export interface BookingCustomer {
  id: string; mon: string; day: string; title: string; meta: string; status: string;
  confirmed: boolean; pending: boolean; attended: boolean; cancelled: boolean;
  balanceMinor: number | null; ref: string; qrToken: string; packageName: string; createdAt: string;
}

export interface BookingAdmin {
  id: string; name: string; initials: string; meta: string; pkg: string;
  amountMinor: number; paid: boolean; unpaid: boolean; status: string;
  isPending: boolean; isConfirmed: boolean; createdAt: string;
}

export interface NotificationItem {
  id: string; kind: string; title: string; body: string; ago: string; unread: boolean; channel: string; action: string;
}

export interface Customer { id: string; name: string; initials: string; meta: string; spendMinor: number }
export interface Coupon { id: string; code: string; detail: string; on: boolean }
export interface Automation { id: string; name: string; note: string; on: boolean }
export interface Teacher { id: string; name: string; initials: string; meta: string; load: string }
export interface RoomItem { id: string; name: string; meta: string; state: string }
export interface CalendarSession { id: string; time: string; ampm: string; title: string; assign: string; load: string; pct: string; pctRaw: number }
export interface CheckinItem { id: string; name: string; initials: string; meta: string; checkedIn: boolean }

export interface DashboardTodo { id: string; title: string; body: string; cta: string; kind: string; sessionId?: string }
export interface Dashboard {
  bookingsToday: number; revenueTodayMinor: number; occupancyPct: number; pendingPayments: number;
  cancellationsThisWeek: number; waitlistCount: number; todo: DashboardTodo[];
}

export interface Reports {
  revenueMinor: number; bookingsThisMonth: number; cancellationRate: number; retentionPct: number;
  revenueByPackage: { name: string; amountMinor: number; pct: number }[];
  peakBars: { label: string; pct: number }[];
  rows: { name: string; value: string }[];
}

// ── API ────────────────────────────────────────────────────────────────

export const api = {
  signup: (data: { name: string; email: string; phone?: string; password: string }) =>
    post<{ token: string; userId: string }>("/auth/signup", data),
  login: (data: { email: string; password: string }) =>
    post<{ token: string; userId: string }>("/auth/login", data),

  me: () => get<Me>("/users/me"),
  updateProfile: (id: string, data: { name: string; email: string; phone: string }) => patch<Me>(`/users/${id}`, data),
  activePass: (userId: string) => get<ActivePass | null>(`/users/${userId}/pass`),

  packages: (all = false) => get<Pkg[]>(`/packages${all ? "?all=1" : ""}`),
  package: (id: string) => get<Pkg>(`/packages/${id}`),
  createPackage: (data: Record<string, unknown>) => post<Pkg>("/packages", data),
  updatePackage: (id: string, data: Record<string, unknown>) => put<Pkg>(`/packages/${id}`, data),

  sessions: (params: Record<string, string | undefined>) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    return get<SessionSlot[]>(`/sessions${qs ? "?" + qs : ""}`);
  },
  waitlist: (sessionId: string) => post<{ ok: boolean }>(`/sessions/${sessionId}/waitlist`),

  addons: () => get<Addon[]>("/addons"),

  quote: (data: { packageId: string; guestCount: number; addonIds: string[]; couponCode?: string }) =>
    post<{ subtotalMinor: number; addonsTotalMinor: number; discountMinor: number; totalMinor: number; depositMinor: number; couponValid: boolean; couponMessage: string; cancelLabel: string }>("/bookings/quote", data),
  myBookings: () => get<{ upcoming: BookingCustomer[]; past: BookingCustomer[] }>("/bookings"),
  booking: (id: string) => get<BookingCustomer & { addons: { name: string; quantity: number }[] }>(`/bookings/${id}`),
  createBooking: (data: Record<string, unknown>) => post<BookingCustomer>("/bookings", data),
  cancelBooking: (id: string) => patch<{ ok: boolean }>(`/bookings/${id}/cancel`),
  payBalance: (id: string, method: string) => patch<{ ok: boolean }>(`/bookings/${id}/pay-balance`, { method }),
  confirmBooking: (id: string) => patch<{ ok: boolean }>(`/bookings/${id}/confirm`),
  declineBooking: (id: string) => patch<{ ok: boolean }>(`/bookings/${id}/decline`),
  refundBooking: (id: string) => patch<{ ok: boolean }>(`/bookings/${id}/refund`),
  remindBooking: (id: string) => post<{ ok: boolean }>(`/bookings/${id}/remind`),
  checkin: (id: string) => patch<{ ok: boolean }>(`/bookings/${id}/checkin`),
  adminBookings: (status?: string) => get<BookingAdmin[]>(`/bookings${status ? "?status=" + encodeURIComponent(status) : ""}`),

  notifications: () => get<NotificationItem[]>("/notifications"),
  markRead: (id: string) => patch<{ ok: boolean }>(`/notifications/${id}/read`),
  markAllRead: () => patch<{ ok: boolean }>("/notifications/read-all"),
  notificationPrefs: () => get<{ id: string; name: string; note: string; on: boolean }[]>("/notifications/preferences"),
  toggleNotificationPref: (channel: string) => patch<{ ok: boolean; value: boolean }>("/notifications/preferences", { channel }),

  admin: {
    dashboard: () => get<Dashboard>("/admin/dashboard"),
    raiseCapacity: (sessionId: string) => patch<{ ok: boolean; capacity: number }>(`/admin/sessions/${sessionId}/capacity`, { increaseBy: 2 }),
    calendar: (date: string) => get<CalendarSession[]>(`/admin/calendar?date=${date}`),
    addSession: (data: Record<string, unknown>) => post<{ ok: boolean; id: string }>("/admin/sessions", data),
    blockDay: (date: string) => post<{ ok: boolean; sessionsBlocked: number; guestsNotified: number }>(`/admin/days/${date}/block`),
    customers: (q?: string) => get<Customer[]>(`/admin/customers${q ? "?q=" + encodeURIComponent(q) : ""}`),
    reports: () => get<Reports>("/admin/reports"),
    coupons: () => get<Coupon[]>("/admin/coupons"),
    toggleCoupon: (id: string) => patch<{ ok: boolean; on: boolean }>(`/admin/coupons/${id}/toggle`),
    loyalty: () => get<{ pointsPerClass: number; freeClassAt: number; referralRewardMinor: number; membersOnPlan: number }>("/admin/loyalty"),
    automations: () => get<Automation[]>("/admin/automations"),
    toggleAutomation: (id: string) => patch<{ ok: boolean; on: boolean }>(`/admin/automations/${id}/toggle`),
    teachers: () => get<Teacher[]>("/admin/teachers"),
    rooms: () => get<RoomItem[]>("/admin/rooms"),
    conflicts: () => get<{ notes: string[] }>("/admin/conflicts"),
    access: () => get<{ name: string; value: string }[]>("/admin/access"),
    checkins: () => get<CheckinItem[]>("/admin/checkins"),
  },
};
