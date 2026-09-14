const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Hardcoded fallback so this keeps working even if the Render env var
// for the recipient never gets set — mirrors the owner-role fallback in seed.ts.
const OWNER_NOTIFY_EMAIL = process.env.OWNER_NOTIFY_EMAIL || "sukahatiyoga@gmail.com";
const FROM = "Sukahati Yoga <onboarding@resend.dev>";

export async function notifyOwner(subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping owner email notification:", subject);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [OWNER_NOTIFY_EMAIL], subject, html }),
    });
    if (!res.ok) {
      console.error("Owner notification email failed:", res.status, await res.text());
    }
  } catch (e) {
    console.error("Owner notification email failed:", e);
  }
}
