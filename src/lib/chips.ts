/**
 * Interactive symbol chips inside a stage formula: every physics symbol
 * (A, F, s, m, g, h, v, Ek, Ep, …) becomes a focusable tap target. Opening
 * one shows a popover with its textbook name, a plain-words line, its unit
 * and its current value, and pulses the matching element on the stage.
 *
 * `chip()` only builds the markup string (used inside fx()/sym() output,
 * same as any other trusted SVG text markup); `mountChipPopovers()` wires
 * up one delegated listener per lesson that opens/closes/positions the
 * popover and toggles the highlight. One popover is open at a time.
 */
import { GLOSSARY } from "./glossary";

const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/**
 * `key` looks up the glossary entry. `display` is the symbol's own trusted
 * markup (e.g. from sym() or E()). `value` is a short live reading, e.g.
 * "20 N". `note` overrides/adds a remark for this occurrence only (a
 * rename like "F = mg" or a lesson-specific correction) — it does not
 * change the shared glossary entry. Unknown keys render as plain text.
 */
export function chip(key: string, display: string, value: string, note?: string): string {
  if (!GLOSSARY[key]) return display;
  const noteAttr = note ? ` data-note="${escAttr(note)}"` : "";
  return `<tspan class="chip" tabindex="0" role="button" aria-haspopup="dialog" aria-expanded="false" data-sym="${key}" data-value="${escAttr(value)}"${noteAttr}>${display}</tspan>`;
}

export type ChipTargets = Record<string, Element | Element[] | undefined>;

/**
 * `root` scopes which chips this instance reacts to (the lesson's own
 * `.sim` element). `targets` maps a glossary key to the scene element(s)
 * that should glow while its popover is open.
 */
export function mountChipPopovers(root: Element, targets: ChipTargets): () => void {
  let openChip: HTMLElement | null = null;
  let pop: HTMLElement | null = null;
  let glowing: Element[] = [];

  const targetsFor = (key: string): Element[] => {
    const t = targets[key];
    if (!t) return [];
    return Array.isArray(t) ? t : [t];
  };

  function close() {
    openChip?.setAttribute("aria-expanded", "false");
    openChip = null;
    glowing.forEach((el) => el.classList.remove("chip-glow"));
    glowing = [];
    pop?.remove();
    pop = null;
  }

  function position(anchor: Element, panel: HTMLElement) {
    const r = anchor.getBoundingClientRect();
    const margin = 10;
    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;
    let left = r.left + r.width / 2 - pw / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - pw - margin));
    let top = r.bottom + 10;
    if (top + ph > window.innerHeight - margin) top = r.top - ph - 10;
    top = Math.max(margin, top);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function open(chipEl: HTMLElement) {
    const key = chipEl.dataset.sym!;
    const term = GLOSSARY[key];
    if (!term) return;
    close();
    openChip = chipEl;
    chipEl.setAttribute("aria-expanded", "true");
    glowing = targetsFor(key);
    glowing.forEach((el) => el.classList.add("chip-glow"));

    const panel = document.createElement("div");
    panel.className = "chip-pop";
    panel.setAttribute("role", "dialog");
    const note = chipEl.dataset.note;
    const value = chipEl.dataset.value;
    panel.innerHTML = `
      <p class="chip-pop-name">${term.name}${term.unit ? ` <span class="chip-pop-unit">(${term.unit})</span>` : ""}</p>
      <p class="chip-pop-plain">${term.plain}</p>
      ${note ? `<p class="chip-pop-note">${note}</p>` : ""}
      ${value ? `<p class="chip-pop-value">${value}</p>` : ""}`;
    document.body.append(panel);
    pop = panel;
    position(chipEl, panel);
  }

  const toggle = (chipEl: HTMLElement) => (openChip === chipEl ? close() : open(chipEl));

  const onClick = (e: MouseEvent) => {
    const chipEl = (e.target as Element).closest<HTMLElement>(".chip");
    if (chipEl && root.contains(chipEl)) {
      e.preventDefault();
      toggle(chipEl);
      return;
    }
    if (pop && !pop.contains(e.target as Node)) close();
  };
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && openChip) {
      close();
      return;
    }
    if (e.key !== "Enter" && e.key !== " ") return;
    const chipEl = (e.target as Element).closest<HTMLElement>(".chip");
    if (chipEl && root.contains(chipEl)) {
      e.preventDefault();
      toggle(chipEl);
    }
  };
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKeydown);

  return () => {
    document.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKeydown);
    close();
  };
}
