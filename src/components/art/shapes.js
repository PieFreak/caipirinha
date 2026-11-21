// Shapes the drawings share. Every drawing is flat color with a lighter and a darker
// tone for depth: no outlines, no gradients.

const point = (radius, angle) => `${(radius * Math.cos(angle)).toFixed(2)} ${(radius * Math.sin(angle)).toFixed(2)}`;

// The segments of a citrus slice around the origin: wedges with a gap between them.
export function wedges(count, inner, outer, gap = 9) {
  const out = [];
  for (let k = 0; k < count; k++) {
    const from = ((k * 360) / count + gap / 2) * (Math.PI / 180);
    const to = (((k + 1) * 360) / count - gap / 2) * (Math.PI / 180);
    out.push(`M${point(inner, from)} L${point(outer, from)} A${outer} ${outer} 0 0 1 ${point(outer, to)} L${point(inner, to)} Z`);
  }
  return out;
}

// A leaf blade from the origin along the x-axis: long, pointed, widest near the base.
export const blade = (length, width) => `M0 0 C${length * 0.28} ${-width} ${length * 0.72} ${-width * 0.85} ${length} 0 `
  + `C${length * 0.72} ${width * 0.85} ${length * 0.28} ${width} 0 0 Z`;

// A four-pointed sparkle around the origin.
export const sparkle = (size) => `M0 ${-size} Q0 0 ${size} 0 Q0 0 0 ${size} Q0 0 ${-size} 0 Q0 0 0 ${-size} Z`;
