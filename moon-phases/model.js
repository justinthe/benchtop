// Moon-phase model: pure (no DOM, no three). Units: time in days, angles in degrees unless a name ends in Rad.
// Classroom picture: the Sun is a distant lamp in a fixed direction (parallel rays), the Moon circles Earth on a flat,
// circular orbit once per synodic month, no tilt, so no eclipses. Day 0 = new Moon (Moon between Earth and Sun).
export const SYNODIC = 29.53;                                        // days, new Moon to new Moon
// Phase-name boundaries as elongation (degrees round the orbit from the Sun's direction). Principal phases get a +-18 deg
// (about 1.5 day) window; between them the Moon is a crescent or gibbous.
export const CUTS = [18, 72, 108, 162, 198, 252, 288, 342];
export const NAMES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent', 'New moon'];

// s: { day }  (any real number; wrapped into one month)
export function model(s) {
  const d = ((s.day % SYNODIC) + SYNODIC) % SYNODIC;                  // days into the month
  const elong = 360 * d / SYNODIC, thetaRad = elong * Math.PI / 180;  // angle round the orbit, Sun direction = 0
  // lit fraction of the disc we see = (1 + cos(phase angle)) / 2 with phase angle = 180 - elongation
  const lit = (1 - Math.cos(thetaRad)) / 2;
  const idx = CUTS.filter(c => elong >= c).length;
  // unit vector from Earth to Moon on the bench plane (+x right, +z toward viewer, counter-clockwise from above)
  const moon = [-Math.cos(thetaRad), Math.sin(thetaRad)];
  const toFull = ((SYNODIC / 2 - d) + SYNODIC) % SYNODIC;             // days until the next full Moon
  return { day: d, elong, thetaRad, lit, litPct: 100 * lit, idx, name: NAMES[idx], waxing: elong < 180, moon, toFull,
    principal: [0, 2, 4, 6, 8].includes(idx) };
}
