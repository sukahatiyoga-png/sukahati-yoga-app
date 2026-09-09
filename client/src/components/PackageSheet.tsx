import { useEffect, useState } from "react";
import Sheet from "./Sheet";
import { useApp } from "../context/AppContext";
import { api, type Pkg } from "../lib/api";
import { money } from "../lib/format";

export default function PackageSheet({ id, onBook }: { id: string; onBook: (packageId: string) => void }) {
  const { closeSheet } = useApp();
  const [pkg, setPkg] = useState<Pkg | null>(null);

  useEffect(() => { api.package(id).then(setPkg).catch(() => setPkg(null)); }, [id]);

  if (!pkg) return <Sheet onClose={closeSheet}><div style={{ padding: 20, textAlign: "center", color: "var(--color-neutral-600)" }}>Loading…</div></Sheet>;

  return (
    <Sheet onClose={closeSheet}>
      {pkg.recommended && <span className="tag tag-accent" style={{ marginBottom: 10 }}>{pkg.badge}</span>}
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 26, lineHeight: 1.12 }}>{pkg.name}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 11 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 31 }}>{money(pkg.priceMinor, pkg.currency === "MYR" ? "RM" : pkg.currency)}</div>
        <div style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>{pkg.unit}</div>
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--color-neutral-800)", marginTop: 13 }}>{pkg.long}</div>

      <div style={{ marginTop: 18, background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        {[
          ["Good for", pkg.goodFor],
          ["Valid", pkg.valid],
          ["Capacity", pkg.capacity],
          ["Cancellation", pkg.cancel],
        ].map(([label, value], i, arr) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--color-divider)" : "none", fontSize: 13.5 }}>
            <span style={{ color: "var(--color-neutral-700)" }}>{label}</span>
            <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
          </div>
        ))}
      </div>

      {pkg.retreat && (
        <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--color-accent-700)", fontWeight: 600 }}>
          {pkg.retreat.placesLeft} places left
          {pkg.retreat.earlyBirdSaveMinor > 0 && ` · early bird saves ${money(pkg.retreat.earlyBirdSaveMinor)}`}
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Included</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--color-neutral-800)", marginTop: 7 }}>{pkg.incl.join(" · ")}</div>
      <div style={{ marginTop: 14, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-neutral-600)" }}>Not included</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--color-neutral-700)", marginTop: 7 }}>{pkg.excl.join(" · ")}</div>

      <button className="btn btn-primary btn-block" style={{ marginTop: 20, padding: "15px 0" }} onClick={() => onBook(pkg.id)}>Book with this package</button>
      <button className="btn btn-ghost btn-block" style={{ marginTop: 8, padding: "13px 0" }} onClick={closeSheet}>Close</button>
    </Sheet>
  );
}
