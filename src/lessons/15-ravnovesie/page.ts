import { html, type Mount } from "../../lib/dom";
import { mountTipping } from "./tipping";

export const lesson15: Mount = (el) => {
  const page = html(`
    <article class="lesson">
      <a class="back-link" href="#/">← Всички уроци</a>
      <h1>Равновесие на телата</h1>
      <p class="intro">Наклони рампата. Кога кутията ще се катурне?</p>
      <div data-sim></div>
      <p class="note">Кутията е на гумена подложка — не се плъзга.</p>
      <p class="key-idea">Отвесът от центъра на тежестта <i>C</i> е в опората → стои. Излезе ли навън → пада.</p>
    </article>`);
  el.append(page);
  const unmountSim = mountTipping(page.querySelector<HTMLElement>("[data-sim]")!);
  return () => {
    unmountSim();
    page.remove();
  };
};
