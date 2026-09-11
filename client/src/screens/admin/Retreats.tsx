import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { api, type RetreatInput, type RetreatItem } from "../../lib/api";
import { money } from "../../lib/format";

export default function Retreats() {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  if (editingId) return <RetreatForm id={editingId === "new" ? null : editingId} onDone={() => setEditingId(null)} />;
  return <RetreatList onSelect={setEditingId} />;
}

function RetreatList({ onSelect }: { onSelect: (id: string | "new") => void }) {
  const [retreats, setRetreats] = useState<RetreatItem[]>([]);
  useEffect(() => { api.adminRetreats.list().then(setRetreats); }, []);

  return (
    <>
      <div style={{ fontSize: 13.5, color: "var(--color-neutral-700)", marginTop: 4, marginBottom: 16 }}>
        Retreats are tracked separately from single-class packages — dates, room capacity and early-bird pricing all live here.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {retreats.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No retreats yet.</div>}
        {retreats.map((r) => (
          <div key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: "pointer", background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: 18, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>{r.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 4 }}>
                  {new Date(r.startsOn).toDateString()} – {new Date(r.endsOn).toDateString()}
                </div>
              </div>
              <div style={{ flex: "none", textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>{money(r.priceMinor, r.currency === "MYR" ? "RM" : r.currency)}</div>
                <div style={{ fontSize: 11, color: "var(--color-neutral-600)", marginTop: 3 }}>per person</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 13, paddingTop: 12, borderTop: "1px solid var(--color-divider)" }}>
              <span className="tag tag-outline">{r.placesLeft} of {r.totalPlaces} places left</span>
              {!r.active && <span className="tag tag-neutral">Hidden</span>}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>{money(r.revenueMinor)} this month</span>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary btn-block" style={{ marginTop: 16, padding: "14px 0" }} onClick={() => onSelect("new")}>New retreat</button>
    </>
  );
}

function toDateInput(iso: string): string {
  return iso ? iso.slice(0, 10) : "";
}

function RetreatForm({ id, onDone }: { id: string | null; onDone: () => void }) {
  const { flash } = useApp();
  const isNew = !id;
  const [loaded, setLoaded] = useState(isNew);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [priceRaw, setPriceRaw] = useState("");
  const [unit, setUnit] = useState("per person");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [checkInAt, setCheckInAt] = useState("14:00");
  const [checkOutAt, setCheckOutAt] = useState("11:00");
  const [totalPlaces, setTotalPlaces] = useState("12");
  const [earlyBirdUntil, setEarlyBirdUntil] = useState("");
  const [capacityLabel, setCapacityLabel] = useState("");
  const [desc, setDesc] = useState("");
  const [long, setLong] = useState("");
  const [goodFor, setGoodFor] = useState("");
  const [category, setCategory] = useState("Retreat");
  const [dur, setDur] = useState("3 days");
  const [rating, setRating] = useState("");
  const [cancellationHours, setCancellationHours] = useState("336");
  const [cancelLabel, setCancelLabel] = useState("");
  const [incl, setIncl] = useState("");
  const [excl, setExcl] = useState("");
  const [active, setActive] = useState(true);
  const [recommended, setRecommended] = useState(false);
  const [badge, setBadge] = useState("");

  useEffect(() => {
    if (!id) return;
    api.adminRetreats.detail(id).then((r) => {
      setName(r.name); setPriceRaw(String(r.priceMinor / 100)); setUnit(r.unit);
      setStartsOn(toDateInput(r.startsOn)); setEndsOn(toDateInput(r.endsOn));
      setCheckInAt(r.checkInAt); setCheckOutAt(r.checkOutAt);
      setTotalPlaces(String(r.totalPlaces)); setEarlyBirdUntil(toDateInput(r.earlyBirdUntil || ""));
      setCapacityLabel(r.capacityLabel); setDesc(r.desc); setLong(r.long); setGoodFor(r.goodFor);
      setCategory(r.cat); setDur(r.dur); setRating(r.rating);
      setCancellationHours(String(r.cancellationHours)); setCancelLabel(r.cancelLabel);
      setIncl(r.incl.join("\n")); setExcl(r.excl.join("\n"));
      setActive(r.active); setRecommended(r.recommended); setBadge(r.badge);
      setLoaded(true);
    });
  }, [id]);

  async function save() {
    setSaving(true);
    try {
      const body: RetreatInput = {
        name, priceRaw, unit, capacityLabel, desc, long, goodFor, category, dur, rating,
        cancellationHours: Number(cancellationHours) || 336, cancelLabel,
        incl: incl.split("\n").map((s) => s.trim()).filter(Boolean),
        excl: excl.split("\n").map((s) => s.trim()).filter(Boolean),
        active, recommended, badge,
        startsOn, endsOn, checkInAt, checkOutAt, totalPlaces: Number(totalPlaces) || 0,
        earlyBirdUntil: earlyBirdUntil || null,
      };
      if (isNew) {
        await api.adminRetreats.create(body);
        flash("Retreat created");
      } else {
        await api.adminRetreats.update(id!, body);
        flash("Retreat saved");
      }
      onDone();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not save retreat");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <div style={{ maxWidth: 640 }}>
      <button className="btn btn-ghost" style={{ marginTop: 4, padding: "6px 4px", fontSize: 13 }} onClick={onDone}>← All retreats</button>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, marginTop: 12 }}>{isNew ? "New retreat" : "Edit retreat"}</div>

      <div className="field" style={{ marginTop: 18 }}>
        <label htmlFor="r-name">Name shown to guests</label>
        <input className="input" id="r-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="r-start">Starts</label>
          <input className="input" id="r-start" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="r-end">Ends</label>
          <input className="input" id="r-end" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="r-checkin">Check-in time</label>
          <input className="input" id="r-checkin" type="time" value={checkInAt} onChange={(e) => setCheckInAt(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="r-checkout">Check-out time</label>
          <input className="input" id="r-checkout" type="time" value={checkOutAt} onChange={(e) => setCheckOutAt(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="r-price">Price per person (MYR)</label>
          <input className="input" id="r-price" value={priceRaw} onChange={(e) => setPriceRaw(e.target.value.replace(/[^0-9.]/g, ""))} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="r-places">Total places</label>
          <input className="input" id="r-places" type="number" min={0} value={totalPlaces} onChange={(e) => setTotalPlaces(e.target.value)} />
        </div>
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="r-earlybird">Early-bird price ends</label>
        <input className="input" id="r-earlybird" type="date" value={earlyBirdUntil} onChange={(e) => setEarlyBirdUntil(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="r-caplabel">Capacity label</label>
        <input className="input" id="r-caplabel" placeholder="e.g. 12 guests · 20 rooms" value={capacityLabel} onChange={(e) => setCapacityLabel(e.target.value)} />
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="r-desc">Short description</label>
        <input className="input" id="r-desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="r-long">Full description</label>
        <textarea className="input" id="r-long" style={{ borderRadius: "var(--radius-md)", minHeight: 90, padding: "12px 16px", resize: "vertical" }} value={long} onChange={(e) => setLong(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="r-goodfor">Good for</label>
        <input className="input" id="r-goodfor" value={goodFor} onChange={(e) => setGoodFor(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="r-cat">Category</label>
          <input className="input" id="r-cat" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="r-dur">Duration label</label>
          <input className="input" id="r-dur" value={dur} onChange={(e) => setDur(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="r-rating">Rating label</label>
          <input className="input" id="r-rating" placeholder="5.0 ★" value={rating} onChange={(e) => setRating(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="r-cancelhrs">Cancellation window (hours)</label>
          <input className="input" id="r-cancelhrs" type="number" min={0} value={cancellationHours} onChange={(e) => setCancellationHours(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="r-cancellabel">Cancellation label</label>
          <input className="input" id="r-cancellabel" placeholder="e.g. 50% refund up to 14 days before" value={cancelLabel} onChange={(e) => setCancelLabel(e.target.value)} />
        </div>
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="r-incl">Inclusions — one per line</label>
        <textarea className="input" id="r-incl" style={{ borderRadius: "var(--radius-md)", minHeight: 80, padding: "12px 16px", resize: "vertical" }} value={incl} onChange={(e) => setIncl(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="r-excl">Exclusions — one per line</label>
        <textarea className="input" id="r-excl" style={{ borderRadius: "var(--radius-md)", minHeight: 70, padding: "12px 16px", resize: "vertical" }} value={excl} onChange={(e) => setExcl(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="r-badge">Badge (optional)</label>
        <input className="input" id="r-badge" placeholder="e.g. Early bird" value={badge} onChange={(e) => setBadge(e.target.value)} />
      </div>

      <div style={{ marginTop: 18, background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 0", borderBottom: "1px solid var(--color-divider)", cursor: "pointer" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Visible on booking form</div>
            <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>Guests can see and book this retreat</div>
          </div>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        </label>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 0", cursor: "pointer" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Mark as recommended</div>
            <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>Adds a badge beside the option</div>
          </div>
          <input type="checkbox" checked={recommended} onChange={(e) => setRecommended(e.target.checked)} />
        </label>
      </div>

      <button className="btn btn-primary btn-block" style={{ marginTop: 20, padding: "15px 0" }} disabled={saving || !name || !startsOn || !endsOn} onClick={save}>
        {saving ? "Saving…" : isNew ? "Create retreat" : "Save changes"}
      </button>
    </div>
  );
}
