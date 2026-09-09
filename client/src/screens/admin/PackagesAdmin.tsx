import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { api, type Pkg } from "../../lib/api";
import { money } from "../../lib/format";
import Toggle from "../../components/Toggle";

export default function PackagesAdmin({ openPackageEditSheet }: { openPackageEditSheet: (pkg: Pkg | null) => void }) {
  const { flash } = useApp();
  const [packages, setPackages] = useState<Pkg[]>([]);

  function reload() { api.packages(true).then((list) => setPackages(list.sort((a, b) => a.sortOrder - b.sortOrder))); }
  useEffect(reload, []);

  async function toggleActive(p: Pkg) {
    await api.updatePackage(p.id, { active: !p.active });
    flash(p.active ? p.name + " hidden from the form" : p.name + " is live");
    reload();
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 20 }}>
        {packages.map((p) => (
          <div key={p.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: 16, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }} onClick={() => openPackageEditSheet(p)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, lineHeight: 1.2 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 4 }}>{p.unit} · {p.capacity}</div>
              </div>
              <div style={{ flex: "none", textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 19, lineHeight: 1 }}>{money(p.priceMinor, p.currency === "MYR" ? "RM" : p.currency)}</div>
                <div style={{ fontSize: 11, color: "var(--color-neutral-600)", marginTop: 3 }}>{p.sold} sold</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 13, paddingTop: 12, borderTop: "1px solid var(--color-divider)" }}>
              <div style={{ flex: 1, fontSize: 12, color: "var(--color-neutral-700)" }}>{money(p.revenueMinor)} this month</div>
              <Toggle size="sm" on={p.active} onClick={() => toggleActive(p)} />
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary btn-block" style={{ marginTop: 16, padding: "14px 0" }} onClick={() => openPackageEditSheet(null)}>New package</button>
    </>
  );
}
