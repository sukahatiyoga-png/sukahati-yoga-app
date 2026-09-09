import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api, type SessionSlot } from "../lib/api";
import { money } from "../lib/format";
import { buildDays } from "../lib/dates";
import { screenPad, kicker, h1, h2, sectionLabel } from "../styles/shared";

const CATS = ["Flow", "Hatha", "Yin", "Private", "Online", "Retreat"];
const PRICES = ["Any price", "Under 100", "100 – 400", "400 and up"];
const DURATIONS = ["Any length", "60 min", "75 min", "Multi-day"];

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ border: 0, borderRadius: 999, padding: "9px 15px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, background: active ? "var(--color-accent-500)" : "var(--color-neutral-100)", color: active ? "#fff" : "var(--color-text)" }}
    >
      {children}
    </button>
  );
}

export default function Search() {
  const { me, goBook, flash } = useApp();
  const days = buildDays(7);
  const [query, setQuery] = useState("");
  const [dayId, setDayId] = useState(days[0].id);
  const [cat, setCat] = useState<string | null>(null);
  const [price, setPrice] = useState("Any price");
  const [duration, setDuration] = useState("Any length");
  const [availOnly, setAvailOnly] = useState(true);
  const [results, setResults] = useState<SessionSlot[]>([]);

  useEffect(() => {
    api.sessions({
      date: dayId, q: query || undefined, category: cat || undefined,
      price: price === "Any price" ? undefined : price,
      duration: duration === "Any length" ? undefined : duration,
      availableOnly: availOnly ? "1" : undefined,
    }).then(setResults);
  }, [dayId, query, cat, price, duration, availOnly]);

  const selectedDay = days.find((d) => d.id === dayId)!;

  return (
    <div style={screenPad}>
      <div style={kicker}>Find a session</div>
      <h1 style={{ ...h1, marginBottom: 16 }}>Search</h1>

      <div className="field">
        <label htmlFor="q">Class, teacher or retreat</label>
        <input className="input" id="q" placeholder='Try "yin" or "Dewi"' value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div style={{ marginTop: 20, ...sectionLabel }}>Date</div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, overflow: "auto", paddingBottom: 4 }}>
        {days.map((d) => (
          <button
            key={d.id}
            onClick={() => setDayId(d.id)}
            style={{ flex: "none", width: 54, border: 0, borderRadius: 20, padding: "11px 0", cursor: "pointer", fontFamily: "var(--font-body)", textAlign: "center", background: dayId === d.id ? "var(--color-accent-500)" : "var(--color-neutral-100)", color: dayId === d.id ? "#fff" : "var(--color-text)" }}
          >
            <div style={{ fontSize: 10.5, letterSpacing: "0.06em", opacity: 0.78 }}>{d.dow}</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 19, lineHeight: 1.2, marginTop: 3 }}>{d.num}</div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20, ...sectionLabel }}>Category</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {CATS.map((c) => (
          <Pill key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>{c}</Pill>
        ))}
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={sectionLabel}>Price</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 10 }}>
            {PRICES.map((p) => (
              <button key={p} onClick={() => setPrice(p)} style={{ border: 0, borderRadius: 999, padding: "9px 0", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, background: price === p ? "var(--color-accent-500)" : "var(--color-neutral-100)", color: price === p ? "#fff" : "var(--color-text)" }}>{p}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={sectionLabel}>Duration</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 10 }}>
            {DURATIONS.map((d) => (
              <button key={d} onClick={() => setDuration(d)} style={{ border: 0, borderRadius: 999, padding: "9px 0", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, background: duration === d ? "var(--color-accent-500)" : "var(--color-neutral-100)", color: duration === d ? "#fff" : "var(--color-text)" }}>{d}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 22, padding: "14px 16px", background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)" }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>Only show places available</div>
        <button
          onClick={() => setAvailOnly((v) => !v)}
          style={{ flex: "none", width: 50, height: 29, borderRadius: 999, border: 0, background: availOnly ? "var(--color-accent-2-500)" : "var(--color-neutral-300)", padding: 3, display: "flex", justifyContent: availOnly ? "flex-end" : "flex-start", cursor: "pointer" }}
        >
          <span style={{ width: 23, height: 23, borderRadius: 999, background: "#fff", display: "block" }} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}>
        <h2 style={h2}>{results.length} results</h2>
        <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => { setCat(null); setPrice("Any price"); setDuration("Any length"); setQuery(""); }}>Clear</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {results.map((r) => (
          <div key={r.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "15px 16px" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15.5, lineHeight: 1.2 }}>{r.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 3 }}>{selectedDay.label} · {r.time} {r.ampm} · {r.teacher}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
                  <span className="tag tag-outline">{r.cat}</span>
                  <span className="tag tag-neutral">{r.rating}</span>
                </div>
              </div>
              <div style={{ flex: "none", textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 19, lineHeight: 1 }}>{money(r.price)}</div>
                <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)", marginTop: 3 }}>{r.dur}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 13, paddingTop: 12, borderTop: "1px solid var(--color-divider)" }}>
              {r.spots > 0 ? (
                <>
                  <span style={{ flex: 1, fontSize: 12, color: "var(--color-accent-2-700)", fontWeight: 600 }}>{r.spots} places left</span>
                  <button className="btn btn-primary" style={{ flex: "none", padding: "8px 16px", fontSize: 12.5 }} onClick={() => goBook({ sessionId: r.id, packageId: undefined, dayId })}>Book</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 12, color: "var(--color-neutral-700)", fontWeight: 600 }}>Fully booked</span>
                  <button className="btn btn-secondary" style={{ flex: "none", padding: "8px 16px", fontSize: 12.5 }} onClick={() => api.waitlist(r.id, me.id).then(() => flash("Added to the waitlist for " + r.title))}>Join waitlist</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
