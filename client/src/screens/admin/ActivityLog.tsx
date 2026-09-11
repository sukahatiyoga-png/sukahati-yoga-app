import { useEffect, useState } from "react";
import { api, type ActivityItem } from "../../lib/api";
import { agoLabel } from "../../lib/format";

const ENTITY_TAG: Record<string, string> = {
  bookings: "tag-accent", payments: "tag-accent-2", packages: "tag-outline",
  teacher_profiles: "tag-neutral", customers: "tag-neutral", coupons: "tag-outline",
};
const ENTITY_LABEL: Record<string, string> = {
  bookings: "Booking", payments: "Payment", packages: "Package",
  teacher_profiles: "Teacher", customers: "Customer", coupons: "Coupon",
};

export default function ActivityLog() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.admin.activity().then((r) => { setItems(r.items); setCursor(r.nextCursor); }).finally(() => setLoading(false));
  }, []);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const r = await api.admin.activity(cursor);
      setItems((prev) => [...prev, ...r.items]);
      setCursor(r.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 13.5, color: "var(--color-neutral-700)", marginBottom: 16 }}>
        Every booking, payment, package edit and staff action, newest first.
      </div>

      {loading && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>Loading…</div>}
      {!loading && items.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No activity yet.</div>}

      <div style={{ position: "relative" }}>
        {items.length > 0 && (
          <div style={{ position: "absolute", left: 15, top: 8, bottom: 8, width: 2, background: "var(--color-divider)" }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((item) => (
            <div key={item.id} style={{ position: "relative", display: "flex", gap: 14, padding: "10px 0" }}>
              <div style={{
                position: "relative", zIndex: 1, flex: "none", width: 32, height: 32, borderRadius: 999,
                background: "var(--color-neutral-100)", border: "2px solid var(--color-bg)", boxShadow: "0 0 0 1px var(--color-divider)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--color-neutral-700)",
              }}>
                {item.actorName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>{item.summary}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                  <span className={`tag ${ENTITY_TAG[item.entityTable] || "tag-neutral"}`}>{ENTITY_LABEL[item.entityTable] || item.entityTable}</span>
                  <span style={{ fontSize: 11.5, color: "var(--color-neutral-600)" }}>{agoLabel(item.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {cursor && (
        <button className="btn btn-secondary btn-block" style={{ marginTop: 18, padding: "11px 0" }} disabled={loadingMore} onClick={loadMore}>
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
