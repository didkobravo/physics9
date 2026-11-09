import { html } from "./dom";

export type Level = "ok" | "warn" | "danger" | "neutral";

/** A live status line under a simulation; colour follows the level. */
export function createStatus() {
  const el = html(`<p class="sim-status" aria-live="polite"></p>`);
  return {
    el,
    set(text: string, level: Level) {
      if (el.textContent !== text) el.textContent = text;
      el.dataset.level = level;
    },
  };
}
