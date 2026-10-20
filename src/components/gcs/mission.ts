// Mission constants shared by the simulator and the screens.
// Values marked PLACEHOLDER are approximate until the team confirms them
// (see the Logic Spec, section 9: "Tunable parameters").

export type Vec = [number, number]; // [East, North] in metres
export type LatLon = [number, number];

/** Provisional landing target (Narayani River Bank, Pipraghat, Kushinagar). */
export const TARGET = { lat: 26.717535, lon: 84.301543 };
export const SITE_NAME = "Narayani River Bank · Pipraghat";
export const MISSION_ID = "FLAMESTON-26 · TEAM 020";

// ---- Descent events (heights above ground, metres) ----------------------
export const SEPARATION_ALT = 1000;
export const FLAPS_ALT = 700;
export const PROP_ALT = 600; // propellers + camera start
export const CONTROLLED_DESCENT_TRIGGER_ALT = PROP_ALT;

// ---- Altitude bands (reference images) ----------------------------------
export const N_BANDS = 14;
export const BAND_RATIO = 0.8;
export const BAND_H0 = 600;
export const PIXEL_FACTOR = 0.01456; // ground pixel size = factor × height (m)
export const H_VIS_MIN = 26; // lowest height for vision with 1 m imagery (PLACEHOLDER)
export const RINGS_M = [25, 50, 100, 200, 400];

export const BAND_HEIGHTS: number[] = Array.from({ length: N_BANDS }, (_, i) =>
  Math.round(BAND_H0 * Math.pow(BAND_RATIO, i)),
);

/** Band number (1..N_BANDS) nearest to height h on a log scale, 0 if above band 1. */
export function bandFor(h: number): number {
  if (h > BAND_HEIGHTS[0] * 1.12) return 0;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < BAND_HEIGHTS.length; i++) {
    const d = Math.abs(Math.log(h / BAND_HEIGHTS[i]));
    if (d < bestD) {
      bestD = d;
      best = i + 1;
    }
  }
  return best;
}

// ---- Landing logic states (Logic Spec, section 2) ------------------------
export type LandingId =
  | "IDLE"
  | "L0"
  | "L1"
  | "L2"
  | "L3"
  | "L4"
  | "L5"
  | "L6"
  | "L7"
  | "L8"
  | "L9"
  | "L10";

export const LANDING_STATES: { id: LandingId; name: string; note: string }[] = [
  { id: "L0", name: "CHUTE FALL", note: "Parachute only, no control" },
  { id: "L1", name: "ARM DEPLOY", note: "Flaps open at 700 m" },
  { id: "L2", name: "MOTOR READY", note: "Interlock check" },
  { id: "L3", name: "SPIN-UP", note: "Props + camera at 600 m" },
  { id: "L4", name: "ACQUIRE", note: "First image fixes" },
  { id: "L5", name: "GUIDED DESCENT", note: "Image match + steering" },
  { id: "L6", name: "TERMINAL", note: "Vision ended, hold estimate" },
  { id: "L7", name: "FLARE", note: "Stop steering, level body" },
  { id: "L8", name: "TOUCHDOWN CHECK", note: "Confirm landing" },
  { id: "L9", name: "PASSIVE SAFE", note: "Parachute only (fault)" },
  { id: "L10", name: "LANDED", note: "Motors off" },
];

export function landingName(id: LandingId): string {
  return LANDING_STATES.find((s) => s.id === id)?.name ?? "WAITING FOR SEPARATION";
}

// ---- Vehicle / physics parameters (PLACEHOLDER until measured) -----------
export const PARAMS = {
  M: 1.0, // kg
  G: 9.81,
  VT: 5.0, // parachute-only fall speed, m/s
  T_MAX: 10.0, // total propeller thrust, N
  K_H: 0.3, // sideways drag coefficient
  V0: 5.0,
  V_END: 3.5,
  H_FLARE: 4.0,
  V_TOUCH: 3.2,
  TILT_MAX_DEG: 25,
  TAU: 0.35, // tilt response time constant, s
  C_MIN: 0.4,
  PSR_MIN: 1.25,
  THRUST_SLEW: 3.0, // N/s
  PAD_ELEVATION: 70, // m above sea level
};

// ---- Geodesy helpers -----------------------------------------------------
const M_PER_DEG_LAT = 111_320;

/** East/North metres relative to the target -> latitude/longitude. */
export function enuToLatLon(e: number, n: number): LatLon {
  const lat = TARGET.lat + n / M_PER_DEG_LAT;
  const lon = TARGET.lon + e / (M_PER_DEG_LAT * Math.cos((TARGET.lat * Math.PI) / 180));
  return [lat, lon];
}

/** Latitude/longitude -> East/North metres relative to the target. */
export function latLonToEnu(lat: number, lon: number): Vec {
  const n = (lat - TARGET.lat) * M_PER_DEG_LAT;
  const e = (lon - TARGET.lon) * M_PER_DEG_LAT * Math.cos((TARGET.lat * Math.PI) / 180);
  return [e, n];
}

/** Compass bearing in degrees (0 = North, clockwise) of vector (e, n). */
export function bearingDeg(e: number, n: number): number {
  const b = (Math.atan2(e, n) * 180) / Math.PI;
  return (b + 360) % 360;
}

export function ringIndex(distM: number): number {
  for (let i = 0; i < RINGS_M.length; i++) if (distM <= RINGS_M[i]) return i;
  return RINGS_M.length;
}

export function ringLabel(idx: number): string {
  return idx < RINGS_M.length ? `≤ ${RINGS_M[idx]} m` : `> ${RINGS_M[RINGS_M.length - 1]} m`;
}
