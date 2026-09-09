import { useEffect, useState } from "react";
import { api, type Automation, type Coupon } from "../../lib/api";
import { money } from "../../lib/format";
import Toggle from "../../components/Toggle";

export default function Promotions() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loyalty, setLoyalty] = useState<{ pointsPerClass: number; freeClassAt: number; referralRewardMinor: number; membersOnPlan: number } | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);

  function reload() {
    api.admin.coupons().then(setCoupons);
    api.admin.loyalty().then(setLoyalty);
    api.admin.automations().then(setAutomations);
  }
  useEffect(reload, []);

  async function toggleCoupon(c: Coupon) { await api.admin.toggleCoupon(c.id); reload(); }
  async function toggleAutomation(a: Automation) { await api.admin.toggleAutomation(a.id); reload(); }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 20 }}>
        {coupons.map((c) => (
          <div key={c.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "15px 16px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 16, letterSpacing: "0.04em" }}>{c.code}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 3 }}>{c.detail}</div>
            </div>
            <Toggle size="sm" on={c.on} onClick={() => toggleCoupon(c)} />
          </div>
        ))}
      </div>

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
