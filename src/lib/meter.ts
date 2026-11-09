import { setAttrs, svgEl } from "./svg";

export type BarMeterOpts = {
  x: number;
  top: number;
  bottom: number;
  width: number;
  min: number;
  max: number;
  inset?: number;
};

/**
 * A vertical bar meter: a frame and a bar that grows from 0 (up for
 * positive values, down for negative). Ticks and labels are drawn by the
 * lesson using `y()`, since every lesson labels its scale differently.
 */
export function createBarMeter(parent: Element, opts: BarMeterOpts) {
  const inset = opts.inset ?? 4;
  let { min, max } = opts;
  const g = svgEl("g", {}, parent);
  svgEl("rect", { class: "meter-frame", x: opts.x, y: opts.top, width: opts.width, height: opts.bottom - opts.top, rx: 4 }, g);
  const bar = svgEl("rect", { x: opts.x + inset, width: opts.width - 2 * inset, height: 0, y: opts.bottom }, g);
  const clampV = (v: number) => Math.max(min, Math.min(max, v));
  const y = (v: number) => opts.bottom - ((clampV(v) - min) / (max - min)) * (opts.bottom - opts.top);
  return {
    g,
    y,
    setRange(newMin: number, newMax: number) {
      min = newMin;
      max = newMax;
    },
    set(value: number, cls: string) {
      const y0 = y(0);
      const yv = y(value);
      setAttrs(bar, { y: Math.min(y0, yv), height: Math.abs(y0 - yv), class: cls });
    },
  };
}
