import { html, type Mount } from "../../lib/dom";
import { mountEnergy } from "./energy";
import type { MassState } from "./energy-math";
import { mountLift } from "./lift";
import { mountPredict } from "./predict";
import { mountPush } from "./push";

type Tab = {
  id: string;
  label: string;
  def: string;
  notes: string[];
  key: string;
  mount: (host: HTMLElement, mass: MassState) => () => void;
  predict?: boolean;
};

// Story order: kinetic, then potential, then the two together.
const TABS: Tab[] = [
  {
    id: "k",
    label: "Кинетична",
    def: "<b>E<sub>k</sub></b> е работата, вложена да засилиш тялото от покой до скорост <i>v</i>.",
    notes: [
      "Триенето и съпротивлението на въздуха пренебрегваме: щом бутането спре, количката продължава със същата скорост.",
      "Скоростта е закръглена до 0,01 m/s, затова E<sub>k</sub> понякога се различава от <i>A</i> в последната цифра (≈).",
    ],
    key: "E<sub>k</sub> = <i>A</i> = <i>mv</i>²/2.",
    mount: mountPush,
    predict: true,
  },
  {
    id: "p",
    label: "Потенциална",
    def: "<b>E<sub>п</sub></b> е работата, вложена да вдигнеш тялото на височина <i>h</i>.",
    notes: [
      "Вдигаме бавно и равномерно, затова <i>F</i> = <i>mg</i>. Краткото засилване в началото и спирането горе пренебрегваме. Височината <i>h</i> мерим от пода.",
    ],
    key: "E<sub>п</sub> = <i>A</i> = <i>mgh</i>. Работата се е запазила като E<sub>п</sub>.",
    mount: mountLift,
  },
  {
    id: "both",
    label: "Заедно",
    def: "Вдигнатата топка има E<sub>п</sub>. Пусни я и гледай как E<sub>п</sub> става E<sub>k</sub>.",
    notes: ["Съпротивлението на въздуха пренебрегваме. Спираме точно преди удара."],
    key: "При падане E<sub>п</sub> → E<sub>k</sub>, а сборът E<sub>п</sub> + E<sub>k</sub> остава същият.",
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
      <div data-sim role="tabpanel"></div>
      <div data-predict></div>
      <div data-notes class="notes"></div>
      <p class="key-idea" data-key></p>
    </article>`);
  el.append(page);

  const tablist = page.querySelector<HTMLElement>("[role=tablist]")!;
  const defEl = page.querySelector<HTMLElement>("[data-def]")!;
  const simHost = page.querySelector<HTMLElement>("[data-sim]")!;
  const predictHost = page.querySelector<HTMLElement>("[data-predict]")!;
  const notesEl = page.querySelector<HTMLElement>("[data-notes]")!;
  const keyEl = page.querySelector<HTMLElement>("[data-key]")!;

  // Page-level state: the mass survives tab switches (same ball in every tab).
  let predict: ReturnType<typeof mountPredict> | null = null;
  const mass: MassState = {
    m: 2,
    set(m) {
      mass.m = m;
      predict?.setMass(m);
    },
  };

  let unmountTab: (() => void) | null = null;
  const buttons = TABS.map((tab) => {
    const b = html<HTMLButtonElement>(`<button type="button" role="tab">${tab.label}</button>`);
    b.dataset.tab = tab.id;
    tablist.append(b);
    return b;
  });

  function select(id: string) {
    const tab = TABS.find((t) => t.id === id)!;
    unmountTab?.();
    predict?.unmount();
    predict = null;
    buttons.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === id)));
    defEl.innerHTML = tab.def;
    notesEl.innerHTML = tab.notes.map((n) => `<p class="note">${n}</p>`).join("");
    keyEl.innerHTML = tab.key;
    unmountTab = tab.mount(simHost, mass);
    if (tab.predict) predict = mountPredict(predictHost, mass.m);
  }

  const onTab = (e: Event) => {
    const id = (e.currentTarget as HTMLElement).dataset.tab!;
    if ((e.currentTarget as HTMLElement).getAttribute("aria-selected") !== "true") select(id);
  };
  buttons.forEach((b) => b.addEventListener("click", onTab));
  select(TABS[0].id);

  return () => {
    unmountTab?.();
    predict?.unmount();
    buttons.forEach((b) => b.removeEventListener("click", onTab));
    page.remove();
  };
};
