/** Returns true if lat/lng are valid, non-zero coordinates (not Null Island). */
export function isValidCoordinate(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  if (lat == null || lng == null) return false;
  if (lat === 0 && lng === 0) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateETA(distanceKm: number): number {
  let speedKmh: number;
  if (distanceKm < 5) {
    speedKmh = 25;
  } else if (distanceKm <= 15) {
    speedKmh = 35;
  } else {
    speedKmh = 50;
  }
  return Math.round((distanceKm / speedKmh) * 60);
}
