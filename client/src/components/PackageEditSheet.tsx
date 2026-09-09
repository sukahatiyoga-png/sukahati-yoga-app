import { useState } from "react";
import Sheet from "./Sheet";
import Toggle from "./Toggle";
import { useApp } from "../context/AppContext";
import { api, type Pkg } from "../lib/api";

export default function PackageEditSheet({ pkg, onSaved }: { pkg: Pkg | null; onSaved: () => void }) {
  const { closeSheet, flash } = useApp();
  const isNew = !pkg;
  const [name, setName] = useState(pkg?.name || "");
  const [priceRaw, setPriceRaw] = useState(pkg ? String(pkg.priceMinor / 100) : "");
  const [unit, setUnit] = useState(pkg?.unit || "per class");
  const [capacity, setCapacity] = useState(pkg?.capacity || "");
  const [desc, setDesc] = useState(pkg?.desc || "");
  const [active, setActive] = useState(pkg?.active ?? true);
  const [recommended, setRecommended] = useState(pkg?.recommended ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const body = { name, priceRaw, unit, capacity, desc, active, recommended };
      if (isNew) {
        await api.createPackage(body);
        flash("Package added to the booking form");
      } else {
        await api.updatePackage(pkg!.id, body);
        flash("Package saved");
      }
      onSaved();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not save package");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet onClose={closeSheet} maxHeight="86%">
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 25, lineHeight: 1.15 }}>{isNew ? "New package" : "Edit package"}</div>

      <div className="field" style={{ marginTop: 18 }}>
        <label htmlFor="e-name">Name shown to guests</label>
        <input className="input" id="e-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="e-price">Price (MYR)</label>
          <input className="input" id="e-price" value={priceRaw} onChange={(e) => setPriceRaw(e.target.value.replace(/[^0-9.]/g, ""))} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="e-unit">Billed as</label>
          <input className="input" id="e-unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
        </div>
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="e-cap">Capacity</label>
        <input className="input" id="e-cap" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="e-desc">Short description</label>
        <input className="input" id="e-desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>

      <div style={{ marginTop: 18, background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 0", borderBottom: "1px solid var(--color-divider)" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Visible on booking form</div>
            <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>Guests can choose this package</div>
          </div>
          <Toggle on={active} onClick={() => setActive((v) => !v)} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 0" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Mark as recommended</div>
            <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>Adds a badge beside the option</div>
          </div>
          <Toggle on={recommended} onClick={() => setRecommended((v) => !v)} />
        </div>
      </div>

      <button className="btn btn-primary btn-block" style={{ marginTop: 20, padding: "15px 0" }} onClick={save} disabled={saving || !name}>
        {isNew ? "Add to booking form" : "Save changes"}
      </button>
      <button className="btn btn-ghost btn-block" style={{ marginTop: 8, padding: "13px 0" }} onClick={closeSheet}>Cancel</button>
    </Sheet>
  );
}
