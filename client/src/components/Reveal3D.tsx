import { useEffect, useRef, useState, type ReactNode } from "react";

const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// A cheap, GPU-only 3D tilt-in — cards rotate/lift into place as they
// scroll into view. Transform + opacity only, no libraries, no WebGL.
export default function Reveal3D({ children, delayMs = 0, style }: { children: ReactNode; delayMs?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        perspective: 800,
        ...style,
      }}
    >
      <div
        style={{
          transform: shown ? "rotateY(0deg) translateZ(0) scale(1)" : "rotateY(22deg) translateZ(-60px) scale(0.94)",
          opacity: shown ? 1 : 0,
          transformStyle: "preserve-3d",
          transition: `transform 620ms cubic-bezier(0.16,1,0.3,1) ${delayMs}ms, opacity 500ms ease ${delayMs}ms`,
          willChange: "transform, opacity",
        }}
      >
        {children}
      </div>
    </div>
  );
}
