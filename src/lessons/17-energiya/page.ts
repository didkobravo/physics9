import { html, type Mount } from "../../lib/dom";
import { mountEnergy } from "./energy";
import { mountPredict } from "./predict";

export const lesson17: Mount = (el) => {
  const page = html(`
    <article class="lesson">
      <a class="back-link" href="#/">← Всички уроци</a>
      <h1>Кинетична и потенциална енергия</h1>
      <p class="intro">Вдигнатата топка има E<sub>п</sub>. Пусни я и гледай как E<sub>п</sub> става E<sub>к</sub>.</p>
      <div data-sim></div>
      <div data-predict></div>
      <p class="note">Съпротивлението на въздуха пренебрегваме. Спираме точно преди удара.</p>
      <p class="key-idea">E<sub>п</sub> = <i>mgh</i>, E<sub>к</sub> = <i>mv</i>²/2. При падане E<sub>п</sub> → E<sub>к</sub>, а сборът остава същият.</p>
    </article>`);
  el.append(page);
  const predict = mountPredict(page.querySelector<HTMLElement>("[data-predict]")!);
  const unmountSim = mountEnergy(page.querySelector<HTMLElement>("[data-sim]")!, (m) => predict.setMass(m));
  return () => {
    unmountSim();
    predict.unmount();
    page.remove();
  };
};
