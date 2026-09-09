import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api, type Pkg } from "../lib/api";
import { money } from "../lib/format";
import { screenPad, kicker, h1 } from "../styles/shared";

export default function Packages() {
  const { openPackageSheet } = useApp();
  const [packages, setPackages] = useState<Pkg[]>([]);

  useEffect(() => { api.packages().then((list) => setPackages(list.sort((a, b) => a.sortOrder - b.sortOrder))); }, []);

  return (
    <div style={screenPad}>
      <div style={kicker}>Choose your practice</div>
      <h1 style={{ ...h1, margin: "10px 0 6px" }}>Packages</h1>
      <div style={{ fontSize: 14.5, color: "var(--color-neutral-700)", maxWidth: 280 }}>Every option on the booking form, from a single drop-in to the October retreat.</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 22 }}>
        {packages.map((p) => (
          <div key={p.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: 20, boxShadow: "var(--shadow-sm)", cursor: "pointer" }} onClick={() => openPackageSheet(p.id)}>
            {p.recommended && <span className="tag tag-accent" style={{ marginBottom: 10 }}>{p.badge}</span>}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 19, lineHeight: 1.2 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: "var(--color-neutral-700)", marginTop: 6, lineHeight: 1.45 }}>{p.desc}</div>
              </div>
              <div style={{ flex: "none", textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 23, lineHeight: 1 }}>{money(p.priceMinor, p.currency === "MYR" ? "RM" : p.currency)}</div>
                <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)", marginTop: 4 }}>{p.unit}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 15, paddingTop: 13, borderTop: "1px solid var(--color-divider)" }}>
              <div style={{ flex: 1, fontSize: 12, color: "var(--color-neutral-700)" }}>{p.incl.join(" · ")}</div>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-600)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="m9 6 6 6-6 6" /></svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
