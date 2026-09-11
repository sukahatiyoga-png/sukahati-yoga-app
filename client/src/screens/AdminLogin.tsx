import { useState } from "react";
import { api, clearToken, setToken } from "../lib/api";

export default function AdminLogin({ onAuthed }: { onAuthed: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { token } = await api.login({ email, password });
      setToken(token);
      const me = await api.me();
      if (me.role !== "owner" && me.role !== "desk") {
        clearToken();
        setError("This account doesn't have studio admin access.");
        return;
      }
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-neutral-900)", padding: 20, boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: 380, background: "var(--color-bg)", borderRadius: "var(--radius-lg)", padding: "36px 30px", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Sukahati Yoga</div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 28, margin: "10px 0 0", lineHeight: 1.06 }}>Studio Admin</h1>
        <div style={{ fontSize: 13.5, color: "var(--color-neutral-700)", marginTop: 8 }}>Sign in with your staff account.</div>

        <form onSubmit={submit} style={{ marginTop: 24 }}>
          <div className="field">
            <label htmlFor="al-email">Email</label>
            <input className="input" id="al-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="al-password">Password</label>
            <input className="input" id="al-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && <div style={{ marginTop: 14, fontSize: 13, color: "var(--color-accent-700)" }}>{error}</div>}

          <button className="btn btn-primary btn-block" style={{ marginTop: 20, padding: "14px 0" }} type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <a href="/" style={{ display: "block", textAlign: "center", marginTop: 20, fontSize: 12.5, color: "var(--color-neutral-600)" }}>← Back to Sukahati Yoga</a>
      </div>
    </div>
  );
}
