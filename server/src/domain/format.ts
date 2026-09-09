export function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
}

export function agoLabel(from: Date, now = new Date()): string {
  const ms = now.getTime() - from.getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "now";
  if (min < 60) return min + "m";
  const hr = Math.round(min / 60);
  if (hr < 24) return hr + "h";
  const day = Math.round(hr / 24);
  if (day === 1) return "Yesterday";
  return day + "d";
}

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DOW_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_FULL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function dayParts(d: Date) {
  return { dow: DOW[d.getDay()], num: String(d.getDate()), mon: MON[d.getMonth()] };
}

export function dateLabel(d: Date): string {
  return `${DOW_FULL[d.getDay()]} ${d.getDate()} ${MON_FULL[d.getMonth()]}`;
}

export function timeParts(d: Date) {
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const m = d.getMinutes();
  return { time: `${h}:${String(m).padStart(2, "0")}`, ampm };
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
