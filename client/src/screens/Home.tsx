import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api, type ActivePass, type BookingCustomer, type Pkg, type SessionSlot } from "../lib/api";
import { money } from "../lib/format";
import { isoDate } from "../lib/dates";
import { screenPad, kicker, h1, h2 } from "../styles/shared";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 18) return "Selamat petang";
  return "Selamat malam";
}

export default function Home() {
  const { me, goTab, goBook, openPackageSheet, flash } = useApp();
  const [nextBooking, setNextBooking] = useState<BookingCustomer | null>(null);
  const [pass, setPass] = useState<ActivePass | null>(null);
  const [retreat, setRetreat] = useState<Pkg | null>(null);
  const [today, setToday] = useState<SessionSlot[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const todayIso = isoDate(new Date());
    api.myBookings().then((b) => setNextBooking(b.upcoming[0] || null));
    api.activePass(me.id).then(setPass);
    api.packages().then((list) => setRetreat(list.find((p) => p.kind === "retreat") || null));
    api.sessions({ date: todayIso }).then(setToday);
    api.notifications().then((list) => setUnread(list.filter((n) => n.unread).length));
  }, [me.id]);

  const initials = me.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div style={screenPad}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={kicker}>Sukahati Yoga · Kuala Lumpur</div>
          <h1 style={h1}>{greeting()},<br />{me.name.split(" ")[0]}</h1>
        </div>
        <div style={{ display: "flex", gap: 8, flex: "none" }}>
          <button
            style={{ width: 44, height: 44, borderRadius: 999, border: 0, background: "var(--color-neutral-100)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)", boxShadow: "var(--shadow-sm)", position: "relative" }}
            onClick={() => goTab("alerts")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" /><path d="M10.5 20a2 2 0 0 0 3 0" /></svg>
            {unread > 0 && (
              <span style={{ position: "absolute", top: -2, right: -2, minWidth: 19, height: 19, borderRadius: 999, background: "var(--color-accent-500)", color: "#fff", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", border: "2px solid var(--color-bg)" }}>
                {unread}
              </span>
            )}
          </button>
          <button
            style={{ width: 44, height: 44, borderRadius: 999, border: 0, background: "var(--color-accent-2-300)", color: "var(--color-accent-2-900)", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "var(--shadow-sm)" }}
            onClick={() => goTab("profile")}
          >
            {initials}
          </button>
        </div>
      </div>

      <div className="washed" style={{ marginTop: 20, borderRadius: "var(--radius-lg)", overflow: "hidden", height: 146 }}>
        <img src={new URL("../assets/studio.jpg", import.meta.url).toString()} alt="Studio practice" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>

      {nextBooking && (
        <div style={{ margin: "-38px 14px 0", position: "relative", background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: 18, boxShadow: "var(--shadow-md)", cursor: "pointer" }} onClick={() => goTab("bookings")}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Next booking</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
            <div style={{ flex: "none", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 25, lineHeight: 1 }}>{nextBooking.mon} {nextBooking.day}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0, borderLeft: "2px solid var(--color-accent-300)", paddingLeft: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{nextBooking.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 2 }}>{nextBooking.meta}</div>
            </div>
            <span className={`tag ${nextBooking.confirmed ? "tag-accent-2" : "tag-accent"}`} style={{ flex: "none" }}>{nextBooking.confirmed ? "Confirmed" : "Pending"}</span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="btn btn-primary" style={{ flex: 1.4, padding: "15px 0", fontSize: 15 }} onClick={() => goBook()}>Book a class</button>
        <button className="btn btn-secondary" style={{ flex: 1, padding: "15px 0", fontSize: 15 }} onClick={() => goTab("search")}>Search</button>
      </div>

      {pass && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}>
            <h2 style={h2}>Your pass</h2>
            <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => goTab("bookings")}>Manage</button>
          </div>
          <div style={{ background: "var(--color-accent-200)", borderRadius: "var(--radius-lg)", padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{pass.packageName}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-accent-800)" }}>{pass.daysLeft} days left</div>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "var(--color-accent-300)", marginTop: 12, overflow: "hidden" }}>
              <div style={{ width: `${pass.pct}%`, height: "100%", background: "var(--color-accent-600)", borderRadius: 999 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, color: "var(--color-accent-800)", marginTop: 9 }}>
              <span>Ends {pass.endLabel}</span><span>{me.points} pts</span>
            </div>
          </div>
        </>
      )}

      {retreat && retreat.retreat && (
        <div style={{ marginTop: 16, background: "var(--color-accent-2-200)", borderRadius: "var(--radius-lg)", padding: 18, cursor: "pointer" }} onClick={() => openPackageSheet(retreat.id)}>
          {retreat.retreat.earlyBirdSaveMinor > 0 && (
            <span className="tag tag-accent" style={{ marginBottom: 10 }}>Early bird · save {money(retreat.retreat.earlyBirdSaveMinor)}</span>
          )}
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, lineHeight: 1.18 }}>{retreat.name}</div>
          <div style={{ fontSize: 13, color: "var(--color-accent-2-900)", marginTop: 7, lineHeight: 1.45 }}>{retreat.desc}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 22 }}>{money(retreat.priceMinor)}</span>
            <span style={{ fontSize: 12.5, color: "var(--color-accent-2-900)" }}>per person · {retreat.retreat.placesLeft} places left</span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}>
        <h2 style={h2}>Today at the studio</h2>
        <span style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>Live availability</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {today.map((t) => (
          <div key={t.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "14px 16px", display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ flex: "none", width: 54 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t.time}</div>
              <div style={{ fontSize: 11, color: "var(--color-neutral-600)", letterSpacing: "0.06em" }}>{t.ampm}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0, borderLeft: "2px solid var(--color-accent-300)", paddingLeft: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{t.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 2 }}>{t.teacher}</div>
            </div>
            {t.spots > 0 ? (
              <span className="tag tag-outline" style={{ flex: "none" }}>{t.spots} left</span>
            ) : (
              <button className="btn btn-ghost" style={{ flex: "none", padding: "7px 12px", fontSize: 12 }} onClick={() => api.waitlist(t.id).then(() => flash("Added to the waitlist for " + t.title))}>Waitlist</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
