/**
 * Predict-then-check carousel for lesson 17: one question at a time, with
 * dots, prev/next and a horizontal swipe. After an answer, a feedback line
 * and (where the simulation can show it) a "Провери" button that opens the
 * right tab with the sliders preset to prove the answer.
 */
import { html } from "../../lib/dom";
import { num, numUpTo } from "../../lib/format";
import { EH, type Preset, type TabResult } from "./energy-math";

export type TabId = "k" | "p" | "both";

export type Check = {
  tab: TabId;
  /** What to do and what to look at (trusted HTML). */
  look: string;
  trials: { label: string; preset: Preset }[];
  /** One trial's result, as a short line (trusted HTML). */
  result: (r: TabResult) => string;
  /** Shown once every trial has a result (trusted HTML). */
  verdict: (rs: TabResult[]) => string;
};

type Question = {
  q: string;
  answers: string[];
  correct: number;
  right: string;
  wrong: string;
  check?: Check;
};

const Ek = EH("k");
const Ep = EH("п");
const times = (a: number, b: number) => numUpTo(b / a, 2);

export const QUESTIONS: Question[] = [
  {
    q: `Количката тръгва 2 пъти по-бързо. Колко пъти расте ${Ek}?`,
    answers: ["2×", "4×"],
    correct: 1,
    right: `Да. В ${Ek} = <i>mv</i>²/2 скоростта е на квадрат: 2² = 4.`,
    wrong: `Не. В ${Ek} = <i>mv</i>²/2 скоростта е на квадрат: 2² = 4, не 2.`,
    check: {
      tab: "k",
      look: `Бутни два пъти — първо до 1 m/s, после до 2 m/s — и сравни ${Ek}.`,
      trials: [
        { label: "Опит 1: <i>F</i> = 1 N", preset: { m: 2, F: 1, s: 1 } },
        { label: "Опит 2: <i>F</i> = 4 N", preset: { m: 2, F: 4, s: 1 } },
      ],
      result: (r) => `<i>v</i> = ${num(r.v, 2)} m/s → ${Ek} = ${num(r.ek, 2)} J`,
      verdict: ([a, b]) => `Скоростта ×${times(a.v, b.v)} → ${Ek} ×${times(a.ek, b.ek)}.`,
    },
  },
  {
    q: `Количка с 2 пъти по-голяма маса се движи със същата скорост. Колко пъти е по-голяма ${Ek}?`,
    answers: ["2×", "4×"],
    correct: 0,
    right: `Да. Масата не е на квадрат: 2× маса → 2× ${Ek}.`,
    wrong: `Не. На квадрат е само скоростта. Масата е просто множител: 2× маса → 2× ${Ek}.`,
    check: {
      tab: "k",
      look: "Два опита с една и съща крайна скорост 2 m/s. По-тежката количка бутаме с двойна сила, за да стигне същата скорост.",
      trials: [
        { label: "Опит 1: 1 kg", preset: { m: 1, F: 2, s: 1 } },
        { label: "Опит 2: 2 kg", preset: { m: 2, F: 4, s: 1 } },
      ],
      result: (r) => `<i>m</i> = ${num(r.m, 1)} kg, <i>v</i> = ${num(r.v, 2)} m/s → ${Ek} = ${num(r.ek, 2)} J`,
      verdict: ([a, b]) => `Масата ×${times(a.m, b.m)}, скоростта същата → ${Ek} ×${times(a.ek, b.ek)}.`,
    },
  },
  {
    q: `Вдигаш топката 2 пъти по-високо. Колко пъти расте ${Ep}?`,
    answers: ["2×", "4×"],
    correct: 0,
    right: `Да. ${Ep} = <i>mgh</i> — двойна височина, двойна работа, двойна ${Ep}.`,
    wrong: `Не. В ${Ep} = <i>mgh</i> нищо не е на квадрат: 2× височина → 2× ${Ep}.`,
    check: {
      tab: "p",
      look: "Вдигни топката на 1 m, после на 2 m.",
      trials: [
        { label: "Опит 1: <i>h</i> = 1 m", preset: { m: 2, h: 1 } },
        { label: "Опит 2: <i>h</i> = 2 m", preset: { m: 2, h: 2 } },
      ],
      result: (r) => `<i>h</i> = ${num(r.h, 2)} m → ${Ep} = ${num(r.ep, 1)} J`,
      verdict: ([a, b]) => `Височината ×${times(a.h, b.h)} → ${Ep} ×${times(a.ep, b.ep)}.`,
    },
  },
  {
    q: `Топката пада. Къде ${Ek} е най-голяма?`,
    answers: ["най-горе", "по средата", "точно преди удара"],
    correct: 2,
    right: "Да. Топката се ускорява по целия път, затова е най-бърза точно преди удара.",
    wrong: "Не. Топката се ускорява по целия път — най-бърза е точно преди удара. Най-горе тя още стои.",
    check: {
      tab: "both",
      look: `Пусни топката и гледай оранжевия стълб ${Ek}: расте през цялото падане.`,
      trials: [{ label: "Пусни от 2 m", preset: { m: 2, h: 2 } }],
      result: (r) => `Точно преди удара: <i>v</i> = ${num(r.v, 2)} m/s, ${Ek} ≈ ${num(r.ek, 1)} J`,
      verdict: () => `Най-голямата ${Ek} е точно преди удара.`,
    },
  },
  {
    q: `Същата топка на същата височина, но на Луната (<i>g</i> ≈ 1,6 m/s²). Каква е ${Ep}?`,
    answers: ["по-голяма", "същата", "по-малка"],
    correct: 2,
    right: `Да. ${Ep} = <i>mgh</i>, а на Луната <i>g</i> е около 6 пъти по-малко (9,8 / 1,6 ≈ 6), затова и ${Ep} е около 6 пъти по-малка.`,
    wrong: `Не. ${Ep} = <i>mgh</i>, а на Луната <i>g</i> е около 6 пъти по-малко (9,8 / 1,6 ≈ 6), затова и ${Ep} е около 6 пъти по-малка.`,
  },
  {
    q: `Топката пада. Какво става със сбора ${Ep} + ${Ek}?`,
    answers: ["расте", "не се променя", "намалява"],
    correct: 1,
    right: `Да. Колкото ${Ep} се губи, толкова ${Ek} се печели (без съпротивление на въздуха).`,
    wrong: `Не. Колкото ${Ep} се губи, толкова ${Ek} се печели — сборът остава същият (без съпротивление на въздуха).`,
    check: {
      tab: "both",
      look: `Пусни топката и гледай пунктира ${Ep} + ${Ek}: стълбовете се сменят, а сборът стои.`,
      trials: [{ label: "Пусни от 3 m", preset: { m: 2, h: 3 } }],
      result: (r) =>
        `Горе: ${Ep} = ${num(r.total, 1)} J, ${Ek} = 0. Точно преди удара: ${Ep} = 0, ${Ek} ≈ ${num(r.ek, 1)} J.`,
      verdict: ([r]) => `Сборът остава ${num(r.total, 1)} J.`,
    },
  },
];

const SWIPE_PX = 50;

export function mountQuiz(host: HTMLElement, onCheck: (c: Check) => void): () => void {
  let index = 0;
  const chosen: (number | null)[] = QUESTIONS.map(() => null);

  const root = html(`
    <section class="quiz" aria-roledescription="carousel" aria-label="Познай">
      <div class="quiz-head"><b>Познай</b><span class="quiz-count"></span></div>
      <div class="quiz-card" aria-live="polite"></div>
      <div class="quiz-nav">
        <button type="button" class="quiz-arrow" data-step="-1" aria-label="Предишен въпрос">‹</button>
        <div class="quiz-dots"></div>
        <button type="button" class="quiz-arrow" data-step="1" aria-label="Следващ въпрос">›</button>
      </div>
    </section>`);
  const card = root.querySelector<HTMLElement>(".quiz-card")!;
  const count = root.querySelector<HTMLElement>(".quiz-count")!;
  const dotsEl = root.querySelector<HTMLElement>(".quiz-dots")!;
  const arrows = [...root.querySelectorAll<HTMLButtonElement>(".quiz-arrow")];
  const dots = QUESTIONS.map((_, i) => {
    const d = html<HTMLButtonElement>(`<button type="button" class="quiz-dot" aria-label="Въпрос ${i + 1}"><span></span></button>`);
    d.dataset.i = String(i);
    dotsEl.append(d);
    return d;
  });
  host.append(root);

  function render(dir = 0) {
    const q = QUESTIONS[index];
    const pick = chosen[index];
    const answered = pick !== null;
    const ok = pick === q.correct;
    card.innerHTML = `
      <p class="quiz-q">${q.q}</p>
      <div class="seg quiz-answers" data-n="${q.answers.length}">
        ${q.answers.map((a, i) => `<button type="button" data-answer="${i}" aria-pressed="${pick === i}">${a}</button>`).join("")}
      </div>
      ${answered ? `<p class="quiz-feedback" data-level="${ok ? "ok" : "warn"}">${ok ? q.right : q.wrong}</p>` : ""}
      ${answered && q.check ? `<button type="button" class="quiz-check" data-tab="${q.check.tab}">Провери ↑</button>` : ""}
      ${answered && !q.check ? `<p class="quiz-nocheck">Луната още я няма в симулацията — тук само смятаме.</p>` : ""}`;
    if (dir) {
      card.classList.remove("from-left", "from-right");
      void card.offsetWidth; // restart the slide-in animation
      card.classList.add(dir > 0 ? "from-right" : "from-left");
    }
    count.textContent = `${index + 1} / ${QUESTIONS.length}`;
    dots.forEach((d, i) => {
      d.toggleAttribute("aria-current", i === index);
      d.dataset.state = chosen[i] === null ? "" : chosen[i] === QUESTIONS[i].correct ? "ok" : "warn";
    });
    arrows[0].disabled = index === 0;
    arrows[1].disabled = index === QUESTIONS.length - 1;
  }

  const go = (i: number) => {
    const next = Math.max(0, Math.min(QUESTIONS.length - 1, i));
    if (next === index) return;
    const dir = next > index ? 1 : -1;
    index = next;
    render(dir);
  };

  // One delegated click handler for answers, "Провери", arrows and dots
  const onClick = (e: Event) => {
    const t = (e.target as HTMLElement).closest("button");
    if (!t || !root.contains(t)) return;
    if (t.dataset.answer !== undefined) {
      chosen[index] = Number(t.dataset.answer);
      render();
    } else if (t.classList.contains("quiz-check")) {
      onCheck(QUESTIONS[index].check!);
    } else if (t.dataset.step) {
      go(index + Number(t.dataset.step));
    } else if (t.dataset.i !== undefined) {
      go(Number(t.dataset.i));
    }
  };
  root.addEventListener("click", onClick);

  // Horizontal swipe on the card (vertical scrolling stays native: touch-action: pan-y)
  let start: { x: number; y: number; id: number } | null = null;
  const onDown = (e: PointerEvent) => {
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onUp = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > 1.5 * Math.abs(dy)) go(index + (dx < 0 ? 1 : -1));
  };
  const onCancel = () => (start = null);
  card.addEventListener("pointerdown", onDown);
  card.addEventListener("pointerup", onUp);
  card.addEventListener("pointercancel", onCancel);

  render();

  return () => {
    root.removeEventListener("click", onClick);
    card.removeEventListener("pointerdown", onDown);
    card.removeEventListener("pointerup", onUp);
    card.removeEventListener("pointercancel", onCancel);
    root.remove();
  };
}
