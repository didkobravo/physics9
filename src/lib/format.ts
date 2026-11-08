const cache = new Map<number, Intl.NumberFormat>();

/** Bulgarian number formatting (decimal comma). */
export function num(value: number, digits = 0): string {
  let f = cache.get(digits);
  if (!f) {
    f = new Intl.NumberFormat("bg-BG", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    cache.set(digits, f);
  }
  return f.format(value);
}
