import { html, type Mount } from "../../lib/dom";
import { mountEnergy } from "./energy";
import { EH, type MassState, type Preset, type TabCtx, type TabResult } from "./energy-math";
import { mountLift } from "./lift";
import { mountPush } from "./push";
import { mountQuiz, type Check, type TabId } from "./quiz";

type Tab = {
  id: TabId;
  label: string;
  def: string;
  notes: string[];
  key: string;
  mount: (host: HTMLElement, ctx: TabCtx) => () => void;
};

// Story order: kinetic, then potential, then the two together.
const TABS: Tab[] = [
  {
    id: "k",
    label: "Кинетична",
    def: `<b>${EH("k")}</b> е работата, вложена да засилиш тялото от покой до скорост <i>v</i>.`,
    notes: [
      "Триенето и съпротивлението на въздуха пренебрегваме: щом бутането спре, количката продължава със същата скорост.",
      `Скоростта е закръглена до 0,01 m/s, затова ${EH("k")} понякога се различава от <i>A</i> в последната цифра (≈).`,
    ],
    key: `${EH("k")} = <i>A</i> = <i>mv</i>²/2.`,
    mount: mountPush,
  },
  {
    id: "p",
    label: "Потенциална",
    def: `<b>${EH("п")}</b> е работата, вложена да вдигнеш тялото на височина <i>h</i>.`,
    notes: [
      "Вдигаме бавно и равномерно, затова <i>F</i> = <i>mg</i>. Краткото засилване в началото и спирането горе пренебрегваме. Височината <i>h</i> мерим от пода.",
    ],
    key: `${EH("п")} = <i>A</i> = <i>mgh</i>. Работата се е запазила като ${EH("п")}.`,
    mount: mountLift,
  },
  {
    id: "both",
    label: "Заедно",
    def: `Вдигнатата топка има ${EH("п")}. Пусни я и гледай как ${EH("п")} става ${EH("k")}.`,
    notes: ["Съпротивлението на въздуха пренебрегваме. Спираме точно преди удара."],
    key: `При падане ${EH("п")} → ${EH("k")}, а сборът ${EH("п")} + ${EH("k")} остава същият.`,
    mount: mountEnergy,
  },
];

export const lesson17: Mount = (el) => {
  const page = html(`
    <article class="lesson">
      <a class="back-link" href="#/">← Всички уроци</a>
      <h1>Кинетична и потенциална енергия</h1>
      <div class="seg tabs" role="tablist" aria-label="Вид енергия"></div>
      <p class="intro" data-def></p>
      <section class="check" hidden></section>
      <div data-sim role="tabpanel"></div>
      <div data-quiz></div>
      <div data-notes class="notes"></div>
      <p class="key-idea" data-key></p>
    </article>`);
  el.append(page);

  const tablist = page.querySelector<HTMLElement>("[role=tablist]")!;
  const defEl = page.querySelector<HTMLElement>("[data-def]")!;
  const checkEl = page.querySelector<HTMLElement>(".check")!;
  const simHost = page.querySelector<HTMLElement>("[data-sim]")!;
  const notesEl = page.querySelector<HTMLElement>("[data-notes]")!;
  const keyEl = page.querySelector<HTMLElement>("[data-key]")!;

  // Page-level state: the mass survives tab switches (same ball in every tab).
  const mass: MassState = {
    m: 2,
    set(m) {
      mass.m = m;
    },
  };

  // An open "Провери": which trial is loaded and what each trial reported
  let check: { c: Check; trial: number; results: (TabResult | undefined)[] } | null = null;

  let current: TabId = "k";
  let unmountTab: (() => void) | null = null;
  const buttons = TABS.map((tab) => {
    const b = html<HTMLButtonElement>(`<button type="button" role="tab">${tab.label}</button>`);
    b.dataset.tab = tab.id;
    tablist.append(b);
    return b;
  });

  function select(id: TabId, preset?: Preset) {
    const tab = TABS.find((t) => t.id === id)!;
    current = id;
    unmountTab?.();
    page.dataset.energy = id;
    buttons.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === id)));
    defEl.innerHTML = tab.def;
    notesEl.innerHTML = tab.notes.map((n) => `<p class="note">${n}</p>`).join("");
    keyEl.innerHTML = tab.key;
    if (preset?.m !== undefined) mass.m = preset.m;
    unmountTab = tab.mount(simHost, {
      mass,
      preset,
      onDone(r) {
        if (check && check.c.tab === current) {
          check.results[check.trial] = r;
          renderCheck();
        }
      },
    });
  }

  function renderCheck() {
    checkEl.hidden = !check;
    if (!check) return;
    const { c, trial, results } = check;
    const all = results.length === c.trials.length && results.every(Boolean);
    checkEl.dataset.energy = c.tab;
    checkEl.innerHTML = `
      <div class="check-head"><b>Провери</b><button type="button" class="check-close" aria-label="Затвори проверката">✕</button></div>
      <p>${c.look}</p>
      <div class="check-trials">
        ${c.trials
          .map(
            (t, i) => `
          <div class="check-trial">
            ${c.trials.length > 1 ? `<button type="button" data-trial="${i}" aria-pressed="${i === trial}">${t.label}</button>` : ""}
            <p class="check-result">${results[i] ? c.result(results[i]!) : i === trial ? "Натисни бутона под картинката." : "—"}</p>
          </div>`,
          )
          .join("")}
      </div>
      ${all ? `<p class="check-verdict">${c.verdict(results as TabResult[])}</p>` : ""}`;
  }

  const onCheck = (c: Check) => {
    check = { c, trial: 0, results: [] };
    select(c.tab, c.trials[0].preset);
    renderCheck();
    checkEl.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const onCheckClick = (e: Event) => {
    const t = (e.target as HTMLElement).closest("button");
    if (!t || !check) return;
    if (t.classList.contains("check-close")) {
      check = null;
      renderCheck();
    } else if (t.dataset.trial !== undefined) {
      check.trial = Number(t.dataset.trial);
      select(check.c.tab, check.c.trials[check.trial].preset);
      renderCheck();
    }
  };
  checkEl.addEventListener("click", onCheckClick);

  const onTab = (e: Event) => {
    const id = (e.currentTarget as HTMLElement).dataset.tab as TabId;
    if (id === current) return;
    check = null; // a manual tab switch ends the check
    renderCheck();
    select(id);
  };
  buttons.forEach((b) => b.addEventListener("click", onTab));
  const unmountQuiz = mountQuiz(page.querySelector<HTMLElement>("[data-quiz]")!, onCheck);
  select("k");

  return () => {
    unmountTab?.();
    unmountQuiz();
    checkEl.removeEventListener("click", onCheckClick);
    buttons.forEach((b) => b.removeEventListener("click", onTab));
    page.remove();
  };
};
