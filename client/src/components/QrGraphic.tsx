export default function QrGraphic({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "var(--radius-md)", background: "#fff", padding: size * 0.078, boxSizing: "border-box", position: "relative" }}>
      <div style={{
        width: "100%", height: "100%", borderRadius: 4,
        backgroundImage:
          "repeating-linear-gradient(90deg,var(--color-neutral-900) 0 9px,transparent 9px 18px)," +
          "repeating-linear-gradient(0deg,var(--color-neutral-900) 0 9px,transparent 9px 18px)",
        backgroundBlendMode: "difference",
      }} />
      <div style={{ position: "absolute", top: size * 0.078, left: size * 0.078, width: size * 0.23, height: size * 0.23, border: `${size * 0.05}px solid var(--color-neutral-900)`, background: "#fff" }} />
      <div style={{ position: "absolute", top: size * 0.078, right: size * 0.078, width: size * 0.23, height: size * 0.23, border: `${size * 0.05}px solid var(--color-neutral-900)`, background: "#fff" }} />
      <div style={{ position: "absolute", bottom: size * 0.078, left: size * 0.078, width: size * 0.23, height: size * 0.23, border: `${size * 0.05}px solid var(--color-neutral-900)`, background: "#fff" }} />
    </div>
  );
}
