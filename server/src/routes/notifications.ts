import { Router } from "express";
import { db } from "../db";
import { agoLabel } from "../domain/format";

export const notificationsRouter = Router();

const KIND_ICON: Record<string, string> = {
  booking_confirmed: "check", payment_received: "card", payment_due: "clock",
  reminder_7d: "clock", reminder_24h: "clock", cancelled: "check",
  schedule_changed: "cal", waitlist_open: "users",
};
const CHANNEL_LABEL: Record<string, string> = { push: "Push", email: "Email", sms: "SMS", whatsapp: "WhatsApp" };

function serialize(n: any) {
  return {
    id: n.id, kind: KIND_ICON[n.event] || "check", title: n.title, body: n.body,
    ago: agoLabel(n.sentAt || n.scheduledFor), unread: !n.readAt,
    channel: CHANNEL_LABEL[n.channel] || n.channel,
    action: n.event === "payment_due" || n.event === "schedule_changed" ? "packages"
      : n.event === "booking_confirmed" ? "bookings"
      : n.event === "waitlist_open" ? "book" : "",
  };
}

notificationsRouter.get("/", async (req, res) => {
  const userId = req.userId!;
  const notifications = await db.notification.findMany({ where: { userId }, orderBy: { sentAt: "desc" } });
  res.json(notifications.map(serialize));
});

notificationsRouter.patch("/:id/read", async (req, res) => {
  const notif = await db.notification.findUnique({ where: { id: req.params.id } });
  if (!notif || notif.userId !== req.userId) return res.status(404).json({ error: "Notification not found" });
  await db.notification.update({ where: { id: req.params.id }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

notificationsRouter.patch("/read-all", async (req, res) => {
  const userId = req.userId!;
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

notificationsRouter.get("/preferences", async (req, res) => {
  const userId = req.userId!;
  const prefs = await db.userPreferences.findUnique({ where: { userId } });
  if (!prefs) return res.status(404).json({ error: "No preferences found" });
  res.json([
    { id: "push", name: "Push notifications", note: "Confirmations, reminders, waitlist", on: prefs.pushEnabled },
    { id: "email", name: "Email", note: "Receipts and schedule changes", on: prefs.emailEnabled },
    { id: "whatsapp", name: "WhatsApp", note: "Waitlist and last-minute changes", on: prefs.whatsappEnabled },
    { id: "sms", name: "SMS", note: "24-hour class reminder", on: prefs.smsEnabled },
  ]);
});

notificationsRouter.patch("/preferences", async (req, res) => {
  const userId = req.userId!;
  const { channel } = req.body || {};
  const field = { push: "pushEnabled", email: "emailEnabled", whatsapp: "whatsappEnabled", sms: "smsEnabled" }[channel as string];
  if (!field) return res.status(400).json({ error: "Unknown channel" });
  const current = await db.userPreferences.findUnique({ where: { userId } });
  if (!current) return res.status(404).json({ error: "No preferences found" });
  const updated = await db.userPreferences.update({
    where: { userId },
    data: { [field]: !(current as any)[field] },
  });
  res.json({ ok: true, value: (updated as any)[field] });
});
