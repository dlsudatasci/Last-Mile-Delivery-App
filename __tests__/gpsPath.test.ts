import { sanitizeRidePoints, shouldRecordRidePoint } from '@/lib/utils/gpsPath';
import type { RidePoint } from '@/lib/store/useRideStore';

const point = (latitude: number, longitude: number, timestamp: number, accuracy?: number): RidePoint => ({
    coordinate: { latitude, longitude },
    timestamp,
    accuracy,
});

describe('GPS path validation', () => {
    test('rejects stale points, poor-accuracy points, and impossible jumps', () => {
        const previous = point(14.6000, 120.9800, 10_000, 10);

        expect(shouldRecordRidePoint(previous, point(14.6001, 120.9801, 9_000, 10))).toBe(false);
        expect(shouldRecordRidePoint(previous, point(14.6001, 120.9801, 12_000, 70))).toBe(false);
        expect(shouldRecordRidePoint(previous, point(14.6500, 121.0300, 12_000, 10))).toBe(false);
    });

    test('orders a historical path without mutating it and removes false branches', () => {
        const first = point(14.6000, 120.9800, 1_000, 10);
        const badJump = point(14.6500, 121.0300, 2_000, 10);
        const second = point(14.6002, 120.9802, 3_000, 10);
        const source = [second, badJump, first];

        expect(sanitizeRidePoints(source)).toEqual([first, second]);
        expect(source).toEqual([second, badJump, first]);
    });
});
