import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { api, type Reports as ReportsData } from "../../lib/api";
import { money } from "../../lib/format";

export default function Reports() {
  const { flash } = useApp();
  const [data, setData] = useState<ReportsData | null>(null);

  useEffect(() => { api.admin.reports().then(setData); }, []);

  function exportCsv() {
    if (!data) return;
    const lines = [
      "Metric,Value",
      `Revenue month to date,${money(data.revenueMinor)}`,
      `Bookings this month,${data.bookingsThisMonth}`,
      `Cancellation rate,${data.cancellationRate}%`,
      `Retention 3 months,${data.retentionPct}%`,
      "",
      "Package,Revenue",
      ...data.revenueByPackage.map((r) => `${r.name},${money(r.amountMinor)}`),
      "",
      ...data.rows.map((r) => `${r.name},${r.value}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sukahati-report.csv"; a.click();
    URL.revokeObjectURL(url);
    flash("September report exported");
  }

  if (!data) return null;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 20 }}>
        <div style={{ background: "var(--color-accent-200)", borderRadius: "var(--radius-md)", padding: 16 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 25, lineHeight: 1 }}>{money(data.revenueMinor)}</div>
          <div style={{ fontSize: 11.5, color: "var(--color-accent-800)", marginTop: 4 }}>Revenue, month to date</div>
        </div>
        <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: 16 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 25, lineHeight: 1 }}>{data.bookingsThisMonth}</div>
          <div style={{ fontSize: 11.5, color: "var(--color-neutral-700)", marginTop: 4 }}>Bookings this month</div>
        </div>
        <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: 16 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 25, lineHeight: 1 }}>{data.cancellationRate}%</div>
          <div style={{ fontSize: 11.5, color: "var(--color-neutral-700)", marginTop: 4 }}>Cancellation rate</div>
        </div>
        <div style={{ background: "var(--color-accent-2-200)", borderRadius: "var(--radius-md)", padding: 16 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 25, lineHeight: 1 }}>{data.retentionPct}%</div>
          <div style={{ fontSize: 11.5, color: "var(--color-accent-2-900)", marginTop: 4 }}>Retention, 3 months</div>
        </div>
      </div>

      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 20, margin: "26px 0 12px" }}>Revenue by package</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        {data.revenueByPackage.map((r, i) => (
          <div key={r.name}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}>
              <span style={{ fontWeight: 600 }}>{r.name}</span><span style={{ color: "var(--color-neutral-700)" }}>{money(r.amountMinor)}</span>
            </div>
            <div style={{ height: 9, borderRadius: 999, background: "var(--color-neutral-200)", marginTop: 7, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, width: `${r.pct}%`, background: i === 0 ? "var(--color-accent-500)" : "var(--color-accent-2-500)" }} />
            </div>
          </div>
        ))}
        {data.revenueByPackage.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No revenue recorded yet.</div>}
      </div>

      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 20, margin: "26px 0 12px" }}>Peak booking times</h2>
      <div style={{ display: "flex", gap: 7, alignItems: "flex-end", height: 120, background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: 16 }}>
        {data.peakBars.map((p) => (
          <div key={p.label} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 7, height: "100%" }}>
            <div style={{ width: "100%", borderRadius: "8px 8px 4px 4px", background: p.pct > 85 ? "var(--color-accent-500)" : "var(--color-accent-2-400)", height: `${Math.max(4, p.pct)}%` }} />
            <div style={{ fontSize: 10, color: "var(--color-neutral-700)" }}>{p.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        {data.rows.map((r, i) => (
          <div key={r.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "13px 0", borderBottom: i < data.rows.length - 1 ? "1px solid var(--color-divider)" : "none", fontSize: 13.5 }}>
            <span style={{ color: "var(--color-neutral-700)" }}>{r.name}</span><span style={{ fontWeight: 600, textAlign: "right" }}>{r.value}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-secondary btn-block" style={{ marginTop: 16, padding: "13px 0", fontSize: 13.5 }} onClick={exportCsv}>Export this month as CSV</button>
    </>
  );
}
