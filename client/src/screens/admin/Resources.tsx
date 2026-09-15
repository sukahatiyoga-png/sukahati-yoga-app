import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { api, type RoomDetail, type RoomItem, type Teacher, type TeacherDetail } from "../../lib/api";
import { fileToDataUrl, MAX_IMAGE_MB } from "../../lib/upload";

type EditTarget = { kind: "teacher" | "room"; id: string | "new" };

export default function Resources() {
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [access, setAccess] = useState<{ name: string; value: string }[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);

  function reload() {
    api.admin.teachers().then(setTeachers);
    api.admin.rooms().then(setRooms);
    api.admin.access().then(setAccess);
    api.admin.conflicts().then((r) => setConflicts(r.notes));
  }
  useEffect(reload, []);

  if (editing?.kind === "teacher") {
    return <TeacherForm id={editing.id === "new" ? null : editing.id} onDone={() => { setEditing(null); reload(); }} />;
  }
  if (editing?.kind === "room") {
    return <RoomForm id={editing.id === "new" ? null : editing.id} onDone={() => { setEditing(null); reload(); }} />;
  }

  return (
    <>
      <StudioProfileEditor />

      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 20, margin: "22px 0 12px" }}>Teachers</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {teachers.map((t) => (
          <div key={t.id} onClick={() => setEditing({ kind: "teacher", id: t.id })} style={{ cursor: "pointer", background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "15px 16px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: "none", width: 38, height: 38, borderRadius: 999, background: "var(--color-accent-300)", color: "var(--color-accent-900)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{t.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>{t.meta}</div>
            </div>
            <span className="tag tag-outline" style={{ flex: "none" }}>{t.load}</span>
          </div>
        ))}
        {teachers.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No teachers yet.</div>}
      </div>
      <button className="btn btn-secondary btn-block" style={{ marginTop: 12, padding: "12px 0" }} onClick={() => setEditing({ kind: "teacher", id: "new" })}>New teacher</button>

      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 20, margin: "24px 0 12px" }}>Rooms and resources</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rooms.map((r) => (
          <div key={r.id} onClick={() => setEditing({ kind: "room", id: r.id })} style={{ cursor: "pointer", background: "var(--color-neutral-100)", borderRadius: "var(--radius-md)", padding: "15px 16px", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>{r.meta}</div>
            </div>
            <span className="tag tag-neutral" style={{ flex: "none" }}>{r.state}</span>
          </div>
        ))}
        {rooms.length === 0 && <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>No rooms yet.</div>}
      </div>
      <button className="btn btn-secondary btn-block" style={{ marginTop: 12, padding: "12px 0" }} onClick={() => setEditing({ kind: "room", id: "new" })}>New room</button>

      {conflicts.length > 0 && (
        <div style={{ marginTop: 16, background: "var(--color-accent-200)", borderRadius: "var(--radius-md)", padding: "15px 16px", display: "flex", gap: 11, alignItems: "flex-start" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-800)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 1 }}><path d="M12 4 3 19h18Z" /><path d="M12 10v4M12 17h.01" /></svg>
          <div style={{ flex: 1, fontSize: 12.5, color: "var(--color-accent-800)", lineHeight: 1.5 }}>{conflicts[0]}</div>
        </div>
      )}

      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 20, margin: "24px 0 12px" }}>Access and security</h2>
      <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        {access.map((a, i) => (
          <div key={a.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "13px 0", borderBottom: i < access.length - 1 ? "1px solid var(--color-divider)" : "none", fontSize: 13.5 }}>
            <span style={{ color: "var(--color-neutral-700)" }}>{a.name}</span><span style={{ fontWeight: 600, textAlign: "right" }}>{a.value}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 12, lineHeight: 1.5 }}>Every change to a booking, price or refund is written to the audit log with the staff account that made it.</div>
    </>
  );
}

function StudioProfileEditor() {
  const { flash } = useApp();
  const [loaded, setLoaded] = useState(false);
  const [aboutTitle, setAboutTitle] = useState("");
  const [aboutBody, setAboutBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.studioProfile().then((p) => {
      setAboutTitle(p.aboutTitle); setAboutBody(p.aboutBody); setImageUrl(p.imageUrl); setLoaded(true);
    });
  }, []);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) { flash(`Please choose a photo under ${MAX_IMAGE_MB}MB`); return; }
    setPhotoBusy(true);
    try { setImageUrl(await fileToDataUrl(file)); } finally { setPhotoBusy(false); }
  }

  async function save() {
    setSaving(true);
    try {
      await api.updateStudioProfile({ aboutTitle, aboutBody, imageUrl });
      flash("Studio profile saved");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: 18, marginTop: 4 }}>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 19 }}>Studio profile</div>
      <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 3 }}>Shown in the "About Sukahati Yoga" section on the customer home page.</div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="sp-title">Title</label>
        <input className="input" id="sp-title" value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="sp-body">About text</label>
        <textarea className="input" id="sp-body" style={{ borderRadius: "var(--radius-md)", minHeight: 80, padding: "12px 16px", resize: "vertical" }} value={aboutBody} onChange={(e) => setAboutBody(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="sp-photo">{photoBusy ? "Uploading…" : imageUrl ? "Photo attached — choose a file to replace" : `Photo — JPG or PNG, up to ${MAX_IMAGE_MB}MB`}</label>
        <input className="input" id="sp-photo" type="file" accept="image/*" disabled={photoBusy} onChange={onPhoto} style={{ borderRadius: "var(--radius-sm)", padding: "10px 14px" }} />
      </div>
      {imageUrl && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <img src={imageUrl} alt="" style={{ width: 90, height: 60, borderRadius: "var(--radius-sm)", objectFit: "cover" }} />
          <button className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12.5, color: "var(--color-accent-700)" }} onClick={() => setImageUrl("")}>Remove photo</button>
        </div>
      )}
      <button className="btn btn-primary" style={{ marginTop: 16, padding: "11px 20px", fontSize: 13.5 }} disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}

function TeacherForm({ id, onDone }: { id: string | null; onDone: () => void }) {
  const { flash } = useApp();
  const isNew = !id;
  const [loaded, setLoaded] = useState(isNew);
  const [name, setName] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [weeklyHourCap, setWeeklyHourCap] = useState("20");
  const [photoUrl, setPhotoUrl] = useState("");
  const [bio, setBio] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.admin.teacherDetail(id).then((t: TeacherDetail) => {
      setName(t.name); setSpecialties(t.specialties.join(", ")); setWeeklyHourCap(String(t.weeklyHourCap));
      setPhotoUrl(t.photoUrl); setBio(t.bio); setLoaded(true);
    });
  }, [id]);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) { flash(`Please choose a photo under ${MAX_IMAGE_MB}MB`); return; }
    setPhotoBusy(true);
    try { setPhotoUrl(await fileToDataUrl(file)); } finally { setPhotoBusy(false); }
  }

  async function save() {
    setSaving(true);
    try {
      const body = { name, specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean), weeklyHourCap: Number(weeklyHourCap) || 20, photoUrl, bio };
      if (isNew) { await api.admin.createTeacher(body); flash("Teacher added"); }
      else { await api.admin.updateTeacher(id!, body); flash("Teacher saved"); }
      onDone();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    if (!window.confirm(`Remove ${name} from the roster?`)) return;
    setDeleting(true);
    try {
      await api.admin.deleteTeacher(id);
      flash("Teacher removed");
      onDone();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not remove teacher");
    } finally {
      setDeleting(false);
    }
  }

  if (!loaded) return null;

  return (
    <div style={{ maxWidth: 480 }}>
      <button className="btn btn-ghost" style={{ marginTop: 4, padding: "6px 4px", fontSize: 13 }} onClick={onDone}>← All resources</button>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, marginTop: 12 }}>{isNew ? "New teacher" : "Edit teacher"}</div>

      <div className="field" style={{ marginTop: 18 }}>
        <label htmlFor="t-name">Name</label>
        <input className="input" id="t-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="t-spec">Specialties — comma separated</label>
        <input className="input" id="t-spec" placeholder="Flow, Yin" value={specialties} onChange={(e) => setSpecialties(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="t-cap">Weekly hour cap</label>
        <input className="input" id="t-cap" type="number" min={0} value={weeklyHourCap} onChange={(e) => setWeeklyHourCap(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="t-bio">Bio — shown to customers</label>
        <textarea className="input" id="t-bio" style={{ borderRadius: "var(--radius-md)", minHeight: 80, padding: "12px 16px", resize: "vertical" }} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="t-photo">{photoBusy ? "Uploading…" : photoUrl ? "Photo attached — choose a file to replace" : `Photo — JPG or PNG, up to ${MAX_IMAGE_MB}MB`}</label>
        <input className="input" id="t-photo" type="file" accept="image/*" disabled={photoBusy} onChange={onPhoto} style={{ borderRadius: "var(--radius-sm)", padding: "10px 14px" }} />
      </div>
      {photoUrl && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <img src={photoUrl} alt="" style={{ width: 56, height: 56, borderRadius: 999, objectFit: "cover" }} />
          <button className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12.5, color: "var(--color-accent-700)" }} onClick={() => setPhotoUrl("")}>Remove photo</button>
        </div>
      )}

      <button className="btn btn-primary btn-block" style={{ marginTop: 20, padding: "15px 0" }} disabled={saving || !name} onClick={save}>
        {saving ? "Saving…" : isNew ? "Add teacher" : "Save changes"}
      </button>
      {!isNew && (
        <button className="btn btn-ghost btn-block" style={{ marginTop: 8, padding: "13px 0", color: "var(--color-accent-700)" }} onClick={remove} disabled={deleting}>
          {deleting ? "Removing…" : "Remove teacher"}
        </button>
      )}
    </div>
  );
}

function RoomForm({ id, onDone }: { id: string | null; onDone: () => void }) {
  const { flash } = useApp();
  const isNew = !id;
  const [loaded, setLoaded] = useState(isNew);
  const [name, setName] = useState("");
  const [matCapacity, setMatCapacity] = useState("");
  const [isAccommodation, setIsAccommodation] = useState(false);
  const [beds, setBeds] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.admin.roomDetail(id).then((r: RoomDetail) => {
      setName(r.name); setMatCapacity(r.matCapacity ? String(r.matCapacity) : ""); setIsAccommodation(r.isAccommodation);
      setBeds(r.beds ? String(r.beds) : ""); setNote(r.note); setLoaded(true);
    });
  }, [id]);

  async function save() {
    setSaving(true);
    try {
      const body = {
        name, matCapacity: matCapacity ? Number(matCapacity) : null, isAccommodation,
        beds: beds ? Number(beds) : null, note,
      };
      if (isNew) { await api.admin.createRoom(body); flash("Room added"); }
      else { await api.admin.updateRoom(id!, body); flash("Room saved"); }
      onDone();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    if (!window.confirm(`Remove ${name}?`)) return;
    setDeleting(true);
    try {
      await api.admin.deleteRoom(id);
      flash("Room removed");
      onDone();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not remove room");
    } finally {
      setDeleting(false);
    }
  }

  if (!loaded) return null;

  return (
    <div style={{ maxWidth: 480 }}>
      <button className="btn btn-ghost" style={{ marginTop: 4, padding: "6px 4px", fontSize: 13 }} onClick={onDone}>← All resources</button>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 24, marginTop: 12 }}>{isNew ? "New room" : "Edit room"}</div>

      <div className="field" style={{ marginTop: 18 }}>
        <label htmlFor="r-name">Name</label>
        <input className="input" id="r-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div style={{ marginTop: 18, background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "4px 16px" }}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 0", cursor: "pointer" }}>
          <div style={{ fontWeight: 600, fontSize: 14.5 }}>Accommodation room</div>
          <input type="checkbox" checked={isAccommodation} onChange={(e) => setIsAccommodation(e.target.checked)} />
        </label>
      </div>

      {isAccommodation ? (
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="r-beds">Beds</label>
          <input className="input" id="r-beds" type="number" min={0} value={beds} onChange={(e) => setBeds(e.target.value)} />
        </div>
      ) : (
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="r-mats">Mat capacity</label>
          <input className="input" id="r-mats" type="number" min={0} value={matCapacity} onChange={(e) => setMatCapacity(e.target.value)} />
        </div>
      )}
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="r-note">Note</label>
        <input className="input" id="r-note" placeholder="e.g. street level, candles allowed" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <button className="btn btn-primary btn-block" style={{ marginTop: 20, padding: "15px 0" }} disabled={saving || !name} onClick={save}>
        {saving ? "Saving…" : isNew ? "Add room" : "Save changes"}
      </button>
      {!isNew && (
        <button className="btn btn-ghost btn-block" style={{ marginTop: 8, padding: "13px 0", color: "var(--color-accent-700)" }} onClick={remove} disabled={deleting}>
          {deleting ? "Removing…" : "Remove room"}
        </button>
      )}
    </div>
  );
}
