import { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { api, type ActivePass, type BookingCustomer, type Pkg, type PublicTeacher, type SessionSlot, type StudioPhoto, type StudioProfileData } from "../lib/api";
import { money } from "../lib/format";
import { isoDate, buildDays } from "../lib/dates";
import { screenPad, kicker, h2 } from "../styles/shared";
import Countdown from "../components/Countdown";
import Reveal3D from "../components/Reveal3D";

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

interface ExploreCard {
  key: string; kindLabel: string; title: string; meta: string; priceMinor: number;
  imageUrl: string; badge?: string; countdownAt?: string; onClick: () => void;
}

export default function Home() {
  const { me, goTab, goBook, openPackageSheet, openRetreatDetail, flash } = useApp();
  const [nextBooking, setNextBooking] = useState<BookingCustomer | null>(null);
  const [pass, setPass] = useState<ActivePass | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [today, setToday] = useState<SessionSlot[]>([]);
  const [unread, setUnread] = useState(0);
  const [teachers, setTeachers] = useState<PublicTeacher[]>([]);
  const [studioPhotos, setStudioPhotos] = useState<StudioPhoto[]>([]);
  const [studioProfile, setStudioProfile] = useState<StudioProfileData | null>(null);
  const calDays = useMemo(() => buildDays(7), []);
  const [calDayId, setCalDayId] = useState(calDays[0].id);
  const [calSessions, setCalSessions] = useState<SessionSlot[]>([]);

  useEffect(() => {
    const todayIso = isoDate(new Date());
    api.myBookings().then((b) => setNextBooking(b.upcoming[0] || null));
    api.activePass(me.id).then(setPass);
    api.packages().then(setPackages);
    api.sessions({ date: todayIso }).then(setToday);
    api.notifications().then((list) => setUnread(list.filter((n) => n.unread).length));
    api.teachers().then(setTeachers).catch(() => {});
    api.studioPhotos().then(setStudioPhotos).catch(() => {});
    api.studioProfile().then(setStudioProfile).catch(() => {});
  }, [me.id]);

  useEffect(() => { api.sessions({ date: calDayId }).then(setCalSessions); }, [calDayId]);

  const retreats = useMemo(() => packages.filter((p) => p.kind === "retreat" && p.retreat), [packages]);
  const events = useMemo(() => packages.filter((p) => p.kind === "event" && p.event), [packages]);
  const plainPackages = useMemo(() => packages.filter((p) => p.kind !== "retreat" && p.kind !== "event"), [packages]);

  const initials = me.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const classCards: ExploreCard[] = today.map((t) => ({
    key: "class-" + t.id, kindLabel: "Class", title: t.title, meta: `${t.time} ${t.ampm} · ${t.teacher}`,
    priceMinor: t.price, imageUrl: "", onClick: () => goBook({ sessionId: t.id }),
  }));
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
  const packageCards: ExploreCard[] = plainPackages.map((p) => ({
    key: "package-" + p.id, kindLabel: "Package", title: p.name, meta: p.unit,
    priceMinor: p.priceMinor, imageUrl: p.imageUrl,
    badge: p.recommended ? "Recommended" : undefined,
    onClick: () => openPackageSheet(p.id),
  }));

  const exploreCards: ExploreCard[] = [...retreatCards, ...eventCards, ...packageCards, ...classCards];

  const distinctStyles = useMemo(() => new Set(teachers.flatMap((t) => t.specialties)).size, [teachers]);

  const featured: ExploreCard | null =
    [...retreatCards, ...eventCards, ...packageCards].find((c) => c.badge) ||
    retreatCards[0] || eventCards[0] || packageCards[0] || null;

  return (
    <div style={screenPad}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={kicker}>Sukahati Yoga · Kuala Lumpur</div>
          <div style={{ fontSize: 14.5, color: "var(--color-neutral-700)", marginTop: 4 }}>{greeting()}, {me.name.split(" ")[0]}</div>
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

      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 32, lineHeight: 1.12, margin: "16px 0 0" }}>
        Where do you<br /><span style={{ color: "var(--color-accent-600)" }}>want to practice?</span>
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

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}>
        <h2 style={h2}>Explore</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {exploreCards.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>Nothing here right now.</div>}
        {exploreCards.map((c, i) => (
          <Reveal3D key={c.key} delayMs={Math.min(i, 5) * 60}>
            <div onClick={c.onClick} style={{ cursor: "pointer", borderRadius: "var(--radius-lg)", overflow: "visible" }}>
              <div style={{
                height: 172, borderRadius: "var(--radius-lg)", position: "relative", overflow: "hidden",
                background: c.imageUrl ? `url(${c.imageUrl})` : gradientFor(c.key), backgroundSize: "cover", backgroundPosition: "center",
              }}>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.4) 100%)" }} />
                <span style={{ position: "absolute", top: 12, left: 12, background: "rgba(255,255,255,0.92)", color: "var(--color-neutral-800)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "5px 11px", borderRadius: 999 }}>
                  {c.kindLabel}
                </span>
                {c.badge && (
                  <span style={{ position: "absolute", top: 12, right: 12, background: "var(--color-accent-600)", color: "#fff", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.03em", padding: "5px 11px", borderRadius: 999 }}>
                    {c.badge}
                  </span>
                )}
                <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, color: "#fff" }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, lineHeight: 1.2 }}>{c.title}</div>
                  {c.countdownAt && <div style={{ fontSize: 11.5, marginTop: 4, opacity: 0.95 }}><Countdown startsAt={c.countdownAt} /></div>}
                </div>
              </div>
              <div style={{
                margin: "-22px 12px 0", position: "relative", background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-md)", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.meta}</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: 18, marginTop: 3 }}>{money(c.priceMinor)}</div>
                </div>
                <span style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 6, background: "var(--color-neutral-900)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "9px 14px", borderRadius: 999 }}>
                  View
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
                </span>
              </div>
            </div>
          </Reveal3D>
        ))}
      </div>

      {studioProfile && (
        <Reveal3D delayMs={0} style={{ marginTop: 26 }}>
          <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{
              height: 170, position: "relative", display: "flex", alignItems: "flex-end",
              background: studioProfile.imageUrl ? `url(${studioProfile.imageUrl})` : "linear-gradient(135deg, var(--color-accent-500), var(--color-accent-2-600))",
              backgroundSize: "cover", backgroundPosition: "center",
            }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.62) 100%)" }} />
              <div style={{ position: "relative", padding: 16, color: "#fff" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>{studioProfile.aboutTitle}</div>
              </div>
            </div>
            <div style={{ background: "var(--color-neutral-100)", padding: 16 }}>
              <div style={{ fontSize: 13.5, color: "var(--color-neutral-800)", lineHeight: 1.6 }}>{studioProfile.aboutBody}</div>
              <div style={{ display: "flex", marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--color-divider)" }}>
                <Stat value={String(teachers.length)} label="Teachers" />
                <Stat value={String(distinctStyles)} label="Styles" />
                <Stat value={String(plainPackages.length)} label="Packages" />
              </div>
            </div>
          </div>
        </Reveal3D>
      )}

      {plainPackages.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}>
            <h2 style={h2}>Our services</h2>
          </div>
          <div style={{ display: "flex", gap: 12, overflow: "auto", paddingBottom: 6 }}>
            {plainPackages.map((p, i) => (
              <Reveal3D key={p.id} delayMs={i * 70} style={{ flex: "none", width: 190 }}>
                <div onClick={() => openPackageSheet(p.id)} style={{ cursor: "pointer", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--color-neutral-100)", boxShadow: "var(--shadow-sm)" }}>
                  <div style={{
                    height: 110, position: "relative", display: "flex", alignItems: "flex-end",
                    background: p.imageUrl ? `url(${p.imageUrl})` : gradientFor(p.id), backgroundSize: "cover", backgroundPosition: "center",
                  }}>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)" }} />
                    <div style={{ position: "relative", padding: "10px 12px", color: "#fff", fontFamily: "var(--font-heading)", fontSize: 15.5, lineHeight: 1.2 }}>{p.name}</div>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: 15 }}>{money(p.priceMinor)}</div>
                    <div style={{ fontSize: 11, color: "var(--color-neutral-600)", marginTop: 2 }}>{p.unit}</div>
                  </div>
                </div>
              </Reveal3D>
            ))}
          </div>
        </>
      )}

      {teachers.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}>
            <h2 style={h2}>Meet your teachers</h2>
          </div>
          <div style={{ display: "flex", gap: 12, overflow: "auto", paddingBottom: 6 }}>
            {teachers.map((t, i) => {
              const tInitials = t.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
              return (
                <Reveal3D key={t.id} delayMs={i * 70} style={{ flex: "none", width: 200 }}>
                  <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--color-neutral-100)", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{
                      height: 130, position: "relative", display: "flex", alignItems: "flex-end",
                      background: t.photoUrl ? `url(${t.photoUrl})` : "linear-gradient(135deg, var(--color-accent-400), var(--color-accent-2-500))",
                      backgroundSize: "cover", backgroundPosition: "center",
                    }}>
                      {!t.photoUrl && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-heading)", fontSize: 30 }}>{tInitials}</div>
                      )}
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
                      <div style={{ position: "relative", padding: "10px 12px", color: "#fff", fontFamily: "var(--font-heading)", fontSize: 16 }}>{t.name}</div>
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      {t.specialties.length > 0 && (
                        <div style={{ fontSize: 11, color: "var(--color-accent-700)", fontWeight: 700, letterSpacing: "0.02em" }}>{t.specialties.join(" · ")}</div>
                      )}
                      {t.bio && (
                        <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 6, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {t.bio}
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal3D>
              );
            })}
          </div>
        </>
      )}

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}>
        <h2 style={h2}>Our studio</h2>
      </div>
      <div style={{ display: "flex", gap: 12, overflow: "auto", paddingBottom: 6 }}>
        {(studioPhotos.length > 0 ? studioPhotos : STUDIO_PLACEHOLDERS).map((p, i) => (
          <Reveal3D key={"id" in p ? p.id : p.label} delayMs={i * 70} style={{ flex: "none", width: 170 }}>
            {"imageUrl" in p ? (
              <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                <img src={p.imageUrl} alt={p.caption || "Studio"} style={{ width: 170, height: 130, objectFit: "cover", display: "block" }} />
                {p.caption && <div style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, background: "var(--color-neutral-100)" }}>{p.caption}</div>}
              </div>
            ) : (
              <div style={{ width: 170, height: 130, borderRadius: "var(--radius-lg)", background: p.gradient, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#fff" }}>
                {p.icon}
                <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "0.02em" }}>{p.label}</span>
              </div>
            )}
          </Reveal3D>
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--color-neutral-600)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function GalleryIcon({ d }: { d: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity={0.9}><path d={d} /></svg>
  );
}

const STUDIO_PLACEHOLDERS = [
  { label: "Studio A", gradient: "linear-gradient(135deg, var(--color-accent-400), var(--color-accent-600))", icon: <GalleryIcon d="M4 20 12 4l8 16Z" /> },
  { label: "Reception", gradient: "linear-gradient(135deg, var(--color-accent-2-400), var(--color-accent-2-600))", icon: <GalleryIcon d="M3 10 12 4l9 6v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /> },
  { label: "Garden deck", gradient: "linear-gradient(135deg, var(--color-accent-500), var(--color-accent-2-500))", icon: <GalleryIcon d="M12 3a5 5 0 0 1 5 5c0 3-5 9-5 9s-5-6-5-9a5 5 0 0 1 5-5Z" /> },
  { label: "Practice room", gradient: "linear-gradient(135deg, var(--color-accent-2-500), var(--color-accent-600))", icon: <GalleryIcon d="M12 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM6 20c0-3 3-5 6-5s6 2 6 5" /> },
];
