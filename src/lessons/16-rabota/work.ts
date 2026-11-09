/**
 * Lesson 16 tracer: the work done by one force on a moving block.
 *
 * Model (stated on the page): a motor pulls the block with a rope at a
 * constant speed, whatever our force does. We only measure the work of our
 * own force F, which snaps to three directions:
 *   напред (along the motion)    → A = +F·s
 *   назад  (against the motion)  → A = −F·s
 *   нагоре (perpendicular)       → A = 0
 * The block has mass 10 kg (weight ≈ 98 N), so even the largest upward
 * force (50 N) cannot lift it off the floor.
 *
 * Work is added up piece by piece (A += ±F·Δs), so changing the direction or
 * size of F mid-run shows the pieces summing. Distances are quantised to
 * 1 cm so the formula on the stage multiplies exactly the numbers it shows.
 */
import { html, slider } from "../../lib/dom";
import { num, numUpTo, signed } from "../../lib/format";
import { startLoop } from "../../lib/loop";
import { createBarMeter } from "../../lib/meter";
import { createArrow, createScene } from "../../lib/scene";
import { createStageFormula, fx } from "../../lib/stage";
import { chip, mountChipPopovers } from "../../lib/chips";
import { createStatus, type Level } from "../../lib/status";
import { setAttrs, svgEl, sym as v, type Pt } from "../../lib/svg";

const VIEW_W = 580;
const VIEW_H = 300;
const SCALE = 100; // viewBox units per metre

const START_X = 1.05; // block's left edge at s = 0 (m)
const BLOCK_W = 0.6;
const BLOCK_H = 0.6;
const TRACK = 2.0; // m the block travels
const SPEED = 0.4; // m/s, set by the motor
export const MASS = 10; // kg
export const WEIGHT = Math.round(MASS * 9.8); // 98 N

const F_MIN = 5;
export const F_MAX = 50;
const WALL_F = 500;

// Work meter, in viewBox units (right-hand column of the scene)
const METER_X = 495;
const METER_W = 34;
const METER_TOP = 36;
const METER_BOTTOM = 246;
const METER_ZERO = (METER_TOP + METER_BOTTOM) / 2;
const METER_MAX = F_MAX * TRACK; // 100 J fills half the meter

// The live formula has a fixed spot in the top-left, clear of the meter
const FORMULA_X = 14;

type Dir = 1 | -1 | 0; // напред / назад / нагоре
type Segment = { dir: Dir; F: number; cm: number }; // distance in whole centimetres

const DIRS: { dir: Dir; label: string }[] = [
  { dir: 1, label: "→ напред" },
  { dir: -1, label: "← назад" },
  { dir: 0, label: "↑ нагоре" },
];

/** Work of one piece, in joules, exact for whole centimetres: A = ±F·s. */
const segWork = (g: Segment) => (g.dir * g.F * g.cm) / 100;
const round2 = (x: number) => Math.round(x * 100) / 100;

export function mountWork(host: HTMLElement): () => void {
  // ---- state ----
  let dir: Dir = 1;
  let F = 20;
  let travelled = 0; // m, continuous
  let running = false;
  let wall = false;
  let segments: Segment[] = [{ dir, F, cm: 0 }];

  const totalCm = () => Math.round(travelled * 100);
  const work = () => round2(segments.reduce((sum, g) => sum + segWork(g), 0));

  // ---- scene ----
  const { svg, toSvg, groundY } = createScene({
    width: VIEW_W,
    height: VIEW_H,
    scale: SCALE,
    groundOffset: 40,
    label: "Блок на пода, тегле от мотор, и сила F; вдясно уред, който показва работата A",
  });

  // Ruler along the floor, 0 at the block's starting position
  for (let m = 0; m <= TRACK + 1e-9; m += 0.5) {
    const x = toSvg({ x: START_X + m, y: 0 }).x;
    const major = Math.abs(m - Math.round(m)) < 1e-9 || m === TRACK;
    svgEl("line", { class: "ruler", x1: x, y1: groundY, x2: x, y2: groundY + (major ? 12 : 7) }, svg);
    if (major) {
      const t = svgEl("text", { class: "ruler-label", x, y: groundY + 30, "font-size": 15, "text-anchor": "middle" }, svg);
      t.textContent = m === TRACK ? `${num(m, 1)} m` : `${num(m)}`;
    }
  }

  // Displacement arrow s, from the start mark to the block
  const sArrow = createArrow(svg, { head: 14, halfWidth: 7, className: "s-arrow" });
  const sLabel = svgEl("text", { class: "scene-label", "font-size": 20, "text-anchor": "middle" }, svg);
  sLabel.textContent = "s";

  // Motor and rope
  const motorX = toSvg({ x: START_X + BLOCK_W + TRACK + 0.12, y: 0 }).x;
  const motor = svgEl("g", {}, svg);
  svgEl("rect", { class: "motor", x: motorX, y: groundY - 30, width: 44, height: 30, rx: 5 }, motor);
  svgEl("circle", { class: "motor-drum", cx: motorX + 14, cy: groundY - 15, r: 9 }, motor);
  const motorLabel = svgEl("text", { class: "scene-small", x: motorX + 22, y: groundY + 30, "font-size": 15, "text-anchor": "middle" }, motor);
  motorLabel.textContent = "мотор";
  const rope = svgEl("line", { class: "rope" }, svg);

  // Block
  const block = svgEl("rect", { class: "box", width: BLOCK_W * SCALE, height: BLOCK_H * SCALE, rx: 3 }, svg);
  const massLabel = svgEl("text", { class: "scene-small", "font-size": 15, "text-anchor": "middle" }, svg);
  massLabel.textContent = `${MASS} kg`;

  // Wall (for "Бутни стената")
  const wallX = toSvg({ x: 3.7, y: 0 }).x;
  const wallEl = svgEl("rect", { class: "wall", x: wallX, y: groundY - 200, width: 36, height: 200 }, svg);

  // Force arrows: normal range, and the oversized wall push
  const fArrow = createArrow(svg);
  const fLabel = svgEl("text", { class: "scene-label", "font-size": 20 }, svg);
  const hugeArrow = createArrow(svg, { head: 34, halfWidth: 20, className: "force-huge" });
  const hugeLabel = svgEl("text", { class: "scene-label", "font-size": 24, "text-anchor": "middle" }, svg);
  hugeLabel.textContent = `F = ${WALL_F} N`;

  // Live formula on the stage: the rule (sign) and the numbers substituted
  const formula = createStageFormula(svg, {
    x: FORMULA_X,
    lines: [
      { y: 32, size: 24, cls: "rule" },
      { y: 60, size: 19, cls: "signed" },
    ],
  });

  // Work meter: zero line, ticks, bar
  const meter = svgEl("g", {}, svg);
  const meterTitle = svgEl("text", { x: METER_X + METER_W / 2, y: METER_TOP - 12, "font-size": 19, "text-anchor": "middle" }, meter);
  const meterA = svgEl("tspan", { class: "scene-label" }, meterTitle);
  meterA.textContent = "A";
  const meterValue = svgEl("tspan", { class: "meter-value" }, meterTitle);
  const workMeter = createBarMeter(meter, { x: METER_X, top: METER_TOP, bottom: METER_BOTTOM, width: METER_W, min: -METER_MAX, max: METER_MAX });
  for (let j = -METER_MAX; j <= METER_MAX + 1e-9; j += 25) {
    const y = workMeter.y(j);
    svgEl("line", { class: "meter-tick", x1: METER_X - 5, y1: y, x2: METER_X, y2: y }, meter);
    if (j !== 0 && Math.abs(j) % 50 === 0) {
      const t = svgEl("text", { class: "meter-label", x: METER_X - 8, y: y + 5, "font-size": 16, "text-anchor": "end" }, meter);
      t.textContent = signed(j);
    }
  }
  svgEl("line", { class: "meter-zero", x1: METER_X - 12, y1: METER_ZERO, x2: METER_X + METER_W + 6, y2: METER_ZERO }, meter);
  const zeroLabel = svgEl("text", { class: "meter-zero-label", x: METER_X - 16, y: METER_ZERO + 6, "font-size": 16, "text-anchor": "end" }, meter);
  zeroLabel.textContent = "0";

  // ---- controls: primary action right under the stage ----
  const status = createStatus();

  const runBtn = html<HTMLButtonElement>(`<button type="button" class="primary"></button>`);
  const restartBtn = html<HTMLButtonElement>(`<button type="button" class="secondary">Отначало</button>`);
  const actionRow = html(`<div class="action-row"></div>`);
  actionRow.append(runBtn, restartBtn);

  const dirGroup = html(`<div class="seg" role="group" aria-label="Посока на силата F"></div>`);
  const dirButtons = DIRS.map(({ dir: d, label }) => {
    const b = html<HTMLButtonElement>(`<button type="button" aria-pressed="false">${label}</button>`);
    b.dataset.dir = String(d);
    dirGroup.append(b);
    return b;
  });

  const force = slider({ label: "Сила F", min: F_MIN, max: F_MAX, step: 5, value: F, format: (x) => `${num(x)} N` });

  const wallBtn = html<HTMLButtonElement>(`<button type="button" class="secondary"></button>`);
  const btnRow = html(`<div class="btn-row"></div>`);
  btnRow.append(wallBtn);

  const controls = html(`<div class="controls"></div>`);
  controls.append(dirGroup, force.root, btnRow);
  const root = html(`<div class="sim"></div>`);
  root.append(svg, actionRow, status.el, controls);
  host.append(root);

  // ---- actions ----
  /** Start a new piece when the force changes mid-run (keeps finished pieces intact). */
  const changeForce = () => {
    const cur = segments[segments.length - 1];
    if (cur.cm === 0) {
      cur.dir = dir;
      cur.F = F;
    } else if (cur.dir !== dir || cur.F !== F) {
      segments.push({ dir, F, cm: 0 });
    }
  };
  const restart = () => {
    travelled = 0;
    running = false;
    segments = [{ dir, F, cm: 0 }];
  };

  const onDir = (e: Event) => {
    dir = Number((e.currentTarget as HTMLElement).dataset.dir) as Dir;
    changeForce();
  };
  dirButtons.forEach((b) => b.addEventListener("click", onDir));
  const offForce = force.onInput((x) => {
    F = x;
    changeForce();
  });
  const onRun = () => {
    if (travelled >= TRACK - 1e-9) restart();
    running = !running;
  };
  const onRestart = () => restart();
  const onWall = () => {
    wall = !wall;
    restart();
  };
  runBtn.addEventListener("click", onRun);
  restartBtn.addEventListener("click", onRestart);
  wallBtn.addEventListener("click", onWall);

  // ---- step ----
  function step(dt: number) {
    if (!running || wall) return;
    const before = totalCm();
    travelled = Math.min(travelled + SPEED * dt, TRACK);
    segments[segments.length - 1].cm += totalCm() - before;
    if (travelled >= TRACK) running = false;
  }

  /** Rule line + numbers line for the stage formula, and its colour class. */
  function stageFormula(A: number, s: number): { rule: string; nums: string; cls: string } {
    if (wall) {
      const chS0 = chip("s", v("s"), "0 m");
      const chA0 = chip("A", v("A"), "0 J");
      return { rule: `${chS0} = 0 → ${chA0} = 0`, nums: fx(chA0, `= ${WALL_F} N · 0 m`, "= 0 J"), cls: "zero" };
    }
    const chA = chip("A", v("A"), `${signed(A)} J`);
    const chF = chip("F", v("F"), `${F} N`);
    const chS = chip("s", v("s"), `${num(s, 2)} m`);
    const rule = dir === 1 ? `${chA} = +${chF}·${chS}` : dir === -1 ? `${chA} = −${chF}·${chS}` : `${chF} ⊥ ${chS} → ${chA} = 0`;
    const cls = dir === 1 ? "pos" : dir === -1 ? "neg" : "zero";

    const last = segments[segments.length - 1];
    const pieces = segments.filter((g) => g.cm > 0);
    const single = pieces.length === 0 || (pieces.length === 1 && pieces[0] === last);
    let nums: string;
    if (single) {
      const sTxt = `${num(s, 2)} m`;
      if (dir === 1) nums = fx(chA, `= +${F} N · ${sTxt}`, `= ${signed(A)} J`);
      else if (dir === -1) nums = fx(chA, `= −${F} N · ${sTxt}`, `= ${signed(A)} J`);
      else nums = fx(chA, `(${F} N ⊥ ${sTxt})`, "= 0 J");
    } else {
      // Several pieces: show how they add up
      const terms = pieces.map((g, i) => {
        const w = round2(segWork(g));
        const t = numUpTo(Math.abs(w));
        if (i === 0) return w < 0 ? `−${t}` : t;
        return `${w < 0 ? "−" : "+"} ${t}`;
      });
      const shown = terms.length > 4 ? ["…", ...terms.slice(-3)] : terms;
      nums = fx(chA, `= ${shown.join(" ")}`, `= ${signed(A)} J`);
    }
    return { rule, nums, cls };
  }

  // ---- render ----
  const show = (el: SVGElement, on: boolean) => (el.style.display = on ? "" : "none");

  function render() {
    const A = wall ? 0 : work();
    const sShown = wall ? 0 : totalCm() / 100;

    show(block, !wall);
    show(massLabel, !wall);
    show(rope, !wall);
    show(motor, !wall);
    show(wallEl, wall);
    fArrow.show(!wall);
    show(fLabel, !wall);
    hugeArrow.show(wall);
    show(hugeLabel, wall);

    if (wall) {
      const tip: Pt = { x: wallX - 2, y: groundY - 110 };
      hugeArrow.set({ x: tip.x - 250, y: tip.y }, tip);
      setAttrs(hugeLabel, { x: tip.x - 130, y: tip.y - 30 });
      sArrow.show(false);
      show(sLabel, false);
    } else {
      const bl = toSvg({ x: START_X + travelled, y: BLOCK_H });
      setAttrs(block, { x: bl.x, y: bl.y });
      const cx = bl.x + (BLOCK_W * SCALE) / 2;
      const cy = bl.y + (BLOCK_H * SCALE) / 2;
      setAttrs(massLabel, { x: cx, y: cy + 12 });
      setAttrs(rope, { x1: bl.x + BLOCK_W * SCALE, y1: groundY - 15, x2: motorX + 14, y2: groundY - 15 });

      // F arrow; length grows with F (5 N → 40, 50 N → 100 units).
      // Horizontal arrows run near the block's top edge so they clear the low motor.
      const len = 40 + ((F - F_MIN) / (F_MAX - F_MIN)) * 60;
      const ay = bl.y + 14;
      const from: Pt = dir === 0 ? { x: cx, y: bl.y } : { x: cx + dir * BLOCK_W * SCALE * 0.5, y: ay };
      const to: Pt = dir === 0 ? { x: cx, y: bl.y - len } : { x: from.x + dir * len, y: ay };
      fArrow.set(from, to);
      if (dir === 0) setAttrs(fLabel, { x: cx + 10, y: to.y + 18 });
      else setAttrs(fLabel, { x: (from.x + to.x) / 2 - 6, y: to.y - 12 });
      fLabel.textContent = "F";

      // s arrow along the floor, pointing the way the block moves
      const x0 = toSvg({ x: START_X, y: 0 }).x;
      const sy = groundY + 6;
      const sLen = bl.x - x0;
      sArrow.show(sLen > 16);
      if (sLen > 16) sArrow.set({ x: x0, y: sy }, { x: bl.x, y: sy });
      setAttrs(sLabel, { x: x0 + sLen / 2, y: groundY - 8 });
      show(sLabel, sLen > 24);
    }

    // Stage formula (fixed position)
    const f = stageFormula(A, sShown);
    formula.set([f.rule, f.nums], f.cls);

    // Meter
    workMeter.set(A, A > 0 ? "meter-bar-pos" : "meter-bar-neg");
    setAttrs(meterValue, { class: `meter-value ${A > 0 ? "pos" : A < 0 ? "neg" : ""}` });
    meterValue.textContent = ` = ${signed(A)} J`;

    // Controls
    dirButtons.forEach((b) => {
      b.setAttribute("aria-pressed", String(Number(b.dataset.dir) === dir));
      b.disabled = wall;
    });
    force.input.disabled = wall;
    runBtn.disabled = wall;
    const atEnd = travelled >= TRACK - 1e-9;
    runBtn.textContent = running ? "❚❚ Пауза" : atEnd ? "↻ Пусни отново" : "▶ Пусни";
    wallBtn.textContent = wall ? "Обратно към блока" : "Бутни стената";

    // Status
    let text: string;
    let level: Level;
    if (wall) {
      text = `${WALL_F} N, но стената не мърда: s = 0 → A = 0.`;
      level = "neutral";
    } else if (atEnd) {
      text = "Край на пътя.";
      level = "neutral";
    } else if (!running && travelled === 0) {
      text = "Избери посока на F и натисни „Пусни“.";
      level = "neutral";
    } else {
      const pre = running ? "" : "Пауза. ";
      if (dir === 1) {
        text = `${pre}F и s сочат в една посока → A расте.`;
        level = "ok";
      } else if (dir === -1) {
        text = `${pre}F и s сочат в различни посоки → A намалява.`;
        level = "danger";
      } else {
        text = `${pre}F ⊥ s → A не се променя. Блокът (${WEIGHT} N) не се вдига.`;
        level = "neutral";
      }
    }
    status.set(text, level);
  }

  const unmountChips = mountChipPopovers(root, {
    A: workMeter.g,
    F: fArrow.el,
    s: sArrow.el,
  });

  const stop = startLoop((dt) => {
    step(dt);
    render();
  });
  render();

  return () => {
    stop();
    unmountChips();
    dirButtons.forEach((b) => b.removeEventListener("click", onDir));
    offForce();
    runBtn.removeEventListener("click", onRun);
    restartBtn.removeEventListener("click", onRestart);
    wallBtn.removeEventListener("click", onWall);
    root.remove();
  };
}
