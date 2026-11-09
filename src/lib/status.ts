import { html } from "./dom";

export type Level = "ok" | "warn" | "danger" | "neutral" | "k" | "p";

/** A live status line under a simulation; colour follows the level. */
export function createStatus() {
  const el = html(`<p class="sim-status" aria-live="polite"></p>`);
  return {
    el,
    /** `asHtml` is for trusted, static markup only (e.g. E<sub>k</sub>). */
    set(text: string, level: Level, asHtml = false) {
      if (asHtml) {
        if (el.dataset.html !== text) {
          el.innerHTML = text;
          el.dataset.html = text;
        }
      } else if (el.textContent !== text || el.dataset.html) {
        el.textContent = text;
        delete el.dataset.html;
      }
      el.dataset.level = level;
    },
  };
}
