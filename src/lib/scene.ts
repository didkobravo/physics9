import { setAttrs, svgEl, type Pt } from "./svg";

export type SceneOpts = {
  width: number; // viewBox width
  height: number; // viewBox height
  scale: number; // viewBox units per metre
  groundOffset?: number; // height of the ground strip at the bottom (viewBox units)
  label: string; // accessible description
};

export type Scene = {
  svg: SVGSVGElement;
  /** World metres (y up, y = 0 at ground level) → SVG viewBox units. */
  toSvg: (p: Pt) => Pt;
  scale: number;
  groundY: number;
};

/** An SVG scene with a ground strip and a metres → viewBox mapping. */
export function createScene(opts: SceneOpts): Scene {
  const { width, height, scale } = opts;
  const groundY = height - (opts.groundOffset ?? 24);
  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": opts.label });
  svgEl("rect", { class: "ground", x: 0, y: groundY, width, height: height - groundY }, svg);
  return { svg, scale, groundY, toSvg: (p) => ({ x: p.x * scale, y: groundY - p.y * scale }) };
}

export type ArrowOpts = { head?: number; halfWidth?: number; className?: string };

/** A force arrow (shaft + triangular head) whose tip lands exactly on `to`. */
export function createArrow(parent: Element, opts: ArrowOpts = {}) {
  const head = opts.head ?? 16;
  const half = opts.halfWidth ?? 8;
  const extra = opts.className ? ` ${opts.className}` : "";
  const shaft = svgEl("line", { class: `force${extra}` }, parent);
  const tri = svgEl("polygon", { class: `force-head${extra}` }, parent);
  return {
    set(from: Pt, to: Pt) {
      const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
      const d = { x: (to.x - from.x) / len, y: (to.y - from.y) / len };
      const base = { x: to.x - d.x * head, y: to.y - d.y * head };
      const end = { x: to.x - d.x * (head - 4), y: to.y - d.y * (head - 4) };
      setAttrs(shaft, { x1: from.x, y1: from.y, x2: end.x, y2: end.y });
      setAttrs(tri, {
        points: `${base.x - d.y * half},${base.y + d.x * half} ${base.x + d.y * half},${base.y - d.x * half} ${to.x},${to.y}`,
      });
    },
    show(visible: boolean) {
      shaft.style.display = tri.style.display = visible ? "" : "none";
    },
  };
}
