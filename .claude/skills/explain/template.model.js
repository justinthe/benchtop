// Pure model: no DOM, no three. Replace with the topic's real model; keep the shape.
// Units: side in metres.
export function model(s) {
  return {
    volume: s.side ** 3,                 // m^3
    area: 6 * s.side ** 2,               // m^2
    diagonal: Math.sqrt(3) * s.side,     // m
  };
}
