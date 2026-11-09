/**
 * Lesson 17, Потенциална tab: lifting the ball stores work as Eп.
 *
 * Model (stated on the page): the ball is lifted slowly at a constant speed,
 * so the lifting force equals its weight, F = mg. The short speed-up at the
 * start and the stop at the top are ignored. h is measured from the floor to
 * the bottom of the ball.
 *
 * The work meter fills live with A = F·s = mg·h, using the h shown in whole
 * centimetres (exact integer arithmetic, "=" vs "≈" is honest). At the top
 * the same bar is relabelled Eп: the work has been stored as Eп = A = mgh.
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
  potential,
  show,
  type TabCtx,
} from "./energy-math";

const SCALE = 80; // viewBox units per metre

const RULER_X = 70;
const BALL_X = 200;
const H_MIN = 0.5;
const H_MAX = 3.0;
const LIFT_SPEED = 0.6; // m/s, constant

const BAR_X = 470;
const BAR_W = 50;
const BAR_TOP = 130;
const TARGET_AT = 0.85; // mgh sits at 85 % of the bar height

export function mountLift(host: HTMLElement, ctx: TabCtx): () => void {
  // ---- state ----
  let m = ctx.mass.m;
  let hTarget = ctx.preset?.h ?? 1.5; // m
  let reported = false;
  let h = 0; // m, current height of the ball bottom (continuous)
  let running = false;

  const top = () => h >= hTarget - 1e-9;

  // ---- scene ----
  const { svg, toSvg, groundY } = createScene({
    width: VIEW_W,
    height: VIEW_H,
    scale: SCALE,
    groundOffset: GROUND,
    label: "Топка, вдигната с постоянна скорост до височина h, и стълб, който показва работата A",
  });

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

  // Target height: dashed line across the scene
  const targetLine = svgEl("line", { class: "target-line", x1: RULER_X, x2: BAR_X - 30 }, svg);

  // Height bracket h
  const hLine = svgEl("line", { class: "h-bracket" }, svg);
  const hTop = svgEl("line", { class: "h-bracket" }, svg);
  const hLabel = svgEl("text", { class: "scene-label", "font-size": 20 }, svg);
  hLabel.textContent = "h";

  // Ball and the lifting force (wrapped in a group: the circle's own class is
  // rewritten every frame for its colour, so a chip-glow goes on the group)
  const ballGroup = svgEl("g", {}, svg);
  const ball = svgEl("circle", { class: "ball" }, ballGroup);
  const ballLabel = svgEl("text", { class: "ball-label", "font-size": 11, "text-anchor": "middle" }, svg);
  const fArrow = createArrow(svg, { head: 14, halfWidth: 7 });
  const fLabel = svgEl("text", { class: "scene-label", "font-size": 18 }, svg);
  fLabel.innerHTML = `F = ${sym("m")}${sym("g")}`;

  // One bar: work A while lifting, relabelled Eп at the top
  const meter = createBarMeter(svg, { x: BAR_X, top: BAR_TOP, bottom: groundY, width: BAR_W, min: 0, max: 1 });
  const barName = svgEl("text", { class: "scene-label", x: BAR_X + BAR_W / 2, y: BAR_TOP - 10, "font-size": 18, "text-anchor": "middle" }, svg);
  const goalLine = svgEl("line", { class: "total-line", x1: BAR_X - 8, x2: BAR_X + BAR_W + 8 }, svg);
  const goalLabel = svgEl("text", { class: "scene-small", x: BAR_X - 12, "font-size": 15, "text-anchor": "end" }, svg);
  goalLabel.innerHTML = `${sym("m")}${sym("g")}${sym("h")}`;

  // Same stage position in all three tabs
  const formula = createStageFormula(svg, { x: 14, lines: FORMULA_LINES });

  // ---- controls ----
  const status = createStatus();
  const runBtn = html<HTMLButtonElement>(`<button type="button" class="primary"></button>`);
  const restartBtn = html<HTMLButtonElement>(`<button type="button" class="secondary">Отначало</button>`);
  const actionRow = html(`<div class="action-row"></div>`);
  actionRow.append(runBtn, restartBtn);

  const height = slider({ label: "Височина h", min: H_MIN, max: H_MAX, step: 0.05, value: hTarget, format: (x) => `${num(x, 2)} m` });
  const mass = slider({ label: "Маса m", min: MASS_MIN, max: MASS_MAX, step: MASS_STEP, value: m, format: (x) => `${num(x, 1)} kg` });
  const controls = html(`<div class="controls"></div>`);
  controls.append(height.root, mass.root);

  const root = html(`<div class="sim"></div>`);
  root.append(svg, actionRow, status.el, controls);
  host.append(root);

  // ---- actions ----
  const restart = () => {
    h = 0;
    running = false;
    reported = false;
  };
  const offs = [
    height.onInput((x) => {
      hTarget = x;
      restart();
    }),
    mass.onInput((x) => {
      m = x;
      ctx.mass.set(m);
      restart();
    }),
  ];
  const onRun = () => {
    if (top()) restart();
    running = !running;
  };
  runBtn.addEventListener("click", onRun);
  restartBtn.addEventListener("click", restart);

  function step(dt: number) {
    if (!running) return;
    h = Math.min(h + LIFT_SPEED * dt, hTarget);
    if (top()) running = false;
  }

  // ---- render ----
  function render() {
    const done = top();
    const m10 = Math.round(m * 10);
    const hCm = done ? Math.round(hTarget * 100) : Math.min(Math.round(h * 100), Math.round(hTarget * 100));
    const A = potential(m10, hCm);

    // Ball, h to its bottom
    const r = ballRadius(m);
    const bottomY = toSvg({ x: 0, y: h }).y;
    const cy = bottomY - r;
    // This tab is about Eп from the first frame: the ball is always blue.
    setAttrs(ball, { cx: BALL_X, cy, r, class: "ball lifted" });
    setAttrs(ballLabel, { x: BALL_X, y: cy + 4 });
    ballLabel.textContent = `${num(m, m % 1 ? 1 : 0)} kg`;

    // Lifting force: up from the top of the ball while it is being lifted
    const lifting = running || (h > 0 && !done);
    fArrow.show(lifting);
    fLabel.style.display = lifting ? "" : "none";
    const fLen = 30 + 10 * Math.sqrt(m);
    fArrow.set({ x: BALL_X, y: cy - r }, { x: BALL_X, y: cy - r - fLen });
    setAttrs(fLabel, { x: BALL_X + 12, y: cy - r - fLen + 14 });

    const ty = toSvg({ x: 0, y: hTarget }).y;
    setAttrs(targetLine, { y1: ty, y2: ty });

    const bx = BALL_X + 40;
    const showH = groundY - bottomY > 14;
    hLine.style.display = hTop.style.display = hLabel.style.display = showH ? "" : "none";
    setAttrs(hLine, { x1: bx, y1: groundY, x2: bx, y2: bottomY });
    setAttrs(hTop, { x1: bx - 6, y1: bottomY, x2: bx + 6, y2: bottomY });
    setAttrs(hLabel, { x: bx + 8, y: (groundY + bottomY) / 2 + 6 });

    // Bar: exact work so far; mgh of the target marked
    const goal = m * G * hTarget;
    meter.setRange(0, goal / TARGET_AT);
    // Work is neutral while it is being done; at the top it has become Eп
    meter.set(m * G * h, done ? "bar-ep" : "bar-work");
    const gy = meter.y(goal);
    setAttrs(goalLine, { y1: gy, y2: gy });
    setAttrs(goalLabel, { y: gy + 5 });
    barName.innerHTML = E("п");
    setAttrs(barName, { class: "scene-label lab-p" });

    // Stage formula: this tab is about Eп from the first frame, so the lead
    // identity line and the Eп label are blue throughout, not just once done.
    const mTxt = `${num(m, 1)} kg`;
    const hTxt = `${num(hCm / 100, 2)} m`;
    const fNote = "За да вдигнеш равномерно, буташ колкото тежи тялото: F = mg.";
    const sNote = "При вдигане пътят е височината: s = h.";
    const chEp = chip("Ep", E("п"), `${num(joules(A), 1)} J`);
    const chF = chip("F", sym("F"), `${num(m * G, 1)} N`, fNote);
    const chM = chip("m", sym("m"), mTxt);
    const chG = chip("g", sym("g"), `${num(G, 1)} m/s²`);
    const chH = chip("h", sym("h"), hTxt);
    const lead = fx(
      `${chEp} = ${chip("A", sym("A"), `${num(joules(A), 1)} J`)} = ${chF}·${chip("s", sym("s"), hTxt, sNote)} = ${chM}${chG}·${chH}`,
    );
    const fLine = fx(`${chF} = ${chM}${chG}`, `= ${mTxt} · ${num(G, 1)} m/s²`, `= ${num(m * G, 1)} N`);
    formula.set([
      { markup: lead, cls: "ep" },
      { markup: fx(chEp, `= ${mTxt} · ${num(G, 1)} m/s² · ${hTxt}`, show(A)), cls: "ep" },
      fLine,
    ]);

    if (done && !reported) {
      reported = true;
      ctx.onDone?.({ h: hCm / 100, ep: joules(A), m });
    }

    runBtn.textContent = running ? "❚❚ Пауза" : done ? "↻ Вдигни отново" : "▶ Вдигни";
    let text: string;
    let level: Level = "neutral";
    if (done) {
      text = `Горе. Работата се е запазила като ${EH("п")} = <i>A</i> = ${num(joules(A), 1)} J.`;
      level = "p";
    } else if (running) {
      text = "Вдигаме с постоянна скорост: <i>F</i> = <i>mg</i>, <i>A</i> расте.";
    } else if (h > 0) {
      text = "Пауза.";
    } else {
      text = "Натисни „Вдигни“.";
    }
    status.set(text, level, true);
  }

  const unmountChips = mountChipPopovers(root, {
    Ep: meter.g,
    A: meter.g,
    F: fArrow.el,
    s: [hLine, hTop],
    m: ballGroup,
    g: undefined,
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
