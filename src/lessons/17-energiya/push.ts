/**
 * Lesson 17, Кинетична tab: pushing a cart from rest stores work as Ek.
 *
 * Model (stated on the page): no friction and no air resistance. A constant
 * force F pushes the cart from rest over a distance s, so a = F/m and
 * x = a t²/2; after the push the cart keeps its speed. Played 2× slower.
 *
 * Both sides are live at every moment: A = F·x (x in whole cm, exact) and
 * Ek = mv²/2 with v = √(2Fx/m), the cart's real speed at that x, rounded to
 * 0,01 m/s. They are equal. Ek shows "=" only when the shown v is the exact
 * speed (then it matches A to the digit), otherwise "≈". The two bars use exact values and are always the same height.
 */
import { html, slider } from "../../lib/dom";
import { num } from "../../lib/format";
import { startLoop } from "../../lib/loop";
import { createBarMeter } from "../../lib/meter";
import { createArrow, createScene } from "../../lib/scene";
import { createStageFormula } from "../../lib/stage";
import { createStatus, type Level } from "../../lib/status";
import { setAttrs, svgEl, sym } from "../../lib/svg";
import { E, MASS_MAX, MASS_MIN, MASS_STEP, kinetic, show, workFx, type MassState } from "./energy-math";

const SLOW = 2;

const VIEW_W = 580;
const VIEW_H = 300;
const SCALE = 110; // viewBox units per metre
const GROUND = 40;

const START = 0.6; // m, cart's left edge at rest
const TRAVEL = 2.4; // m the cart's left edge moves before we stop the picture
const CART_W = 0.45;
const CART_H = 0.22;
const WHEEL_R = 7; // viewBox units

const S_MIN = 0.5;
const S_MAX = 1.5;
const F_MIN = 1;
const F_MAX = 10;

const BAR_W = 40;
const A_X = 425;
const EK_X = 500;
const BAR_TOP = 120;
const GOAL_AT = 0.85;

export function mountPush(host: HTMLElement, mass0: MassState): () => void {
  // ---- state ----
  let m = mass0.m;
  let F = 4; // N
  let s = 1; // m, length of the push
  let t = 0; // s of simulated time
  let running = false;

  const a = () => F / m;
  const tPush = () => Math.sqrt((2 * s) / a());
  const vFinal = () => Math.sqrt((2 * F * s) / m);
  /** Position of the cart's left edge, measured from the start, in metres. */
  const xAt = (tt: number) => (tt <= tPush() ? (a() * tt * tt) / 2 : s + vFinal() * (tt - tPush()));
  const tEnd = () => tPush() + (TRAVEL - s) / vFinal();
  const ended = () => t >= tEnd() - 1e-9;

  /** The displayed state; during the push v is derived from the x shown. */
  function state() {
    const x = Math.min(xAt(t), TRAVEL);
    const sCm = Math.round(s * 100);
    const pushing = t < tPush();
    const xCm = pushing ? Math.min(Math.round(x * 100), sCm) : sCm; // pushed distance
    const vExact = Math.sqrt((2 * F * (xCm / 100)) / m);
    const vCm = Math.round(vExact * 100);
    return { x, xCm, sCm, pushing, vCm };
  }

  // ---- scene ----
  const { svg, toSvg, groundY } = createScene({
    width: VIEW_W,
    height: VIEW_H,
    scale: SCALE,
    groundOffset: GROUND,
    label: "Количка, бутана със сила F по път s, и два стълба: работата A и кинетичната енергия",
  });

  // Ruler along the floor, 0 at the cart's start
  for (let d = 0; d <= TRAVEL + 1e-9; d += 0.5) {
    const x = toSvg({ x: START + d, y: 0 }).x;
    const major = Math.abs(d - Math.round(d)) < 1e-9;
    svgEl("line", { class: "ruler", x1: x, y1: groundY, x2: x, y2: groundY + (major ? 12 : 7) }, svg);
    if (major) {
      const lab = svgEl("text", { class: "ruler-label", x, y: groundY + 30, "font-size": 15, "text-anchor": "middle" }, svg);
      lab.textContent = d === 0 ? "0" : `${num(d)} m`;
    }
  }

  // The stretch where F pushes
  const zone = svgEl("rect", { class: "push-zone", y: groundY - 3, height: 6 }, svg);
  const zoneEnd = svgEl("line", { class: "target-line", y1: groundY - 70, y2: groundY }, svg);
  const zoneLabel = svgEl("text", { class: "scene-label", y: groundY - 74, "font-size": 18, "text-anchor": "middle" }, svg);

  const slowLabel = svgEl("text", { class: "scene-small", x: (A_X + EK_X + BAR_W) / 2, y: groundY + 30, "font-size": 14, "text-anchor": "middle" }, svg);
  slowLabel.textContent = `забавено ${SLOW}×`;

  // Cart
  const cart = svgEl("g", {}, svg);
  const body = svgEl("rect", { class: "cart", width: CART_W * SCALE, height: CART_H * SCALE, rx: 4 }, cart);
  const wheels = [0.2, 0.8].map((f) => svgEl("circle", { class: "wheel", r: WHEEL_R, "data-f": f }, cart));
  const massLabel = svgEl("text", { class: "ball-label", "font-size": 12, "text-anchor": "middle" }, cart);

  const fArrow = createArrow(svg);
  const fLabel = svgEl("text", { class: "scene-label", "font-size": 20 }, svg);
  fLabel.textContent = "F";
  const vArrow = createArrow(svg, { head: 14, halfWidth: 7, className: "v-arrow" });
  const vLabel = svgEl("text", { class: "scene-label", "font-size": 20 }, svg);
  vLabel.textContent = "v";

  // Two bars side by side: the work done and the cart's Ek
  const aMeter = createBarMeter(svg, { x: A_X, top: BAR_TOP, bottom: groundY, width: BAR_W, min: 0, max: 1 });
  const ekMeter = createBarMeter(svg, { x: EK_X, top: BAR_TOP, bottom: groundY, width: BAR_W, min: 0, max: 1 });
  const goalLine = svgEl("line", { class: "total-line", x1: A_X - 8, x2: EK_X + BAR_W + 8 }, svg);
  const goalLabel = svgEl("text", { class: "scene-small", x: A_X - 12, "font-size": 15, "text-anchor": "end" }, svg);
  goalLabel.innerHTML = `${sym("F")}·${sym("s")}`;
  for (const [x, name] of [
    [A_X, sym("A")],
    [EK_X, E("k")],
  ] as const) {
    const lab = svgEl("text", { class: "scene-label", x: x + BAR_W / 2, y: BAR_TOP - 10, "font-size": 18, "text-anchor": "middle" }, svg);
    lab.innerHTML = name;
  }

  const formula = createStageFormula(svg, {
    x: 14,
    lines: [
      { y: 28, size: 17, cls: "work" },
      { y: 54, size: 17, cls: "ek" },
      { y: 82, size: 18, cls: "rule" },
    ],
  });

  // ---- controls ----
  const status = createStatus();
  const runBtn = html<HTMLButtonElement>(`<button type="button" class="primary"></button>`);
  const restartBtn = html<HTMLButtonElement>(`<button type="button">Отначало</button>`);
  const actionRow = html(`<div class="action-row"></div>`);
  actionRow.append(runBtn, restartBtn);

  const force = slider({ label: "Сила F", min: F_MIN, max: F_MAX, step: 1, value: F, format: (x) => `${num(x)} N` });
  const dist = slider({ label: "Път на бутане s", min: S_MIN, max: S_MAX, step: 0.05, value: s, format: (x) => `${num(x, 2)} m` });
  const mass = slider({ label: "Маса m", min: MASS_MIN, max: MASS_MAX, step: MASS_STEP, value: m, format: (x) => `${num(x, 1)} kg` });
  const controls = html(`<div class="controls"></div>`);
  controls.append(force.root, dist.root, mass.root);

  const root = html(`<div class="sim"></div>`);
  root.append(svg, actionRow, status.el, controls);
  host.append(root);

  // ---- actions ----
  const restart = () => {
    t = 0;
    running = false;
  };
  const offs = [
    force.onInput((x) => {
      F = x;
      restart();
    }),
    dist.onInput((x) => {
      s = x;
      restart();
    }),
    mass.onInput((x) => {
      m = x;
      mass0.set(m);
      restart();
    }),
  ];
  const onRun = () => {
    if (ended()) restart();
    running = !running;
  };
  runBtn.addEventListener("click", onRun);
  restartBtn.addEventListener("click", restart);

  function step(dt: number) {
    if (!running) return;
    t = Math.min(t + dt / SLOW, tEnd());
    if (ended()) running = false;
  }

  // ---- render ----
  function render() {
    const st = state();
    const m10 = Math.round(m * 10);
    const A = workFx(F, st.xCm);
    // "=" only when the shown v is the cart's exact speed (then Ek = A to the digit):
    // v² = 2F·x/m  ⇔  vCm² · m10 = 2 · F · xCm · 1000
    const vIsExact = st.vCm * st.vCm * m10 === 2 * F * st.xCm * 1000;
    const ekRaw = kinetic(m10, st.vCm, 2);
    const ek = { ...ekRaw, exact: ekRaw.exact && vIsExact };
    const done = ended();

    // Push zone on the floor
    const z0 = toSvg({ x: START, y: 0 }).x;
    const z1 = toSvg({ x: START + s, y: 0 }).x;
    setAttrs(zone, { x: z0, width: z1 - z0 });
    setAttrs(zoneEnd, { x1: z1, x2: z1 });
    setAttrs(zoneLabel, { x: (z0 + z1) / 2 });
    zoneLabel.innerHTML = `${sym("s")} = ${num(s, 2)} m`;

    // Cart (its left edge at START + x)
    const left = toSvg({ x: START + st.x, y: 0 }).x;
    const w = CART_W * SCALE;
    const bodyTop = groundY - 2 * WHEEL_R - CART_H * SCALE + 4;
    setAttrs(body, { x: left, y: bodyTop });
    wheels.forEach((wh) => setAttrs(wh, { cx: left + Number(wh.getAttribute("data-f")) * w, cy: groundY - WHEEL_R }));
    setAttrs(massLabel, { x: left + w / 2, y: bodyTop + CART_H * SCALE / 2 + 4 });
    massLabel.textContent = `${num(m, m % 1 ? 1 : 0)} kg`;

    // F behind the cart while it is (or is about to be) pushed
    const midY = bodyTop + (CART_H * SCALE) / 2;
    const pushOn = st.pushing && !done;
    fArrow.show(pushOn);
    fLabel.style.display = pushOn ? "" : "none";
    const fLen = 30 + 5 * F;
    fArrow.set({ x: left - fLen, y: midY }, { x: left - 2, y: midY });
    setAttrs(fLabel, { x: left - fLen / 2 - 6, y: midY - 14 });

    // v above the cart
    const vLen = 14 * (st.vCm / 100);
    const showV = vLen > 8;
    vArrow.show(showV);
    vLabel.style.display = showV ? "" : "none";
    const vy = bodyTop - 14;
    vArrow.set({ x: left + w / 2, y: vy }, { x: left + w / 2 + vLen, y: vy });
    setAttrs(vLabel, { x: left + w / 2 - 18, y: vy + 6 });

    // Bars: exact values, equal at every moment
    const goal = F * s;
    const now = (F * st.xCm) / 100;
    aMeter.setRange(0, goal / GOAL_AT);
    ekMeter.setRange(0, goal / GOAL_AT);
    aMeter.set(now, "meter-bar-pos");
    ekMeter.set(now, "bar-ek");
    const gy = aMeter.y(goal);
    setAttrs(goalLine, { y1: gy, y2: gy });
    setAttrs(goalLabel, { y: gy + 5 });

    // Stage formula: both sides live
    const xName = st.pushing ? sym("x") : sym("s");
    const xTxt = `${num(st.xCm / 100, 2)} m`;
    const vTxt = `${num(st.vCm / 100, 2)} m/s`;
    formula.set(
      [
        `${sym("A")} = ${sym("F")}·${xName} = ${F} N · ${xTxt} ${show(A)}`,
        `${E("k")} = ${sym("m")}${sym("v")}²/2 = ${num(m, 1)} kg · (${vTxt})² / 2 ${show(ek)}`,
        `${E("k")} = ${sym("A")}`,
      ],
      "",
    );

    runBtn.textContent = running ? "❚❚ Пауза" : done ? "↻ Бутни отново" : "▶ Бутни";
    let text: string;
    let level: Level = "neutral";
    if (done) {
      text = `Количката носи Ek = A = ${num(A.units / 100, 2)} J и продължава с v = ${num(st.vCm / 100, 2)} m/s.`;
      level = "ok";
    } else if (!running && t === 0) {
      text = "Количката стои: v = 0, Ek = 0. Натисни „Бутни“.";
    } else if (!running) {
      text = "Пауза.";
    } else if (st.pushing) {
      text = "Бутаме: A расте и Ek расте точно толкова.";
    } else {
      text = "Бутането спря. Без триене v не се променя, Ek = A.";
      level = "ok";
    }
    status.set(text, level);
  }

  const stop = startLoop((dt) => {
    step(dt);
    render();
  });
  render();

  return () => {
    stop();
    offs.forEach((off) => off());
    runBtn.removeEventListener("click", onRun);
    restartBtn.removeEventListener("click", restart);
    root.remove();
  };
}
