import { useEffect, useState } from "react";
import { api, type Customer } from "../../lib/api";
import { money } from "../../lib/format";

export default function Customers() {
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => { api.admin.customers(q || undefined).then(setCustomers); }, [q]);

  return (
    <>
      <div className="field" style={{ marginTop: 20 }}>
        <label htmlFor="cq">Find a customer</label>
        <input className="input" id="cq" placeholder="Name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {customers.map((c) => (
          <div key={c.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "15px 16px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: "none", width: 40, height: 40, borderRadius: 999, background: "var(--color-accent-2-300)", color: "var(--color-accent-2-900)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13.5 }}>{c.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>{c.meta}</div>
            </div>
            <div style={{ flex: "none", textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{money(c.spendMinor)}</div>
              <div style={{ fontSize: 11, color: "var(--color-neutral-600)", marginTop: 2 }}>lifetime</div>
            </div>
          </div>
        ))}
        {customers.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No customers found.</div>}
      </div>
    </>
  );
}
