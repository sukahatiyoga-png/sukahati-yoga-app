// Money-in-minor-units + append-only-payments rules live here so every
// route that touches a booking's totals goes through the same math.

import { db } from "../db";

export function computeDiscount(subtotalMinor: number, coupon: { discountType: string; discountValue: number } | null): number {
  if (!coupon) return 0;
  if (coupon.discountType === "percent") return Math.round((subtotalMinor * coupon.discountValue) / 100);
  return Math.min(coupon.discountValue, subtotalMinor);
}

/** A booking's true paid total is always the sum of its non-refund payment rows
 * plus its (negative) refund rows — never hand-edited. Call this after every
 * payment insert to keep the cached `amountPaidMinor` column in sync. */
export async function recomputeAmountPaid(bookingId: string): Promise<number> {
  const payments = await db.payment.findMany({ where: { bookingId, status: "paid" } });
  const total = payments.reduce((sum, p) => sum + p.amountMinor, 0);
  await db.booking.update({ where: { id: bookingId }, data: { amountPaidMinor: total } });
  return total;
}
