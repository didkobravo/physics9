/**
 * Exact energy arithmetic for lesson 17, shared by its three tabs.
 *
 * Every input is an integer in small units (mass in 0,1 kg, lengths in cm,
 * speeds in cm/s, forces in whole N), so a product is exact and we can say
 * honestly whether the printed value is "=" (exact at the shown digits) or
 * "≈" (rounded).
 */
import { num } from "../../lib/format";
import { sym } from "../../lib/svg";

export const G = 9.8; // m/s², as in the textbook

/** A value in units of 10^-digits J, and whether that rounding was exact. */
export type Rounded = { units: number; digits: number; exact: boolean };

const round = (raw: number, perUnit: number, digits: number): Rounded => ({
  units: Math.round(raw / perUnit),
  digits,
  exact: raw % perUnit === 0,
});

/** Eп = m·g·h, m in 0,1 kg, h in cm (raw unit 1e-4 J). Also the lifting work mg·h. */
export const potential = (m10: number, hCm: number, digits = 1) => round(m10 * 98 * hCm, 10 ** (4 - digits), digits);

/** Ek = m·v²/2, m in 0,1 kg, v in cm/s (raw unit 5e-6 J: 1 J = 200 000 raw). */
export const kinetic = (m10: number, vCm: number, digits = 1) => round(m10 * vCm * vCm, 200000 / 10 ** digits, digits);

/** A = F·x, F in whole N, x in cm (raw unit 0,01 J). */
export const workFx = (F: number, xCm: number, digits = 2) => round(F * xCm, 10 ** (2 - digits), digits);

export const joules = (r: Rounded) => r.units / 10 ** r.digits;

/** "= 29,4 J" or "≈ 29,4 J". */
export const show = (r: Rounded) => `${r.exact ? "=" : "≈"} ${num(joules(r), r.digits)} J`;

/**
 * E with its subscript, for SVG text: Latin k for kinetic, Cyrillic п for
 * potential, as in the textbook. The subscript is upright and must not use
 * the Bulgarian localized letterforms (where п looks like an n). Chrome and
 * Firefox honour `font-feature-settings: "locl" 0` (class "std"); Safari
 * ignores it and only switches forms by language, hence lang="ru" on the
 * subscript alone (Russian uses the standard п).
 */
export const E = (sub: "п" | "k") => `${sym("E")}<tspan baseline-shift="sub" font-size="70%" font-style="normal" class="std" lang="ru">${sub}</tspan>`;

/** Shared mass across the three tabs: it is the same ball (or cart) everywhere. */
export type MassState = { m: number; set: (m: number) => void };

/** Slider values a tab can be opened with (from a quiz "Провери"). */
export type Preset = { m?: number; F?: number; s?: number; h?: number };
/** What a tab reports when a run finishes. */
export type TabResult = Record<string, number>;
export type TabCtx = { mass: MassState; preset?: Preset; onDone?: (r: TabResult) => void };

/** Same markup in HTML (status lines, page copy). */
export const EH = (sub: "п" | "k") => `E<sub lang="ru">${sub}</sub>`;

export const MASS_MIN = 0.5;
export const MASS_MAX = 5;
export const MASS_STEP = 0.5;

/** Ball radius in viewBox units; grows gently with mass. */
export const ballRadius = (m: number) => 12 + 4 * Math.cbrt(m);
