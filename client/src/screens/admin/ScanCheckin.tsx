import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { api, type ScanResult } from "../../lib/api";

export default function ScanCheckin() {
  const { flash } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const scanningRef = useRef(true);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    import("jsqr").then(({ default: jsQR }) => {
      if (cancelled) return;

      function tick() {
        rafRef.current = requestAnimationFrame(tick);
        const video = videoRef.current, canvas = canvasRef.current;
        if (!video || !canvas || !scanningRef.current || video.readyState < 2) return;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          scanningRef.current = false;
          lookup(code.data);
        }
      }

      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then((stream) => {
          if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          tick();
        })
        .catch(() => setCameraError("Camera access was denied or unavailable. Allow camera access in your browser to scan check-ins."));
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function lookup(token: string) {
    setLookupError(null);
    try {
      const r = await api.bookingByQr(token);
      setResult(r);
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : "Could not read that code");
      setTimeout(() => { scanningRef.current = true; setLookupError(null); }, 1800);
    }
  }

  async function confirm() {
    if (!result) return;
    setBusy(true);
    try {
      await api.checkin(result.id);
      flash(result.name.split(" ")[0] + " checked in");
      scanNext();
    } finally {
      setBusy(false);
    }
  }

  function scanNext() {
    setResult(null);
    setLookupError(null);
    scanningRef.current = true;
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 13.5, color: "var(--color-neutral-700)", marginBottom: 14 }}>Point the camera at a guest's booking QR code to check them in.</div>

      {cameraError ? (
        <div style={{ fontSize: 13.5, color: "var(--color-accent-700)", background: "var(--color-accent-100)", borderRadius: "var(--radius-md)", padding: 16, maxWidth: 420 }}>{cameraError}</div>
      ) : (
        <div style={{ position: "relative", width: "100%", maxWidth: 420, borderRadius: "var(--radius-lg)", overflow: "hidden", background: "#000", aspectRatio: "1" }}>
          <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div style={{ position: "absolute", inset: "12%", border: "3px solid rgba(255,255,255,0.85)", borderRadius: 18, pointerEvents: "none" }} />
        </div>
      )}

      {lookupError && <div style={{ marginTop: 14, fontSize: 13.5, color: "var(--color-accent-700)", background: "var(--color-accent-100)", borderRadius: "var(--radius-sm)", padding: "10px 14px", maxWidth: 420 }}>{lookupError}</div>}

      {result && (
        <div style={{ marginTop: 18, maxWidth: 420, background: "var(--color-neutral-100)", borderRadius: "var(--radius-lg)", padding: 20 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: "none", width: 44, height: 44, borderRadius: 999, background: "var(--color-accent-2-300)", color: "var(--color-accent-2-900)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{result.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{result.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", marginTop: 2 }}>{result.title} · {result.meta}</div>
              <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)", marginTop: 2 }}>{result.reference}</div>
            </div>
          </div>

          {result.cancelled && <div style={{ marginTop: 14, fontSize: 13, color: "var(--color-accent-700)" }}>This booking was cancelled.</div>}
          {result.checkedIn && !result.cancelled && <div style={{ marginTop: 14, fontSize: 13, color: "var(--color-accent-2-700)" }}>Already checked in.</div>}

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn btn-secondary" style={{ flex: 1, padding: "11px 0" }} onClick={scanNext}>Scan next</button>
            {!result.checkedIn && !result.cancelled && (
              <button className="btn btn-primary" style={{ flex: 1.3, padding: "11px 0" }} disabled={busy} onClick={confirm}>{busy ? "Checking in…" : "Confirm check-in"}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
