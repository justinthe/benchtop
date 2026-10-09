// Reduced-eye spectacles model: pure (no DOM, no three). Units: lengths in mm, powers in dioptres (D).
// One refracting surface (power EYE_POWER) with the eye filled with fluid of index N_EYE; a thin spectacle lens sits
// in the same plane (the small gap between glasses and eye is ignored, per the topic). Paraxial optics.
export const N_EYE = 1.336, EYE_POWER = 60, PUPIL = 4;            // index, D, mm
export const NORMAL_LENGTH = 1000 * N_EYE / EYE_POWER;             // 22.27 mm: where a 60 D eye focuses distant light
export const RAY_HEIGHTS = [-1.9, -1.27, -.63, 0, .63, 1.27, 1.9]; // mm, inside the 4 mm pupil
export const RAY_START = -25;                                       // mm in front of the cornea (display only)
export const SHARP_UM = 15;                                         // blur circle below this reads as sharp
const MODEL_TOL = .25;                                              // D: within this of perfect counts as corrected

// Lens power that makes a distant object focus exactly on the retina of an eye of length L (mm).
export const neededPower = L => 1000 * N_EYE / L - EYE_POWER;

// s: { eye: axial length mm, lens: spectacle power D }
export function model(s) {
  const Ptot = EYE_POWER + s.lens, focus = 1000 * N_EYE / Ptot;      // mm behind the cornea plane
  const needed = neededPower(s.eye), residual = needed - s.lens;     // D still uncorrected
  const offset = focus - s.eye;                                       // <0: focus falls in front of the retina
  const blurUm = 1000 * PUPIL * Math.abs(offset) / focus;           // blur circle diameter on the retina
  // marginal-ray trace: slope after the plane is -h*Ptot/(1000 n); heights follow straight lines
  const rays = RAY_HEIGHTS.map(h => {
    const slope = -(h / 1000) * Ptot / N_EYE;                        // mm per mm inside the eye
    const pts = [[RAY_START, h], [0, h], [s.eye, h + slope * s.eye]];
    const past = focus > s.eye ? [[s.eye, h + slope * s.eye], [focus, h + slope * focus]] : null; // continues behind a too-short eye
    return { h, pts, past };
  });
  const kind = needed < -MODEL_TOL ? 'myopic' : needed > MODEL_TOL ? 'hyperopic' : 'normal';
  return { Ptot, focus, offset, blurUm, needed, residual, kind, sharp: blurUm < SHARP_UM, corrected: Math.abs(residual) < MODEL_TOL, rays };
}
