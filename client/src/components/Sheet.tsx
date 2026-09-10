import type { ReactNode } from "react";

export default function Sheet({ onClose, maxHeight = "84%", children }: { onClose: () => void; maxHeight?: string; children: ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(32,30,29,0.42)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", zIndex: 30 }}>
      <div style={{ background: "var(--color-bg)", borderRadius: "28px 28px 0 0", maxHeight, overflow: "auto", padding: "14px 20px 30px", boxShadow: "var(--shadow-lg)", width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 14, cursor: "pointer" }} onClick={onClose}>
          <div style={{ width: 44, height: 5, borderRadius: 999, background: "var(--color-neutral-400)" }} />
        </div>
        {children}
      </div>
    </div>
  );
}
