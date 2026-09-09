// SQLite has no native enum type, so these unions are the enforcement point
// for the string-typed "enum" columns in prisma/schema.prisma.

export const BOOKING_STATUS = ["pending", "confirmed", "cancelled", "no_show", "attended"] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];

export const PAYMENT_KIND = ["deposit", "balance", "full", "refund"] as const;
export type PaymentKind = (typeof PAYMENT_KIND)[number];

export const PAYMENT_METHOD = ["card", "fpx", "grabpay", "apple_pay", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];

export const PAYMENT_STATUS = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatusT = (typeof PAYMENT_STATUS)[number];

export const SESSION_STATUS = ["scheduled", "full", "cancelled", "blocked"] as const;
export type SessionStatusT = (typeof SESSION_STATUS)[number];

export const WAITLIST_STATUS = ["waiting", "offered", "claimed", "expired"] as const;
export type WaitlistStatusT = (typeof WAITLIST_STATUS)[number];

export const NOTIFICATION_EVENT = [
  "booking_confirmed",
  "payment_received",
  "reminder_7d",
  "reminder_24h",
  "cancelled",
  "schedule_changed",
  "payment_due",
  "waitlist_open",
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENT)[number];

export const NOTIFICATION_CHANNEL = ["push", "email", "sms", "whatsapp"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[number];

export const USER_ROLE = ["customer", "desk", "teacher", "owner"] as const;
export type UserRole = (typeof USER_ROLE)[number];

export const PACKAGE_KIND = ["single", "pass", "private", "online", "retreat"] as const;
export type PackageKind = (typeof PACKAGE_KIND)[number];

export const AUDIT_ACTION = ["create", "update", "delete", "refund"] as const;
export type AuditAction = (typeof AUDIT_ACTION)[number];

export function toMinor(ringgit: number): number {
  return Math.round(ringgit * 100);
}

export function fromMinor(minor: number): number {
  return minor / 100;
}

export function formatMoney(minor: number, currency = "RM"): string {
  return currency + " " + fromMinor(minor).toLocaleString("en-MY", { minimumFractionDigits: minor % 100 === 0 ? 0 : 2 });
}

export function genReference(): string {
  return "SKH-" + (4500 + Math.floor(Math.random() * 4999));
}

export function genQrToken(): string {
  return "qr_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function genReferralCode(fullName: string): string {
  const base = fullName.split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "");
  return base + Math.floor(10 + Math.random() * 89);
}
