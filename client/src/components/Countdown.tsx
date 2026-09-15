import { useEffect, useState } from "react";

function label(targetIso: string, now: number): string {
  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) return "Happening now";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export default function Countdown({ startsAt, style }: { startsAt: string; style?: React.CSSProperties }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const started = new Date(startsAt).getTime() <= now;
  return (
    <span style={{ fontWeight: 700, ...style }}>
      {started ? "Happening now" : `Starts in ${label(startsAt, now)}`}
    </span>
  );
}
