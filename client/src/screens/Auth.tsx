import { useState } from "react";
import { useApp } from "../context/AppContext";
import { api, setToken } from "../lib/api";

export default function Auth({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { token } =
        mode === "login"
          ? await api.login({ email, password })
          : await api.signup({ name, email, phone, password });
      setToken(token);
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "relative", height: "100dvh", width: "100%", maxWidth: 480, margin: "0 auto", overflow: "hidden", background: "linear-gradient(165deg, var(--color-accent-600), var(--color-accent-2-700))" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 32%, rgba(255,255,255,0.22), transparent 60%)" }} />

      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 30 }}>
          <svg width="130" height="120" viewBox="0 0 120 110" fill="none" style={{ filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.2))" }}>
            <circle cx="60" cy="18" r="12" fill="rgba(255,255,255,0.95)" />
            <path
              d="M60 32c-16 0-26 12-26 26v6c-14 4-24 14-28 28 -1 4 2 7 6 6 5-13 14-22 24-26v-4c0 10 10 16 24 16s24-6 24-16v4c10 4 19 13 24 26 4 1 7-2 6-6-4-14-14-24-28-28v-6c0-14-10-26-26-26z"
              fill="rgba(255,255,255,0.95)"
            />
          </svg>
          <div style={{ marginTop: 8, fontFamily: "var(--font-heading)", fontSize: 26, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
            Sukahati Yoga
          </div>
          <div style={{ marginTop: 4, fontSize: 12.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)" }}>
            Kuala Lumpur
          </div>
        </div>

        <div style={{ flex: "none", background: "var(--color-bg)", borderRadius: "28px 28px 0 0", boxShadow: "0 -12px 30px rgba(0,0,0,0.18)", padding: "30px 24px 34px", boxSizing: "border-box" }}>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 27, margin: 0 }}>
            {mode === "login" ? "Sign In" : "Create your account"}
          </h1>
          <div style={{ fontSize: 13.5, color: "var(--color-neutral-700)", marginTop: 6 }}>
            {mode === "login" ? "Sign in with your email and password." : "Sign up to start booking classes at Sukahati."}
          </div>

          <form onSubmit={submit} style={{ marginTop: 22 }}>
            {mode === "signup" && (
              <div className="field">
                <label htmlFor="a-name">Full name</label>
                <input className="input" id="a-name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div className="field" style={{ marginTop: mode === "signup" ? 14 : 0 }}>
              <label htmlFor="a-email">Email</label>
              <input className="input" id="a-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {mode === "signup" && (
              <div className="field" style={{ marginTop: 14 }}>
                <label htmlFor="a-phone">Phone (optional)</label>
                <input className="input" id="a-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            )}
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="a-password">Password</label>
              <input
                className="input" id="a-password" type="password" required minLength={mode === "signup" ? 8 : undefined}
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {mode === "login" && <ForgotPasswordLink />}

            {error && <div style={{ marginTop: 14, fontSize: 13, color: "var(--color-danger, #b3432b)" }}>{error}</div>}

            <button className="btn btn-primary btn-block" style={{ marginTop: 20, padding: "15px 0" }} type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "login" ? "Sign In" : "Sign up"}
            </button>
          </form>

          <button
            className="btn btn-ghost btn-block" style={{ marginTop: 14, padding: "10px 0", fontSize: 13.5 }}
            onClick={() => { setError(null); setMode(mode === "login" ? "signup" : "login"); }}
          >
            {mode === "login" ? "Don't have an account? Sign Up here" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordLink() {
  const { flash } = useApp0();
  return (
    <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--color-neutral-700)" }}>
      Forgot password?{" "}
      <button
        type="button"
        onClick={() => flash("Contact the studio to reset your password")}
        style={{ border: 0, background: "none", padding: 0, font: "inherit", color: "var(--color-accent-700)", fontWeight: 600, cursor: "pointer" }}
      >
        Reset it here
      </button>
    </div>
  );
}

// AppContext isn't available pre-login (no `me` yet) — this screen only
// needs the toast, so read it defensively rather than requiring full context.
function useApp0(): { flash: (m: string) => void } {
  try {
    return useApp();
  } catch {
    return { flash: (m: string) => window.alert(m) };
  }
}
