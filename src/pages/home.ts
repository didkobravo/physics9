import { html, type Mount } from "../lib/dom";

export const home: Mount = (el) => {
  const page = html(`
    <section>
      <h1>Физика 9</h1>
      <p>Уроци, които можеш да пипаш: мести плъзгачите и гледай какво става.</p>
      <ul class="lesson-list">
        <li><a class="lesson-card" href="#/ravnovesie">
          <span class="num">Урок 15</span>
          <b>Равновесие на телата</b>
          <span>Кога една кутия на рампа се преобръща?</span>
        </a></li>
        <li><a class="lesson-card" href="#/rabota">
          <span class="num">Урок 16</span>
          <b>Работа и мощност</b>
          <span>Кога една сила върши работа — и кога не?</span>
        </a></li>
        <li><a class="lesson-card" href="#/energiya">
          <span class="num">Урок 17</span>
          <b>Кинетична и потенциална енергия</b>
          <span>Къде отива енергията на падащата топка?</span>
        </a></li>
      </ul>
    </section>`);
  el.append(page);
  return () => page.remove();
};
