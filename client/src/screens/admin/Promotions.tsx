import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { api, type Automation, type Coupon, type CouponInput } from "../../lib/api";
import { money } from "../../lib/format";
import Toggle from "../../components/Toggle";

export default function Promotions() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loyalty, setLoyalty] = useState<{ pointsPerClass: number; freeClassAt: number; referralRewardMinor: number; membersOnPlan: number } | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);

  function reload() {
    api.admin.coupons().then(setCoupons);
    api.admin.loyalty().then(setLoyalty);
    api.admin.automations().then(setAutomations);
  }
  useEffect(reload, []);

  async function toggleCoupon(c: Coupon) { await api.admin.toggleCoupon(c.id); reload(); }
  async function toggleAutomation(a: Automation) { await api.admin.toggleAutomation(a.id); reload(); }

  if (editing) {
    return <CouponForm coupon={editing === "new" ? null : editing} onDone={() => { setEditing(null); reload(); }} />;
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 20 }}>
        {coupons.map((c) => (
          <div key={c.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "15px 16px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setEditing(c)}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 16, letterSpacing: "0.04em" }}>{c.code}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 3 }}>{c.detail}</div>
            </div>
            <Toggle size="sm" on={c.on} onClick={() => toggleCoupon(c)} />
          </div>
        ))}
        {coupons.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No coupons yet.</div>}
      </div>
      <button className="btn btn-primary btn-block" style={{ marginTop: 14, padding: "13px 0" }} onClick={() => setEditing("new")}>New coupon</button>

      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 20, margin: "26px 0 12px" }}>Loyalty and referrals</h2>
      {loyalty && (
        <div style={{ background: "var(--color-accent-2-200)", borderRadius: "var(--radius-lg)", padding: "4px 18px" }}>
          {[
            ["Points earned per class", String(loyalty.pointsPerClass)],
            ["Free class at", `${loyalty.freeClassAt} points`],
            ["Referral reward", `${money(loyalty.referralRewardMinor)} each`],
            ["Members on a plan", String(loyalty.membersOnPlan)],
          ].map(([label, value], i, arr) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "13px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--color-accent-2-300)" : "none", fontSize: 13.5 }}>
              <span style={{ color: "var(--color-accent-2-900)" }}>{label}</span><span style={{ fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 20, margin: "26px 0 12px" }}>Automations</h2>
      <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        {automations.map((a, i) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 0", borderBottom: i < automations.length - 1 ? "1px solid var(--color-divider)" : "none" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--color-neutral-700)", marginTop: 2 }}>{a.note}</div>
            </div>
            <Toggle size="sm" on={a.on} onClick={() => toggleAutomation(a)} />
          </div>
        ))}
      </div>
    </>
  );
}

function toDateInput(iso: string): string {
  return iso ? iso.slice(0, 10) : "";
}

function CouponForm({ coupon, onDone }: { coupon: Coupon | null; onDone: () => void }) {
  const { flash } = useApp();
  const isNew = !coupon;
  const [code, setCode] = useState(coupon?.code || "");
  const [discountType, setDiscountType] = useState(coupon?.discountType || "percent");
  const [discountValue, setDiscountValue] = useState(coupon ? String(coupon.discountValue) : "10");
  const [minGuests, setMinGuests] = useState(coupon ? String(coupon.minGuests) : "1");
  const [expiresAt, setExpiresAt] = useState(coupon ? toDateInput(coupon.expiresAt) : "");
  const [maxRedemptions, setMaxRedemptions] = useState(coupon ? String(coupon.maxRedemptions) : "100");
  const [detail, setDetail] = useState(coupon?.detail || "");
  const [active, setActive] = useState(coupon?.on ?? true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const body: CouponInput = {
        code, discountType, discountValue: Number(discountValue) || 0, minGuests: Number(minGuests) || 1,
        expiresAt: expiresAt || undefined, maxRedemptions: Number(maxRedemptions) || 1000000,
        isActive: active, detail,
      };
      if (isNew) {
        await api.admin.createCoupon(body);
        flash("Coupon created");
      } else {
        await api.admin.updateCoupon(coupon!.id, body);
        flash("Coupon saved");
      }
      onDone();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not save coupon");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!coupon) return;
    if (!window.confirm(`Delete coupon "${coupon.code}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await api.admin.deleteCoupon(coupon.id);
      flash("Coupon deleted");
      onDone();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not delete coupon");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <button className="btn btn-ghost" style={{ marginTop: 4, padding: "6px 4px", fontSize: 13 }} onClick={onDone}>← All coupons</button>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, marginTop: 12 }}>{isNew ? "New coupon" : "Edit coupon"}</div>

      <div className="field" style={{ marginTop: 18 }}>
        <label htmlFor="cp-code">Code</label>
        <input className="input" id="cp-code" style={{ textTransform: "uppercase" }} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
      </div>

      <div className="seg" style={{ width: "100%", marginTop: 14 }}>
        <button type="button" className={`seg-opt ${discountType === "percent" ? "active" : ""}`} style={{ flex: 1 }} onClick={() => setDiscountType("percent")}>Percent off</button>
        <button type="button" className={`seg-opt ${discountType === "fixed" ? "active" : ""}`} style={{ flex: 1 }} onClick={() => setDiscountType("fixed")}>Fixed amount</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="cp-value">{discountType === "percent" ? "Discount %" : "Discount (RM)"}</label>
          <input className="input" id="cp-value" type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="cp-minguests">Min guests</label>
          <input className="input" id="cp-minguests" type="number" min={1} value={minGuests} onChange={(e) => setMinGuests(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="cp-expires">Expires</label>
          <input className="input" id="cp-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="cp-max">Max redemptions</label>
          <input className="input" id="cp-max" type="number" min={1} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} />
        </div>
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="cp-detail">Detail label shown to staff</label>
        <input className="input" id="cp-detail" placeholder="e.g. 10% off · retreat only" value={detail} onChange={(e) => setDetail(e.target.value)} />
      </div>

      {!isNew && (
        <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--color-neutral-600)" }}>{coupon!.redemptionCount} redemptions so far</div>
      )}

      <div style={{ marginTop: 18, background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 0", cursor: "pointer" }}>
          <div style={{ fontWeight: 600, fontSize: 14.5 }}>Active</div>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        </label>
      </div>

      <button className="btn btn-primary btn-block" style={{ marginTop: 20, padding: "15px 0" }} disabled={saving || !code} onClick={save}>
        {saving ? "Saving…" : isNew ? "Create coupon" : "Save changes"}
      </button>
      {!isNew && (
        <button className="btn btn-ghost btn-block" style={{ marginTop: 8, padding: "13px 0", color: "var(--color-accent-700)" }} onClick={remove} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete coupon"}
        </button>
      )}
    </div>
  );
}
