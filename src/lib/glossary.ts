/**
 * Single source of truth for every symbol that appears in a stage formula,
 * across all lessons. Names match the Bulgarian textbook; `plain` is a one-
 * line explanation in our own words, not copied from the textbook.
 *
 * A symbol can mean slightly different things in different lessons (e.g.
 * lesson 15's `h` is the box's own height, not a height above the floor).
 * The generic entry below covers the common case; a lesson passes an
 * occurrence-specific `note` to `chip()` when it needs to say something
 * else (a correction, like lesson 15's h, or a rename, like F = mg).
 */
export type Term = {
  /** Bulgarian textbook term. */
  name: string;
  /** One plain-words line, our own wording. */
  plain: string;
  /** Unit shown next to the name; "" if the symbol has none on its own. */
  unit: string;
};

export const GLOSSARY: Record<string, Term> = {
  A: { name: "Работа", plain: "Енергията, която сила предава, докато тялото се мести в посоката на действието ѝ.", unit: "J" },
  F: { name: "Сила", plain: "Бутане или дърпане върху тялото.", unit: "N" },
  s: { name: "Път", plain: "Разстоянието, което тялото изминава.", unit: "m" },
  x: { name: "Път (дотук)", plain: "Разстоянието, изминато от началото на движението до момента.", unit: "m" },
  m: { name: "Маса", plain: "Количеството вещество в тялото — колкото е по-голяма, толкова по-трудно е да го ускориш.", unit: "kg" },
  g: { name: "Земно ускорение", plain: "Постоянното ускорение, с което падат тела близо до Земята.", unit: "m/s²" },
  h: { name: "Височина", plain: "Разстоянието от пода (или избрано ниво) до тялото.", unit: "m" },
  v: { name: "Скорост", plain: "Колко бързо се движи тялото.", unit: "m/s" },
  Ek: { name: "Кинетична енергия", plain: "Енергията на тялото заради движението му.", unit: "J" },
  Ep: { name: "Потенциална енергия", plain: "Енергията на тялото заради височината му над избрано ниво.", unit: "J" },
  θ: { name: "Ъгъл на наклона", plain: "Ъгълът между рампата и хоризонта.", unit: "°" },
  b: { name: "Основа", plain: "Ширината на основата на кутията — страната, с която стъпва на рампата.", unit: "m" },
};
