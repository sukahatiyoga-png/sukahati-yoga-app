import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { api, type ActivePass, type BookingCustomer, type Pkg, type PublicTeacher, type SessionSlot, type StudioPhoto } from "../lib/api";
import { money } from "../lib/format";
import { isoDate } from "../lib/dates";
import { screenPad, kicker, h1, h2 } from "../styles/shared";
import Countdown from "../components/Countdown";
import Reveal3D from "../components/Reveal3D";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { me, goTab, goBook, openPackageSheet, flash } = useApp();
  const [nextBooking, setNextBooking] = useState<BookingCustomer | null>(null);
  const [pass, setPass] = useState<ActivePass | null>(null);
  const [retreats, setRetreats] = useState<Pkg[]>([]);
  const [events, setEvents] = useState<Pkg[]>([]);
  const [today, setToday] = useState<SessionSlot[]>([]);
  const [unread, setUnread] = useState(0);
  const [teachers, setTeachers] = useState<PublicTeacher[]>([]);
  const [studioPhotos, setStudioPhotos] = useState<StudioPhoto[]>([]);

  useEffect(() => {
    const todayIso = isoDate(new Date());
    api.myBookings().then((b) => setNextBooking(b.upcoming[0] || null));
    api.activePass(me.id).then(setPass);
    api.packages().then((list) => {
      setRetreats(list.filter((p) => p.kind === "retreat" && p.retreat));
      setEvents(list.filter((p) => p.kind === "event" && p.event));
    });
    api.sessions({ date: todayIso }).then(setToday);
    api.notifications().then((list) => setUnread(list.filter((n) => n.unread).length));
    api.teachers().then(setTeachers).catch(() => {});
    api.studioPhotos().then(setStudioPhotos).catch(() => {});
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

      {retreats.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}>
            <h2 style={h2}>Retreats</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {retreats.map((retreat) => retreat.retreat && (
              <div key={retreat.id} style={{ background: "var(--color-accent-2-200)", borderRadius: "var(--radius-lg)", padding: 18, cursor: "pointer" }} onClick={() => openPackageSheet(retreat.id)}>
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
            ))}
          </div>
        </>
      )}

      {events.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}>
            <h2 style={h2}>Upcoming events</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {events.map((ev) => ev.event && (
              <div key={ev.id} style={{ background: "var(--color-accent-200)", borderRadius: "var(--radius-lg)", padding: 18, cursor: "pointer" }} onClick={() => openPackageSheet(ev.id)}>
                {ev.event.earlyBirdSaveMinor > 0 && (
                  <span className="tag tag-accent" style={{ marginBottom: 10 }}>Early bird · save {money(ev.event.earlyBirdSaveMinor)}</span>
                )}
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, lineHeight: 1.18 }}>{ev.name}</div>
                <div style={{ fontSize: 13, color: "var(--color-accent-800)", marginTop: 7, lineHeight: 1.45 }}>{ev.desc}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 22 }}>{money(ev.priceMinor)}</span>
                  <span style={{ fontSize: 12.5, color: "var(--color-accent-800)" }}>
                    {new Date(ev.event.startsAt).toLocaleDateString("en-MY", { month: "short", day: "numeric" })} · {ev.event.placesLeft} places left
                  </span>
                </div>
                <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--color-accent-900)" }}>
                  <Countdown startsAt={ev.event.startsAt} />
                </div>
              </div>
            ))}
          </div>
        </>
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

      {teachers.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}>
            <h2 style={h2}>Meet your teachers</h2>
          </div>
          <div style={{ display: "flex", gap: 12, overflow: "auto", paddingBottom: 6 }}>
            {teachers.map((t, i) => {
              const initials = t.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
              return (
                <Reveal3D key={t.id} delayMs={i * 70} style={{ flex: "none", width: 210 }}>
                  <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: 16, height: "100%", boxSizing: "border-box" }}>
                    {t.photoUrl ? (
                      <img src={t.photoUrl} alt={t.name} style={{ width: 64, height: 64, borderRadius: 999, objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: 999, background: "linear-gradient(135deg, var(--color-accent-400), var(--color-accent-2-500))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heading)", fontSize: 22 }}>
                        {initials}
                      </div>
                    )}
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, marginTop: 12 }}>{t.name}</div>
                    {t.specialties.length > 0 && (
                      <div style={{ fontSize: 11.5, color: "var(--color-accent-700)", fontWeight: 600, marginTop: 3 }}>{t.specialties.join(" · ")}</div>
                    )}
                    {t.bio && (
                      <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 8, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {t.bio}
                      </div>
                    )}
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
