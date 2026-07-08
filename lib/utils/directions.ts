// -----------------------------------------------------------------------------
// Mapbox Geocoding + Directions helpers — used to turn a destination into
// coordinates, then fetch the shortest driving route + ETA from the rider's
// current location. Coordinates are [longitude, latitude] (Mapbox order).
// -----------------------------------------------------------------------------

const MAPBOX_TOKEN =
    'pk.eyJ1IjoiYW5kcmVzd2UiLCJhIjoiY203N3Z2ZXZkMTdnajJqcTg0ZGwweDV1YSJ9.8-Muri-txLBOiaKSsCZjWA';

export type LngLat = [number, number];

export interface RouteResult {
    coordinates: LngLat[]; // route line geometry
    durationSec: number; // ETA in seconds
    distanceM: number; // distance in meters
}

/** Turn a place name (e.g. "BGC") into coordinates, biased to the rider's area. */
export async function geocode(query: string, proximity?: LngLat): Promise<LngLat | null> {
    if (!query.trim()) return null;
    const prox = proximity ? `&proximity=${proximity[0]},${proximity[1]}` : '';
    const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
        `?country=PH&limit=1${prox}&access_token=${MAPBOX_TOKEN}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const center = data?.features?.[0]?.center;
        return Array.isArray(center) && center.length === 2 ? [center[0], center[1]] : null;
    } catch (error) {
        console.warn('geocode failed:', error);
        return null;
    }
}

/** Fetch the shortest driving route (geometry + ETA + distance) between two points. */
export async function getRoute(from: LngLat, to: LngLat): Promise<RouteResult | null> {
    const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving/${from[0]},${from[1]};${to[0]},${to[1]}` +
        `?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const route = data?.routes?.[0];
        if (!route?.geometry?.coordinates) return null;
        return {
            coordinates: route.geometry.coordinates as LngLat[],
            durationSec: route.duration ?? 0,
            distanceM: route.distance ?? 0,
        };
    } catch (error) {
        console.warn('getRoute failed:', error);
        return null;
    }
}

/** "28 min" / "1 h 5 min" from a duration in seconds. */
export function formatEta(durationSec: number): string {
    const totalMin = Math.max(1, Math.round(durationSec / 60));
    if (totalMin < 60) return `${totalMin} min`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

/** "12.4 km" from a distance in meters. */
export function formatDistance(distanceM: number): string {
    return `${(distanceM / 1000).toFixed(1)} km`;
}
