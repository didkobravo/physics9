/** Small helper: create an element from an HTML string (trusted, static copy only). */
export function html<T extends Element = HTMLElement>(markup: string): T {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as T;
}

export type Mount = (el: HTMLElement) => () => void;

export type SliderOpts = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (v: number) => string;
};

/** Labelled range slider with a live <output>. */
export function slider(opts: SliderOpts) {
  const id = `s-${Math.random().toString(36).slice(2, 8)}`;
  const root = html(`
    <div class="control">
      <label for="${id}">${opts.label}</label>
      <output for="${id}"></output>
      <input id="${id}" type="range" min="${opts.min}" max="${opts.max}" step="${opts.step}" value="${opts.value}" />
    </div>`);
  const input = root.querySelector("input")!;
  const output = root.querySelector("output")!;
  const sync = () => (output.textContent = opts.format(Number(input.value)));
  sync();
  return {
    root,
    input,
    get value() {
      return Number(input.value);
    },
    set(v: number) {
      input.value = String(v);
      sync();
    },
    onInput(fn: (v: number) => void) {
      const h = () => {
        sync();
        fn(Number(input.value));
      };
      input.addEventListener("input", h);
      return () => input.removeEventListener("input", h);
    },
  };
}
