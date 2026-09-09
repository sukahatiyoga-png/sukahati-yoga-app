export default function Toggle({ on, onClick, size = "md" }: { on: boolean; onClick: () => void; size?: "md" | "sm" }) {
  const w = size === "sm" ? 48 : 50;
  const h = size === "sm" ? 28 : 29;
  const knob = size === "sm" ? 22 : 23;
  return (
    <button
      onClick={onClick}
      style={{
        flex: "none", width: w, height: h, borderRadius: 999, border: 0,
        background: on ? "var(--color-accent-2-500)" : "var(--color-neutral-300)",
        padding: 3, display: "flex", justifyContent: on ? "flex-end" : "flex-start", cursor: "pointer",
      }}
    >
      <span style={{ width: knob, height: knob, borderRadius: 999, background: "#fff", display: "block" }} />
    </button>
  );
}
