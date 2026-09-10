import { useEffect, useRef } from "react";

// Renders a real, scannable QR code encoding the booking's qrToken — the
// admin Scan QR screen (screens/admin/ScanCheckin.tsx) decodes this same
// string to look up and check in the booking. The qrcode library is loaded
// on demand so customers who never open this screen don't pay for it.
export default function QrGraphic({ value, size }: { value: string; size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;
    import("qrcode").then(({ default: QRCode }) => {
      if (cancelled || !canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 1 }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [value, size]);

  return (
    <div style={{ width: size, height: size, borderRadius: "var(--radius-md)", background: "#fff", padding: size * 0.06, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
