import { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { api, type ActivePass, type BookingCustomer, type Pkg, type SessionSlot } from "../lib/api";
import { money } from "../lib/format";
import { buildDays } from "../lib/dates";
import { screenPad, kicker, h2 } from "../styles/shared";
import Countdown from "../components/Countdown";
import Reveal3D from "../components/Reveal3D";

const homeHeroUrl = new URL("../assets/studio.jpg", import.meta.url).toString();

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg, var(--color-accent-400), var(--color-accent-600))",
  "linear-gradient(135deg, var(--color-accent-2-400), var(--color-accent-2-600))",
  "linear-gradient(135deg, var(--color-accent-500), var(--color-accent-2-500))",
  "linear-gradient(135deg, var(--color-accent-2-500), var(--color-accent-600))",
];
function gradientFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_GRADIENTS[h % PLACEHOLDER_GRADIENTS.length];
}

type Pill = "All" | "Retreats" | "Events";
const PILLS: Pill[] = ["All", "Retreats", "Events"];

interface ExploreCard {
  key: string; kindLabel: string; title: string; meta: string; priceMinor: number;
  imageUrl: string; badge?: string; countdownAt?: string; onClick: () => void;
}

export default function Home() {
  const { me, goTab, goBook, openPackageSheet, openRetreatDetail, flash } = useApp();
  const [nextBooking, setNextBooking] = useState<BookingCustomer | null>(null);
  const [pass, setPass] = useState<ActivePass | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [unread, setUnread] = useState(0);
  const [pill, setPill] = useState<Pill>("All");
  const calDays = useMemo(() => buildDays(7), []);
  const [calDayId, setCalDayId] = useState(calDays[0].id);
  const [calSessions, setCalSessions] = useState<SessionSlot[]>([]);

  useEffect(() => {
    api.myBookings().then((b) => setNextBooking(b.upcoming[0] || null));
    api.activePass(me.id).then(setPass);
    api.packages().then(setPackages);
    api.notifications().then((list) => setUnread(list.filter((n) => n.unread).length));
  }, [me.id]);

  useEffect(() => { api.sessions({ date: calDayId }).then(setCalSessions); }, [calDayId]);

  const retreats = useMemo(() => packages.filter((p) => p.kind === "retreat" && p.retreat), [packages]);
  const events = useMemo(() => packages.filter((p) => p.kind === "event" && p.event), [packages]);

  const initials = me.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const retreatCards: ExploreCard[] = retreats.map((r) => ({
    key: "retreat-" + r.id, kindLabel: "Retreat", title: r.name,
    meta: r.retreat ? `${new Date(r.retreat.startsOn).toLocaleDateString("en-MY", { month: "short", day: "numeric" })} · ${r.retreat.placesLeft} left` : "",
    priceMinor: r.priceMinor, imageUrl: r.imageUrl,
    badge: r.retreat && r.retreat.earlyBirdSaveMinor > 0 ? "Early bird" : undefined,
    onClick: () => openRetreatDetail(r.id),
  }));
  const eventCards: ExploreCard[] = events.map((e) => ({
    key: "event-" + e.id, kindLabel: "Event", title: e.name,
    meta: e.event ? `${new Date(e.event.startsAt).toLocaleDateString("en-MY", { month: "short", day: "numeric" })} · ${e.event.placesLeft} left` : "",
    priceMinor: e.priceMinor, imageUrl: e.imageUrl, countdownAt: e.event?.startsAt,
    badge: e.event && e.event.earlyBirdSaveMinor > 0 ? "Early bird" : undefined,
    onClick: () => openPackageSheet(e.id),
  }));

  const railCards: ExploreCard[] =
    pill === "Retreats" ? retreatCards
    : pill === "Events" ? eventCards
    : [...retreatCards, ...eventCards];

  const featured: ExploreCard | null =
    [...retreatCards, ...eventCards].find((c) => c.badge) ||
    retreatCards[0] || eventCards[0] || null;

  return (
    <div style={screenPad}>
      <Reveal3D delayMs={0}>
        <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", position: "relative" }}>
          <img src={homeHeroUrl} alt="" style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.82) 100%)" }} />
          <button
            style={{ position: "absolute", top: 14, left: 14, width: 40, height: 40, borderRadius: 999, border: 0, background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text)" }}
            onClick={() => goTab("alerts")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" /><path d="M10.5 20a2 2 0 0 0 3 0" /></svg>
            {unread > 0 && (
              <span style={{ position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 999, background: "var(--color-accent-500)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid #fff" }}>
                {unread}
              </span>
            )}
          </button>
          <button
            style={{ position: "absolute", top: 14, right: 14, width: 40, height: 40, borderRadius: 999, border: 0, background: "rgba(255,255,255,0.92)", color: "var(--color-accent-2-900)", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            onClick={() => goTab("profile")}
          >
            {initials}
          </button>
          <div style={{ position: "absolute", left: 16, right: 16, bottom: 14 }}>
            <div style={{ ...kicker, color: "var(--color-accent-200)", textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}>Sukahati Yoga · Kuala Lumpur</div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "#fff", marginTop: 4, textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}>{greeting()}, {me.name.split(" ")[0]}</div>
          </div>
        </div>
      </Reveal3D>

      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 32, lineHeight: 1.12, margin: "18px 0 0" }}>
        Breathe in,<br /><span style={{ color: "var(--color-accent-600)" }}>find your flow.</span>
      </h1>

      <button
        onClick={() => goTab("search")}
        style={{ marginTop: 16, width: "100%", display: "flex", alignItems: "center", gap: 10, border: 0, cursor: "pointer", textAlign: "left", background: "var(--color-neutral-100)", borderRadius: 999, padding: "13px 16px", boxShadow: "var(--shadow-sm)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-600)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <span style={{ flex: 1, fontSize: 13.5, color: "var(--color-neutral-600)" }}>Search classes, teachers, retreats…</span>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-600)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
      </button>

      {nextBooking && (
        <div style={{ marginTop: 16, background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: 16, boxShadow: "var(--shadow-sm)", cursor: "pointer" }} onClick={() => goTab("bookings")}>
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

      {pass && (
        <div style={{ marginTop: 14, background: "var(--color-accent-200)", borderRadius: "var(--radius-lg)", padding: 16, cursor: "pointer" }} onClick={() => goTab("bookings")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{pass.packageName}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--color-accent-800)" }}>{pass.daysLeft} days left</div>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: "var(--color-accent-300)", marginTop: 10, overflow: "hidden" }}>
            <div style={{ width: `${pass.pct}%`, height: "100%", background: "var(--color-accent-600)", borderRadius: 999 }} />
          </div>
        </div>
      )}

      {featured && (
        <Reveal3D delayMs={0} style={{ marginTop: 22 }}>
          <div
            onClick={featured.onClick}
            style={{
              cursor: "pointer", borderRadius: "var(--radius-lg)", overflow: "hidden", position: "relative",
              height: 190, display: "flex", alignItems: "flex-end",
              background: featured.imageUrl ? `url(${featured.imageUrl})` : gradientFor(featured.key),
              backgroundSize: "cover", backgroundPosition: "center",
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.68) 100%)" }} />
            {featured.badge && (
              <span style={{ position: "absolute", top: 14, left: 14, background: "rgba(255,255,255,0.92)", color: "var(--color-accent-800)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", padding: "5px 11px", borderRadius: 999 }}>
                {featured.badge}
              </span>
            )}
            <div style={{ position: "relative", padding: 18, color: "#fff", width: "100%", boxSizing: "border-box" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 21, lineHeight: 1.2 }}>{featured.title}</div>
              <div style={{ fontSize: 12.5, marginTop: 4, opacity: 0.92 }}>{featured.meta}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>{money(featured.priceMinor)}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: "var(--color-accent-800)", fontSize: 12.5, fontWeight: 700, padding: "9px 15px", borderRadius: 999 }}>
                  Explore Now
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
                </span>
              </div>
            </div>
          </div>
        </Reveal3D>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 22, overflow: "auto", paddingBottom: 4 }}>
        {PILLS.map((p) => (
          <button
            key={p} onClick={() => setPill(p)}
            style={{ flex: "none", border: 0, cursor: "pointer", borderRadius: 999, padding: "9px 16px", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-body)", background: pill === p ? "var(--color-neutral-900)" : "var(--color-neutral-100)", color: pill === p ? "#fff" : "var(--color-text)" }}
          >
            {p}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {railCards.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>Nothing here right now.</div>}
        {railCards.map((c, i) => (
          <Reveal3D key={c.key} delayMs={Math.min(i, 4) * 60}>
            <div onClick={c.onClick} style={{ cursor: "pointer", display: "flex", gap: 12, alignItems: "center", background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: 12 }}>
              <div style={{
                flex: "none", width: 64, height: 64, borderRadius: "var(--radius-sm)", overflow: "hidden",
                background: c.imageUrl ? `url(${c.imageUrl})` : gradientFor(c.key), backgroundSize: "cover", backgroundPosition: "center",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {!c.imageUrl && <span style={{ color: "#fff", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{c.kindLabel}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
                <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>{c.meta}</div>
                {c.countdownAt && <div style={{ fontSize: 11.5, color: "var(--color-accent-700)", marginTop: 3 }}><Countdown startsAt={c.countdownAt} /></div>}
              </div>
              <div style={{ flex: "none", fontFamily: "var(--font-heading)", fontSize: 16 }}>{money(c.priceMinor)}</div>
            </div>
          </Reveal3D>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}>
        <h2 style={h2}>Class calendar</h2>
      </div>
      <div style={{ display: "flex", gap: 8, overflow: "auto", paddingBottom: 4 }}>
        {calDays.map((d) => (
          <button
            key={d.id} onClick={() => setCalDayId(d.id)}
            style={{ flex: "none", width: 52, border: 0, borderRadius: 16, padding: "10px 0", cursor: "pointer", fontFamily: "var(--font-body)", textAlign: "center", background: calDayId === d.id ? "var(--color-neutral-900)" : "var(--color-neutral-100)", color: calDayId === d.id ? "#fff" : "var(--color-text)" }}
          >
            <div style={{ fontSize: 10, letterSpacing: "0.06em", opacity: 0.78 }}>{d.dow}</div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, lineHeight: 1.2, marginTop: 3 }}>{d.num}</div>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
        {calSessions.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No classes scheduled this day.</div>}
        {calSessions.map((s) => (
          <div key={s.id} style={{ display: "flex", gap: 12, alignItems: "center", background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
            <div style={{ flex: "none", width: 50 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.time}</div>
              <div style={{ fontSize: 10.5, color: "var(--color-neutral-600)" }}>{s.ampm}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0, borderLeft: "2px solid var(--color-accent-300)", paddingLeft: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div>
              <div style={{ fontSize: 11.5, color: "var(--color-neutral-700)", marginTop: 1 }}>{s.teacher}</div>
            </div>
            {s.spots > 0 ? (
              <button className="btn btn-secondary" style={{ flex: "none", padding: "7px 12px", fontSize: 11.5 }} onClick={() => goBook({ sessionId: s.id })}>Book</button>
            ) : (
              <button className="btn btn-ghost" style={{ flex: "none", padding: "7px 12px", fontSize: 11.5 }} onClick={() => api.waitlist(s.id).then(() => flash("Added to the waitlist for " + s.title))}>Waitlist</button>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
