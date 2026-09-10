import { useState } from "react";
import { api, setToken } from "../lib/api";
import { screenPad, kicker, h1 } from "../styles/shared";

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
    <div style={{ ...screenPad, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100%" }}>
      <div style={kicker}>Sukahati Yoga</div>
      <h1 style={h1}>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <div style={{ fontSize: 13.5, color: "var(--color-neutral-700)", marginTop: 8 }}>
        {mode === "login" ? "Sign in to book classes and manage your passes." : "Sign up to start booking classes at Sukahati."}
      </div>

      <form onSubmit={submit} style={{ marginTop: 24 }}>
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

        {error && <div style={{ marginTop: 14, fontSize: 13, color: "var(--color-danger, #b3432b)" }}>{error}</div>}

        <button className="btn btn-primary btn-block" style={{ marginTop: 20, padding: "14px 0" }} type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <button
        className="btn btn-ghost btn-block" style={{ marginTop: 14, padding: "10px 0", fontSize: 13.5 }}
        onClick={() => { setError(null); setMode(mode === "login" ? "signup" : "login"); }}
      >
        {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
