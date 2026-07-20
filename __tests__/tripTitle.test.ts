import { buildTripRouteTitle } from '../lib/utils/tripTitle';

describe('buildTripRouteTitle', () => {
    test('uses inferred origin and destination cities from coordinates and label', () => {
        expect(
            buildTripRouteTitle({
                origin: { latitude: 14.5647, longitude: 120.9939 },
                destination: { latitude: 14.6281, longitude: 121.0437 },
                destinationLabel: 'Zinnia Towers',
            })
        ).toBe('Manila → Quezon City');
    });

    test('does not expose Current Location fallback text', () => {
        expect(
            buildTripRouteTitle({
                destinationLabel: 'Zinnia Towers',
            })
        ).toBe('Metro Manila → Quezon City');
    });
});
