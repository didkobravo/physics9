import { html, type Mount } from "../../lib/dom";
import { WEIGHT, mountWork } from "./work";

export const lesson16: Mount = (el) => {
  const page = html(`
    <article class="lesson">
      <a class="back-link" href="#/">← Всички уроци</a>
      <h1>Работа и мощност</h1>
      <p class="intro">Сила върши работа <i>A</i> само ако тялото се мести. Знакът зависи от посоката.</p>
      <div data-sim></div>
      <p class="note">Мотор тегли блока (${WEIGHT} N) равномерно. Мерим работата само на нашата <i>F</i>.</p>
      <p class="key-idea">Помага на движението → <i>A</i> &gt; 0. Пречи → <i>A</i> &lt; 0. Не мести → <i>A</i> = 0.</p>
    </article>`);
  el.append(page);
  const unmountSim = mountWork(page.querySelector<HTMLElement>("[data-sim]")!);
  return () => {
    unmountSim();
    page.remove();
  };
};
