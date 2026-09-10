import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { db } from "../db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-do-not-use-in-production";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

/** Attaches req.userId / req.userRole for a valid bearer token. 401s otherwise. */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Sign in required" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.deletedAt) return res.status(401).json({ error: "Sign in required" });
    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch {
    return res.status(401).json({ error: "Sign in required" });
  }
};

/** Must follow requireAuth. Only studio staff (owner/desk) may proceed. */
export const requireStaff: RequestHandler = (req, res, next) => {
  if (req.userRole === "owner" || req.userRole === "desk") return next();
  return res.status(403).json({ error: "Staff access required" });
};
