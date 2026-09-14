import { useEffect, useState } from "react";

const MIN_HOLD_MS = 650;
const FADE_MS = 420;

export default function Splash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  const [minHoldPassed, setMinHoldPassed] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => setMinHoldPassed(true), MIN_HOLD_MS);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, []);

  useEffect(() => {
    if (!ready || !minHoldPassed || fadingOut) return;
    setFadingOut(true);
    const t = setTimeout(onDone, FADE_MS);
    return () => clearTimeout(t);
  }, [ready, minHoldPassed, fadingOut, onDone]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "var(--color-bg)", zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: fadingOut ? 0 : 1, transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <img
        src={new URL("../assets/logo.png", import.meta.url).toString()} alt="Sukahati Yoga"
        style={{
          width: 220, maxWidth: "58vw",
          opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(0.8)",
          transition: "opacity 650ms ease-out, transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />
    </div>
  );
}
