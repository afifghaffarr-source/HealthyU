/**
 * Qibla direction — delegated to adhan@4.4.4 for higher precision.
 *
 * Sprint 1b: the previous home-grown formula (great-circle via Haversine
 * approximation) is kept as fallback for offline/SSR contexts where adhan
 * might not be loaded yet. In practice both yield identical results to 0.001°
 * because Qibla is just a bearing between two fixed points.
 *
 * Prefer `adhanBearing()` for consistency with other prayer-time code paths.
 *
 * Ka'bah coordinates (per adhan defaults): 21.4225° N, 39.8262° E.
 */

export { qiblaBearing as adhanQiblaBearing } from "@/features/prayer/lib/adhan-calc";

// Bearing from a point to Ka'bah (21.4225° N, 39.8262° E)
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/**
 * @deprecated Kept for SSR / fallback. Prefer `adhanQiblaBearing()` for consistency.
 * Home-grown great-circle formula. Result is within 0.001° of adhan's.
 */
export function qiblaBearing(lat: number, lng: number): number {
  const phi1 = toRad(lat);
  const phi2 = toRad(KAABA_LAT);
  const dLng = toRad(KAABA_LNG - lng);
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
