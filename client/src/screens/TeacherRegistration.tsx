import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { api, type TeacherProfileItem, type TeacherRegSessionInput, type TeacherVisitItem } from "../lib/api";

const YOGA_STYLES = ["Hatha", "Vinyasa", "Ashtanga", "Yin", "Restorative", "Meditation", "Pranayama", "Sound Healing", "Other"];
const VISIT_TYPES: { value: string; label: string }[] = [
  { value: "guest_teacher", label: "Guest Teacher" }, { value: "workshop", label: "Workshop" },
  { value: "retreat", label: "Retreat" }, { value: "teacher_training", label: "Teacher Training" },
  { value: "private_session", label: "Private Session" }, { value: "special_event", label: "Special Event" },
  { value: "other", label: "Other" },
];
const STEP_LABELS = ["Personal", "Teaching", "Visit", "Additional Details", "Review"];
const DRAFT_KEY = "sukahati_teacher_reg_draft";
const MAX_IMAGE_MB = 3;
const MAX_FILE_MB = 5;

interface SessionDraft { date: string; time: string; className: string; style: string; duration: string; capacity: string }
interface Draft {
  personal: { fullName: string; preferredName: string; email: string; phone: string; country: string; city: string; profilePhotoUrl: string; instagram: string; website: string };
  teaching: { yogaStyles: string[]; yearsExperience: string; certification: string; certificationSchool: string; certificationLevel: string; bio: string; teachingSpecialties: string; certificationFileUrl: string; certificationFileName: string };
  visit: { visitType: string; proposedDate: string; numberOfSessions: string; title: string; description: string; expectedStudents: string; sessionDuration: string; preferredTime: string; sessions: SessionDraft[] };
  additional: { websiteIntro: string; socialLinks: string; equipmentNeeds: string; travelNotes: string; dietaryNeeds: string; additionalComments: string; agreedToTerms: boolean };
}

function emptyDraft(): Draft {
  return {
    personal: { fullName: "", preferredName: "", email: "", phone: "", country: "", city: "", profilePhotoUrl: "", instagram: "", website: "" },
    teaching: { yogaStyles: [], yearsExperience: "", certification: "", certificationSchool: "", certificationLevel: "", bio: "", teachingSpecialties: "", certificationFileUrl: "", certificationFileName: "" },
    visit: { visitType: "guest_teacher", proposedDate: "", numberOfSessions: "1", title: "", description: "", expectedStudents: "", sessionDuration: "60 min", preferredTime: "", sessions: [] },
    additional: { websiteIntro: "", socialLinks: "", equipmentNeeds: "", travelNotes: "", dietaryNeeds: "", additionalComments: "", agreedToTerms: false },
  };
}

// Persisted draft excludes file data URLs (can be large) — "save and
// continue later" restores text fields; photo/certification need reselecting.
function saveDraft(d: Draft) {
  try {
    const { certificationFileUrl, certificationFileName, ...restTeaching } = d.teaching;
    const { profilePhotoUrl, ...restPersonal } = d.personal;
    void certificationFileUrl; void certificationFileName; void profilePhotoUrl;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, personal: restPersonal, teaching: restTeaching }));
  } catch { /* ignore */ }
}
function loadDraft(): Partial<Draft> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Shared visual language for this page (distinct scale from the booking app) ──
const page: CSSProperties = { minHeight: "100vh", width: "100%", background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "var(--font-body)" };
const container: CSSProperties = { maxWidth: 640, margin: "0 auto", padding: "0 24px" };
const kicker: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-accent-700)" };
const cardStyle: CSSProperties = { background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: "28px 26px", boxShadow: "var(--shadow-sm)" };
const fieldLabel: CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--color-neutral-800)" };
const helpText: CSSProperties = { fontSize: 12, color: "var(--color-neutral-600)", marginTop: 5 };

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 18 }}>
      <label style={fieldLabel}>{label}{required && <span style={{ color: "var(--color-accent-700)" }}> *</span>}</label>
      {children}
      {hint && <div style={helpText}>{hint}</div>}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        border: active ? "1.5px solid var(--color-accent)" : "1.5px solid var(--color-divider)",
        background: active ? "var(--color-accent-100)" : "var(--color-bg)",
        color: active ? "var(--color-accent-800)" : "var(--color-text)",
        borderRadius: 999, padding: "9px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
        fontFamily: "var(--font-body)",
      }}
    >
      {children}
    </button>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <div style={kicker}>{eyebrow}</div>
      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 30, margin: "8px 0 0", lineHeight: 1.1 }}>{title}</h2>
    </>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", gap: 6, margin: "22px 0 6px" }}>
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "active" : "todo";
        return (
          <div key={label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              height: 4, borderRadius: 999, marginBottom: 8,
              background: state === "todo" ? "var(--color-neutral-300)" : "var(--color-accent)",
              opacity: state === "todo" ? 1 : state === "active" ? 1 : 0.55,
            }} />
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", color: state === "active" ? "var(--color-accent-700)" : "var(--color-neutral-600)", display: window.innerWidth < 560 && state !== "active" ? "none" : "block" }}>
              {String(n).padStart(2, "0")} {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StickyFooter({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: "sticky", bottom: 0, background: "linear-gradient(to top, var(--color-bg) 70%, transparent)", paddingTop: 18, paddingBottom: 22, marginTop: 8, display: "flex", gap: 10 }}>
      {children}
    </div>
  );
}

export default function TeacherRegistration() {
  const [phase, setPhase] = useState<"landing" | "form" | "success">("landing");
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [dupe, setDupe] = useState<{ teacherCode: string; fullName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ teacherCode: string; isReturning: boolean } | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const d = loadDraft();
    if (d && (d.personal?.fullName || d.personal?.email)) setHasDraft(true);
  }, []);

  function update<K extends keyof Draft>(section: K, patch: Partial<Draft[K]>) {
    setDraft((d) => {
      const next = { ...d, [section]: { ...d[section], ...patch } };
      saveDraft(next);
      return next;
    });
  }

  function startFresh() {
    clearDraft();
    setDraft(emptyDraft());
    setHasDraft(false);
    setPhase("form");
    setStep(1);
  }
  function resumeDraft() {
    const d = loadDraft();
    if (d) setDraft({ ...emptyDraft(), ...d, personal: { ...emptyDraft().personal, ...d.personal }, teaching: { ...emptyDraft().teaching, ...d.teaching }, visit: { ...emptyDraft().visit, ...d.visit }, additional: { ...emptyDraft().additional, ...d.additional } });
    setPhase("form");
  }

  async function checkDuplicate() {
    const { email, phone } = draft.personal;
    if (!email || !phone) return;
    try {
      const r = await api.teacherRegistration.checkDuplicate({ email, phone });
      setDupe(r.found ? { teacherCode: r.teacherCode!, fullName: r.fullName! } : null);
    } catch { /* non-blocking */ }
  }

  function toggleStyle(s: string) {
    const has = draft.teaching.yogaStyles.includes(s);
    update("teaching", { yogaStyles: has ? draft.teaching.yogaStyles.filter((x) => x !== s) : [...draft.teaching.yogaStyles, s] });
  }

  function addSession() {
    update("visit", { sessions: [...draft.visit.sessions, { date: "", time: "", className: "", style: "", duration: "60 min", capacity: "" }] });
  }
  function updateSession(i: number, patch: Partial<SessionDraft>) {
    const sessions = draft.visit.sessions.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    update("visit", { sessions });
  }
  function removeSession(i: number) {
    update("visit", { sessions: draft.visit.sessions.filter((_, idx) => idx !== i) });
  }

  function validateStep(n: number): string | null {
    if (n === 1) {
      if (!draft.personal.fullName.trim()) return "Full name is required";
      if (!draft.personal.email.trim() || !draft.personal.email.includes("@")) return "A valid email is required";
      if (!draft.personal.phone.trim()) return "WhatsApp / phone number is required";
    }
    if (n === 4) {
      if (!draft.additional.agreedToTerms) return "Please agree to Sukahati Yoga's teacher terms and policies";
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    if (step === 1) checkDuplicate();
    setStep((s) => Math.min(5, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const sessions: TeacherRegSessionInput[] = draft.visit.sessions.map((s) => ({
        date: s.date || undefined, time: s.time || undefined, className: s.className || undefined,
        style: s.style || undefined, duration: s.duration || undefined, capacity: s.capacity ? Number(s.capacity) : undefined,
      }));
      const r = await api.teacherRegistration.submit({
        personal: draft.personal,
        teaching: draft.teaching,
        visit: {
          visitType: draft.visit.visitType, proposedDate: draft.visit.proposedDate || undefined,
          numberOfSessions: Number(draft.visit.numberOfSessions) || sessions.length || 1,
          title: draft.visit.title, description: draft.visit.description,
          expectedStudents: draft.visit.expectedStudents ? Number(draft.visit.expectedStudents) : undefined,
          sessionDuration: draft.visit.sessionDuration, preferredTime: draft.visit.preferredTime,
          sessions,
        },
        additional: draft.additional,
      });
      clearDraft();
      setResult({ teacherCode: r.teacherCode, isReturning: r.isReturning });
      setPhase("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "landing") return <Landing hasDraft={hasDraft} onStart={startFresh} onResume={resumeDraft} />;
  if (phase === "success" && result) return <SuccessScreen teacherCode={result.teacherCode} isReturning={result.isReturning} email={draft.personal.email} />;

  return (
    <div style={page}>
      <div style={{ ...container, paddingTop: 36, paddingBottom: 8 }}>
        <div style={kicker}>Sukahati Yoga · Teacher Registration</div>
        <ProgressBar step={step} />
      </div>

      <div style={{ ...container, paddingBottom: 40 }}>
        {dupe && step <= 2 && (
          <div style={{ background: "var(--color-accent-2-100)", border: "1px solid var(--color-accent-2-300)", borderRadius: "var(--radius-md)", padding: "14px 16px", marginBottom: 4, fontSize: 13.5, color: "var(--color-accent-2-900)" }}>
            <strong>Existing Teacher Detected.</strong> We found a profile for {dupe.fullName} ({dupe.teacherCode}). This visit will be connected to that teacher profile — no duplicate will be created.
          </div>
        )}

        {step === 1 && <StepPersonal draft={draft} update={update} onBlurContact={checkDuplicate} />}
        {step === 2 && <StepTeaching draft={draft} update={update} toggleStyle={toggleStyle} />}
        {step === 3 && <StepVisit draft={draft} update={update} addSession={addSession} updateSession={updateSession} removeSession={removeSession} />}
        {step === 4 && <StepAdditional draft={draft} update={update} />}
        {step === 5 && <StepReview draft={draft} goToStep={setStep} />}

        {error && <div style={{ marginTop: 16, fontSize: 13.5, color: "var(--color-accent-700)", background: "var(--color-accent-100)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>{error}</div>}

        <StickyFooter>
          {step > 1 && <button className="btn btn-secondary" style={{ padding: "13px 22px" }} onClick={goBack}>Back</button>}
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" style={{ padding: "13px 10px", fontSize: 13 }} onClick={() => { saveDraft(draft); setHasDraft(true); setPhase("landing"); }}>Save and continue later</button>
          {step < 5 ? (
            <button className="btn btn-primary" style={{ padding: "13px 26px" }} onClick={goNext}>Continue</button>
          ) : (
            <button className="btn btn-primary" style={{ padding: "13px 26px" }} disabled={submitting} onClick={submit}>{submitting ? "Submitting…" : "Submit Registration"}</button>
          )}
        </StickyFooter>
      </div>
    </div>
  );
}

// ── Landing / hero ───────────────────────────────────────────────────────
function Landing({ hasDraft, onStart, onResume }: { hasDraft: boolean; onStart: () => void; onResume: () => void }) {
  return (
    <div style={page}>
      <div style={{ position: "relative", height: 420, overflow: "hidden" }}>
        <img src={new URL("../assets/studio.jpg", import.meta.url).toString()} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(32,30,29,0.15) 0%, rgba(32,30,29,0.55) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end" }}>
          <div style={{ ...container, paddingBottom: 44, color: "#fff" }}>
            <div style={{ ...kicker, color: "#ffe1d0" }}>Sukahati Yoga</div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "clamp(34px, 6vw, 52px)", lineHeight: 1.05, margin: "12px 0 0" }}>Teach. Share. Connect.</h1>
          </div>
        </div>
      </div>

      <div style={{ ...container, paddingTop: 30, paddingBottom: 60 }}>
        <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "var(--color-neutral-800)", maxWidth: 520 }}>
          Welcome to Sukahati Yoga. Please complete your teacher registration so we can prepare for your visit and create your teacher profile in our studio database.
        </p>

        <button className="btn btn-primary" style={{ marginTop: 26, padding: "16px 30px", fontSize: 15.5 }} onClick={onStart}>Start Registration</button>

        {hasDraft && (
          <button className="btn btn-ghost btn-block" style={{ marginTop: 10, padding: "12px 0", fontSize: 13.5 }} onClick={onResume}>Continue your saved registration</button>
        )}

        <div style={{ marginTop: 22, fontSize: 13, color: "var(--color-neutral-600)", lineHeight: 1.5 }}>
          Already registered with Sukahati Yoga? We'll automatically connect your new visit to your existing teacher profile.
        </div>

        <div style={{ marginTop: 44, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 18 }}>
          {[
            { n: "01", t: "Personal", d: "Tell us who you are" },
            { n: "02", t: "Teaching", d: "Your practice and certification" },
            { n: "03", t: "Visit", d: "What you'll teach at Sukahati" },
            { n: "04", t: "Details", d: "Anything else we should know" },
            { n: "05", t: "Review", d: "Confirm and submit" },
          ].map((s) => (
            <div key={s.n} style={cardStyle}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 22, color: "var(--color-accent-600)" }}>{s.n}</div>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginTop: 8 }}>{s.t}</div>
              <div style={{ fontSize: 12.5, color: "var(--color-neutral-600)", marginTop: 3 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 1 ────────────────────────────────────────────────────────────────
function StepPersonal({ draft, update, onBlurContact }: { draft: Draft; update: <K extends keyof Draft>(s: K, p: Partial<Draft[K]>) => void; onBlurContact: () => void }) {
  const [photoBusy, setPhotoBusy] = useState(false);
  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) { alert(`Please choose a photo under ${MAX_IMAGE_MB}MB.`); return; }
    setPhotoBusy(true);
    try { update("personal", { profilePhotoUrl: await fileToDataUrl(file) }); } finally { setPhotoBusy(false); }
  }

  return (
    <div>
      <SectionTitle eyebrow="Step 01 of 05" title="Tell us about yourself" />
      <div style={{ marginTop: 22 }}>
        <Field label="Full Name" required><input className="input" value={draft.personal.fullName} onChange={(e) => update("personal", { fullName: e.target.value })} /></Field>
        <Field label="Preferred Name"><input className="input" value={draft.personal.preferredName} onChange={(e) => update("personal", { preferredName: e.target.value })} /></Field>
        <Field label="Email Address" required><input className="input" type="email" value={draft.personal.email} onChange={(e) => update("personal", { email: e.target.value })} onBlur={onBlurContact} /></Field>
        <Field label="WhatsApp / Phone" required><input className="input" value={draft.personal.phone} onChange={(e) => update("personal", { phone: e.target.value })} onBlur={onBlurContact} /></Field>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flex: 1 }}><Field label="Country" required><input className="input" value={draft.personal.country} onChange={(e) => update("personal", { country: e.target.value })} /></Field></div>
          <div style={{ flex: 1 }}><Field label="City"><input className="input" value={draft.personal.city} onChange={(e) => update("personal", { city: e.target.value })} /></Field></div>
        </div>
        <Field label="Profile Photo" hint={photoBusy ? "Uploading…" : draft.personal.profilePhotoUrl ? "Photo attached" : `JPG or PNG, up to ${MAX_IMAGE_MB}MB`}>
          <input className="input" type="file" accept="image/*" onChange={onPhoto} style={{ borderRadius: "var(--radius-sm)", padding: "10px 14px" }} />
        </Field>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flex: 1 }}><Field label="Instagram"><input className="input" placeholder="@handle" value={draft.personal.instagram} onChange={(e) => update("personal", { instagram: e.target.value })} /></Field></div>
          <div style={{ flex: 1 }}><Field label="Website"><input className="input" placeholder="https://" value={draft.personal.website} onChange={(e) => update("personal", { website: e.target.value })} /></Field></div>
        </div>
      </div>
      <div style={{ ...helpText, marginTop: 22, padding: "12px 14px", background: "var(--color-neutral-100)", borderRadius: "var(--radius-sm)" }}>
        Your information is used by Sukahati Yoga to coordinate your teaching visit and maintain your teacher profile.
      </div>
    </div>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────────────
function StepTeaching({ draft, update, toggleStyle }: { draft: Draft; update: <K extends keyof Draft>(s: K, p: Partial<Draft[K]>) => void; toggleStyle: (s: string) => void }) {
  const [fileBusy, setFileBusy] = useState(false);
  async function onCert(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) { alert(`Please choose a file under ${MAX_FILE_MB}MB.`); return; }
    setFileBusy(true);
    try { update("teaching", { certificationFileUrl: await fileToDataUrl(file), certificationFileName: file.name }); } finally { setFileBusy(false); }
  }

  return (
    <div>
      <SectionTitle eyebrow="Step 02 of 05" title="Your teaching practice" />
      <div style={{ marginTop: 22 }}>
        <Field label="Yoga Styles">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {YOGA_STYLES.map((s) => <Chip key={s} active={draft.teaching.yogaStyles.includes(s)} onClick={() => toggleStyle(s)}>{s}</Chip>)}
          </div>
        </Field>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flex: 1 }}><Field label="Years of Teaching Experience"><input className="input" value={draft.teaching.yearsExperience} onChange={(e) => update("teaching", { yearsExperience: e.target.value })} /></Field></div>
          <div style={{ flex: 1 }}><Field label="Certification Level"><input className="input" value={draft.teaching.certificationLevel} onChange={(e) => update("teaching", { certificationLevel: e.target.value })} placeholder="e.g. RYT-200" /></Field></div>
        </div>
        <Field label="Yoga Certification"><input className="input" value={draft.teaching.certification} onChange={(e) => update("teaching", { certification: e.target.value })} /></Field>
        <Field label="Certification School"><input className="input" value={draft.teaching.certificationSchool} onChange={(e) => update("teaching", { certificationSchool: e.target.value })} /></Field>
        <Field label="Short Teacher Bio">
          <textarea className="input" style={{ borderRadius: "var(--radius-md)", minHeight: 90, padding: "12px 16px", resize: "vertical" }} value={draft.teaching.bio} onChange={(e) => update("teaching", { bio: e.target.value })} />
        </Field>
        <Field label="Teaching Specialties" hint="Prenatal, injury recovery, breathwork, etc.">
          <input className="input" value={draft.teaching.teachingSpecialties} onChange={(e) => update("teaching", { teachingSpecialties: e.target.value })} />
        </Field>
        <Field label="Upload Certification" hint={fileBusy ? "Uploading…" : draft.teaching.certificationFileName || `PDF, JPG or PNG, up to ${MAX_FILE_MB}MB`}>
          <input className="input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onCert} style={{ borderRadius: "var(--radius-sm)", padding: "10px 14px" }} />
        </Field>
      </div>
    </div>
  );
}

// ── Step 3 ────────────────────────────────────────────────────────────────
function StepVisit({ draft, update, addSession, updateSession, removeSession }: {
  draft: Draft; update: <K extends keyof Draft>(s: K, p: Partial<Draft[K]>) => void;
  addSession: () => void; updateSession: (i: number, p: Partial<SessionDraft>) => void; removeSession: (i: number) => void;
}) {
  return (
    <div>
      <SectionTitle eyebrow="Step 03 of 05" title="Tell us about your Sukahati visit" />
      <div style={{ marginTop: 22 }}>
        <Field label="Visit Type">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {VISIT_TYPES.map((t) => <Chip key={t.value} active={draft.visit.visitType === t.value} onClick={() => update("visit", { visitType: t.value })}>{t.label}</Chip>)}
          </div>
        </Field>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flex: 1 }}><Field label="Proposed Teaching Date"><input className="input" type="date" value={draft.visit.proposedDate} onChange={(e) => update("visit", { proposedDate: e.target.value })} /></Field></div>
          <div style={{ flex: 1 }}><Field label="Number of Sessions"><input className="input" type="number" min={1} value={draft.visit.numberOfSessions} onChange={(e) => update("visit", { numberOfSessions: e.target.value })} /></Field></div>
        </div>
        <Field label="Class / Workshop Title"><input className="input" value={draft.visit.title} onChange={(e) => update("visit", { title: e.target.value })} /></Field>
        <Field label="Class Description">
          <textarea className="input" style={{ borderRadius: "var(--radius-md)", minHeight: 80, padding: "12px 16px", resize: "vertical" }} value={draft.visit.description} onChange={(e) => update("visit", { description: e.target.value })} />
        </Field>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flex: 1 }}><Field label="Expected Number of Students"><input className="input" type="number" min={0} value={draft.visit.expectedStudents} onChange={(e) => update("visit", { expectedStudents: e.target.value })} /></Field></div>
          <div style={{ flex: 1 }}><Field label="Session Duration"><input className="input" value={draft.visit.sessionDuration} onChange={(e) => update("visit", { sessionDuration: e.target.value })} /></Field></div>
        </div>
        <Field label="Preferred Teaching Time"><input className="input" placeholder="e.g. Mornings" value={draft.visit.preferredTime} onChange={(e) => update("visit", { preferredTime: e.target.value })} /></Field>

        <div style={{ marginTop: 26, paddingTop: 20, borderTop: "1px solid var(--color-divider)" }}>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>Individual sessions</div>
          <div style={{ ...helpText, marginTop: 3 }}>Teaching more than once? Add each session — Sukahati will schedule them individually.</div>
          {draft.visit.sessions.map((s, i) => (
            <div key={i} style={{ ...cardStyle, padding: 18, marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-accent-700)" }}>Session {i + 1}</div>
                <button type="button" className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => removeSession(i)}>Remove</button>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <div style={{ flex: 1 }}><Field label="Date"><input className="input" type="date" value={s.date} onChange={(e) => updateSession(i, { date: e.target.value })} /></Field></div>
                <div style={{ flex: 1 }}><Field label="Time"><input className="input" type="time" value={s.time} onChange={(e) => updateSession(i, { time: e.target.value })} /></Field></div>
              </div>
              <Field label="Class name"><input className="input" value={s.className} onChange={(e) => updateSession(i, { className: e.target.value })} /></Field>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><Field label="Style"><input className="input" value={s.style} onChange={(e) => updateSession(i, { style: e.target.value })} /></Field></div>
                <div style={{ flex: 1 }}><Field label="Duration"><input className="input" value={s.duration} onChange={(e) => updateSession(i, { duration: e.target.value })} /></Field></div>
                <div style={{ flex: 1 }}><Field label="Capacity"><input className="input" type="number" min={0} value={s.capacity} onChange={(e) => updateSession(i, { capacity: e.target.value })} /></Field></div>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 14, padding: "12px 0" }} onClick={addSession}>+ Add another session</button>
        </div>
      </div>
    </div>
  );
}

// ── Step 4 ────────────────────────────────────────────────────────────────
function StepAdditional({ draft, update }: { draft: Draft; update: <K extends keyof Draft>(s: K, p: Partial<Draft[K]>) => void }) {
  return (
    <div>
      <SectionTitle eyebrow="Step 04 of 05" title="A few more details" />
      <div style={{ marginTop: 22 }}>
        <Field label="Short introduction for the Sukahati Yoga website">
          <textarea className="input" style={{ borderRadius: "var(--radius-md)", minHeight: 80, padding: "12px 16px", resize: "vertical" }} value={draft.additional.websiteIntro} onChange={(e) => update("additional", { websiteIntro: e.target.value })} />
        </Field>
        <Field label="Social media links"><input className="input" value={draft.additional.socialLinks} onChange={(e) => update("additional", { socialLinks: e.target.value })} /></Field>
        <Field label="Special equipment requirements"><input className="input" value={draft.additional.equipmentNeeds} onChange={(e) => update("additional", { equipmentNeeds: e.target.value })} /></Field>
        <Field label="Travel / accommodation notes"><input className="input" value={draft.additional.travelNotes} onChange={(e) => update("additional", { travelNotes: e.target.value })} /></Field>
        <Field label="Dietary requirements for retreat / workshop"><input className="input" value={draft.additional.dietaryNeeds} onChange={(e) => update("additional", { dietaryNeeds: e.target.value })} /></Field>
        <Field label="Additional comments">
          <textarea className="input" style={{ borderRadius: "var(--radius-md)", minHeight: 70, padding: "12px 16px", resize: "vertical" }} value={draft.additional.additionalComments} onChange={(e) => update("additional", { additionalComments: e.target.value })} />
        </Field>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 22, fontSize: 13.5, cursor: "pointer" }}>
          <input type="checkbox" checked={draft.additional.agreedToTerms} onChange={(e) => update("additional", { agreedToTerms: e.target.checked })} style={{ marginTop: 2 }} />
          <span>I agree to Sukahati Yoga's teacher terms and policies.</span>
        </label>
      </div>
    </div>
  );
}

// ── Step 5 ────────────────────────────────────────────────────────────────
function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--color-divider)", fontSize: 13.5 }}>
      <span style={{ color: "var(--color-neutral-600)" }}>{label}</span><span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}
function ReviewSection({ title, onEdit, children }: { title: string; onEdit?: () => void; children: ReactNode }) {
  return (
    <div style={{ ...cardStyle, padding: 20, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        {onEdit && <button type="button" className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 12.5 }} onClick={onEdit}>Edit</button>}
      </div>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}
function StepReview({ draft, goToStep }: { draft: Draft; goToStep: (n: number) => void }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div>
      <SectionTitle eyebrow="Step 05 of 05" title="Review your registration" />
      <ReviewSection title="Personal Information" onEdit={() => goToStep(1)}>
        <ReviewRow label="Full name" value={draft.personal.fullName} />
        <ReviewRow label="Preferred name" value={draft.personal.preferredName} />
        <ReviewRow label="Email" value={draft.personal.email} />
        <ReviewRow label="Phone" value={draft.personal.phone} />
        <ReviewRow label="Location" value={[draft.personal.city, draft.personal.country].filter(Boolean).join(", ")} />
      </ReviewSection>
      <ReviewSection title="Teaching Profile" onEdit={() => goToStep(2)}>
        <ReviewRow label="Styles" value={draft.teaching.yogaStyles.join(", ")} />
        <ReviewRow label="Experience" value={draft.teaching.yearsExperience} />
        <ReviewRow label="Certification" value={[draft.teaching.certification, draft.teaching.certificationLevel].filter(Boolean).join(" · ")} />
        <ReviewRow label="School" value={draft.teaching.certificationSchool} />
      </ReviewSection>
      <ReviewSection title="Teaching Visit" onEdit={() => goToStep(3)}>
        <ReviewRow label="Type" value={VISIT_TYPES.find((t) => t.value === draft.visit.visitType)?.label || ""} />
        <ReviewRow label="Proposed date" value={draft.visit.proposedDate} />
        <ReviewRow label="Title" value={draft.visit.title} />
        <ReviewRow label="Sessions" value={draft.visit.sessions.length ? String(draft.visit.sessions.length) : draft.visit.numberOfSessions} />
      </ReviewSection>
      <ReviewSection title="Additional Information" onEdit={() => goToStep(4)}>
        <ReviewRow label="Equipment" value={draft.additional.equipmentNeeds} />
        <ReviewRow label="Travel notes" value={draft.additional.travelNotes} />
        <ReviewRow label="Dietary" value={draft.additional.dietaryNeeds} />
      </ReviewSection>

      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 22, fontSize: 13.5, cursor: "pointer" }}>
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ marginTop: 2 }} />
        <span>I confirm that the information provided is accurate.</span>
      </label>
      {!confirmed && <div style={{ ...helpText, marginTop: 6 }}>Check the box above, then submit.</div>}
    </div>
  );
}

// ── Success screen ───────────────────────────────────────────────────────
function SuccessScreen({ teacherCode, isReturning, email }: { teacherCode: string; isReturning: boolean; email: string }) {
  const [viewing, setViewing] = useState(false);
  const [profile, setProfile] = useState<TeacherProfileItem | null>(null);
  const [visits, setVisits] = useState<TeacherVisitItem[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  async function viewRegistration() {
    setViewing(true);
    try {
      const r = await api.teacherRegistration.lookup(teacherCode, email);
      setProfile(r.profile); setVisits(r.visits);
    } catch {
      setLoadErr("We couldn't load your registration right now — your Teacher ID above is still valid.");
    }
  }

  return (
    <div style={{ ...page, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: "var(--color-accent-2-200)", color: "var(--color-accent-2-800)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontSize: 28 }}>✓</div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 32, margin: "20px 0 0" }}>Registration Received</h1>
        <p style={{ fontSize: 15, color: "var(--color-neutral-700)", marginTop: 10, lineHeight: 1.55 }}>
          {isReturning ? "Thank you for registering with Sukahati Yoga again. Your new visit has been added to your existing teacher profile." : "Thank you for registering with Sukahati Yoga. Your teacher profile has been created successfully."}
        </p>

        <div style={{ ...cardStyle, marginTop: 22, textAlign: "center" }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-neutral-600)" }}>Teacher ID</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 26, marginTop: 6, letterSpacing: "0.04em" }}>{teacherCode}</div>
        </div>

        <p style={{ fontSize: 13.5, color: "var(--color-neutral-600)", marginTop: 18, lineHeight: 1.5 }}>
          Our team will review your registration and contact you regarding your teaching schedule.
        </p>

        {!viewing && <button className="btn btn-secondary btn-block" style={{ marginTop: 20, padding: "13px 0" }} onClick={viewRegistration}>View Registration</button>}
        <button className="btn btn-primary btn-block" style={{ marginTop: 10, padding: "13px 0" }} onClick={() => { window.location.href = "/"; }}>Return to Sukahati Yoga</button>

        {loadErr && <div style={{ ...helpText, marginTop: 14 }}>{loadErr}</div>}

        {profile && (
          <div style={{ textAlign: "left", marginTop: 26 }}>
            <ReviewSection title="Your profile">
              <ReviewRow label="Name" value={profile.fullName} />
              <ReviewRow label="Styles" value={profile.teachingStyles.join(", ")} />
              <ReviewRow label="Status" value={profile.status} />
            </ReviewSection>
            {visits.map((v) => (
              <ReviewSection key={v.id} title={v.title || VISIT_TYPES.find((t) => t.value === v.visitType)?.label || "Visit"}>
                <ReviewRow label="Proposed date" value={v.proposedDate ? new Date(v.proposedDate).toDateString() : "—"} />
                <ReviewRow label="Status" value={v.status} />
              </ReviewSection>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
