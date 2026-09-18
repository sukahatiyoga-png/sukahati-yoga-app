import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../domain/auth";

export const reviewsRouter = Router();

reviewsRouter.get("/", async (req, res) => {
  const { packageId } = req.query as Record<string, string | undefined>;
  if (!packageId) return res.status(400).json({ error: "packageId is required" });
  const rows = await db.review.findMany({
    where: { packageId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(rows.map((r) => ({
    id: r.id, rating: r.rating, comment: r.comment,
    authorName: r.user.fullName.split(" ")[0], createdAt: r.createdAt.toISOString(),
  })));
});

reviewsRouter.post("/", requireAuth, async (req, res) => {
  const { bookingId, rating, comment } = req.body || {};
  const ratingNum = Number(rating);
  if (!bookingId) return res.status(400).json({ error: "bookingId is required" });
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) return res.status(400).json({ error: "rating must be 1-5" });

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.userId !== req.userId) return res.status(404).json({ error: "Booking not found" });
  if (booking.status !== "attended") return res.status(400).json({ error: "You can only review a completed booking" });

  try {
    const review = await db.review.create({
      data: { bookingId, userId: req.userId!, packageId: booking.packageId, rating: ratingNum, comment: comment || "" },
      include: { user: true },
    });
    res.status(201).json({
      id: review.id, rating: review.rating, comment: review.comment,
      authorName: review.user.fullName.split(" ")[0], createdAt: review.createdAt.toISOString(),
    });
  } catch (e: any) {
    if (e.code === "P2002") return res.status(409).json({ error: "You've already reviewed this booking" });
    throw e;
  }
});
