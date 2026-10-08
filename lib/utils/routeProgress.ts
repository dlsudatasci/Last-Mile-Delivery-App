// -----------------------------------------------------------------------------
// Route progress helpers.
//
// Given the rider's current position and the active route geometry, work out how
// far along the route they are: distance travelled along the route, distance
// remaining to the destination, and the route split into a "travelled" portion
// (behind the rider) and an "upcoming" portion (ahead of the rider). These drive:
//   - the remaining-distance metric (decreases as the rider nears the destination)
//   - the ETA metric (remaining route fraction x traffic-aware route duration)
//   - the map colouring (travelled = green, upcoming = blue)
//
// Distances are computed with the same equirectangular/haversine helpers used for
// snapping so numbers line up with lib/utils/routeSnapping.
// -----------------------------------------------------------------------------

import { LngLat } from './directions';
import { distanceBetweenLngLatM, snapLngLatToRoute } from './routeSnapping';

/** Default snap tolerance (metres) for treating the rider as "on route". */
export const DEFAULT_ROUTE_PROGRESS_SNAP_M = 60;

export interface RouteProgress {
    /** Rider position projected onto the nearest point of the route. */
    snappedCoordinate: LngLat;
    /** Index of the route vertex that starts the segment the rider is on. */
    segmentIndex: number;
    /** Perpendicular distance from the rider to the route (metres). */
    snapDistanceM: number;
    /** Total length of the active route (metres). */
    totalRouteDistanceM: number;
    /** Distance travelled along the route from its start to the snapped point. */
    traveledDistanceM: number;
    /** Distance remaining along the route from the snapped point to the end. */
    remainingDistanceM: number;
    /** Fraction of the route already travelled, 0..1. */
    fractionTraveled: number;
    /** Fraction of the route still remaining, 0..1. */
    fractionRemaining: number;
    /** Route geometry from the start up to (and including) the snapped point. */
    traveledCoordinates: LngLat[];
    /** Route geometry from the snapped point (inclusive) to the destination. */
    upcomingCoordinates: LngLat[];
}

/**
 * Cumulative distance (metres) from the route start to each vertex.
 * cumulative[0] === 0; cumulative[last] === total route length.
 */
export function cumulativeRouteDistancesM(routeCoordinates: LngLat[]): number[] {
    const cumulative: number[] = new Array(routeCoordinates.length).fill(0);
    for (let i = 1; i < routeCoordinates.length; i += 1) {
        cumulative[i] = cumulative[i - 1] + distanceBetweenLngLatM(routeCoordinates[i - 1], routeCoordinates[i]);
    }
    return cumulative;
}

/**
 * Compute the rider's progress along the active route. Returns null when the
 * route is too short to reason about or the rider is further than
 * `maxSnapDistanceM` from it (i.e. off-route — the caller should keep its last
 * reliable value rather than jump).
 */
export function getRouteProgress(
    current: LngLat,
    routeCoordinates: LngLat[],
    maxSnapDistanceM: number = DEFAULT_ROUTE_PROGRESS_SNAP_M
): RouteProgress | null {
    if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) return null;

    const snapped = snapLngLatToRoute(current, routeCoordinates, maxSnapDistanceM);
    if (!snapped) return null;

    const cumulative = cumulativeRouteDistancesM(routeCoordinates);
    const totalRouteDistanceM = cumulative[cumulative.length - 1];

    const segmentStart = routeCoordinates[snapped.segmentIndex];
    const intoSegmentM = distanceBetweenLngLatM(segmentStart, snapped.coordinate);
    const traveledDistanceM = Math.min(totalRouteDistanceM, cumulative[snapped.segmentIndex] + intoSegmentM);
    const remainingDistanceM = Math.max(0, totalRouteDistanceM - traveledDistanceM);

    const traveledCoordinates: LngLat[] = [
        ...routeCoordinates.slice(0, snapped.segmentIndex + 1),
        snapped.coordinate,
    ];
    const upcomingCoordinates: LngLat[] = [
        snapped.coordinate,
        ...routeCoordinates.slice(snapped.segmentIndex + 1),
    ];

    return {
        snappedCoordinate: snapped.coordinate,
        segmentIndex: snapped.segmentIndex,
        snapDistanceM: snapped.distanceM,
        totalRouteDistanceM,
        traveledDistanceM,
        remainingDistanceM,
        fractionTraveled: totalRouteDistanceM > 0 ? traveledDistanceM / totalRouteDistanceM : 0,
        fractionRemaining: totalRouteDistanceM > 0 ? remainingDistanceM / totalRouteDistanceM : 0,
        traveledCoordinates,
        upcomingCoordinates,
    };
}

/**
 * Estimate remaining ETA (seconds) from the traffic-aware route duration and the
 * fraction of the route still ahead. Because `routeDurationSec` is refreshed from
 * the rider's current position (see the record screen's traffic/reroute effects),
 * this decreases naturally as the rider advances and updates when traffic changes.
 */
export function estimateRemainingEtaSec(routeDurationSec: number, fractionRemaining: number): number {
    if (!Number.isFinite(routeDurationSec) || routeDurationSec <= 0) return 0;
    const frac = Number.isFinite(fractionRemaining) ? Math.max(0, Math.min(1, fractionRemaining)) : 1;
    return Math.round(routeDurationSec * frac);
}

/** Clamp a raw fraction into 0..1, tolerating NaN/undefined by returning 1 (assume full remaining). */
export function clampFraction(value: number | undefined | null): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
    return Math.max(0, Math.min(1, value));
}
