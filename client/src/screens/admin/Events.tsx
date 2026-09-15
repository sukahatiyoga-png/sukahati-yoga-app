import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { api, type EventInput, type EventItem } from "../../lib/api";
import { money } from "../../lib/format";

export default function Events() {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  if (editingId) return <EventForm id={editingId === "new" ? null : editingId} onDone={() => setEditingId(null)} />;
  return <EventList onSelect={setEditingId} />;
}

function EventList({ onSelect }: { onSelect: (id: string | "new") => void }) {
  const { flash } = useApp();
  const [events, setEvents] = useState<EventItem[]>([]);
  useEffect(() => {
    api.adminEvents.list().then(setEvents)
      .catch((e) => flash(e instanceof Error ? e.message : "Couldn't load events"));
  }, [flash]);

  return (
    <>
      <div style={{ fontSize: 13.5, color: "var(--color-neutral-700)", marginTop: 4, marginBottom: 16 }}>
        One-off workshops and special classes — separate from the weekly schedule and from multi-day retreats.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {events.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No events yet.</div>}
        {events.map((e) => (
          <div key={e.id} onClick={() => onSelect(e.id)} style={{ cursor: "pointer", background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: 18, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>{e.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 4 }}>
                  {new Date(e.startsAt).toLocaleString("en-MY", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  {" – "}
                  {new Date(e.endsAt).toLocaleString("en-MY", { hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
              <div style={{ flex: "none", textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>{money(e.priceMinor, e.currency === "MYR" ? "RM" : e.currency)}</div>
                <div style={{ fontSize: 11, color: "var(--color-neutral-600)", marginTop: 3 }}>per person</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 13, paddingTop: 12, borderTop: "1px solid var(--color-divider)" }}>
              <span className="tag tag-outline">{e.placesLeft} of {e.totalPlaces} places left</span>
              {!e.active && <span className="tag tag-neutral">Hidden</span>}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>{money(e.revenueMinor)} this month</span>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary btn-block" style={{ marginTop: 16, padding: "14px 0" }} onClick={() => onSelect("new")}>New event</button>
    </>
  );
}

function toDateTimeInput(iso: string): string {
  return iso ? iso.slice(0, 16) : "";
}

function EventForm({ id, onDone }: { id: string | null; onDone: () => void }) {
  const { flash } = useApp();
  const isNew = !id;
  const [loaded, setLoaded] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [priceRaw, setPriceRaw] = useState("");
  const [unit, setUnit] = useState("per person");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [totalPlaces, setTotalPlaces] = useState("20");
  const [earlyBirdUntil, setEarlyBirdUntil] = useState("");
  const [capacityLabel, setCapacityLabel] = useState("");
  const [desc, setDesc] = useState("");
  const [long, setLong] = useState("");
  const [goodFor, setGoodFor] = useState("");
  const [category, setCategory] = useState("Event");
  const [dur, setDur] = useState("2 hours");
  const [rating, setRating] = useState("");
  const [cancellationHours, setCancellationHours] = useState("24");
  const [cancelLabel, setCancelLabel] = useState("");
  const [incl, setIncl] = useState("");
  const [excl, setExcl] = useState("");
  const [active, setActive] = useState(true);
  const [recommended, setRecommended] = useState(false);
  const [badge, setBadge] = useState("");

  useEffect(() => {
    if (!id) return;
    api.adminEvents.detail(id).then((e) => {
      setName(e.name); setPriceRaw(String(e.priceMinor / 100)); setUnit(e.unit);
      setStartsAt(toDateTimeInput(e.startsAt)); setEndsAt(toDateTimeInput(e.endsAt));
      setTotalPlaces(String(e.totalPlaces)); setEarlyBirdUntil(e.earlyBirdUntil ? e.earlyBirdUntil.slice(0, 10) : "");
      setCapacityLabel(e.capacityLabel); setDesc(e.desc); setLong(e.long); setGoodFor(e.goodFor);
      setCategory(e.cat); setDur(e.dur); setRating(e.rating);
      setCancellationHours(String(e.cancellationHours)); setCancelLabel(e.cancelLabel);
      setIncl(e.incl.join("\n")); setExcl(e.excl.join("\n"));
      setActive(e.active); setRecommended(e.recommended); setBadge(e.badge);
      setLoaded(true);
    });
  }, [id]);

  async function save() {
    setSaving(true);
    try {
      const body: EventInput = {
        name, priceRaw, unit, capacityLabel, desc, long, goodFor, category, dur, rating,
        cancellationHours: Number(cancellationHours) || 24, cancelLabel,
        incl: incl.split("\n").map((s) => s.trim()).filter(Boolean),
        excl: excl.split("\n").map((s) => s.trim()).filter(Boolean),
        active, recommended, badge,
        startsAt, endsAt, totalPlaces: Number(totalPlaces) || 0,
        earlyBirdUntil: earlyBirdUntil || null,
      };
      if (isNew) {
        await api.adminEvents.create(body);
        flash("Event created");
      } else {
        await api.adminEvents.update(id!, body);
        flash("Event saved");
      }
      onDone();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not save event");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await api.adminEvents.delete(id);
      flash("Event deleted");
      onDone();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not delete event");
    } finally {
      setDeleting(false);
    }
  }

  if (!loaded) return null;

  return (
    <div style={{ maxWidth: 640 }}>
      <button className="btn btn-ghost" style={{ marginTop: 4, padding: "6px 4px", fontSize: 13 }} onClick={onDone}>← All events</button>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, marginTop: 12 }}>{isNew ? "New event" : "Edit event"}</div>

      <div className="field" style={{ marginTop: 18 }}>
        <label htmlFor="e-name">Name shown to guests</label>
        <input className="input" id="e-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="e-start">Starts</label>
          <input className="input" id="e-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="e-end">Ends</label>
          <input className="input" id="e-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="e-price">Price per person (MYR)</label>
          <input className="input" id="e-price" value={priceRaw} onChange={(e) => setPriceRaw(e.target.value.replace(/[^0-9.]/g, ""))} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="e-places">Total places</label>
          <input className="input" id="e-places" type="number" min={0} value={totalPlaces} onChange={(e) => setTotalPlaces(e.target.value)} />
        </div>
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="e-earlybird">Early-bird price ends</label>
        <input className="input" id="e-earlybird" type="date" value={earlyBirdUntil} onChange={(e) => setEarlyBirdUntil(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="e-caplabel">Capacity label</label>
        <input className="input" id="e-caplabel" placeholder="e.g. 20 mats" value={capacityLabel} onChange={(e) => setCapacityLabel(e.target.value)} />
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="e-desc">Short description</label>
        <input className="input" id="e-desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="e-long">Full description</label>
        <textarea className="input" id="e-long" style={{ borderRadius: "var(--radius-md)", minHeight: 90, padding: "12px 16px", resize: "vertical" }} value={long} onChange={(e) => setLong(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="e-goodfor">Good for</label>
        <input className="input" id="e-goodfor" value={goodFor} onChange={(e) => setGoodFor(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="e-cat">Category</label>
          <input className="input" id="e-cat" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="e-dur">Duration label</label>
          <input className="input" id="e-dur" value={dur} onChange={(e) => setDur(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="e-rating">Rating label</label>
          <input className="input" id="e-rating" placeholder="5.0 ★" value={rating} onChange={(e) => setRating(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="e-cancelhrs">Cancellation window (hours)</label>
          <input className="input" id="e-cancelhrs" type="number" min={0} value={cancellationHours} onChange={(e) => setCancellationHours(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="e-cancellabel">Cancellation label</label>
          <input className="input" id="e-cancellabel" placeholder="e.g. Free cancellation up to 24h before" value={cancelLabel} onChange={(e) => setCancelLabel(e.target.value)} />
        </div>
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="e-incl">Inclusions — one per line</label>
        <textarea className="input" id="e-incl" style={{ borderRadius: "var(--radius-md)", minHeight: 80, padding: "12px 16px", resize: "vertical" }} value={incl} onChange={(e) => setIncl(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="e-excl">Exclusions — one per line</label>
        <textarea className="input" id="e-excl" style={{ borderRadius: "var(--radius-md)", minHeight: 70, padding: "12px 16px", resize: "vertical" }} value={excl} onChange={(e) => setExcl(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="e-badge">Badge (optional)</label>
        <input className="input" id="e-badge" placeholder="e.g. New" value={badge} onChange={(e) => setBadge(e.target.value)} />
      </div>

      <div style={{ marginTop: 18, background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 0", borderBottom: "1px solid var(--color-divider)", cursor: "pointer" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Visible on booking form</div>
            <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>Guests can see and book this event</div>
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

      <button className="btn btn-primary btn-block" style={{ marginTop: 20, padding: "15px 0" }} disabled={saving || !name || !startsAt || !endsAt} onClick={save}>
        {saving ? "Saving…" : isNew ? "Create event" : "Save changes"}
      </button>
      {!isNew && (
        <button className="btn btn-ghost btn-block" style={{ marginTop: 8, padding: "13px 0", color: "var(--color-accent-700)" }} onClick={remove} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete event"}
        </button>
      )}
    </div>
  );
}
