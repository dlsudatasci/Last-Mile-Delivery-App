import { LngLat } from './directions';

export interface SnappedRoutePoint {
    coordinate: LngLat;
    distanceM: number;
    segmentIndex: number;
}

const EARTH_RADIUS_M = 6371000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

const lngLatToMeters = ([lng, lat]: LngLat, originLat: number): [number, number] => {
    const originLatRad = toRadians(originLat);
    return [toRadians(lng) * EARTH_RADIUS_M * Math.cos(originLatRad), toRadians(lat) * EARTH_RADIUS_M];
};

const metersToLngLat = ([x, y]: [number, number], originLat: number): LngLat => {
    const originLatRad = toRadians(originLat);
    return [toDegrees(x / (EARTH_RADIUS_M * Math.cos(originLatRad))), toDegrees(y / EARTH_RADIUS_M)];
};

export const distanceBetweenLngLatM = (a: LngLat, b: LngLat): number => {
    const deltaLat = toRadians(b[1] - a[1]);
    const deltaLng = toRadians(b[0] - a[0]);
    const lat1 = toRadians(a[1]);
    const lat2 = toRadians(b[1]);

    const h =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

    return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export function snapLngLatToRoute(point: LngLat, routeCoordinates: LngLat[], maxDistanceM: number): SnappedRoutePoint | null {
    if (routeCoordinates.length === 0) return null;
    if (routeCoordinates.length === 1) {
        const distanceM = distanceBetweenLngLatM(point, routeCoordinates[0]);
        return distanceM <= maxDistanceM ? { coordinate: routeCoordinates[0], distanceM, segmentIndex: 0 } : null;
    }

    const originLat = point[1];
    const pointMeters = lngLatToMeters(point, originLat);
    let best: SnappedRoutePoint | null = null;

    for (let i = 0; i < routeCoordinates.length - 1; i++) {
        const start = lngLatToMeters(routeCoordinates[i], originLat);
        const end = lngLatToMeters(routeCoordinates[i + 1], originLat);
        const segmentX = end[0] - start[0];
        const segmentY = end[1] - start[1];
        const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;

        const t =
            segmentLengthSq === 0
                ? 0
                : Math.max(
                      0,
                      Math.min(
                          1,
                          ((pointMeters[0] - start[0]) * segmentX + (pointMeters[1] - start[1]) * segmentY) /
                              segmentLengthSq
                      )
                  );

        const projectedMeters: [number, number] = [start[0] + t * segmentX, start[1] + t * segmentY];
        const snappedCoordinate = metersToLngLat(projectedMeters, originLat);
        const distanceM = distanceBetweenLngLatM(point, snappedCoordinate);

        if (!best || distanceM < best.distanceM) {
            best = { coordinate: snappedCoordinate, distanceM, segmentIndex: i };
        }
    }

    return best && best.distanceM <= maxDistanceM ? best : null;
}
