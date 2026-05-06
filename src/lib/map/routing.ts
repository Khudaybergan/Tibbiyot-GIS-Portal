import type { Feature, LineString } from 'geojson';

export type RouteProfile = 'driving' | 'walking' | 'cycling';

export type RouteStep = {
  instruction: string;            // human-readable, in Uzbek
  maneuverType: string;           // turn / continue / arrive / depart
  location: [number, number];     // where the maneuver happens
  distanceMeters: number;         // length of THIS step
};

export type RouteResult = {
  geojson: Feature<LineString>;
  distanceMeters: number;
  durationSeconds: number;
  profile: RouteProfile;
  from: [number, number];
  to: [number, number];
  steps: RouteStep[];
};

export type AllRoutes = Record<RouteProfile, RouteResult>;

export const PROFILES: RouteProfile[] = ['driving', 'cycling', 'walking'];

const OSRM_BASE = 'https://router.project-osrm.org/route/v1';

// Public OSRM demo only ships the `car` graph — non-driving profile names are
// silently mapped to driving on the server. We fetch the driving geometry
// (the only one available) and synthesize duration for cycling/walking from
// distance × typical speed. Geometry is a reasonable approximation for short
// urban routes; for production switch to a multi-profile router (OpenRouteService,
// Valhalla, Mapbox Directions, or self-hosted OSRM with all graphs).
const TYPICAL_SPEED_KMH: Record<Exclude<RouteProfile, 'driving'>, number> = {
  cycling: 15,
  walking: 5,
};

type OsrmManeuver = {
  type: string;
  modifier?: string;
  location: [number, number];
};

type OsrmStep = {
  maneuver: OsrmManeuver;
  distance: number;
  duration: number;
  name?: string;
};

type OsrmResponse = {
  code: string;
  routes?: Array<{
    geometry: LineString;
    distance: number;
    duration: number;
    legs?: Array<{ steps?: OsrmStep[] }>;
  }>;
};

const MANEUVER_LABEL: Record<string, string> = {
  depart: "Yo'lga chiqing",
  arrive: 'Manzilga yetib keldingiz',
  turn: 'Buriling',
  continue: "To'g'ri davom eting",
  merge: "Yo'lga qo'shiling",
  fork: "Yo'l ayrilmasi",
  roundabout: 'Aylanma yo\'l',
  'on ramp': 'Yo\'lga chiqing',
  'off ramp': 'Yo\'ldan chiqing',
  'end of road': "Yo'l oxiri",
  'new name': "To'g'ri davom eting",
};

const MODIFIER_LABEL: Record<string, string> = {
  left: 'chapga',
  right: 'o\'ngga',
  'sharp left': "keskin chapga",
  'sharp right': "keskin o'ngga",
  'slight left': "biroz chapga",
  'slight right': "biroz o'ngga",
  straight: "to'g'ri",
  uturn: 'orqaga (U-burilish)',
};

function buildInstruction(step: OsrmStep): string {
  const t = step.maneuver.type;
  const m = step.maneuver.modifier;
  const name = step.name?.trim();

  if (t === 'arrive') return MANEUVER_LABEL.arrive;
  if (t === 'depart') return name ? `Yo'lga chiqing — ${name}` : MANEUVER_LABEL.depart;

  const action = MANEUVER_LABEL[t] ?? "To'g'ri davom eting";
  const dir = m ? MODIFIER_LABEL[m] : '';
  const onto = name ? ` — ${name}` : '';
  return [action, dir].filter(Boolean).join(' ') + onto;
}

/**
 * Fetches a route from the public OSRM demo (driving-only) and adjusts
 * duration for non-driving profiles using average-speed heuristics.
 */
export async function fetchRoute(
  from: [number, number],
  to: [number, number],
  profile: RouteProfile = 'driving',
  signal?: AbortSignal,
): Promise<RouteResult> {
  const url = `${OSRM_BASE}/driving/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson&steps=true`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Routing service error (${res.status})`);

  const data = (await res.json()) as OsrmResponse;
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error("Marshrut topilmadi. Boshqa manzilni tanlang.");
  }

  const r = data.routes[0];

  // Synthesize duration for non-driving modes from distance × typical speed.
  let durationSeconds = r.duration;
  if (profile !== 'driving') {
    const kmh = TYPICAL_SPEED_KMH[profile];
    durationSeconds = r.distance / (kmh * 1000 / 3600);
  }

  const rawSteps = r.legs?.[0]?.steps ?? [];
  const steps: RouteStep[] = rawSteps.map(s => ({
    instruction: buildInstruction(s),
    maneuverType: s.maneuver.type,
    location: s.maneuver.location,
    distanceMeters: s.distance,
  }));

  return {
    geojson: { type: 'Feature', properties: {}, geometry: r.geometry },
    distanceMeters: r.distance,
    durationSeconds,
    profile,
    from,
    to,
    steps,
  };
}

/** Fetch all three modes in parallel for the comparison UI. */
export async function fetchAllRoutes(
  from: [number, number],
  to: [number, number],
  signal?: AbortSignal,
): Promise<AllRoutes> {
  const [driving, cycling, walking] = await Promise.all(
    PROFILES.map(p => fetchRoute(from, to, p, signal)),
  );
  return { driving, cycling, walking };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function formatDuration(seconds: number): string {
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} daqiqa`;
  const hours = Math.floor(min / 60);
  const remMin = min % 60;
  return remMin === 0 ? `${hours} soat` : `${hours} soat ${remMin} daqiqa`;
}

/** Initial bearing (degrees, 0..360) from point A to point B along a great circle. */
export function bearingDegrees(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLng = toRad(b[0] - a[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/** Haversine distance in meters between two [lng, lat] points. */
export function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Find the next upcoming maneuver step closest to the user's position. */
export function findNextStep(
  steps: RouteStep[],
  position: [number, number],
): { step: RouteStep | null; index: number; distanceToStep: number } {
  if (steps.length === 0) return { step: null, index: -1, distanceToStep: 0 };
  // Skip 'depart' if there is a real next step
  const candidates = steps.filter(s => s.maneuverType !== 'depart');
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const d = haversineMeters(position, candidates[i].location);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return { step: candidates[bestIdx], index: bestIdx, distanceToStep: bestDist };
}

export function getCurrentPosition(): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Brauzer geolokatsiyani qo'llab-quvvatlamaydi"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve([coords.longitude, coords.latitude]),
      err => reject(new Error(
        err.code === err.PERMISSION_DENIED
          ? "Geolokatsiyaga ruxsat berilmagan. Brauzer sozlamalarida ruxsat bering."
          : "Joylashuvingizni aniqlab bo'lmadi",
      )),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 },
    );
  });
}
