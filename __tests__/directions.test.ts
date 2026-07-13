import {
    formatDistance,
    formatEta,
    geocode,
    getRoute,
} from "../lib/utils/directions";

global.fetch = jest.fn();

// formateEta() testing
describe("formatEta()", () => {

    // 0s = 1m
    test("formats zero seconds as one minute", () => {
        expect(formatEta(0)).toBe("1 min");
    });

    test("formats exactly one minute", () => {
        expect(formatEta(60)).toBe("1 min");
    });

    test("formats five minutes", () => {
        expect(formatEta(300)).toBe("5 min");
    });

    // Boundary: 59m
    test("formats fifty-nine minutes", () => {
        expect(formatEta(3540)).toBe("59 min");
    });

    test("formats exactly one hour", () => {
        expect(formatEta(3600)).toBe("1 h");
    });

    test("formats one hour and five minutes", () => {
        expect(formatEta(3900)).toBe("1 h 5 min");
    });

    test("formats two hours and one minute", () => {
        expect(formatEta(7260)).toBe("2 h 1 min");
    });
});

//formatDistance() testing
describe("formatDistance()", () => {

    test("formats zero meters", () => {
        expect(formatDistance(0)).toBe("0.0 km");
    });

    test("formats exactly one kilometer", () => {
        expect(formatDistance(1000)).toBe("1.0 km");
    });

    test("rounds decimal kilometers correctly", () => {
        expect(formatDistance(1250)).toBe("1.3 km");
    });

    test("formats large distances", () => {
        expect(formatDistance(12345)).toBe("12.3 km");
    });
});

// geocode() testing
describe("geocode()", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns coordinates from a valid response", async () => {
        (fetch as jest.Mock).mockResolvedValue({
            json: async () => ({
                features: [
                    {
                        center: [121.056, 14.603],
                    },
                ],
            }),
        });

        const result = await geocode("BGC");

        expect(result).toEqual([121.056, 14.603]);
    });

    test("returns null for an empty query", async () => {
        const result = await geocode("");

        expect(result).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    test("returns null when no locations are found", async () => {
        (fetch as jest.Mock).mockResolvedValue({
            json: async () => ({
                features: [],
            }),
        });

        const result = await geocode("Unknown Place");

        expect(result).toBeNull();
    });

    test("returns null for an invalid API response", async () => {
        (fetch as jest.Mock).mockResolvedValue({
            json: async () => ({}),
        });

        const result = await geocode("BGC");

        expect(result).toBeNull();
    });

    test("returns null when fetch throws an error", async () => {
        (fetch as jest.Mock).mockRejectedValue(new Error("Network Error"));

        const result = await geocode("BGC");

        expect(result).toBeNull();
    });
});

// getRoute() testing
describe("getRoute()", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns route information from a valid response", async () => {
        (fetch as jest.Mock).mockResolvedValue({
            json: async () => ({
                routes: [
                    {
                        geometry: {
                            coordinates: [
                                [121.0, 14.0],
                                [121.1, 14.1],
                            ],
                        },
                        duration: 180,
                        distance: 2500,
                    },
                ],
            }),
        });

        const result = await getRoute([121, 14], [121.1, 14.1]);

        expect(result).toEqual({
            coordinates: [
                [121.0, 14.0],
                [121.1, 14.1],
            ],
            durationSec: 180,
            distanceM: 2500,
        });
    });

    test("returns null when no routes are returned", async () => {
        (fetch as jest.Mock).mockResolvedValue({
            json: async () => ({
                routes: [],
            }),
        });

        const result = await getRoute([121, 14], [121.1, 14.1]);

        expect(result).toBeNull();
    });

    test("returns null when geometry is missing", async () => {
        (fetch as jest.Mock).mockResolvedValue({
            json: async () => ({
                routes: [
                    {
                        duration: 180,
                        distance: 2500,
                    },
                ],
            }),
        });

        const result = await getRoute([121, 14], [121.1, 14.1]);

        expect(result).toBeNull();
    });

    test("returns null when fetch throws an error", async () => {
        (fetch as jest.Mock).mockRejectedValue(new Error("Network Error"));

        const result = await getRoute([121, 14], [121.1, 14.1]);

        expect(result).toBeNull();
    });
});