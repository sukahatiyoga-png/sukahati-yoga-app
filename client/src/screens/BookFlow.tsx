import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api, type Addon, type Pkg, type SessionSlot, type BookingCustomer } from "../lib/api";
import { money } from "../lib/format";
import { buildDays, type DayOption } from "../lib/dates";
import { sectionLabel } from "../styles/shared";
import QrGraphic from "../components/QrGraphic";

export interface BookDraft {
  step: 1 | 2 | 3 | "done";
  dayId: string;
  sessionId: string | null;
  packageId: string | null;
  level: string;
  guests: number;
  addonIds: string[];
  notes: string;
  promo: string;
  promoOk: boolean;
  promoMsg: string;
  payMode: "full" | "deposit" | "studio";
  method: string;
  bookingResult: BookingCustomer | null;
}

export function initialDraft(preset?: { sessionId?: string; packageId?: string; dayId?: string }): BookDraft {
  return {
    step: preset?.sessionId ? 2 : 1,
    dayId: preset?.dayId || buildDays(1)[0].id,
    sessionId: preset?.sessionId || null,
    packageId: preset?.packageId || null,
    level: "Beginner", guests: 1, addonIds: [], notes: "",
    promo: "", promoOk: false, promoMsg: "",
    payMode: "full", method: "Card",
    bookingResult: null,
  };
}

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const METHODS = ["Card", "FPX", "GrabPay", "Apple Pay"];

interface Quote { subtotalMinor: number; addonsTotalMinor: number; discountMinor: number; totalMinor: number; depositMinor: number; couponValid: boolean; couponMessage: string; cancelLabel: string }

export default function BookFlow({ draft, setDraft, onDone }: { draft: BookDraft; setDraft: (fn: (d: BookDraft) => BookDraft) => void; onDone: () => void }) {
  const { me, flash, goTab } = useApp();
  const days = buildDays(7);
  const [slots, setSlots] = useState<SessionSlot[]>([]);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.sessions({ date: draft.dayId }).then(setSlots); }, [draft.dayId]);
  useEffect(() => { api.packages().then((list) => setPackages(list.sort((a, b) => a.sortOrder - b.sortOrder))); api.addons().then(setAddons); }, []);

  useEffect(() => {
    if (draft.step !== 3 || !draft.packageId) return;
    api.quote({ packageId: draft.packageId, guestCount: draft.guests, addonIds: draft.addonIds, couponCode: draft.promoOk ? draft.promo : undefined })
      .then(setQuote).catch(() => setQuote(null));
  }, [draft.step, draft.packageId, draft.guests, draft.addonIds, draft.promoOk, draft.promo]);

  const selectedDay = days.find((d) => d.id === draft.dayId) || days[0];
  const selectedSlot = slots.find((s) => s.id === draft.sessionId) || null;
  const selectedPkg = packages.find((p) => p.id === draft.packageId) || null;

  function back() {
    if (draft.step === 1) return goTab("home");
    setDraft((d) => ({ ...d, step: (d.step === 3 ? 2 : 1) as 1 | 2 }));
  }

  function toggleAddon(id: string) {
    setDraft((d) => ({ ...d, addonIds: d.addonIds.includes(id) ? d.addonIds.filter((x) => x !== id) : [...d.addonIds, id] }));
  }

  async function applyPromo() {
    if (!draft.packageId) return;
    const q = await api.quote({ packageId: draft.packageId, guestCount: draft.guests, addonIds: draft.addonIds, couponCode: draft.promo });
    setDraft((d) => ({ ...d, promoOk: q.couponValid, promoMsg: q.couponMessage }));
    flash(q.couponMessage);
  }

  async function submit() {
    if (!draft.packageId) return;
    setSubmitting(true);
    try {
      const result = await api.createBooking({
        userId: me.id, packageId: draft.packageId, sessionId: draft.sessionId, guestCount: draft.guests,
        level: draft.level, specialRequests: draft.notes, addonIds: draft.addonIds,
        couponCode: draft.promoOk ? draft.promo : undefined, payMode: draft.payMode, method: draft.method,
      });
      setDraft((d) => ({ ...d, step: "done", bookingResult: result }));
      onDone();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not complete the booking");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (draft.step === 1) {
      if (!draft.sessionId) return;
      setDraft((d) => ({ ...d, step: 2 }));
    } else if (draft.step === 2) {
      if (!draft.packageId) return;
      setDraft((d) => ({ ...d, step: 3 }));
    } else if (draft.step === 3) {
      submit();
    }
  }

  const ready = draft.step === 1 ? !!draft.sessionId : draft.step === 2 ? !!draft.packageId : true;
  const stepTitle = { 1: "Pick a date", 2: "Package and guests", 3: "Payment" }[draft.step === "done" ? 1 : draft.step];
  const dueNow = quote ? (draft.payMode === "deposit" ? quote.depositMinor : draft.payMode === "studio" ? 0 : quote.totalMinor) : 0;
  const ctaLabel = draft.step === 1 ? "Choose package" : draft.step === 2 ? "Continue to payment"
    : draft.payMode === "studio" ? "Confirm booking" : `Pay ${money(dueNow)}`;

  if (draft.step === "done" && draft.bookingResult) {
    const b = draft.bookingResult;
    return (
      <div style={{ height: "100%", overflow: "auto", padding: "58px 20px 28px", boxSizing: "border-box" }}>
        <div style={{ paddingTop: 30, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ width: 96, height: 96, borderRadius: 999, background: "var(--color-accent-2-300)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-2-800)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 29, lineHeight: 1.1, marginTop: 20 }}>Booking confirmed</div>
          <div style={{ fontSize: 14, color: "var(--color-neutral-700)", marginTop: 9, maxWidth: 250, lineHeight: 1.5 }}>
            {b.balanceMinor === null || b.balanceMinor === 0
              ? `Paid by ${draft.method}. Receipt emailed to you.`
              : `${money(b.balanceMinor)} to settle when you arrive.`}
          </div>

          <div style={{ width: "100%", marginTop: 22, background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: 20, textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{b.title}</div>
            <div style={{ fontSize: 13, color: "var(--color-neutral-700)", marginTop: 4 }}>{selectedDay.label} · {selectedPkg?.name || draft.packageId} · {draft.guests} guest(s)</div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
              <QrGraphic size={150} />
            </div>
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--color-neutral-700)", marginTop: 12 }}>Show this at the door · booking {b.ref}</div>
          </div>

          <button className="btn btn-primary btn-block" style={{ marginTop: 18, padding: "15px 0" }} onClick={() => goTab("bookings")}>My bookings</button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 8, padding: "13px 0" }} onClick={() => goTab("home")}>Back to home</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflow: "auto", padding: "58px 20px 28px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={{ flex: "none", width: 40, height: 40, borderRadius: 999, border: 0, background: "var(--color-neutral-100)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)" }} onClick={back}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Step {draft.step} of 3</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 23, lineHeight: 1.15, marginTop: 3 }}>{stepTitle}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
          <div style={{ flex: 1, height: 5, borderRadius: 999, background: "var(--color-accent-500)" }} />
          <div style={{ flex: 1, height: 5, borderRadius: 999, background: draft.step === 2 || draft.step === 3 ? "var(--color-accent-500)" : "var(--color-accent-300)" }} />
          <div style={{ flex: 1, height: 5, borderRadius: 999, background: draft.step === 3 ? "var(--color-accent-500)" : "var(--color-accent-300)" }} />
        </div>

        {draft.step === 1 && (
          <Step1 days={days} draft={draft} setDraft={setDraft} slots={slots} me={me} flash={flash} />
        )}
        {draft.step === 2 && (
          <Step2 draft={draft} setDraft={setDraft} packages={packages} addons={addons} toggleAddon={toggleAddon} />
        )}
        {draft.step === 3 && (
          <Step3 draft={draft} setDraft={setDraft} quote={quote} selectedDay={selectedDay} selectedSlot={selectedSlot} selectedPkg={selectedPkg} applyPromo={applyPromo} />
        )}
      </div>

      <div style={{ flex: "none", background: "var(--color-neutral-100)", borderTop: "1px solid var(--color-divider)", borderRadius: "26px 26px 0 0", padding: "16px 20px 34px" }}>
        <button className="btn btn-primary btn-block" style={{ padding: "16px 0", fontSize: 16, opacity: ready && !submitting ? 1 : 0.45, pointerEvents: ready && !submitting ? "auto" : "none" }} onClick={next}>
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

function Step1({ days, draft, setDraft, slots, me, flash }: {
  days: DayOption[]; draft: BookDraft; setDraft: (fn: (d: BookDraft) => BookDraft) => void; slots: SessionSlot[];
  me: { id: string }; flash: (m: string) => void;
}) {
  return (
    <>
      <div style={{ marginTop: 22, ...sectionLabel }}>{days[0].date.toLocaleDateString("en-MY", { month: "long", year: "numeric" })}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 11, overflow: "auto", paddingBottom: 4 }}>
        {days.map((d) => (
          <button
            key={d.id}
            onClick={() => setDraft((s) => ({ ...s, dayId: d.id, sessionId: null }))}
            style={{ flex: "none", width: 54, border: 0, borderRadius: 20, padding: "11px 0", cursor: "pointer", fontFamily: "var(--font-body)", textAlign: "center", background: draft.dayId === d.id ? "var(--color-accent-500)" : "var(--color-neutral-100)", color: draft.dayId === d.id ? "#fff" : "var(--color-text)" }}
          >
            <div style={{ fontSize: 10.5, letterSpacing: "0.06em", opacity: 0.78 }}>{d.dow}</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 19, lineHeight: 1.2, marginTop: 3 }}>{d.num}</div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 22, ...sectionLabel }}>Time slot · live capacity</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 11 }}>
        {slots.map((s) => (
          <div
            key={s.id}
            onClick={() => (s.spots > 0 ? setDraft((d) => ({ ...d, sessionId: s.id })) : api.waitlist(s.id, me.id).then(() => flash("Added to the waitlist for " + s.title)))}
            style={{ borderRadius: "var(--radius-md)", padding: "14px 16px", display: "flex", gap: 13, alignItems: "center", background: draft.sessionId === s.id ? "var(--color-accent-200)" : "var(--color-neutral-100)", cursor: "pointer" }}
          >
            <div style={{ flex: "none", width: 56 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{s.time}</div>
              <div style={{ fontSize: 11, color: "var(--color-neutral-600)", letterSpacing: "0.06em" }}>{s.ampm}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0, borderLeft: "2px solid var(--color-accent-300)", paddingLeft: 13 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{s.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 2 }}>{s.teacher}</div>
            </div>
            {s.spots > 0 ? (
              <span className="tag tag-outline" style={{ flex: "none" }}>{s.spots} left</span>
            ) : (
              <button className="btn btn-ghost" style={{ flex: "none", padding: "7px 12px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); api.waitlist(s.id, me.id).then(() => flash("Added to the waitlist for " + s.title)); }}>Waitlist</button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function Step2({ draft, setDraft, packages, addons, toggleAddon }: {
  draft: BookDraft; setDraft: (fn: (d: BookDraft) => BookDraft) => void; packages: Pkg[]; addons: Addon[]; toggleAddon: (id: string) => void;
}) {
  return (
    <>
      <div style={{ marginTop: 22, ...sectionLabel }}>Package</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 11 }}>
        {packages.map((p) => (
          <button
            key={p.id}
            onClick={() => setDraft((d) => ({ ...d, packageId: p.id }))}
            style={{ border: 0, textAlign: "left", cursor: "pointer", fontFamily: "var(--font-body)", borderRadius: "var(--radius-md)", padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", background: draft.packageId === p.id ? "var(--color-accent-200)" : "var(--color-neutral-100)" }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.25 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 3 }}>{p.unit}</div>
            </div>
            <div style={{ flex: "none", fontFamily: "var(--font-heading)", fontSize: 17 }}>{money(p.priceMinor, p.currency === "MYR" ? "RM" : p.currency)}</div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 22, ...sectionLabel }}>Level</div>
      <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setDraft((d) => ({ ...d, level: l }))}
            style={{ flex: 1, border: 0, borderRadius: 999, padding: "12px 0", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, background: draft.level === l ? "var(--color-accent-500)" : "var(--color-neutral-100)", color: draft.level === l ? "#fff" : "var(--color-text)" }}
          >
            {l}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 20, background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>Guests</div>
          <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>Places held under your name</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
          <button style={{ width: 34, height: 34, borderRadius: 999, border: 0, background: "var(--color-neutral-200)", cursor: "pointer", fontSize: 18, fontWeight: 700, color: "var(--color-text)" }} onClick={() => setDraft((d) => ({ ...d, guests: Math.max(1, d.guests - 1) }))}>−</button>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, minWidth: 18, textAlign: "center" }}>{draft.guests}</div>
          <button style={{ width: 34, height: 34, borderRadius: 999, border: 0, background: "var(--color-accent-500)", cursor: "pointer", fontSize: 18, fontWeight: 700, color: "#fff" }} onClick={() => setDraft((d) => ({ ...d, guests: Math.min(6, d.guests + 1) }))}>+</button>
        </div>
      </div>

      <div style={{ marginTop: 22, ...sectionLabel }}>Add-ons</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 11 }}>
        {addons.map((a) => {
          const on = draft.addonIds.includes(a.id);
          return (
            <button key={a.id} onClick={() => toggleAddon(a.id)} style={{ border: 0, textAlign: "left", cursor: "pointer", fontFamily: "var(--font-body)", borderRadius: "var(--radius-md)", padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", background: on ? "var(--color-accent-200)" : "var(--color-neutral-100)" }}>
              <div style={{ flex: "none", width: 24, height: 24, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: on ? "var(--color-accent-500)" : "var(--color-neutral-300)", color: "#fff" }}>
                {on && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{a.name}</div>
              <div style={{ flex: "none", fontSize: 13.5, fontWeight: 600, color: "var(--color-neutral-700)" }}>+ {money(a.priceMinor)}</div>
            </button>
          );
        })}
      </div>

      <div className="field" style={{ marginTop: 20 }}>
        <label htmlFor="req">Special requests</label>
        <input className="input" id="req" placeholder="Injuries, first time, timezone" value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
      </div>
    </>
  );
}

function Step3({ draft, setDraft, quote, selectedDay, selectedSlot, selectedPkg, applyPromo }: {
  draft: BookDraft; setDraft: (fn: (d: BookDraft) => BookDraft) => void; quote: Quote | null;
  selectedDay: DayOption; selectedSlot: SessionSlot | null; selectedPkg: Pkg | null; applyPromo: () => void;
}) {
  const payModes: { id: BookDraft["payMode"]; name: string; note: string; amountMinor: number }[] = quote ? [
    { id: "full", name: "Pay in full now", note: "Confirmed instantly", amountMinor: quote.totalMinor },
    { id: "deposit", name: "Deposit 50%", note: "Balance due before the class", amountMinor: quote.depositMinor },
    { id: "studio", name: "Pay at the studio", note: "Place held for 12 hours", amountMinor: 0 },
  ] : [];

  return (
    <>
      <div style={{ marginTop: 22, background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        {[
          ["Date", selectedDay.label],
          ["Class", selectedSlot ? `${selectedSlot.title} · ${selectedSlot.time} ${selectedSlot.ampm}` : "—"],
          ["Package", selectedPkg?.name || "—"],
          ["Guests · level", `${draft.guests} · ${draft.level}`],
        ].map(([label, value], i, arr) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--color-divider)" : "none", fontSize: 13.5 }}>
            <span style={{ color: "var(--color-neutral-700)" }}>{label}</span>
            <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, ...sectionLabel }}>Promo code</div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input className="input" style={{ flex: 1 }} placeholder="EARLYBIRD" value={draft.promo} onChange={(e) => setDraft((d) => ({ ...d, promo: e.target.value, promoOk: false }))} />
        <button className="btn btn-secondary" style={{ flex: "none", padding: "12px 18px", fontSize: 13.5 }} onClick={applyPromo}>Apply</button>
      </div>
      {draft.promoOk && <div style={{ marginTop: 9, fontSize: 12.5, fontWeight: 600, color: "var(--color-accent-2-700)" }}>{draft.promoMsg}</div>}

      <div style={{ marginTop: 22, ...sectionLabel }}>How much to pay now</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 11 }}>
        {payModes.map((m) => (
          <button key={m.id} onClick={() => setDraft((d) => ({ ...d, payMode: m.id }))} style={{ border: 0, textAlign: "left", cursor: "pointer", fontFamily: "var(--font-body)", borderRadius: "var(--radius-md)", padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", background: draft.payMode === m.id ? "var(--color-accent-200)" : "var(--color-neutral-100)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>{m.note}</div>
            </div>
            <div style={{ flex: "none", fontFamily: "var(--font-heading)", fontSize: 17 }}>{money(m.amountMinor)}</div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 22, ...sectionLabel }}>Payment method</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 11 }}>
        {METHODS.map((m) => (
          <button key={m} onClick={() => setDraft((d) => ({ ...d, method: m }))} style={{ border: 0, borderRadius: 999, padding: "11px 17px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, background: draft.method === m ? "var(--color-accent-500)" : "var(--color-neutral-100)", color: draft.method === m ? "#fff" : "var(--color-text)" }}>{m}</button>
        ))}
      </div>

      {quote && (
        <div style={{ marginTop: 22, background: "var(--color-accent-200)", borderRadius: "var(--radius-lg)", padding: "6px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--color-accent-300)", fontSize: 13.5 }}>
            <span style={{ color: "var(--color-accent-800)" }}>{selectedPkg?.name} × {draft.guests}</span><span style={{ fontWeight: 600 }}>{money(quote.subtotalMinor)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--color-accent-300)", fontSize: 13.5 }}>
            <span style={{ color: "var(--color-accent-800)" }}>Add-ons</span><span style={{ fontWeight: 600 }}>{money(quote.addonsTotalMinor)}</span>
          </div>
          {draft.promoOk && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--color-accent-300)", fontSize: 13.5 }}>
              <span style={{ color: "var(--color-accent-800)" }}>Discount</span><span style={{ fontWeight: 600 }}>−{money(quote.discountMinor)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "13px 0" }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-accent-800)" }}>Due now</span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 23 }}>{money(draft.payMode === "deposit" ? quote.depositMinor : draft.payMode === "studio" ? 0 : quote.totalMinor)}</span>
          </div>
        </div>
      )}
      <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 10, lineHeight: 1.5 }}>
        {quote?.cancelLabel || "Free cancellation up to 12 hours before the class."} Receipts are emailed and stored under your profile.
      </div>
    </>
  );
}
