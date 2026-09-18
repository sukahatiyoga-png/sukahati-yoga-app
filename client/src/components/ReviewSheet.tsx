import { useState } from "react";
import Sheet from "./Sheet";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";

export default function ReviewSheet({ bookingId, title, onDone }: { bookingId: string; title: string; onDone: () => void }) {
  const { closeSheet, flash } = useApp();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api.reviews.create({ bookingId, rating, comment: comment.trim() || undefined });
      flash("Thanks for your review!");
      onDone();
      closeSheet();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not submit review");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={closeSheet}>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 22, lineHeight: 1.2 }}>Rate & review</div>
      <div style={{ fontSize: 13.5, color: "var(--color-neutral-700)", marginTop: 4 }}>{title}</div>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 22 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n} type="button" onClick={() => setRating(n)}
            style={{ border: 0, background: "none", cursor: "pointer", padding: 4, color: n <= rating ? "var(--color-accent-500)" : "var(--color-neutral-300)" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill={n <= rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
              <path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2Z" />
            </svg>
          </button>
        ))}
      </div>

      <div className="field" style={{ marginTop: 20 }}>
        <label htmlFor="rv-comment">Your review (optional)</label>
        <textarea
          className="input" id="rv-comment" style={{ borderRadius: "var(--radius-md)", minHeight: 90, padding: "12px 16px", resize: "vertical" }}
          value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was your practice?"
        />
      </div>

      <button className="btn btn-primary btn-block" style={{ marginTop: 20, padding: "15px 0" }} disabled={busy} onClick={submit}>
        {busy ? "Submitting…" : "Submit review"}
      </button>
      <button className="btn btn-ghost btn-block" style={{ marginTop: 8, padding: "13px 0" }} onClick={closeSheet}>Cancel</button>
    </Sheet>
  );
}
