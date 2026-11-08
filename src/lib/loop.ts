/** Runs fn(dt in seconds) every animation frame. Returns a stop function. */
export function startLoop(fn: (dt: number) => void): () => void {
  let id = 0;
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 20); // clamp after tab switches
    last = now;
    fn(dt);
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}
