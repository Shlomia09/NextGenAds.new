// Resolve a CSS custom property to its current value (e.g. '--accent' → '#FB2343').
// Use where a colour leaves the CSS cascade: canvas, or string concatenation like `${color}40`.
export const cssToken = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Turn 'var(--x)' into the token's hex so a two-digit alpha suffix can be appended.
// Anything that is not a plain var() reference is returned unchanged.
export const solid = (color: string): string => {
  const m = color.match(/^var\((--[a-z0-9-]+)\)$/);
  return m ? cssToken(m[1]) : color;
};
