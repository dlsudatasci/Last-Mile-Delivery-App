import {
    formatDistance,
    formatEta,
    formatSearchDistance,
    geocode,
    rankSearchResults,
    buildCongestionSegments,
    buildRouteSteps,
    chooseRiderFriendlyRoute,
    getRestrictedRoadExposure,
    scoreRiderRoute,
    summarizeRouteCongestion,
    estimateMetroManilaEtaSec,
    getRoute,
    getDistanceToRouteM,
    searchPlaces,
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

describe("formatSearchDistance()", () => {
    test("formats meters below one kilometer", () => {
        expect(formatSearchDistance(850)).toBe("850 m");
    });

    test("formats kilometers at one kilometer and above", () => {
        expect(formatSearchDistance(4200)).toBe("4.2 km");
    });
});

describe("getDistanceToRouteM()", () => {
    test("returns a small distance for a point on the route", () => {
        const route: [number, number][] = [
            [121.0, 14.0],
            [121.01, 14.0],
        ];

        expect(getDistanceToRouteM([121.005, 14.0], route)).toBeLessThan(5);
    });

    test("returns a larger distance for a point away from the route", () => {
        const route: [number, number][] = [
            [121.0, 14.0],
            [121.01, 14.0],
        ];

        expect(getDistanceToRouteM([121.005, 14.002], route)).toBeGreaterThan(100);
    });
});

describe("rankSearchResults()", () => {
    test("prioritizes exact phrase and all-word name matches", () => {
        const results = [
            {
                name: "Torre Central",
                fullAddress: "2 Lorenzo Street, Manila",
                coordinates: [121.0, 14.0] as [number, number],
            },
            {
                name: "2 Torre Lorenzo",
                fullAddress: "Taft Avenue, Malate, Manila",
                coordinates: [121.01, 14.01] as [number, number],
            },
            {
                name: "Lorenzo Place",
                fullAddress: "Torre Street, Makati",
                coordinates: [121.02, 14.02] as [number, number],
            },
        ];

        expect(rankSearchResults("2 torre lorenzo", results)[0].name).toBe("2 Torre Lorenzo");
    });

    test("keeps fallback results when no result contains every typed word", () => {
        const results = [
            {
                name: "Torre Central",
                fullAddress: "Manila",
                coordinates: [121.0, 14.0] as [number, number],
            },
            {
                name: "Lorenzo Place",
                fullAddress: "Makati",
                coordinates: [121.02, 14.02] as [number, number],
            },
        ];

        expect(rankSearchResults("2 torre lorenzo", results)).toHaveLength(2);
    });

    test("ranks a building place above street-only results for 2 torre lorenzo", () => {
        const results = [
            {
                name: "Torre Lorenzo Street",
                fullAddress: "Torre Lorenzo Street, Manila",
                coordinates: [121.0, 14.0] as [number, number],
                featureType: "address",
            },
            {
                name: "2 Torre Lorenzo",
                fullAddress: "2 Torre Lorenzo, Taft Avenue, Malate, Manila",
                coordinates: [121.01, 14.01] as [number, number],
                featureType: "poi",
            },
        ];

        expect(rankSearchResults("2 torre lorenzo", results)[0].name).toBe("2 Torre Lorenzo");
    });

    test("ranks Zinnia Towers above street and address results", () => {
        const results = [
            {
                name: "North Avenue",
                fullAddress: "North Avenue, Quezon City",
                coordinates: [121.0, 14.0] as [number, number],
                featureType: "address",
            },
            {
                name: "Zinnia Towers",
                fullAddress: "Zinnia Towers, North Avenue, Quezon City",
                coordinates: [121.02, 14.04] as [number, number],
                featureType: "poi",
            },
            {
                name: "Zinnia Street",
                fullAddress: "Zinnia Street, Quezon City",
                coordinates: [121.01, 14.03] as [number, number],
                featureType: "address",
            },
        ];

        expect(rankSearchResults("zinnia towers", results)[0].name).toBe("Zinnia Towers");
    });

    test("named establishments beat generic avenues and streets", () => {
        const results = [
            {
                name: "Rizal Avenue",
                fullAddress: "Rizal Avenue, Manila",
                coordinates: [121.0, 14.0] as [number, number],
                featureType: "address",
            },
            {
                name: "Rizal Park Hotel",
                fullAddress: "Rizal Park Hotel, Ermita, Manila",
                coordinates: [120.98, 14.58] as [number, number],
                featureType: "poi",
            },
        ];

        expect(rankSearchResults("rizal park hotel", results)[0].name).toBe("Rizal Park Hotel");
    });

    test("does not rank generic Taft Avenue streets above a specific building place", () => {
        const results = [
            {
                name: "Taft Avenue",
                fullAddress: "Taft Avenue, Manila",
                coordinates: [121.0, 14.0] as [number, number],
                featureType: "address",
            },
            {
                name: "2 Torre Lorenzo",
                fullAddress: "2 Torre Lorenzo, Taft Avenue, Malate, Manila",
                coordinates: [121.01, 14.01] as [number, number],
                featureType: "poi",
            },
        ];

        expect(rankSearchResults("2 torre lorenzo taft avenue", results)[0].name).toBe("2 Torre Lorenzo");
    });
});

describe("searchPlaces()", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("requests POIs and addresses, then ranks the building result first", async () => {
        (fetch as jest.Mock)
            .mockResolvedValueOnce({
                json: async () => ({
                    suggestions: [],
                }),
            })
            .mockResolvedValueOnce({
                json: async () => ({
                    features: [
                        {
                            text: "Taft Avenue",
                            place_name: "Taft Avenue, Manila",
                            center: [121.0, 14.0],
                            place_type: ["address"],
                        },
                    ],
                }),
            })
            .mockResolvedValueOnce({
                json: async () => ({
                    features: [
                        {
                            text: "2 Torre Lorenzo",
                            place_name: "2 Torre Lorenzo, Taft Avenue, Malate, Manila",
                            center: [121.01, 14.01],
                            place_type: ["poi"],
                        },
                    ],
                }),
            });

        const results = await searchPlaces("2 torre lorenzo taft avenue", [121, 14]);

        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/search/searchbox/v1/suggest"));
        expect(fetch).toHaveBeenCalledTimes(3);
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("types=poi,address,place,locality,neighborhood"));
        expect(results[0].name).toBe("2 Torre Lorenzo");
        expect(results[0].distanceM).toBeDefined();
    });

    test("uses Search Box suggestions and retrieve results before geocoding fallback", async () => {
        (fetch as jest.Mock)
            .mockResolvedValueOnce({
                json: async () => ({
                    suggestions: [{ name: "Zinnia Towers", mapbox_id: "poi.123" }],
                }),
            })
            .mockResolvedValueOnce({
                json: async () => ({
                    features: [
                        {
                            properties: {
                                name: "Zinnia Towers",
                                full_address: "Zinnia Towers, North Avenue, Quezon City",
                                feature_type: "poi",
                            },
                            geometry: { coordinates: [121.02, 14.04] },
                        },
                    ],
                }),
            })
            .mockResolvedValue({
                json: async () => ({
                    features: [
                        {
                            text: "Zinnia Street",
                            place_name: "Zinnia Street, Quezon City",
                            center: [121.0, 14.0],
                            place_type: ["address"],
                        },
                    ],
                }),
            });

        const results = await searchPlaces("zinnia towers", [121, 14]);

        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/search/searchbox/v1/retrieve/poi.123"));
        expect(results[0].name).toBe("Zinnia Towers");
        expect(results[0].source).toBe("searchbox");
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
        jest.useFakeTimers().setSystemTime(new Date("2026-07-17T10:00:00+08:00"));
    });

    afterEach(() => {
        jest.useRealTimers();
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

        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/directions/v5/mapbox/driving-traffic/"));
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("alternatives=true"));
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("annotations=congestion,congestion_numeric,duration,distance"));
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("overview=full"));
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("depart_at=now"));
        expect(result).toEqual({
            coordinates: [
                [121.0, 14.0],
                [121.1, 14.1],
            ],
            durationSec: 900,
            mapboxDurationSec: 180,
            distanceM: 2500,
            congestionSegments: [],
            score: 3.85,
            trafficDelaySec: 0,
            typicalDurationSec: undefined,
            restrictedRoadExposure: 0,
            congestionSummary: {
                unknown: { distanceM: 0, count: 0 },
                low: { distanceM: 0, count: 0 },
                moderate: { distanceM: 0, count: 0 },
                heavy: { distanceM: 0, count: 0 },
                severe: { distanceM: 0, count: 0 },
            },
            steps: [],
        });
    });

    test("uses lower ETA as a tie-breaker when balanced route scores are close", async () => {
        (fetch as jest.Mock).mockResolvedValue({
            json: async () => ({
                routes: [
                    {
                        geometry: {
                            coordinates: [
                                [121.0, 14.0],
                                [121.2, 14.2],
                            ],
                        },
                        duration: 305,
                        distance: 4900,
                    },
                    {
                        geometry: {
                            coordinates: [
                                [121.0, 14.0],
                                [121.1, 14.1],
                            ],
                        },
                        duration: 300,
                        distance: 5000,
                    },
                ],
            }),
        });

        const result = await getRoute([121, 14], [121.1, 14.1]);

        expect(result?.durationSec).toBe(1800);
        expect(result?.mapboxDurationSec).toBe(300);
        expect(result?.distanceM).toBe(5000);
    });

    test("chooses a rider-friendly route over a faster Skyway or SLEX route", async () => {
        (fetch as jest.Mock).mockResolvedValue({
            json: async () => ({
                routes: [
                    {
                        geometry: { coordinates: [[121.0, 14.0], [121.2, 14.2]] },
                        duration: 300,
                        distance: 9000,
                        legs: [{ steps: [{ name: "Metro Manila Skyway" }] }],
                    },
                    {
                        geometry: { coordinates: [[121.0, 14.0], [121.1, 14.1]] },
                        duration: 420,
                        distance: 7000,
                        legs: [{ steps: [{ name: "Osmena Highway" }, { name: "Buendia Avenue" }] }],
                    },
                ],
            }),
        });

        const result = await getRoute([121, 14], [121.1, 14.1]);

        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("exclude=motorway,toll"));
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("steps=true"));
        expect(result?.durationSec).toBe(2520);
        expect(result?.mapboxDurationSec).toBe(420);
        expect(result?.distanceM).toBe(7000);
    });

    test("chooses the least restricted route when every alternative uses restricted roads", () => {
        const best = chooseRiderFriendlyRoute([
            {
                id: "more-restricted",
                geometry: { coordinates: [[121.0, 14.0], [121.2, 14.2]] },
                duration: 300,
                legs: [{ steps: [{ name: "SLEX" }, { name: "Metro Manila Skyway" }] }],
            },
            {
                id: "least-restricted",
                geometry: { coordinates: [[121.0, 14.0], [121.1, 14.1]] },
                duration: 420,
                legs: [{ steps: [{ name: "South Luzon Expressway" }] }],
            },
        ]);

        expect(best?.id).toBe("least-restricted");
        expect(getRestrictedRoadExposure(best)).toBe(1);
    });

    test("lets a longer smoother route beat a short route with severe traffic", () => {
        const best = chooseRiderFriendlyRoute([
            {
                id: "short-severe",
                geometry: { coordinates: [[121.0, 14.0], [121.01, 14.01], [121.02, 14.02]] },
                duration: 900,
                duration_typical: 420,
                distance: 3000,
                legs: [{ annotation: { congestion: ["severe", "severe"], distance: [1500, 1500] }, steps: [{ name: "Local Road" }] }],
            },
            {
                id: "longer-smooth",
                geometry: { coordinates: [[121.0, 14.0], [121.05, 14.05], [121.1, 14.1]] },
                duration: 780,
                duration_typical: 720,
                distance: 7000,
                legs: [{ annotation: { congestion: ["low", "low"], distance: [3500, 3500] }, steps: [{ name: "Surface Road" }] }],
            },
        ]);

        expect(best?.id).toBe("longer-smooth");
    });

    test("lets live traffic ETA beat a shorter but much slower route", () => {
        const best = chooseRiderFriendlyRoute([
            {
                id: "short-slow-traffic",
                geometry: { coordinates: [[121.0, 14.0], [121.01, 14.01]] },
                duration: 3600,
                duration_typical: 1800,
                distance: 4000,
                legs: [{ annotation: { congestion: ["heavy"], distance: [4000] }, steps: [{ name: "Taft Avenue" }] }],
            },
            {
                id: "longer-faster-current-traffic",
                geometry: { coordinates: [[121.0, 14.0], [121.05, 14.05]] },
                duration: 2400,
                duration_typical: 2100,
                distance: 7000,
                legs: [{ annotation: { congestion: ["moderate"], distance: [7000] }, steps: [{ name: "Local Road" }] }],
            },
        ]);

        expect(best?.id).toBe("longer-faster-current-traffic");
    });

    test("lets a short route with moderate moving traffic beat a longer route", () => {
        const best = chooseRiderFriendlyRoute([
            {
                id: "short-moderate",
                geometry: { coordinates: [[121.0, 14.0], [121.01, 14.01]] },
                duration: 540,
                duration_typical: 480,
                distance: 3000,
                legs: [{ annotation: { congestion: ["moderate"], distance: [3000] }, steps: [{ name: "City Street" }] }],
            },
            {
                id: "long-low",
                geometry: { coordinates: [[121.0, 14.0], [121.1, 14.1]] },
                duration: 600,
                duration_typical: 570,
                distance: 7000,
                legs: [{ annotation: { congestion: ["low"], distance: [7000] }, steps: [{ name: "Long Road" }] }],
            },
        ]);

        expect(best?.id).toBe("short-moderate");
    });

    test("applies a very large restricted-road penalty", () => {
        const restrictedScore = scoreRiderRoute({
            geometry: { coordinates: [[121.0, 14.0], [121.01, 14.01]] },
            duration: 300,
            distance: 2000,
            legs: [{ steps: [{ name: "SLEX" }] }],
        });
        const cleanScore = scoreRiderRoute({
            geometry: { coordinates: [[121.0, 14.0], [121.1, 14.1]] },
            duration: 900,
            distance: 12000,
            legs: [{ steps: [{ name: "Local Road" }] }],
        });

        expect(restrictedScore.score - cleanScore.score).toBeGreaterThan(9000);
    });

    test("summarizes congestion with annotation distances when available", () => {
        const summary = summarizeRouteCongestion({
            geometry: {
                coordinates: [
                    [121.0, 14.0],
                    [121.01, 14.01],
                    [121.02, 14.02],
                    [121.03, 14.03],
                ],
            },
            legs: [{ annotation: { congestion: ["moderate", "heavy", "severe"], distance: [1000, 2000, 3000] } }],
        });

        expect(summary.moderate).toEqual({ distanceM: 1000, count: 1 });
        expect(summary.heavy).toEqual({ distanceM: 2000, count: 1 });
        expect(summary.severe).toEqual({ distanceM: 3000, count: 1 });
    });

    test("requests and parses route congestion annotations", async () => {
        (fetch as jest.Mock).mockResolvedValue({
            json: async () => ({
                routes: [
                    {
                        geometry: {
                            coordinates: [
                                [121.0, 14.0],
                                [121.05, 14.05],
                                [121.1, 14.1],
                            ],
                        },
                        duration: 420,
                        duration_typical: 300,
                        distance: 2500,
                        legs: [
                            {
                                annotation: {
                                    congestion: ["low", "severe"],
                                },
                                steps: [
                                    {
                                        distance: 350,
                                        name: "Taft Avenue",
                                        maneuver: {
                                            type: "turn",
                                            modifier: "left",
                                            instruction: "Turn left onto Taft Avenue",
                                            location: [121.05, 14.05],
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }),
        });

        const result = await getRoute([121, 14], [121.1, 14.1]);

        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("annotations=congestion,congestion_numeric,duration,distance"));
        expect(result?.durationSec).toBe(1140);
        expect(result?.mapboxDurationSec).toBe(420);
        expect(result?.typicalDurationSec).toBe(300);
        expect(result?.congestionSegments).toEqual([
            { coordinates: [[121.0, 14.0], [121.05, 14.05]], congestion: "low", distanceM: expect.any(Number) },
            { coordinates: [[121.05, 14.05], [121.1, 14.1]], congestion: "severe", distanceM: expect.any(Number) },
        ]);
        expect(result?.trafficDelaySec).toBe(120);
        expect(result?.congestionSummary.severe.count).toBe(1);
        expect(result?.steps).toEqual([
            {
                instruction: "Turn left onto Taft Avenue",
                maneuverType: "turn",
                maneuverModifier: "left",
                location: [121.05, 14.05],
                distanceM: 350,
            },
        ]);
    });

    test("uses traffic-aware duration for ETA instead of typical duration", async () => {
        (fetch as jest.Mock).mockResolvedValue({
            json: async () => ({
                routes: [
                    {
                        geometry: { coordinates: [[121.0, 14.0], [121.1, 14.1]] },
                        duration: 3600,
                        duration_typical: 1800,
                        distance: 5000,
                        legs: [{ annotation: { congestion: ["heavy"], distance: [5000] } }],
                    },
                ],
            }),
        });

        const result = await getRoute([121, 14], [121.1, 14.1]);

        expect(result?.durationSec).toBe(3600);
        expect(result?.mapboxDurationSec).toBe(3600);
        expect(result?.typicalDurationSec).toBe(1800);
        expect(result?.trafficDelaySec).toBe(1800);
    });

    test("calibrates unrealistically fast Metro Manila ETA upward during peak traffic", () => {
        expect(
            estimateMetroManilaEtaSec({
                duration: 1980,
                distance: 9000,
                geometry: { coordinates: [[121.0, 14.0], [121.1, 14.1]] },
                legs: [{ annotation: { congestion: [], distance: [] } }],
            })
        ).toBe(3240);
    });

    test("preserves moderate, heavy, and severe congestion from numeric annotations", () => {
        const segments = buildCongestionSegments({
            geometry: {
                coordinates: [
                    [121.0, 14.0],
                    [121.01, 14.01],
                    [121.02, 14.02],
                    [121.03, 14.03],
                ],
            },
            legs: [{ annotation: { congestion_numeric: [35, 65, 90], distance: [1000, 2000, 3000] } }],
        });

        expect(segments.map(segment => segment.congestion)).toEqual(["moderate", "heavy", "severe"]);
        expect(segments.map(segment => segment.distanceM)).toEqual([1000, 2000, 3000]);
    });

    test("retries without depart_at when Mapbox rejects that parameter", async () => {
        (fetch as jest.Mock)
            .mockResolvedValueOnce({
                json: async () => ({
                    message: "depart_at is not supported for this request",
                    routes: [],
                }),
            })
            .mockResolvedValueOnce({
                json: async () => ({
                    routes: [
                        {
                            geometry: { coordinates: [[121.0, 14.0], [121.1, 14.1]] },
                            duration: 600,
                            distance: 2000,
                        },
                    ],
                }),
            });

        const result = await getRoute([121, 14], [121.1, 14.1]);

        expect(fetch).toHaveBeenNthCalledWith(1, expect.stringContaining("depart_at=now"));
        expect(fetch).toHaveBeenNthCalledWith(2, expect.not.stringContaining("depart_at=now"));
        expect(result?.durationSec).toBe(720);
        expect(result?.mapboxDurationSec).toBe(600);
    });

    test("buildRouteSteps maps maneuver data and falls back to continue instructions", () => {
        expect(
            buildRouteSteps({
                legs: [
                    {
                        steps: [
                            {
                                distance: 500,
                                name: "Rizal Avenue",
                                maneuver: {
                                    type: "continue",
                                    location: [121.0, 14.0],
                                },
                            },
                        ],
                    },
                ],
            })
        ).toEqual([
            {
                instruction: "Continue on Rizal Avenue",
                maneuverType: "continue",
                maneuverModifier: undefined,
                location: [121.0, 14.0],
                distanceM: 500,
            },
        ]);
    });

    test("buildCongestionSegments gracefully falls back without annotations", () => {
        expect(
            buildCongestionSegments({
                geometry: {
                    coordinates: [
                        [121.0, 14.0],
                        [121.1, 14.1],
                    ],
                },
                legs: [],
            })
        ).toEqual([]);
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
