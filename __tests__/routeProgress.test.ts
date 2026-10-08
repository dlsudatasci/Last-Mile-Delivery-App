import {
    clampFraction,
    cumulativeRouteDistancesM,
    estimateRemainingEtaSec,
    getRouteProgress,
} from "../lib/utils/routeProgress";
import { LngLat } from "../lib/utils/directions";

// A short straight west->east route near the equator-ish Metro Manila latitude.
// At lat ~14.5, 0.001 deg lng is ~107.6 m, so each 0.001 step is a known-ish length.
const ROUTE: LngLat[] = [
    [121.000, 14.500],
    [121.001, 14.500],
    [121.002, 14.500],
    [121.003, 14.500],
    [121.004, 14.500],
];

describe("cumulativeRouteDistancesM()", () => {
    test("starts at zero and increases monotonically", () => {
        const cumulative = cumulativeRouteDistancesM(ROUTE);
        expect(cumulative[0]).toBe(0);
        for (let i = 1; i < cumulative.length; i++) {
            expect(cumulative[i]).toBeGreaterThan(cumulative[i - 1]);
        }
    });

    test("total length is roughly 4 x segment length", () => {
        const cumulative = cumulativeRouteDistancesM(ROUTE);
        const total = cumulative[cumulative.length - 1];
        // ~430 m for 4 x ~107 m segments
        expect(total).toBeGreaterThan(400);
        expect(total).toBeLessThan(460);
    });
});

describe("getRouteProgress()", () => {
    test("returns null for a degenerate route", () => {
        expect(getRouteProgress([121, 14.5], [[121, 14.5]], 60)).toBeNull();
    });

    test("returns null when the rider is too far from the route", () => {
        // ~1km north of the route, snap tolerance 60 m
        expect(getRouteProgress([121.002, 14.51], ROUTE, 60)).toBeNull();
    });

    test("at the start, remaining ~= total and traveled ~= 0", () => {
        const progress = getRouteProgress([121.0, 14.5], ROUTE, 60);
        expect(progress).not.toBeNull();
        expect(progress!.traveledDistanceM).toBeLessThan(5);
        expect(progress!.remainingDistanceM).toBeCloseTo(progress!.totalRouteDistanceM, 0);
        expect(progress!.fractionRemaining).toBeGreaterThan(0.98);
    });

    test("remaining distance decreases as the rider moves along the route", () => {
        const near = getRouteProgress([121.001, 14.5], ROUTE, 60)!;
        const mid = getRouteProgress([121.002, 14.5], ROUTE, 60)!;
        const far = getRouteProgress([121.003, 14.5], ROUTE, 60)!;

        expect(near.remainingDistanceM).toBeGreaterThan(mid.remainingDistanceM);
        expect(mid.remainingDistanceM).toBeGreaterThan(far.remainingDistanceM);

        // traveled should mirror the decrease
        expect(near.traveledDistanceM).toBeLessThan(mid.traveledDistanceM);
        expect(mid.traveledDistanceM).toBeLessThan(far.traveledDistanceM);
    });

    test("traveled + remaining always equals the total route distance", () => {
        const progress = getRouteProgress([121.0025, 14.5], ROUTE, 60)!;
        expect(progress.traveledDistanceM + progress.remainingDistanceM).toBeCloseTo(
            progress.totalRouteDistanceM,
            5
        );
    });

    test("splits geometry into traveled (green) and upcoming (blue) sharing the snapped point", () => {
        const progress = getRouteProgress([121.002, 14.5], ROUTE, 60)!;
        // Both segments include the snapped point as their shared boundary.
        const lastTraveled = progress.traveledCoordinates[progress.traveledCoordinates.length - 1];
        const firstUpcoming = progress.upcomingCoordinates[0];
        expect(firstUpcoming).toEqual(progress.snappedCoordinate);
        expect(lastTraveled).toEqual(progress.snappedCoordinate);
        // Upcoming should still reach the destination vertex.
        expect(progress.upcomingCoordinates[progress.upcomingCoordinates.length - 1]).toEqual(
            ROUTE[ROUTE.length - 1]
        );
        // Traveled should start at the origin vertex.
        expect(progress.traveledCoordinates[0]).toEqual(ROUTE[0]);
    });
});

describe("estimateRemainingEtaSec()", () => {
    test("returns 0 for non-positive durations", () => {
        expect(estimateRemainingEtaSec(0, 1)).toBe(0);
        expect(estimateRemainingEtaSec(-10, 1)).toBe(0);
        expect(estimateRemainingEtaSec(NaN, 1)).toBe(0);
    });

    test("scales the route duration by the remaining fraction", () => {
        expect(estimateRemainingEtaSec(600, 1)).toBe(600);
        expect(estimateRemainingEtaSec(600, 0.5)).toBe(300);
        expect(estimateRemainingEtaSec(600, 0)).toBe(0);
    });

    test("decreases as the remaining route fraction decreases", () => {
        const full = estimateRemainingEtaSec(3600, 0.9);
        const half = estimateRemainingEtaSec(3600, 0.45);
        const near = estimateRemainingEtaSec(3600, 0.1);
        expect(full).toBeGreaterThan(half);
        expect(half).toBeGreaterThan(near);
    });

    test("clamps out-of-range fractions", () => {
        expect(estimateRemainingEtaSec(600, 2)).toBe(600);
        expect(estimateRemainingEtaSec(600, -1)).toBe(0);
    });
});

describe("ETA follows route progress (integration)", () => {
    const ROUTE_DURATION_SEC = 3600; // 1 hour traffic-aware duration for the whole route

    test("ETA strictly decreases as the rider advances along the route", () => {
        const positions: LngLat[] = [
            [121.0005, 14.5],
            [121.0015, 14.5],
            [121.0025, 14.5],
            [121.0035, 14.5],
        ];

        const etas = positions.map(position => {
            const progress = getRouteProgress(position, ROUTE, 60)!;
            return estimateRemainingEtaSec(ROUTE_DURATION_SEC, progress.fractionRemaining);
        });

        for (let i = 1; i < etas.length; i++) {
            expect(etas[i]).toBeLessThan(etas[i - 1]);
        }
        // And it should not stay pinned at the original full duration.
        expect(etas[etas.length - 1]).toBeLessThan(ROUTE_DURATION_SEC);
    });

    test("after a reroute from the current position, ETA reflects the new remaining route", () => {
        // Simulate a reroute: the new route starts at the rider's current position and is
        // shorter, with its own (smaller) traffic-aware duration.
        const reroute: LngLat[] = [
            [121.002, 14.5],
            [121.003, 14.5],
            [121.004, 14.5],
        ];
        const rerouteDurationSec = 1200;
        const atStartOfReroute = getRouteProgress([121.002, 14.5], reroute, 60)!;
        const eta = estimateRemainingEtaSec(rerouteDurationSec, atStartOfReroute.fractionRemaining);
        // At the start of the new route the ETA equals its full (remaining) duration,
        // never the original route's duration.
        expect(eta).toBeCloseTo(rerouteDurationSec, -1);
        expect(atStartOfReroute.remainingDistanceM).toBeCloseTo(atStartOfReroute.totalRouteDistanceM, 0);
    });
});

describe("clampFraction()", () => {
    test("clamps into 0..1 and defaults to 1 for invalid input", () => {
        expect(clampFraction(0.5)).toBe(0.5);
        expect(clampFraction(2)).toBe(1);
        expect(clampFraction(-1)).toBe(0);
        expect(clampFraction(undefined)).toBe(1);
        expect(clampFraction(NaN)).toBe(1);
    });
});
