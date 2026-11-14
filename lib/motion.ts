/** CSS is the source of truth for shared timing; Framer consumes the same tokens. */
export function readMotionTransition(style: Pick<CSSStyleDeclaration, "getPropertyValue">) {
  const value = style.getPropertyValue("--motion-normal").trim();
  const number = Number.parseFloat(value);
  const seconds = value.endsWith("ms") ? number / 1000 : value.endsWith("s") ? number : 0;
  const match = /^cubic-bezier\(([^)]+)\)$/.exec(style.getPropertyValue("--motion-ease").trim());
  const curve = match?.[1].split(",").map(Number) ?? [];
  const valid = curve.length === 4 && curve.every(n => Number.isFinite(n) && n >= 0 && n <= 1);
  return {
    duration: Number.isFinite(seconds) && seconds >= 0 && seconds <= 1 ? seconds : 0,
    ease: (valid ? curve : [0, 0, 1, 1]) as [number, number, number, number],
  };
}
