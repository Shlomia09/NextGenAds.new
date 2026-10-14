// Resolve a CSS custom property to its current value (e.g. '--accent' → '#FB2343').
// Use where a colour leaves the CSS cascade: canvas, or string concatenation like `${color}40`.
export const cssToken = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();
