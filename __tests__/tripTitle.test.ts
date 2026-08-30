import {
    buildTripRouteTitle,
    inferMetroManilaCityFromPoint,
    inferMetroManilaCityFromText,
} from "../lib/utils/tripTitle";

// buildTripRouteTitle() testing
describe("buildTripRouteTitle", () => {
    test("uses inferred origin and destination cities from coordinates and label", () => {
        expect(
            buildTripRouteTitle({
                origin: { latitude: 14.5647, longitude: 120.9939 },
                destination: { latitude: 14.6281, longitude: 121.0437 },
                destinationLabel: 'Zinnia Towers',
            })
        ).toBe('Manila → Quezon City');
    });

    test("does not expose Current Location fallback text", () => {
        expect(
            buildTripRouteTitle({
                destinationLabel: 'Zinnia Towers',
            })
        ).toBe('Metro Manila → Quezon City');
    });

    test("prefers destination label over destination coordinates", () => {
        expect(
            buildTripRouteTitle({
                origin: { latitude: 14.5647, longitude: 120.9939 },
                destination: { latitude: 14.6281, longitude: 121.0437 },
                destinationLabel: 'BGC',
            })
        ).toBe('Manila → Taguig');
    });

    test("uses the destination label when no city can be inferred", () => {
        expect(
            buildTripRouteTitle({
                destinationLabel: 'Some Unknown Place',
            })
        ).toBe('Metro Manila → Some Unknown Place');
    });

    test("returns the default title when no route information is available", () => {
        expect(
            buildTripRouteTitle({})
        ).toBe('Metro Manila Trip');
    });
});

// inferMetroManilaCityFromPoint() testing
describe("inferMetroManilaCityFromPoint", () => {
    test("infers a city from coordinates", () => {
        expect(
            inferMetroManilaCityFromPoint({ 
                latitude: 14.5647, 
                longitude: 120.9939 
            })
        ).toBe('Manila');
    });

    test("return null when coordinates are outside knowncity bounds", () => {
        expect(
            inferMetroManilaCityFromPoint({
                latitude: 15.0,
                longitude: 121.0,
            })
        ).toBeNull();
    });

    test("return null when no points are provided", () => {
        expect(inferMetroManilaCityFromPoint()).toBeNull();
        expect(inferMetroManilaCityFromPoint(null)).toBeNull();
    });
    
    test("infers a city when coordinates are exactly on the city boundary", () => {
        expect(
            inferMetroManilaCityFromPoint({
                latitude: 14.55,
                longitude: 120.94,
            })
        ).toBe('Manila');
    });
});

// inferMetroManilaCityFromText() testing
describe("inferMetroManilaCityFromText", () => {
    test("infers a city from text", () => {
        expect(
            inferMetroManilaCityFromText('Manila')
        ).toBe('Manila');
    });

    test("infers Taguig from BGC", () => {
        expect(
            inferMetroManilaCityFromText('BGC')
        ).toBe('Taguig');
    });

    test("return null when text does not match any known city", () => {
        expect(
            inferMetroManilaCityFromText('Unknown City')
        ).toBeNull();
    });

    test("returns null when text is empty or only whitespace", () => {
        expect(inferMetroManilaCityFromText()).toBeNull();
        expect(inferMetroManilaCityFromText(null)).toBeNull();
        expect(inferMetroManilaCityFromText('')).toBeNull();
        expect(inferMetroManilaCityFromText('   ')).toBeNull();
    });
});