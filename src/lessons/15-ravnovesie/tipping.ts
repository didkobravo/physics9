/**
 * Lesson 15 tracer: a box standing on a tilting ramp.
 *
 * Model (stated on the page): the box stands on a rubber pad and never slides;
 * it can only rotate about its downhill bottom corner. It tips when the
 * vertical line through its centre of gravity C leaves the support base,
 * i.e. when tan θ > b / h for a uniform box of base b and height h.
 *
 * Once it has tipped past the corner it lands on a face and is "fallen" until
 * the user stands it up. If the face it lands on is still unstable it keeps
 * tumbling down the ramp, and if its centre passes the end of the ramp it
 * drops onto the ground. Every landing is treated as inelastic (it stops).
 *
 * World coordinates are metres, y up. They are mapped to SVG viewBox units.
 */
import { html, slider } from "../../lib/dom";
import { num } from "../../lib/format";
import { startLoop } from "../../lib/loop";
import { createArrow, createScene } from "../../lib/scene";
import { createStatus, type Level } from "../../lib/status";
import { pointsAttr, setAttrs, svgEl, type Pt } from "../../lib/svg";

const G = 9.8;
const VIEW_W = 580;
const VIEW_H = 420;
const SCALE = 100; // viewBox units per metre

const HINGE: Pt = { x: 3.6, y: 0.25 }; // downhill end of the ramp (world)
const RAMP_LEN = 3.3;
const BOX_POS = 2.15; // distance of the box's base centre from the hinge, along the ramp

const MAX_ANGLE = 70;
const DROP_TIME = 0.45; // s, fall from the ramp end to the ground

/**
 * standing — upright on its original base
 * tipping  — rotating about its downhill corner (tumble = how many faces it has already rolled over)
 * fallen   — lying on a face on the ramp
 * dropping — falling off the end of the ramp
 * ground   — lying on the ground
 */
type Phase = "standing" | "tipping" | "fallen" | "dropping" | "ground";

const add = (a: Pt, b: Pt, k = 1): Pt => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const rotCW = (v: Pt, a: number): Pt => ({
  x: v.x * Math.cos(a) + v.y * Math.sin(a),
  y: -v.x * Math.sin(a) + v.y * Math.cos(a),
});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function mountTipping(host: HTMLElement): () => void {
  // ---- state ----
  let thetaDeg = 0;
  let b = 0.6; // base width, m (box-fixed)
  let h = 1.2; // load height, m (box-fixed)
  let phase: Phase = "standing";

  // Pose on the ramp, in ramp terms. The face currently on the ramp spans
  // [sP, sP + along] measured uphill from the hinge; `rise` is the box's
  // extent away from the ramp. `quarter` counts completed 90° tumbles.
  let sP = BOX_POS - b / 2;
  let along = b;
  let rise = h;
  let quarter = 0;
  let phi = 0; // rotation of the current tip, clockwise (rad)
  let omega = 0; // angular velocity (rad/s)

  // Drop animation (world pose interpolated from start to end)
  let drop = { t: 0, c0: { x: 0, y: 0 }, a0: 0, c1: { x: 0, y: 0 }, a1: 0 };

  // ---- DOM ----
  const root = html(`<div class="sim"></div>`);
  const { svg, toSvg } = createScene({
    width: VIEW_W,
    height: VIEW_H,
    scale: SCALE,
    label: "Кутия върху наклонена рампа с отвес от центъра на тежестта",
  });
  const ramp = svgEl("polygon", { class: "ramp" }, svg);
  const angleLabel = svgEl("text", { class: "scene-angle", "font-size": 20, x: 16, y: 34 }, svg);
  const support = svgEl("line", { class: "support" }, svg);
  const box = svgEl("polygon", { class: "box" }, svg);
  const slat1 = svgEl("line", { class: "box-slat" }, svg);
  const slat2 = svgEl("line", { class: "box-slat" }, svg);
  const plumb = svgEl("line", { class: "plumb" }, svg);
  const foot = svgEl("circle", { r: 6 }, svg);
  const gravity = createArrow(svg);
  const forceLabel = svgEl("text", { class: "scene-label", "font-size": 22 }, svg);
  const cg = svgEl("circle", { class: "cg", r: 7 }, svg);
  const cLabel = svgEl("text", { class: "scene-label", "font-size": 22 }, svg);
  cLabel.textContent = "C";
  forceLabel.textContent = "G";

  const status = createStatus();

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
  // Becomes the filled primary action only while the box is down
  const reset = html<HTMLButtonElement>(`<button type="button">↻ Изправи кутията</button>`);
  const actionRow = html(`<div class="action-row"></div>`);
  actionRow.append(reset);

  // The tilt slider is the main action, so it sits right under the stage
  const controls = html(`<div class="controls"></div>`);
  controls.append(width.root, height.root);
  root.append(svg, angle.root, status.el, actionRow, controls);
  host.append(root);

  const standUp = () => {
    phase = "standing";
    sP = BOX_POS - b / 2;
    along = b;
    rise = h;
    quarter = 0;
    phi = 0;
    omega = 0;
  };

  /** Down = it has gone past its corner at least once and has not been stood up. */
  const isDown = () => phase === "fallen" || phase === "dropping" || phase === "ground" || quarter > 0;

  const offs = [
    angle.onInput((v) => (thetaDeg = v)),
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

  // ---- geometry ----
  function rampAxes() {
    const th = (thetaDeg * Math.PI) / 180;
    const u: Pt = { x: -Math.cos(th), y: Math.sin(th) }; // uphill along the ramp
    const n: Pt = { x: Math.sin(th), y: Math.cos(th) }; // away from the ramp surface
    return { th, u, n };
  }

  /** World pose of the box: centre C, box-fixed axes e1 (along b) and e2 (along h). */
  type Pose = { c: Pt; e1: Pt; e2: Pt; pivot: Pt | null };

  function rampPose(): Pose {
    const { u, n } = rampAxes();
    const pivot = add(HINGE, u, sP);
    const r0 = add({ x: u.x * (along / 2), y: u.y * (along / 2) }, n, rise / 2);
    const c = add(pivot, rotCW(r0, phi));
    const a = quarter * (Math.PI / 2) + phi;
    return { c, e1: rotCW(u, a), e2: rotCW(n, a), pivot };
  }

  function dropPose(): Pose {
    const s = Math.min(drop.t / DROP_TIME, 1);
    const k = s * s; // accelerating, like a fall
    const c = { x: lerp(drop.c0.x, drop.c1.x, k), y: lerp(drop.c0.y, drop.c1.y, k) };
    const a = lerp(drop.a0, drop.a1, k);
    const e1 = { x: Math.cos(a), y: Math.sin(a) };
    return { c, e1, e2: { x: e1.y, y: -e1.x }, pivot: null }; // e2 is e1 turned 90° clockwise, as on the ramp
  }

  const pose = (): Pose => (phase === "dropping" || phase === "ground" ? dropPose() : rampPose());

  /** The box has just rolled onto its next face: decide what happens next. */
  function land() {
    quarter += 1;
    sP -= rise;
    [along, rise] = [rise, along];
    phi = 0;
    omega = 0;
    const p = rampPose();
    if (sP >= 0) {
      // Whole face is on the ramp: tip again if C is past the new downhill corner
      phase = p.c.x > p.pivot!.x ? "tipping" : "fallen";
    } else if (p.c.x <= HINGE.x) {
      phase = "fallen"; // overhangs the end, but C is still above the ramp
    } else {
      startDrop(p);
    }
  }

  function startDrop(p: Pose) {
    const a0 = Math.atan2(p.e1.y, p.e1.x);
    // Keep turning clockwise to the nearest flat orientation
    const a1 = Math.floor(a0 / (Math.PI / 2) - 1e-6) * (Math.PI / 2);
    const flatB = Math.round(a1 / (Math.PI / 2)) % 2 === 0; // b lies horizontally
    const w = flatB ? b : h;
    const ht = flatB ? h : b;
    drop = { t: 0, c0: p.c, a0, c1: { x: HINGE.x + 0.03 + w / 2, y: ht / 2 }, a1 };
    phase = "dropping";
  }

  // ---- physics step ----
  function step(dt: number) {
    if (phase === "fallen" || phase === "ground") return;
    if (phase === "dropping") {
      drop.t += dt;
      if (drop.t >= DROP_TIME) phase = "ground";
      return;
    }
    const sub = 4;
    for (let i = 0; i < sub; i++) {
      const p = rampPose();
      const lever = p.c.x - p.pivot!.x; // >0: C is downhill of the pivot → tips
      if (phase === "standing") {
        if (lever <= 0) return;
        phase = "tipping";
      }
      const alpha = (3 * G * lever) / (b * b + h * h); // uniform box about a corner
      omega += alpha * (dt / sub);
      phi += omega * (dt / sub);
      if (phi <= 0) {
        // The ramp was lowered mid-tip: it settles back onto the face it came from.
        if (quarter === 0) standUp();
        else {
          phi = 0;
          omega = 0;
          phase = "fallen";
        }
        return;
      }
      if (phi >= Math.PI / 2) {
        land();
        return;
      }
    }
  }

  // ---- render ----
  let lastDown: boolean | null = null;

  function render() {
    const { th, u } = rampAxes();
    const top = add(HINGE, u, RAMP_LEN);
    const rampPts = [{ x: HINGE.x, y: 0 }, HINGE, top, { x: top.x, y: 0 }].map(toSvg);
    setAttrs(ramp, { points: pointsAttr(rampPts) });
    angleLabel.textContent = `наклон ${num(thetaDeg)}°`;

    const p = pose();
    const corner = (i: number, j: number) => add(add(p.c, p.e1, (i * b) / 2), p.e2, (j * h) / 2);
    setAttrs(box, { points: pointsAttr([corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)].map(toSvg)) });
    const slat = (el: SVGLineElement, j: number) => {
      const a = toSvg(corner(-1, j));
      const z = toSvg(corner(1, j));
      setAttrs(el, { x1: a.x, y1: a.y, x2: z.x, y2: z.y });
    };
    slat(slat1, -1 / 3);
    slat(slat2, 1 / 3);

    // Where the vertical through C lands: on the ramp, or on the ground past its end
    const onRamp = p.c.x <= HINGE.x;
    const footPt: Pt = onRamp ? add(HINGE, u, (HINGE.x - p.c.x) / Math.cos(th)) : { x: p.c.x, y: 0 };

    // Colour: how far inside the support base the plumb line lands (1 = centre, 0 = edge)
    let level: Level = "ok";
    let sa: Pt;
    let sb: Pt;
    if (phase === "standing") {
      const sFoot = (HINGE.x - p.c.x) / Math.cos(th);
      const margin = (sFoot - sP) / (along / 2);
      level = margin < 0.05 ? "danger" : margin < 0.3 ? "warn" : "ok";
      sa = toSvg(add(HINGE, u, sP));
      sb = toSvg(add(HINGE, u, sP + along));
    } else if (phase === "tipping") {
      level = "danger";
      sa = sb = toSvg(p.pivot!);
    } else if (phase === "fallen") {
      sa = toSvg(add(HINGE, u, Math.max(sP, 0)));
      sb = toSvg(add(HINGE, u, sP + along));
    } else {
      // dropping / ground: the face lying on the ground
      const half = Math.abs(p.e1.x) > 0.5 ? b / 2 : h / 2;
      sa = toSvg({ x: p.c.x - half, y: 0 });
      sb = phase === "ground" ? toSvg({ x: p.c.x + half, y: 0 }) : sa;
    }
    setAttrs(support, { x1: sa.x, y1: sa.y, x2: sb.x, y2: sb.y, class: `support level-${level}` });

    const cs = toSvg(p.c);
    const fs = toSvg(footPt);
    setAttrs(plumb, { x1: cs.x, y1: cs.y, x2: cs.x, y2: fs.y, class: `plumb level-${level}` });
    setAttrs(foot, { cx: cs.x, cy: fs.y, class: `level-${level}` });

    // Gravity arrow G from C
    const len = 0.45 * SCALE;
    const tip = cs.y + len;
    gravity.set(cs, { x: cs.x, y: tip + 2 });
    setAttrs(forceLabel, { x: cs.x + 10, y: tip });
    setAttrs(cg, { cx: cs.x, cy: cs.y });
    setAttrs(cLabel, { x: cs.x - 26, y: cs.y - 8 });

    // Base and load sliders are locked while the box is down, so they can't contradict the picture
    const down = isDown();
    if (down !== lastDown) {
      width.input.disabled = down;
      height.input.disabled = down;
      reset.classList.toggle("primary", down);
      lastDown = down;
    }

    // Status line
    let text: string;
    let statusLevel: Level;
    if (down && phase !== "tipping") {
      text = "Лежи на страната си. Натисни „Изправи кутията“.";
      statusLevel = "warn";
    } else if (phase === "tipping") {
      text = "Преобръща се! Отвесът от C излезе извън опората.";
      statusLevel = "danger";
    } else if (level === "ok") {
      text = "Стои. Отвесът от C пада вътре в опората.";
      statusLevel = "ok";
    } else {
      text = "Внимание! Отвесът е съвсем близо до ръба на опората.";
      statusLevel = level;
    }
    status.set(text, statusLevel);
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
