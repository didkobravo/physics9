/**
 * Lesson 15 tracer: a box standing on a tilting ramp.
 *
 * Model (stated on the page): the box stands on a rubber pad and never slides;
 * it can only rotate about its downhill bottom corner. It tips when the
 * vertical line through its centre of gravity C leaves the support base,
 * i.e. when tan θ > b / h for a uniform box of base b and height h.
 *
 * World coordinates are metres, y up. They are mapped to SVG viewBox units.
 */
import { html, slider } from "../../lib/dom";
import { num } from "../../lib/format";
import { startLoop } from "../../lib/loop";
import { pointsAttr, setAttrs, svgEl, type Pt } from "../../lib/svg";

const G = 9.8;
const VIEW_W = 560;
const VIEW_H = 420;
const SCALE = 100; // viewBox units per metre
const GROUND_Y = VIEW_H - 24; // SVG y of world y = 0

const HINGE: Pt = { x: 3.6, y: 0.25 }; // downhill end of the ramp (world)
const RAMP_LEN = 3.3;
const BOX_POS = 2.15; // distance of the box's base centre from the hinge, along the ramp

const MAX_ANGLE = 70;

type Phase = "standing" | "tipping" | "fallen";
type Level = "ok" | "warn" | "danger";

const toSvg = (p: Pt): Pt => ({ x: p.x * SCALE, y: GROUND_Y - p.y * SCALE });
const add = (a: Pt, b: Pt, k = 1): Pt => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const rotCW = (v: Pt, a: number): Pt => ({
  x: v.x * Math.cos(a) + v.y * Math.sin(a),
  y: -v.x * Math.sin(a) + v.y * Math.cos(a),
});

export function mountTipping(host: HTMLElement): () => void {
  // ---- state ----
  let thetaDeg = 0;
  let b = 0.6; // base width, m
  let h = 1.2; // load height, m
  let phase: Phase = "standing";
  let phi = 0; // extra rotation about the pivot, clockwise (rad)
  let omega = 0; // angular velocity (rad/s)

  // ---- DOM ----
  const root = html(`<div class="sim"></div>`);
  const svg = svgEl("svg", {
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
    role: "img",
    "aria-label": "Кутия върху наклонена рампа с отвес от центъра на тежестта",
  });
  svgEl("rect", { class: "ground", x: 0, y: GROUND_Y, width: VIEW_W, height: VIEW_H - GROUND_Y }, svg);
  const ramp = svgEl("polygon", { class: "ramp" }, svg);
  const angleLabel = svgEl("text", { class: "scene-angle", "font-size": 20 }, svg);
  const support = svgEl("line", { class: "support" }, svg);
  const box = svgEl("polygon", { class: "box" }, svg);
  const slat1 = svgEl("line", { class: "box-slat" }, svg);
  const slat2 = svgEl("line", { class: "box-slat" }, svg);
  const plumb = svgEl("line", { class: "plumb" }, svg);
  const foot = svgEl("circle", { r: 6 }, svg);
  const force = svgEl("line", { class: "force" }, svg);
  const forceHead = svgEl("polygon", { class: "force-head" }, svg);
  const forceLabel = svgEl("text", { class: "scene-label", "font-size": 22 }, svg);
  const cg = svgEl("circle", { class: "cg", r: 7 }, svg);
  const cLabel = svgEl("text", { class: "scene-label", "font-size": 22 }, svg);
  cLabel.textContent = "C";
  forceLabel.textContent = "G";

  const status = html(`<p class="sim-status" aria-live="polite"></p>`);

  const angle = slider({
    label: "Наклон на рампата",
    min: 0,
    max: MAX_ANGLE,
    step: 1,
    value: thetaDeg,
    format: (v) => `${num(v)}°`,
  });
  const width = slider({
    label: "Ширина на основата",
    min: 0.3,
    max: 1.0,
    step: 0.05,
    value: b,
    format: (v) => `${num(v, 2)} m`,
  });
  const height = slider({
    label: "Височина на товара",
    min: 0.4,
    max: 2.0,
    step: 0.05,
    value: h,
    format: (v) => `${num(v, 2)} m`,
  });
  const reset = html<HTMLButtonElement>(`<button type="button" class="primary">Изправи кутията</button>`);

  const controls = html(`<div class="controls"></div>`);
  controls.append(angle.root, width.root, height.root, reset);
  root.append(svg, status, controls);
  host.append(root);

  const standUp = () => {
    phase = "standing";
    phi = 0;
    omega = 0;
  };

  // The box can stand on this ramp without tipping (tan θ ≤ b / h).
  const stableAt = (deg: number) => Math.tan((deg * Math.PI) / 180) <= b / h;

  const offs = [
    angle.onInput((v) => {
      thetaDeg = v;
      // A fallen box is put back upright as soon as the ramp is lowered to an
      // angle where it can stand, so the drawing and status match the sliders.
      if (phase === "fallen" && stableAt(v)) standUp();
    }),
    width.onInput((v) => {
      b = v;
      standUp();
    }),
    height.onInput((v) => {
      h = v;
      standUp();
    }),
  ];
  const onReset = () => {
    thetaDeg = 0;
    angle.set(0);
    standUp();
  };
  reset.addEventListener("click", onReset);

  // ---- geometry for the current state ----
  function geometry() {
    const th = (thetaDeg * Math.PI) / 180;
    const up: Pt = { x: -Math.cos(th), y: Math.sin(th) }; // uphill along the ramp
    const normal: Pt = { x: Math.sin(th), y: Math.cos(th) }; // away from the ramp surface
    const baseCentre = add(HINGE, up, BOX_POS);
    const pivot = add(baseCentre, up, -b / 2); // downhill bottom corner
    // Box axes after tipping by phi (clockwise about the pivot)
    const ax = rotCW(up, phi);
    const ay = rotCW(normal, phi);
    const local = (p: number, q: number) => add(add(pivot, ax, p), ay, q);
    const corners = [local(0, 0), local(b, 0), local(b, h), local(0, h)];
    const c = local(b / 2, h / 2);
    // Where the vertical through C meets the ramp line, measured from the hinge
    const sFoot = (HINGE.x - c.x) / Math.cos(th);
    const footPt = add(HINGE, up, sFoot);
    return { th, up, pivot, corners, c, local, sFoot, footPt };
  }

  // ---- physics step ----
  function step(dt: number) {
    if (phase === "fallen") return;
    const sub = 4;
    for (let i = 0; i < sub; i++) {
      const g = geometry();
      const lever = g.c.x - g.pivot.x; // >0: C is downhill of the pivot → tips
      if (phase === "standing") {
        if (lever <= 0) return;
        phase = "tipping";
      }
      const alpha = (3 * G * lever) / (b * b + h * h); // uniform box about a corner
      omega += alpha * (dt / sub);
      phi += omega * (dt / sub);
      if (phi <= 0) {
        // the ramp was lowered mid-tip: the box settles back on its base
        standUp();
        return;
      }
      if (phi >= Math.PI / 2) {
        phi = Math.PI / 2;
        omega = 0;
        phase = "fallen";
        return;
      }
    }
  }

  // ---- render ----
  function render() {
    const g = geometry();
    const top = add(HINGE, g.up, RAMP_LEN);
    const rampPts = [{ x: HINGE.x, y: 0 }, HINGE, top, { x: top.x, y: 0 }].map(toSvg);
    setAttrs(ramp, { points: pointsAttr(rampPts) });

    // Fixed top-left corner: the box and its labels never reach it.
    setAttrs(angleLabel, { x: 16, y: 34 });
    angleLabel.textContent = `наклон ${num(thetaDeg)}°`;

    // Box and decorative slats
    setAttrs(box, { points: pointsAttr(g.corners.map(toSvg)) });
    const s1a = toSvg(g.local(0, h / 3));
    const s1b = toSvg(g.local(b, h / 3));
    const s2a = toSvg(g.local(0, (2 * h) / 3));
    const s2b = toSvg(g.local(b, (2 * h) / 3));
    setAttrs(slat1, { x1: s1a.x, y1: s1a.y, x2: s1b.x, y2: s1b.y });
    setAttrs(slat2, { x1: s2a.x, y1: s2a.y, x2: s2b.x, y2: s2b.y });

    // How far inside the support base the plumb line lands (1 = centre, 0 = edge)
    const edge = BOX_POS - b / 2;
    const margin = phase === "standing" ? (g.sFoot - edge) / (b / 2) : -1;
    const level: Level = margin < 0.05 ? "danger" : margin < 0.3 ? "warn" : "ok";

    // Support area: the whole base while standing, only the corner while tipping
    const sa = toSvg(g.pivot);
    const sb = phase === "standing" ? toSvg(add(g.pivot, g.up, b)) : sa;
    setAttrs(support, { x1: sa.x, y1: sa.y, x2: sb.x, y2: sb.y, class: `support level-${level}` });

    const cs = toSvg(g.c);
    const fs = toSvg(g.footPt);
    setAttrs(plumb, { x1: cs.x, y1: cs.y, x2: cs.x, y2: fs.y, class: `plumb level-${level}` });
    setAttrs(foot, { cx: cs.x, cy: fs.y, class: `level-${level}` });

    // Gravity arrow G from C
    const len = 0.45 * SCALE;
    const tip = cs.y + len;
    setAttrs(force, { x1: cs.x, y1: cs.y, x2: cs.x, y2: tip - 10 });
    setAttrs(forceHead, { points: `${cs.x - 8},${tip - 14} ${cs.x + 8},${tip - 14} ${cs.x},${tip + 2}` });
    setAttrs(forceLabel, { x: cs.x + 10, y: tip });

    setAttrs(cg, { cx: cs.x, cy: cs.y });
    setAttrs(cLabel, { x: cs.x - 26, y: cs.y - 8 });

    // Status line
    const crit = num((Math.atan(b / h) * 180) / Math.PI);
    let text: string;
    if (phase === "fallen") {
      text = `Падна! Тази кутия се преобръща при наклон около ${crit}°. Натисни „Изправи кутията“.`;
    } else if (phase === "tipping") {
      text = "Преобръща се! Отвесът от C излезе извън опората.";
    } else if (level === "ok") {
      text = "Стои. Отвесът от C пада вътре в опората.";
    } else {
      text = "Внимание! Отвесът е съвсем близо до ръба на опората.";
    }
    if (status.textContent !== text) status.textContent = text;
    const statusLevel = phase === "standing" ? level : "danger";
    status.dataset.level = statusLevel;
  }

  const stop = startLoop((dt) => {
    step(dt);
    render();
  });
  render();

  return () => {
    stop();
    offs.forEach((off) => off());
    reset.removeEventListener("click", onReset);
    root.remove();
  };
}
