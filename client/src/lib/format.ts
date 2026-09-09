export function money(minor: number, currency = "RM"): string {
  const v = minor / 100;
  return currency + " " + v.toLocaleString("en-MY", { minimumFractionDigits: v % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
}
