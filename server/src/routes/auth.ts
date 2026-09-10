import { Router } from "express";
import { db } from "../db";
import { hashPassword, verifyPassword, signToken } from "../domain/auth";
import { genReferralCode } from "../domain/enums";

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required" });
  if (String(password).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return res.status(409).json({ error: "An account with that email already exists" });

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      fullName: name, email: normalizedEmail, phoneE164: phone || "",
      passwordHash, authProvider: "email", role: "customer",
      referralCode: genReferralCode(name),
      preferences: { create: {} },
    },
  });
  res.status(201).json({ token: signToken(user.id), userId: user.id });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }
  if (user.deletedAt) return res.status(401).json({ error: "This account has been deactivated" });
  res.json({ token: signToken(user.id), userId: user.id });
});
