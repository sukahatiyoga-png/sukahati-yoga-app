import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../domain/auth";
import { notifyOwner } from "../domain/mailer";

export const enquiriesRouter = Router();
enquiriesRouter.use(requireAuth);

function serializeMessage(m: { id: string; body: string; isStaff: boolean; createdAt: Date; author: { fullName: string } }) {
  return { id: m.id, body: m.body, isStaff: m.isStaff, authorName: m.author.fullName, createdAt: m.createdAt.toISOString() };
}

function serializeSummary(e: { id: string; subject: string; status: string; createdAt: Date; messages: { body: string; createdAt: Date }[] }) {
  const last = e.messages[e.messages.length - 1];
  return {
    id: e.id, subject: e.subject, status: e.status, createdAt: e.createdAt.toISOString(),
    lastMessage: last?.body || "", lastAt: (last?.createdAt || e.createdAt).toISOString(),
  };
}

enquiriesRouter.get("/", async (req, res) => {
  const rows = await db.enquiry.findMany({
    where: { userId: req.userId! },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(rows.map(serializeSummary));
});

enquiriesRouter.get("/:id", async (req, res) => {
  const e = await db.enquiry.findUnique({
    where: { id: req.params.id },
    include: { messages: { include: { author: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!e || e.userId !== req.userId) return res.status(404).json({ error: "Enquiry not found" });
  res.json({ id: e.id, subject: e.subject, status: e.status, createdAt: e.createdAt.toISOString(), messages: e.messages.map(serializeMessage) });
});

enquiriesRouter.post("/", async (req, res) => {
  const { subject, message } = req.body || {};
  if (!message || !String(message).trim()) return res.status(400).json({ error: "Message is required" });
  const userId = req.userId!;
  const user = await db.user.findUnique({ where: { id: userId } });
  const e = await db.enquiry.create({
    data: {
      userId, subject: subject || "",
      messages: { create: { authorUserId: userId, isStaff: false, body: String(message).trim() } },
    },
    include: { messages: { include: { author: true } } },
  });
  notifyOwner(
    `New enquiry from ${user?.fullName || "a customer"}`,
    `<p><b>${user?.fullName || "A customer"}</b> (${user?.email || ""}) sent an enquiry${subject ? `: <b>${subject}</b>` : ""}.</p><p>${String(message).trim()}</p>`
  );
  res.status(201).json({ id: e.id, subject: e.subject, status: e.status, createdAt: e.createdAt.toISOString(), messages: e.messages.map(serializeMessage) });
});

enquiriesRouter.post("/:id/reply", async (req, res) => {
  const { message } = req.body || {};
  if (!message || !String(message).trim()) return res.status(400).json({ error: "Message is required" });
  const e = await db.enquiry.findUnique({ where: { id: req.params.id } });
  if (!e || e.userId !== req.userId) return res.status(404).json({ error: "Enquiry not found" });
  await db.enquiryMessage.create({ data: { enquiryId: e.id, authorUserId: req.userId!, isStaff: false, body: String(message).trim() } });
  await db.enquiry.update({ where: { id: e.id }, data: { status: "open" } });
  notifyOwner(`Follow-up on enquiry${e.subject ? `: ${e.subject}` : ""}`, `<p>${String(message).trim()}</p>`);
  const full = await db.enquiry.findUnique({ where: { id: e.id }, include: { messages: { include: { author: true }, orderBy: { createdAt: "asc" } } } });
  res.json({ id: full!.id, subject: full!.subject, status: full!.status, createdAt: full!.createdAt.toISOString(), messages: full!.messages.map(serializeMessage) });
});
