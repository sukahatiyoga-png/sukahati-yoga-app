import { useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { money } from "../lib/format";
import { screenPad, h2 } from "../styles/shared";

export default function Profile() {
  const { me, refreshMe, flash, goAdmin, logout } = useApp();
  const [name, setName] = useState(me.name);
  const [email, setEmail] = useState(me.email);
  const [phone, setPhone] = useState(me.phone);

  async function save(next: { name?: string; email?: string; phone?: string }) {
    const merged = { name, email, phone, ...next };
    setName(merged.name); setEmail(merged.email); setPhone(merged.phone);
    await api.updateProfile(me.id, merged);
    refreshMe();
  }

  const initials = me.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div style={screenPad}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: "none", width: 64, height: 64, borderRadius: 999, background: "var(--color-accent-2-300)", color: "var(--color-accent-2-900)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22 }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 25, lineHeight: 1.12 }}>{me.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 3 }}>
            Member since {new Date(me.memberSince).toLocaleDateString("en-MY", { month: "short", year: "numeric" })} · signed in with {me.authProvider}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <div style={{ flex: 1, background: "var(--color-accent-200)", borderRadius: "var(--radius-md)", padding: 14 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 23, lineHeight: 1 }}>{me.points}</div>
          <div style={{ fontSize: 11.5, color: "var(--color-accent-800)", marginTop: 4 }}>Loyalty points</div>
        </div>
        <div style={{ flex: 1, background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: 14 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 23, lineHeight: 1 }}>{me.classesAttended}</div>
          <div style={{ fontSize: 11.5, color: "var(--color-neutral-700)", marginTop: 4 }}>Classes attended</div>
        </div>
        <div style={{ flex: 1, background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: 14 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 23, lineHeight: 1 }}>{me.friendsReferred}</div>
          <div style={{ fontSize: 11.5, color: "var(--color-neutral-700)", marginTop: 4 }}>Friends referred</div>
        </div>
      </div>

      <div className="field" style={{ marginTop: 20 }}>
        <label htmlFor="p-name">Full name</label>
        <input className="input" id="p-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => save({})} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="p-email">Email</label>
        <input className="input" id="p-email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => save({})} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="p-phone">Phone</label>
        <input className="input" id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => save({})} />
      </div>

      <h2 style={h2}>Saved preferences</h2>
      <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        {[
          ["Usual level", me.preferences?.usualLevel || "Not set"],
          ["Preferred time", me.preferences?.preferredTime || "Not set"],
          ["Meals", me.preferences?.mealPreference || "Not set"],
          ["Payment method", me.preferences?.savedPaymentLabel || "Not set"],
        ].map(([label, value], i, arr) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "13px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--color-divider)" : "none", fontSize: 13.5 }}>
            <span style={{ color: "var(--color-neutral-700)" }}>{label}</span><span style={{ fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      <h2 style={h2}>Refer a friend</h2>
      <div style={{ background: "var(--color-accent-2-200)", borderRadius: "var(--radius-lg)", padding: 18 }}>
        <div style={{ fontSize: 13.5, color: "var(--color-accent-2-900)", lineHeight: 1.5 }}>Share your code and you both get {money(2500)} off the next booking.</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 13, background: "var(--color-bg)", borderRadius: 999, padding: "11px 18px" }}>
          <span style={{ flex: 1, fontFamily: "var(--font-heading)", fontSize: 17, letterSpacing: "0.06em" }}>{me.referralCode}</span>
          <button className="btn btn-ghost" style={{ flex: "none", padding: "6px 12px", fontSize: 12 }} onClick={() => { navigator.clipboard?.writeText(me.referralCode).catch(() => {}); flash(me.referralCode + " copied"); }}>Copy</button>
        </div>
      </div>

      {(me.role === "owner" || me.role === "desk") && (
        <button className="btn btn-secondary btn-block" style={{ marginTop: 24, padding: "14px 0" }} onClick={goAdmin}>Switch to studio admin</button>
      )}
      <button className="btn btn-ghost btn-block" style={{ marginTop: 8, padding: "13px 0", fontSize: 13.5 }} onClick={logout}>Sign out</button>
    </div>
  );
}
