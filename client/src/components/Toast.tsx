export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "absolute", left: 20, right: 20, bottom: 112,
        background: "var(--color-accent-2-800)", color: "var(--color-accent-2-100)",
        borderRadius: 999, padding: "13px 20px", fontSize: 13, fontWeight: 600,
        boxShadow: "var(--shadow-lg)", textAlign: "center", zIndex: 50,
      }}
    >
      {message}
    </div>
  );
}
