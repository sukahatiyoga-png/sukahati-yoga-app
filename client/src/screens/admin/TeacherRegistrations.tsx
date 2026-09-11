import { useEffect, useState } from "react";
import { api, type TeacherProfileItem, type TeacherRegDashboard, type TeacherRegRow, type TeacherVisitItem } from "../../lib/api";

const STATUS_FILTERS = ["All", "Pending", "Approved", "Active", "Archived"];
const STATUS_TAG_CLASS: Record<string, string> = { pending: "tag-accent", approved: "tag-accent-2", active: "tag-accent-2", archived: "tag-neutral" };
const VISIT_LABELS: Record<string, string> = {
  guest_teacher: "Guest Teacher", workshop: "Workshop", retreat: "Retreat",
  teacher_training: "Teacher Training", private_session: "Private Session", special_event: "Special Event", other: "Other",
};

export default function TeacherRegistrations() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (selectedId) return <TeacherDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  return <TeacherList onSelect={setSelectedId} />;
}

function TeacherList({ onSelect }: { onSelect: (id: string) => void }) {
  const [dash, setDash] = useState<TeacherRegDashboard | null>(null);
  const [rows, setRows] = useState<TeacherRegRow[]>([]);
  const [status, setStatus] = useState("All");
  const [q, setQ] = useState("");

  useEffect(() => { api.adminTeacherReg.dashboard().then(setDash); }, []);
  useEffect(() => {
    api.adminTeacherReg.list({ status: status === "All" ? undefined : status, q: q || undefined }).then(setRows);
  }, [status, q]);

  return (
    <>
      {dash && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 20 }}>
          <StatCard value={dash.totalTeachers} label="Total teachers" bg="var(--color-accent-200)" fg="var(--color-accent-800)" />
          <StatCard value={dash.pendingRegistrations} label="Pending registrations" bg="var(--color-neutral-100)" fg="var(--color-neutral-700)" />
          <StatCard value={dash.upcomingTeachers} label="Upcoming teachers" bg="var(--color-accent-2-200)" fg="var(--color-accent-2-900)" />
          <StatCard value={dash.thisMonth} label="This month" bg="var(--color-neutral-100)" fg="var(--color-neutral-700)" />
          <div style={{ gridColumn: "1 / -1" }}><StatCard value={dash.completedVisits} label="Completed visits" bg="var(--color-neutral-100)" fg="var(--color-neutral-700)" /></div>
        </div>
      )}

      <div className="field" style={{ marginTop: 20 }}>
        <label htmlFor="tq">Find a teacher</label>
        <input className="input" id="tq" placeholder="Name, email, Teacher ID or country" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, overflow: "auto", paddingBottom: 4 }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f} onClick={() => setStatus(f)}
            style={{ flex: "none", border: 0, borderRadius: 999, padding: "9px 15px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, background: status === f ? "var(--color-accent-500)" : "var(--color-neutral-100)", color: status === f ? "#fff" : "var(--color-text)" }}
          >
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {rows.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No teachers match this filter.</div>}
        {rows.map((r) => (
          <div key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: "pointer", background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "15px 16px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: "none", width: 40, height: 40, borderRadius: 999, background: "var(--color-accent-2-300)", color: "var(--color-accent-2-900)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13.5 }}>{r.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>{r.teacherCode} · {r.style} · next {r.nextVisit}</div>
            </div>
            <span className={`tag ${STATUS_TAG_CLASS[r.status] || "tag-neutral"}`} style={{ flex: "none", textTransform: "capitalize" }}>{r.status}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function StatCard({ value, label, bg, fg }: { value: number; label: string; bg: string; fg: string }) {
  return (
    <div style={{ background: bg, borderRadius: "var(--radius-md)", padding: 16 }}>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 27, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: fg, marginTop: 4 }}>{label}</div>
    </div>
  );
}

const TABS = ["Overview", "Visits", "Sessions", "Documents", "Notes"] as const;
type Tab = (typeof TABS)[number];

function TeacherDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [profile, setProfile] = useState<TeacherProfileItem | null>(null);
  const [visits, setVisits] = useState<TeacherVisitItem[]>([]);
  const [tab, setTab] = useState<Tab>("Overview");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    api.adminTeacherReg.detail(id).then((r) => { setProfile(r.profile); setVisits(r.visits); setNotes(r.profile.adminNotes || ""); });
  }
  useEffect(reload, [id]);

  async function setStatus(status: string) {
    await api.adminTeacherReg.setStatus(id, status);
    reload();
  }
  async function saveNotes() {
    setSaving(true);
    try { await api.adminTeacherReg.setNotes(id, notes); } finally { setSaving(false); }
  }
  async function setVisitStatus(visitId: string, status: string) {
    await api.adminTeacherReg.setVisitStatus(visitId, status);
    reload();
  }
  async function deleteVisit(visitId: string) {
    if (!window.confirm("Delete this visit and its sessions? This can't be undone.")) return;
    await api.adminTeacherReg.deleteVisit(visitId);
    reload();
  }
  async function deleteProfile() {
    if (!profile) return;
    if (!window.confirm(`Delete ${profile.fullName}'s teacher profile, including all visits and sessions? This can't be undone.`)) return;
    await api.adminTeacherReg.delete(id);
    onBack();
  }

  if (!profile) return null;

  return (
    <>
      <button className="btn btn-ghost" style={{ marginTop: 20, padding: "6px 4px", fontSize: 13 }} onClick={onBack}>← All teachers</button>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
        <div style={{ flex: "none", width: 56, height: 56, borderRadius: 999, overflow: "hidden", background: "var(--color-accent-2-300)", color: "var(--color-accent-2-900)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18 }}>
          {profile.profilePhotoUrl ? <img src={profile.profilePhotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : profile.fullName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 22 }}>{profile.fullName}</div>
          <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 2 }}>{profile.teacherCode}</div>
        </div>
        <span className={`tag ${STATUS_TAG_CLASS[profile.status] || "tag-neutral"}`} style={{ flex: "none", textTransform: "capitalize" }}>{profile.status}</span>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
        {["pending", "approved", "active", "archived"].map((s) => (
          <button key={s} className={s === profile.status ? "btn btn-primary" : "btn btn-secondary"} style={{ padding: "7px 13px", fontSize: 12, textTransform: "capitalize" }} onClick={() => setStatus(s)}>{s}</button>
        ))}
        <button className="btn btn-ghost" style={{ padding: "7px 13px", fontSize: 12, color: "var(--color-accent-700)" }} onClick={deleteProfile}>Delete profile</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 18, overflow: "auto", paddingBottom: 4 }}>
        {TABS.map((t) => (
          <button
            key={t} onClick={() => setTab(t)}
            style={{ flex: "none", border: 0, borderRadius: 999, padding: "9px 15px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, background: tab === t ? "var(--color-accent-500)" : "var(--color-neutral-100)", color: tab === t ? "#fff" : "var(--color-text)" }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab profile={profile} />}
      {tab === "Visits" && <VisitsTab visits={visits} onStatus={setVisitStatus} onDelete={deleteVisit} />}
      {tab === "Sessions" && <SessionsTab visits={visits} />}
      {tab === "Documents" && <DocumentsTab profile={profile} />}
      {tab === "Notes" && (
        <div style={{ marginTop: 18 }}>
          <div className="field">
            <label htmlFor="tn">Internal admin notes</label>
            <textarea className="input" id="tn" style={{ borderRadius: "var(--radius-md)", minHeight: 140, padding: "12px 16px", resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ marginTop: 10, padding: "10px 18px" }} disabled={saving} onClick={saveNotes}>{saving ? "Saving…" : "Save notes"}</button>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--color-divider)", fontSize: 13.5 }}>
      <span style={{ color: "var(--color-neutral-700)" }}>{label}</span><span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function OverviewTab({ profile }: { profile: TeacherProfileItem }) {
  return (
    <div style={{ marginTop: 6 }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 19, margin: "20px 0 6px" }}>Personal</h2>
      <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        <Row label="Email" value={profile.email} />
        <Row label="Phone" value={profile.phone} />
        <Row label="Location" value={[profile.city, profile.country].filter(Boolean).join(", ") || "—"} />
        <Row label="Instagram" value={profile.instagram} />
        <Row label="Website" value={profile.website} />
        <Row label="Member since" value={new Date(profile.createdAt).toLocaleDateString()} />
      </div>

      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 19, margin: "22px 0 6px" }}>Teaching background</h2>
      <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        <Row label="Styles" value={profile.teachingStyles.join(", ") || "—"} />
        <Row label="Years experience" value={profile.yearsExperience} />
        <Row label="Specialties" value={profile.teachingSpecialties} />
      </div>

      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 19, margin: "22px 0 6px" }}>Certifications</h2>
      <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        <Row label="Certification" value={profile.certification} />
        <Row label="School" value={profile.certificationSchool} />
        <Row label="Level" value={profile.certificationLevel} />
      </div>

      {profile.bio && (
        <>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 19, margin: "22px 0 6px" }}>Bio</h2>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--color-neutral-800)" }}>{profile.bio}</div>
        </>
      )}
    </div>
  );
}

function VisitsTab({ visits, onStatus, onDelete }: { visits: TeacherVisitItem[]; onStatus: (visitId: string, status: string) => void; onDelete: (visitId: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
      {visits.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No visits recorded yet.</div>}
      {visits.map((v) => (
        <div key={v.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{v.title || VISIT_LABELS[v.visitType] || v.visitType}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>
                {VISIT_LABELS[v.visitType] || v.visitType} · {v.proposedDate ? new Date(v.proposedDate).toDateString() : "date TBC"} · {v.numberOfSessions} session{v.numberOfSessions === 1 ? "" : "s"}
              </div>
            </div>
            <span className="tag tag-outline" style={{ flex: "none", textTransform: "capitalize" }}>{v.status}</span>
          </div>
          {v.description && <div style={{ fontSize: 13, color: "var(--color-neutral-800)", marginTop: 10, lineHeight: 1.5 }}>{v.description}</div>}
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {["pending", "confirmed", "completed", "cancelled"].map((s) => (
              <button key={s} className={s === v.status ? "btn btn-primary" : "btn btn-secondary"} style={{ padding: "6px 11px", fontSize: 11.5, textTransform: "capitalize" }} onClick={() => onStatus(v.id, s)}>{s}</button>
            ))}
            <button className="btn btn-ghost" style={{ padding: "6px 11px", fontSize: 11.5, color: "var(--color-accent-700)" }} onClick={() => onDelete(v.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionsTab({ visits }: { visits: TeacherVisitItem[] }) {
  const sessions = visits.flatMap((v) => v.sessions.map((s) => ({ ...s, visitTitle: v.title || VISIT_LABELS[v.visitType] })));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
      {sessions.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No individual sessions recorded.</div>}
      {sessions.map((s) => (
        <div key={s.id} style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{s.className || s.visitTitle || "Session"}</div>
            <span className="tag tag-neutral" style={{ textTransform: "capitalize" }}>{s.status}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 4 }}>
            {s.date ? new Date(s.date).toDateString() : "date TBC"} {s.startTime && `· ${s.startTime}`} · {s.yogaStyle || "—"} · {s.duration || "—"} · cap {s.capacity || "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentsTab({ profile }: { profile: TeacherProfileItem }) {
  return (
    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>Profile photo</div>
        {profile.profilePhotoUrl ? (
          <img src={profile.profilePhotoUrl} alt="" style={{ marginTop: 10, width: 120, height: 120, objectFit: "cover", borderRadius: "var(--radius-md)" }} />
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--color-neutral-600)", marginTop: 6 }}>Not provided.</div>
        )}
      </div>
      <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>Certification file</div>
        {profile.certificationFileUrl ? (
          <a href={profile.certificationFileUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ marginTop: 10, padding: "9px 16px", fontSize: 12.5 }}>View file</a>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--color-neutral-600)", marginTop: 6 }}>Not provided.</div>
        )}
      </div>
    </div>
  );
}
