/**
 * Predict-then-reveal: "if the speed doubles, how many times does Eк grow?"
 * After either answer, a speed slider (0 … 2·v₀) drives an Eк bar with
 * markers at 1×, 2× (the tempting wrong answer) and 4× Eк(v₀).
 * All numbers are exact: v in 0,1 m/s steps, m in 0,5 kg steps.
 */
import { html, slider } from "../../lib/dom";
import { num, numUpTo } from "../../lib/format";
import { setAttrs, svgEl } from "../../lib/svg";

const V0 = 2; // m/s
const W = 580;
const X0 = 20;
const X1 = 560;

export function mountPredict(host: HTMLElement) {
  let m = 2;
  const root = html(`
    <section class="predict">
      <p><b>Познай:</b> ако скоростта стане 2 пъти по-голяма, колко пъти расте E<sub>к</sub>?</p>
      <div class="seg" role="group" aria-label="Твоят отговор">
        <button type="button" data-answer="2">2×</button>
        <button type="button" data-answer="4">4×</button>
      </div>
      <div class="reveal" hidden>
        <p class="predict-feedback"></p>
        <div data-bar></div>
        <div data-slider></div>
        <p class="predict-formula"></p>
      </div>
    </section>`);
  const reveal = root.querySelector<HTMLElement>(".reveal")!;
  const feedback = root.querySelector<HTMLElement>(".predict-feedback")!;
  const formulaEl = root.querySelector<HTMLElement>(".predict-formula")!;
  const answers = [...root.querySelectorAll<HTMLButtonElement>("[data-answer]")];

  // Horizontal Eк bar with markers
  const svg = svgEl("svg", { viewBox: `0 0 ${W} 96`, role: "img", "aria-label": "Кинетична енергия при скорост v" });
  svgEl("rect", { class: "track", x: X0, y: 34, width: X1 - X0, height: 30, rx: 4 }, svg);
  const bar = svgEl("rect", { class: "bar-ek", x: X0 + 3, y: 37, height: 24 }, svg);
  const markers = [1, 2, 4].map((k) => {
    const line = svgEl("line", { class: k === 2 ? "marker dashed" : "marker", y1: 26, y2: 72 }, svg);
    const lab = svgEl("text", { class: k === 2 ? "marker-label dim" : "marker-label", y: 20, "font-size": 16, "text-anchor": "middle" }, svg);
    lab.textContent = k === 1 ? "при v₀" : `${k}×`;
    return { k, line, lab };
  });
  root.querySelector("[data-bar]")!.append(svg);

  const speed = slider({ label: "Скорост v", min: 0, max: 2 * V0, step: 0.1, value: V0, format: (x) => `${num(x, 1)} m/s` });
  root.querySelector("[data-slider]")!.append(speed.root);
  host.append(root);

  // Scale: 4·Eк(v₀) sits at 90 % of the track, independent of m
  const xOf = (ratio: number) => X0 + 3 + (ratio / 4) * 0.9 * (X1 - X0 - 6);

  function render() {
    const v = speed.value;
    const ratio = (v / V0) ** 2;
    const ek = (m * v * v) / 2;
    const ek0 = (m * V0 * V0) / 2;
    setAttrs(bar, { width: Math.max(0, xOf(ratio) - X0 - 3) });
    for (const mk of markers) {
      const x = xOf(mk.k);
      setAttrs(mk.line, { x1: x, x2: x });
      setAttrs(mk.lab, { x });
    }
    const vTxt = `${num(v, 1)} m/s`;
    const times = Math.abs(v - 2 * V0) < 1e-9 ? "2" : numUpTo(v / V0, 2);
    formulaEl.innerHTML =
      `v = ${vTxt} = ${times} · v<sub>0</sub> → E<sub>к</sub> = ${num(m, 1)} kg · (${vTxt})² / 2 = ${numUpTo(ek, 4)} J` +
      ` = ${numUpTo(ratio, 4)} × E<sub>к</sub>(v<sub>0</sub>) (${numUpTo(ek0, 4)} J)`;
    formulaEl.classList.toggle("hit", Math.abs(v - 2 * V0) < 1e-9);
  }

  const onAnswer = (e: Event) => {
    const a = (e.currentTarget as HTMLElement).dataset.answer;
    answers.forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget)));
    if (a === "4") {
      feedback.textContent = "Точно! Скоростта е на квадрат: 2² = 4. Провери с плъзгача.";
      feedback.dataset.level = "ok";
    } else {
      feedback.textContent = "Не съвсем — Eк зависи от v², не от v. Провери с плъзгача:";
      feedback.dataset.level = "warn";
    }
    reveal.hidden = false;
    render();
  };
  answers.forEach((b) => b.addEventListener("click", onAnswer));
  const offSpeed = speed.onInput(render);
  render();

  return {
    setMass(newM: number) {
      m = newM;
      render();
    },
    unmount() {
      answers.forEach((b) => b.removeEventListener("click", onAnswer));
      offSpeed();
      root.remove();
    },
  };
}
