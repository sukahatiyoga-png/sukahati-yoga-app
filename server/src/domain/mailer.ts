import { db } from "../db";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Hardcoded fallback so this keeps working even if the Render env var
// for the recipient never gets set — mirrors the owner-role fallback in seed.ts.
const OWNER_NOTIFY_EMAIL = process.env.OWNER_NOTIFY_EMAIL || "sukahatiyoga@gmail.com";
const FROM = "Sukahati Yoga <onboarding@resend.dev>";

async function sendMail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email:", subject);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      console.error("Email failed:", res.status, await res.text());
    }
  } catch (e) {
    console.error("Email failed:", e);
  }
}

export async function notifyOwner(subject: string, html: string) {
  await sendMail(OWNER_NOTIFY_EMAIL, subject, html);
}

// Emails a customer directly, respecting their notification preference —
// a no-op if they've turned email off or no preferences row exists for them.
export async function notifyCustomer(userId: string, subject: string, html: string) {
  const user = await db.user.findUnique({ where: { id: userId }, include: { preferences: true } });
  if (!user || user.preferences?.emailEnabled === false) return;
  await sendMail(user.email, subject, wrapCustomerEmail(user.fullName, html));
}

function wrapCustomerEmail(name: string, bodyHtml: string): string {
  return `<div style="font-family:sans-serif;color:#2b2620;max-width:480px">
    <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#a05a3d;font-weight:700">Sukahati Yoga</div>
    <p>Hi ${name.split(" ")[0]},</p>
    ${bodyHtml}
    <p style="margin-top:24px;font-size:12px;color:#8a8073">Sukahati Yoga · Kuala Lumpur</p>
  </div>`;
}
