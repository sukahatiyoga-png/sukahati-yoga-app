const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DOW_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_FULL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface DayOption { id: string; dow: string; num: string; label: string; date: Date }

export function buildDays(count = 7, startOffset = 0): DayOption[] {
  const out: DayOption[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + startOffset + i);
    out.push({
      id: isoDate(d), dow: DOW[d.getDay()], num: String(d.getDate()),
      label: `${DOW_FULL[d.getDay()]} ${d.getDate()} ${MON_FULL[d.getMonth()]}`, date: d,
    });
  }
  return out;
}

export function monthLabel(d: Date): string {
  return `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][d.getMonth()]} ${d.getFullYear()}`;
}
