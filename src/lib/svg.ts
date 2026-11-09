const SVG_NS = "http://www.w3.org/2000/svg";

type Attrs = Record<string, string | number>;

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  setAttrs(el, attrs);
  parent?.appendChild(el);
  return el;
}

export function setAttrs(el: Element, attrs: Attrs): void {
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
}

export type Pt = { x: number; y: number };

export function pointsAttr(pts: Pt[]): string {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/** Italic physics symbol for use inside SVG <text> markup. */
export const sym = (s: string): string => `<tspan class="v">${s}</tspan>`;
