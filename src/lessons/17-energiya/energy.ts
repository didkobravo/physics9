/**
 * Lesson 17 tracer: a ball dropped from height h₀; Eп turns into Ek.
 *
 * Model (stated on the page): free fall without air resistance, worked out
 * exactly rather than stepped: h = h₀ − g t²/2. The fall plays 4× slower
 * than real time, and stops at the instant before the ball hits the floor.
 *
 * Every number on the stage is checkable by hand. The displayed state is
 * (h, v) with h in whole centimetres and v = √(2g(h₀ − h)) rounded to
 * 0,01 m/s. Eп is computed from the h shown and Ek from the v shown, each
 * with "=" when the product is exact at 0,1 J and "≈" when it is rounded.
 * The sum line shows "≈" whenever the two rounded energies do not add up to
 * the rounded total m·g·h₀.
 */
import { html, slider } from "../../lib/dom";
import { num } from "../../lib/format";
import { startLoop } from "../../lib/loop";
import { createBarMeter } from "../../lib/meter";
import { createArrow, createScene } from "../../lib/scene";
import { createStageFormula, fx } from "../../lib/stage";
import { chip, mountChipPopovers } from "../../lib/chips";
import { createStatus, type Level } from "../../lib/status";
import { setAttrs, svgEl, sym } from "../../lib/svg";
import {
  E,
  EH,
  FORMULA_LINES,
  G,
  GROUND,
  MASS_MAX,
  MASS_MIN,
  MASS_STEP,
  VIEW_H,
  VIEW_W,
  ballRadius,
  joules,
  kinetic,
  potential,
  show,
  type TabCtx,
} from "./energy-math";

const SLOW = 4; // slow-motion factor

const SCALE = 80; // viewBox units per metre

const RULER_X = 70;
const BALL_X = 170;
const H_MIN = 0.5;
const H_MAX = 3.0;

// Energy bars (right-hand side)
const BAR_W = 46;
const EP_X = 400;
const EK_X = 482;
const BAR_TOP = 130;
const TOTAL_AT = 0.85; // the total sits at 85 % of the bar height

export function mountEnergy(host: HTMLElement, ctx: TabCtx): () => void {
  // ---- state ----
  let h0 = ctx.preset?.h ?? 1.5; // m
  let m = ctx.mass.m; // kg, shared with the other tabs
  let reported = false;
  let t = 0; // s of simulated time since release
  let running = false;

  const tFall = () => Math.sqrt((2 * h0) / G);
  const landed = () => t >= tFall() - 1e-9;

  /** The displayed state: h in whole cm, v from h (rounded to cm/s). */
  function state() {
    const h0Cm = Math.round(h0 * 100);
    const hTrue = Math.max(h0 - (G * t * t) / 2, 0);
    const hCm = landed() ? 0 : Math.min(h0Cm, Math.round(hTrue * 100));
    const vExact = Math.sqrt(2 * G * ((h0Cm - hCm) / 100));
    const vCm = Math.round(vExact * 100);
    return { h0Cm, hTrue, hCm, vCm, vExact };
  }

  // ---- scene ----
  const { svg, toSvg, groundY } = createScene({
    width: VIEW_W,
    height: VIEW_H,
    scale: SCALE,
    groundOffset: GROUND,
    label: "Топка, пусната от височина h, и два стълба: потенциална и кинетична енергия",
  });

  // Vertical ruler
  for (let mm = 0; mm <= H_MAX + 1e-9; mm += 0.5) {
    const y = toSvg({ x: 0, y: mm }).y;
    const major = Math.abs(mm - Math.round(mm)) < 1e-9;
    svgEl("line", { class: "ruler", x1: RULER_X - (major ? 12 : 7), y1: y, x2: RULER_X, y2: y }, svg);
    if (major) {
      const lab = svgEl("text", { class: "ruler-label", x: RULER_X - 16, y: y + 5, "font-size": 15, "text-anchor": "end" }, svg);
      lab.textContent = mm === 0 ? "0" : `${num(mm)} m`;
    }
  }
  svgEl("line", { class: "ruler", x1: RULER_X, y1: groundY, x2: RULER_X, y2: toSvg({ x: 0, y: H_MAX }).y }, svg);

  const slowLabel = svgEl("text", { class: "scene-small", x: 250, y: groundY + 19, "font-size": 14, "text-anchor": "middle" }, svg);
  slowLabel.textContent = `забавено ${SLOW}×`;

  // Height bracket h (floor → ball bottom)
  const hLine = svgEl("line", { class: "h-bracket" }, svg);
  const hTop = svgEl("line", { class: "h-bracket" }, svg);
  const hLabel = svgEl("text", { class: "scene-label", "font-size": 20 }, svg);
  hLabel.textContent = "h";

  // Ball and its velocity arrow (wrapped in a group: the circle's own class is
  // rewritten every frame for its colour, so a chip-glow goes on the group)
  const ballGroup = svgEl("g", {}, svg);
  const ball = svgEl("circle", { class: "ball" }, ballGroup);
  const ballLabel = svgEl("text", { class: "ball-label", "font-size": 11, "text-anchor": "middle" }, svg);
  const vArrow = createArrow(svg, { head: 14, halfWidth: 7, className: "v-arrow" });
  const vLabel = svgEl("text", { class: "scene-label", "font-size": 20 }, svg);
  vLabel.textContent = "v";

  // Energy bars with the total marked
  const epMeter = createBarMeter(svg, { x: EP_X, top: BAR_TOP, bottom: groundY, width: BAR_W, min: 0, max: 1 });
  const ekMeter = createBarMeter(svg, { x: EK_X, top: BAR_TOP, bottom: groundY, width: BAR_W, min: 0, max: 1 });
  const totalLine = svgEl("line", { class: "total-line", x1: EP_X - 8, x2: EK_X + BAR_W + 8 }, svg);
  const totalLabel = svgEl("text", { class: "scene-small", x: EP_X - 12, "font-size": 15, "text-anchor": "end" }, svg);
  totalLabel.innerHTML = `${E("п")} + ${E("k")}`;
  for (const [x, sub] of [
    [EP_X, "п"],
    [EK_X, "k"],
  ] as const) {
    // Names sit above the bars (below them the subscript would be clipped by the stage edge)
    const lab = svgEl("text", { class: `scene-label lab-${sub === "п" ? "p" : "k"}`, x: x + BAR_W / 2, y: BAR_TOP - 10, "font-size": 18, "text-anchor": "middle" }, svg);
    lab.innerHTML = E(sub);
  }

  // Fixed live formula, top-left — same position in all three tabs
  const formula = createStageFormula(svg, { x: 14, lines: FORMULA_LINES });

  // ---- controls ----
  const status = createStatus();
  const runBtn = html<HTMLButtonElement>(`<button type="button" class="primary"></button>`);
  const restartBtn = html<HTMLButtonElement>(`<button type="button" class="secondary">Отначало</button>`);
  const actionRow = html(`<div class="action-row"></div>`);
  actionRow.append(runBtn, restartBtn);

  const height = slider({ label: "Височина h", min: H_MIN, max: H_MAX, step: 0.05, value: h0, format: (x) => `${num(x, 2)} m` });
  const mass = slider({ label: "Маса m", min: MASS_MIN, max: MASS_MAX, step: MASS_STEP, value: m, format: (x) => `${num(x, 1)} kg` });
  const controls = html(`<div class="controls"></div>`);
  controls.append(height.root, mass.root);

  const root = html(`<div class="sim"></div>`);
  root.append(svg, actionRow, status.el, controls);
  host.append(root);

  // ---- actions ----
  const restart = () => {
    t = 0;
    running = false;
    reported = false;
  };
  const offs = [
    height.onInput((x) => {
      h0 = x;
      restart();
    }),
    mass.onInput((x) => {
      m = x;
      restart();
      ctx.mass.set(m);
    }),
  ];
  const onRun = () => {
    if (landed() && t > 0) restart();
    running = !running;
  };
  runBtn.addEventListener("click", onRun);
  restartBtn.addEventListener("click", restart);

  function step(dt: number) {
    if (!running) return;
    t = Math.min(t + dt / SLOW, tFall());
    if (landed()) running = false;
  }

  // ---- render ----
  function render() {
    const s = state();
    const m10 = Math.round(m * 10);
    const ep = potential(m10, s.hCm);
    const ek = kinetic(m10, s.vCm);
    const total = potential(m10, s.h0Cm);
    const adds = ep.units + ek.units === total.units;

    // Ball (h measured to its bottom), radius grows gently with mass
    const r = ballRadius(m);
    const bottomY = toSvg({ x: 0, y: s.hTrue }).y;
    const cy = bottomY - r;
    // Highlight: blue while all its energy is Eп, orange once it moves
    setAttrs(ball, { cx: BALL_X, cy, r, class: t > 0 ? "ball moving" : "ball lifted" });
    setAttrs(ballLabel, { x: BALL_X, y: cy + 4 });
    ballLabel.textContent = `${num(m, m % 1 ? 1 : 0)} kg`;

    // v arrow: left of the ball, ending level with its centre, pointing down
    const vLen = 8 * (s.vCm / 100);
    const showV = vLen > 6;
    vArrow.show(showV);
    vLabel.style.display = showV ? "" : "none";
    if (showV) {
      vArrow.set({ x: BALL_X - r - 14, y: cy - vLen }, { x: BALL_X - r - 14, y: cy });
      setAttrs(vLabel, { x: BALL_X - r - 34, y: cy - vLen / 2 + 6 });
    }

    // h bracket on the right of the ball
    const bx = BALL_X + 30;
    const showH = groundY - bottomY > 14;
    hLine.style.display = hTop.style.display = hLabel.style.display = showH ? "" : "none";
    setAttrs(hLine, { x1: bx, y1: groundY, x2: bx, y2: bottomY });
    setAttrs(hTop, { x1: bx - 6, y1: bottomY, x2: bx + 6, y2: bottomY });
    setAttrs(hLabel, { x: bx + 8, y: (groundY + bottomY) / 2 + 6 });

    // Bars use the exact energies (they always add up to the total line);
    // only the printed numbers are rounded. The total sits at TOTAL_AT of the height.
    const totalJ = m * G * h0;
    const epJ = m * G * s.hTrue;
    const max = totalJ / TOTAL_AT;
    epMeter.setRange(0, max);
    ekMeter.setRange(0, max);
    epMeter.set(epJ, "bar-ep");
    ekMeter.set(totalJ - epJ, "bar-ek");
    const ty = epMeter.y(totalJ);
    setAttrs(totalLine, { y1: ty, y2: ty });
    setAttrs(totalLabel, { y: ty + 5 });

    // Stage formula: each line multiplies out exactly as written
    const mTxt = `${num(m, 1)} kg`;
    const hTxt = `${num(s.hCm / 100, 2)} m`;
    const vTxt = `${num(s.vCm / 100, 2)} m/s`;
    const epVal = `${num(joules(ep), 1)} J`;
    const ekVal = `${num(joules(ek), 1)} J`;
    const chEp = chip("Ep", E("п"), epVal);
    const chEk = chip("Ek", E("k"), ekVal);
    formula.set([
      fx(
        `${chEp} = ${chip("m", sym("m"), mTxt)}${chip("g", sym("g"), `${num(G, 1)} m/s²`)}${chip("h", sym("h"), hTxt)}`,
        `= ${mTxt} · ${num(G, 1)} m/s² · ${hTxt}`,
        show(ep),
      ),
      fx(`${chEk} = ${chip("m", sym("m"), mTxt)}${chip("v", sym("v"), vTxt)}²/2`, `= ${mTxt} · (${vTxt})² / 2`, show(ek)),
      fx(
        `${chEp} + ${chEk}`,
        `= ${num(joules(ep), 1)} + ${num(joules(ek), 1)}`,
        `${adds ? "=" : "≈"} ${num(joules(total), 1)} J`,
        "(не се променя)",
      ),
    ]);

    // Controls and status
    const done = landed() && t > 0;
    if (done && !reported) {
      reported = true;
      ctx.onDone?.({ v: s.vCm / 100, ek: joules(ek), ep: joules(ep), total: joules(total), h0, m });
    }
    runBtn.textContent = running ? "❚❚ Пауза" : done ? "↻ Пусни отново" : "▶ Пусни";
    let text: string;
    let level: Level = "neutral";
    if (done) {
      text = `Точно преди удара: цялата ${EH("п")} стана ${EH("k")}. <i>v</i> = √(2<i>gh</i>₀) = ${num(s.vCm / 100, 2)} m/s.`;
      level = "k";
    } else if (running) {
      text = `${EH("п")} намалява, ${EH("k")} расте — сборът остава същият.`;
    } else if (t > 0) {
      text = "Пауза.";
    } else {
      text = "Натисни „Пусни“.";
    }
    status.set(text, level, true);
  }

  const unmountChips = mountChipPopovers(root, {
    Ep: epMeter.g,
    Ek: ekMeter.g,
    m: ballGroup,
    v: [vArrow.el, vLabel],
    h: [hLine, hTop],
  });

  const stop = startLoop((dt) => {
    step(dt);
    render();
  });
  render();

  return () => {
    stop();
    unmountChips();
    offs.forEach((off) => off());
    runBtn.removeEventListener("click", onRun);
    restartBtn.removeEventListener("click", restart);
    root.remove();
  };
}
