import "./styles/global.css";
import "./styles/tokens.css";

import type { Mount } from "./lib/dom";
import { home } from "./pages/home";
import { lesson15 } from "./lessons/15-ravnovesie/page";
import { lesson16 } from "./lessons/16-rabota/page";

const routes: Record<string, { mount: Mount; title: string }> = {
  "": { mount: home, title: "Физика 9" },
  ravnovesie: { mount: lesson15, title: "Равновесие на телата · Физика 9" },
  rabota: { mount: lesson16, title: "Работа и мощност · Физика 9" },
};

const app = document.querySelector<HTMLElement>("#app")!;
let unmount: (() => void) | null = null;

function route() {
  const key = location.hash.replace(/^#\/?/, "");
  const r = routes[key] ?? routes[""];
  unmount?.();
  app.replaceChildren();
  unmount = r.mount(app);
  document.title = r.title;
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
route();
