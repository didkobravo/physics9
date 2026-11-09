import { setAttrs, svgEl } from "./svg";

export type FormulaLine = { y: number; size: number; cls?: string };

/** A line's markup, optionally with a class that replaces the line's class. */
export type LineSpec = string | { markup: string; cls: string };

/**
 * One formula line in three weights: the formula itself bold, the
 * substituted numbers thin and faded, the result at full strength in the
 * line's colour. `tail` is an optional faded remark after the result.
 * All arguments are trusted SVG text markup.
 */
export function fx(formula: string, subst = "", result = "", tail = ""): string {
  return (
    `<tspan class="f-rule">${formula}</tspan>` +
    (subst ? `<tspan class="f-sub"> ${subst}</tspan>` : "") +
    (result ? `<tspan class="f-res"> ${result}</tspan>` : "") +
    (tail ? `<tspan class="f-sub"> ${tail}</tspan>` : "")
  );
}

/**
 * Fixed live formula in the top-left of a stage: a few lines of SVG text
 * whose markup and colour class are swapped as the simulation changes.
 */
export function createStageFormula(parent: Element, opts: { x: number; lines: FormulaLine[] }) {
  const g = svgEl("g", { class: "stage-formula" }, parent);
  const texts = opts.lines.map((l) =>
    svgEl("text", { x: opts.x, y: l.y, "font-size": l.size, ...(l.cls ? { class: l.cls } : {}) }, g),
  );
  const baseCls = opts.lines.map((l) => l.cls ?? "");
  let last = "";
  return {
    /** `lines` are trusted SVG text markup; `cls` colours the group (e.g. pos / neg / zero). */
    set(lines: LineSpec[], cls = "") {
      const specs = lines.map((l, i) => (typeof l === "string" ? { markup: l, cls: baseCls[i] ?? "" } : l));
      const key = cls + "\u0000" + specs.map((l) => l.cls + "\u0001" + l.markup).join("\u0000");
      if (key === last) return;
      last = key;
      specs.forEach((l, i) => {
        if (!texts[i]) return;
        texts[i].innerHTML = l.markup;
        texts[i].setAttribute("class", l.cls);
      });
      setAttrs(g, { class: `stage-formula ${cls}`.trim() });
    },
    texts,
  };
}
