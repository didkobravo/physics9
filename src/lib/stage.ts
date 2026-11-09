import { setAttrs, svgEl } from "./svg";

export type FormulaLine = { y: number; size: number; cls?: string };

/**
 * Fixed live formula in the top-left of a stage: a few lines of SVG text
 * whose markup and colour class are swapped as the simulation changes.
 */
export function createStageFormula(parent: Element, opts: { x: number; lines: FormulaLine[] }) {
  const g = svgEl("g", { class: "stage-formula" }, parent);
  const texts = opts.lines.map((l) =>
    svgEl("text", { x: opts.x, y: l.y, "font-size": l.size, ...(l.cls ? { class: l.cls } : {}) }, g),
  );
  let last = "";
  return {
    /** `lines` are trusted SVG text markup; `cls` colours the group (e.g. pos / neg / zero). */
    set(lines: string[], cls = "") {
      const key = cls + "\u0000" + lines.join("\u0000");
      if (key === last) return;
      last = key;
      lines.forEach((markup, i) => {
        if (texts[i]) texts[i].innerHTML = markup;
      });
      setAttrs(g, { class: `stage-formula ${cls}`.trim() });
    },
    texts,
  };
}
