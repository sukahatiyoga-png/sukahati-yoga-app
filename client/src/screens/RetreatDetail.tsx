import { useEffect, useState } from "react";
import { api, type Pkg, type Review } from "../lib/api";
import { money } from "../lib/format";
import Countdown from "../components/Countdown";

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-700)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}><path d={icon} /></svg>
      <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 7 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "var(--color-neutral-600)", marginTop: 1 }}>{label}</div>
    </div>
  );
}

export default function RetreatDetail({ id, onBook, onClose }: { id: string; onBook: (packageId: string) => void; onClose: () => void }) {
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => { api.package(id).then(setPkg).catch(() => setPkg(null)); }, [id]);
  useEffect(() => { api.reviews.list(id).then(setReviews).catch(() => {}); }, [id]);

  if (!pkg) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-neutral-600)" }}>
        Loading…
      </div>
    );
  }

  const r = pkg.retreat;
  const dateLabel = r
    ? `${new Date(r.startsOn).toLocaleDateString("en-MY", { month: "short", day: "numeric" })} – ${new Date(r.endsOn).toLocaleDateString("en-MY", { day: "numeric" })}`
    : "";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "var(--color-bg)", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ position: "relative", height: 260, background: pkg.imageUrl ? `url(${pkg.imageUrl})` : "linear-gradient(135deg, var(--color-accent-400), var(--color-accent-2-600))", backgroundSize: "cover", backgroundPosition: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, var(--color-bg) 100%)" }} />
          <button
            onClick={onClose}
            style={{ position: "absolute", top: 18, left: 18, width: 38, height: 38, borderRadius: 999, border: 0, background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
          </button>
        </div>

        <div style={{ padding: "18px 20px 0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Retreat</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 26, lineHeight: 1.15, marginTop: 5 }}>{pkg.name}</div>
          {pkg.reviewCount > 0 ? (
            <div style={{ fontSize: 13, color: "var(--color-neutral-700)", marginTop: 6 }}>★ {pkg.reviewAvg} ({pkg.reviewCount} review{pkg.reviewCount === 1 ? "" : "s"})</div>
          ) : pkg.rating ? (
            <div style={{ fontSize: 13, color: "var(--color-neutral-700)", marginTop: 6 }}>★ {pkg.rating}</div>
          ) : null}

          {r && (
            <div style={{ marginTop: 18, background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "16px 8px", display: "flex" }}>
              <Stat icon="M8 3v4M16 3v4M3.5 9h17M5 5.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" label="Dates" value={dateLabel} />
              <Stat icon="M4 21V9l8-6 8 6v12M9 21v-6h6v6" label="Check-in" value={r.checkInAt} />
              <Stat icon="M12 8v4l3 3M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" label="Duration" value={pkg.dur || "—"} />
              <Stat icon="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" label="Places left" value={String(r.placesLeft)} />
            </div>
          )}

          {r?.earlyBirdSaveMinor ? (
            <div style={{ marginTop: 14 }}>
              <span className="tag tag-accent">Early bird · save {money(r.earlyBirdSaveMinor)}</span>
            </div>
          ) : null}

          {pkg.long && <div style={{ fontSize: 13.5, color: "var(--color-neutral-800)", lineHeight: 1.6, marginTop: 18 }}>{pkg.long}</div>}

          {pkg.incl.length > 0 && (
            <>
              <div style={{ marginTop: 22, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>What's included</div>
              <div style={{ marginTop: 10 }}>
                {pkg.incl.map((item, i) => (
                  <div key={item} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingLeft: 4, position: "relative" }}>
                    <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 22, height: 22, borderRadius: 999, background: "var(--color-accent-500)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      </div>
                      {i < pkg.incl.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 18, background: "var(--color-accent-200)", marginTop: 2 }} />}
                    </div>
                    <div style={{ paddingBottom: 16, fontSize: 13.5, paddingTop: 2 }}>{item}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {pkg.excl.length > 0 && (
            <div style={{ fontSize: 12.5, color: "var(--color-neutral-600)", marginTop: 6 }}>
              <span style={{ fontWeight: 700 }}>Not included: </span>{pkg.excl.join(" · ")}
            </div>
          )}

          {pkg.cancel && <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 18, lineHeight: 1.5 }}>{pkg.cancel}</div>}

          {reviews.length > 0 && (
            <>
              <div style={{ marginTop: 26, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Reviews</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
                {reviews.map((r) => (
                  <div key={r.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{r.authorName}</span>
                      <span style={{ fontSize: 12, color: "var(--color-accent-600)" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    </div>
                    {r.comment && <div style={{ fontSize: 13, color: "var(--color-neutral-800)", marginTop: 4, lineHeight: 1.5 }}>{r.comment}</div>}
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ height: 110 }} />
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "var(--color-neutral-900)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>Total price</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 21, color: "#fff" }}>{money(pkg.priceMinor)}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}> /person</span></div>
        </div>
        <button
          onClick={() => onBook(pkg.id)}
          style={{ border: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, background: "var(--color-accent-500)", color: "#fff", fontWeight: 700, fontSize: 14.5, padding: "13px 22px", borderRadius: 999 }}
        >
          Book Now
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
        </button>
      </div>
      {r && <div style={{ position: "absolute", top: 18, right: 18, background: "rgba(0,0,0,0.35)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "6px 11px", borderRadius: 999 }}><Countdown startsAt={r.startsOn} /></div>}
    </div>
  );
}
