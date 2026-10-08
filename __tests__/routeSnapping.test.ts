// Imports
import {
    distanceBetweenLngLatM,
    snapLngLatToRoute,
} from "../lib/utils/routeSnapping";

// distanceBetweenLngLatM() testing
describe("distanceBetweenLngLatM()", () => {
    test("returns 0 for the same coordinates", () => {
        expect(
            distanceBetweenLngLatM(
                [121.0, 14.6],
                [121.0, 14.6]
            )
        ).toBe(0);
    });

    test("calculates the distance between two coordinates", () => {
        const distance = distanceBetweenLngLatM(
            [121.0, 14.6],
            [121.001, 14.6]
        );

        expect(distance).toBeGreaterThan(100);
        expect(distance).toBeLessThan(120);
    });

    test("calculates distance symmetrically", () => {
        const first = distanceBetweenLngLatM(
            [121.0, 14.6],
            [121.001, 14.6]
        );

        const second = distanceBetweenLngLatM(
            [121.001, 14.6],
            [121.0, 14.6]
        );

        expect(first).toBeCloseTo(second);
    });
});

// snapLngLatToRoute() testing
describe("snapLngLatToRoute()", () => {
    test("returns null when the route has no coordinates", () => {
        expect(
            snapLngLatToRoute(
                [121.0, 14.6],
                [],
                100
            )
        ).toBeNull();
    });

    test("snaps to a single route coordinate when within the maximum distance", () => {
        const result = snapLngLatToRoute(
            [121.0001, 14.6],
            [[121.0, 14.6]],
            100
        );

        expect(result).not.toBeNull();
        expect(result?.coordinate).toEqual([121.0, 14.6]);
        expect(result?.segmentIndex).toBe(0);
        expect(result?.distanceM).toBeLessThan(100);
    });

    test("returns null for a single route coordinate outside the maximum distance", () => {
        expect(
            snapLngLatToRoute(
                [121.01, 14.6],
                [[121.0, 14.6]],
                100
            )
        ).toBeNull();
    });

    test("snaps a point to the nearest route segment", () => {
        const result = snapLngLatToRoute(
            [121.001, 14.6],
            [
                [121.0, 14.6],
                [121.002, 14.6],
            ],
            200
        );

        expect(result).not.toBeNull();
        expect(result?.segmentIndex).toBe(0);
        expect(result?.coordinate[0]).toBeCloseTo(121.001, 5);
        expect(result?.coordinate[1]).toBeCloseTo(14.6, 5);
        expect(result?.distanceM).toBeCloseTo(0, 5);
    });

    test("clamps the snapped point to the start of a segment", () => {
        const result = snapLngLatToRoute(
            [120.999, 14.6],
            [
                [121.0, 14.6],
                [121.002, 14.6],
            ],
            200
        );

        expect(result).not.toBeNull();
        expect(result?.coordinate[0]).toBeCloseTo(121.0, 5);
        expect(result?.coordinate[1]).toBeCloseTo(14.6, 5);
    });

    test("clamps the snapped point to the end of a segment", () => {
        const result = snapLngLatToRoute(
            [121.003, 14.6],
            [
                [121.0, 14.6],
                [121.002, 14.6],
            ],
            200
        );

        expect(result).not.toBeNull();
        expect(result?.coordinate[0]).toBeCloseTo(121.002, 5);
        expect(result?.coordinate[1]).toBeCloseTo(14.6, 5);
    });

    test("returns null when the nearest route point is beyond the maximum distance", () => {
        expect(
            snapLngLatToRoute(
                [121.01, 14.6],
                [
                    [121.0, 14.6],
                    [121.002, 14.6],
                ],
                100
            )
        ).toBeNull();
    });

    test("handles a zero-length route segment", () => {
        const result = snapLngLatToRoute(
            [121.001, 14.6],
            [
                [121.0, 14.6],
                [121.0, 14.6],
            ],
            200
        );

        expect(result).not.toBeNull();
        expect(result?.coordinate).toEqual([121.0, 14.6]);
        expect(result?.segmentIndex).toBe(0);
    });

    test("selects the nearest segment when the route has multiple segments", () => {
        const result = snapLngLatToRoute(
            [121.003, 14.6],
            [
                [121.0, 14.6],
                [121.001, 14.6],
                [121.004, 14.6],
            ],
            200
        );

        expect(result).not.toBeNull();
        expect(result?.segmentIndex).toBe(1);
        expect(result?.coordinate[0]).toBeCloseTo(121.003, 5);
    });
});