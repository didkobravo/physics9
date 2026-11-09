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

const upTo = new Map<number, Intl.NumberFormat>();

/** Like num(), but drops trailing zeros: 30 → "30", 16.5 → "16,5", 30.75 → "30,75". */
export function numUpTo(value: number, maxDigits = 2): string {
  let f = upTo.get(maxDigits);
  if (!f) {
    f = new Intl.NumberFormat("bg-BG", { maximumFractionDigits: maxDigits });
    upTo.set(maxDigits, f);
  }
  return f.format(Object.is(value, -0) ? 0 : value);
}

/** Signed value with a real minus sign: "+30", "−7,5", "0". */
export function signed(value: number, maxDigits = 2): string {
  const r = Math.round(value * 10 ** maxDigits) / 10 ** maxDigits;
  if (r === 0) return "0";
  return (r > 0 ? "+" : "−") + numUpTo(Math.abs(r), maxDigits);
}
