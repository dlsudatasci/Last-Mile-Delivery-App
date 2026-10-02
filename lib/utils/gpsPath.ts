import type { RidePoint } from '../store/useRideStore';

// A bike/scooter can briefly travel quickly, but a location fix that would
// require more than this is almost certainly a stale or inaccurate GPS fix.
// This is deliberately below the metric speed clamp: this protects the path
// geometry, whereas the metric clamp only limits the displayed speed.
export const MAX_RECORDED_GPS_SPEED_MPS = 25;
export const MAX_RECORDED_GPS_ACCURACY_M = 65;

const MIN_GPS_JUMP_ALLOWANCE_M = 15;

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isValidCoordinate(point: RidePoint): boolean {
    const { latitude, longitude } = point.coordinate ?? {};
    return (
        isFiniteNumber(latitude) &&
        isFiniteNumber(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
}

function isUsableAccuracy(accuracy: number | undefined): boolean {
    return accuracy === undefined || (isFiniteNumber(accuracy) && accuracy >= 0 && accuracy <= MAX_RECORDED_GPS_ACCURACY_M);
}

function distanceM(a: RidePoint, b: RidePoint): number {
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const earthRadiusM = 6371e3;
    const lat1 = toRadians(a.coordinate.latitude);
    const lat2 = toRadians(b.coordinate.latitude);
    const deltaLat = toRadians(b.coordinate.latitude - a.coordinate.latitude);
    const deltaLon = toRadians(b.coordinate.longitude - a.coordinate.longitude);
    const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    return earthRadiusM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

/**
 * Returns whether a newly delivered location is safe to append to a ride.
 * Background location callbacks can contain stale fixes, and accuracy is not
 * guaranteed even when BestForNavigation is requested.
 */
export function shouldRecordRidePoint(previous: RidePoint | undefined, next: RidePoint): boolean {
    if (!isValidCoordinate(next) || !isFiniteNumber(next.timestamp) || !isUsableAccuracy(next.accuracy)) return false;
    if (!previous) return true;
    if (!isValidCoordinate(previous) || !isFiniteNumber(previous.timestamp)) return true;

    const elapsedSec = (next.timestamp - previous.timestamp) / 1000;
    if (elapsedSec <= 0) return false;

    const accuracyAllowanceM = Math.max(
        MIN_GPS_JUMP_ALLOWANCE_M,
        (isFiniteNumber(next.accuracy) ? next.accuracy : 0) * 1.5,
        (isFiniteNumber(previous.accuracy) ? previous.accuracy : 0) * 1.5
    );
    return distanceM(previous, next) <= MAX_RECORDED_GPS_SPEED_MPS * elapsedSec + accuracyAllowanceM;
}

/**
 * Produces a chronologically ordered, non-mutating route suitable for a
 * polyline. Applying this on reads also prevents old rides with a bad fix from
 * drawing a long false branch.
 */
export function sanitizeRidePoints(points: RidePoint[]): RidePoint[] {
    const ordered = points
        .map((point, index) => ({ point, index }))
        .sort((a, b) => a.point.timestamp - b.point.timestamp || a.index - b.index)
        .map(({ point }) => point);

    const accepted: RidePoint[] = [];
    for (const point of ordered) {
        if (shouldRecordRidePoint(accepted[accepted.length - 1], point)) {
            accepted.push(point);
        }
    }
    return accepted;
}
