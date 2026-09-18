import { Router, Request, Response } from "express";
import { db } from "../db";
import { notifyCustomer } from "../domain/mailer";

export const adminEnquiriesRouter = Router();

function serializeMessage(m: { id: string; body: string; isStaff: boolean; createdAt: Date; author: { fullName: string } }) {
  return { id: m.id, body: m.body, isStaff: m.isStaff, authorName: m.author.fullName, createdAt: m.createdAt.toISOString() };
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

adminEnquiriesRouter.get("/", async (req, res) => {
  const { status } = req.query as Record<string, string | undefined>;
  const rows = await db.enquiry.findMany({
    where: status && status !== "All" ? { status: status.toLowerCase() } : undefined,
    include: { user: true, messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(rows.map((e) => {
    const last = e.messages[e.messages.length - 1];
    return {
      id: e.id, subject: e.subject, status: e.status, createdAt: e.createdAt.toISOString(),
      userName: e.user.fullName, initials: initials(e.user.fullName),
      lastMessage: last?.body || "", lastAt: (last?.createdAt || e.createdAt).toISOString(),
    };
  }));
});

adminEnquiriesRouter.get("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const e = await db.enquiry.findUnique({
    where: { id: req.params.id },
    include: { user: true, messages: { include: { author: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!e) return res.status(404).json({ error: "Enquiry not found" });
  res.json({
    id: e.id, subject: e.subject, status: e.status, createdAt: e.createdAt.toISOString(),
    userName: e.user.fullName, userEmail: e.user.email, userPhone: e.user.phoneE164 || "",
    messages: e.messages.map(serializeMessage),
  });
});

adminEnquiriesRouter.post("/:id/reply", async (req: Request<{ id: string }>, res: Response) => {
  const { message } = req.body || {};
  if (!message || !String(message).trim()) return res.status(400).json({ error: "Message is required" });
  const e = await db.enquiry.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!e) return res.status(404).json({ error: "Enquiry not found" });
  const body = String(message).trim();

  await db.enquiryMessage.create({ data: { enquiryId: e.id, authorUserId: req.userId!, isStaff: true, body } });
  await db.enquiry.update({ where: { id: e.id }, data: { status: "replied" } });
  await db.notification.create({
    data: {
      userId: e.userId, event: "enquiry_replied", channel: "push",
      title: e.subject ? `Reply: ${e.subject}` : "Reply to your enquiry",
      body, scheduledFor: new Date(), sentAt: new Date(),
    },
  });
  await db.auditLog.create({
    data: { actorUserId: req.userId!, entityTable: "enquiries", entityId: e.id, action: "update", diff: JSON.stringify({ reply: body }) },
  }).catch(() => {});
  notifyCustomer(e.userId, e.subject ? `Reply: ${e.subject}` : "Reply to your enquiry", `<p>${body}</p>`);

  const full = await db.enquiry.findUnique({ where: { id: e.id }, include: { user: true, messages: { include: { author: true }, orderBy: { createdAt: "asc" } } } });
  res.json({
    id: full!.id, subject: full!.subject, status: full!.status, createdAt: full!.createdAt.toISOString(),
    userName: full!.user.fullName, userEmail: full!.user.email, userPhone: full!.user.phoneE164 || "",
    messages: full!.messages.map(serializeMessage),
  });
});

adminEnquiriesRouter.patch("/:id/status", async (req: Request<{ id: string }>, res: Response) => {
  const { status } = req.body || {};
  if (!["open", "replied", "closed"].includes(status)) return res.status(400).json({ error: "Invalid status" });
  const e = await db.enquiry.findUnique({ where: { id: req.params.id } });
  if (!e) return res.status(404).json({ error: "Enquiry not found" });
  await db.enquiry.update({ where: { id: e.id }, data: { status } });
  res.json({ ok: true, status });
});
