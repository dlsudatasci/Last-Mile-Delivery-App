// Imports
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

import { saveRide } from "../lib/firebase-crud/rides";

import {
    calculateRemainingDistanceM,
    calculateSpeedFromMovement,
    formatNavigationInstruction,
    getNextDisplayPoints,
    getNextNavigationInstruction,
    haversineDistance,
    sanitizeLocationSpeed,
    simplify,
    smoothSpeed,
    useRideStore,
} from "../lib/store/useRideStore";
import { snapLngLatToRoute } from "../lib/utils/routeSnapping";

// Mocks
jest.mock("../lib/utils/firebaseConfig", () => ({
    auth: {
        currentUser: {
            uid: "user123",
        },
    },
    firestore: {},
    functions: {},
}));

jest.mock("../lib/firebase-crud/rides", () => ({
    saveRide: jest.fn().mockResolvedValue("ride123"),
}));

jest.mock("expo-location", () => ({
    Accuracy: {
        BestForNavigation: 6,
        Balanced: 3,
    },
    hasStartedLocationUpdatesAsync: jest.fn(),
    stopLocationUpdatesAsync: jest.fn(),
    startLocationUpdatesAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
}));

jest.mock(
    "@react-native-async-storage/async-storage",
    () =>
        require(
            "@react-native-async-storage/async-storage/jest/async-storage-mock"
        )
);

// useRideStore testing
describe("useRideStore", () => {
    beforeEach(() => {
        useRideStore.setState({
            isRecording: false,
            isPaused: false,
            startTime: null,
            pausedAt: null,
            pausedDurationMs: 0,

            points: [],
            displayPoints: [],

            duration: 0,

            currentElevation: 0,
            totalElevationGain: 0,
            totalDistance: 0,

            currentSpeed: 0,
            averageSpeed: 0,
            maxSpeed: 0,
            activeRouteSteps: [],
            activeRouteCoordinates: [],
            activeRouteCongestionSegments: [],
            activeRouteDestination: null,
            activeRouteDurationSec: 0,
            activeRouteDistanceM: 0,
            suggestedRouteDurationSec: 0,
            suggestedRouteDistanceM: 0,
            activeRouteUpdatedAt: null,
            routeUpdateStatus: "idle",
            deviationEvents: [],

            annotations: [],
        });
        jest.clearAllMocks();

        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
        (Location.stopLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
        (Location.startLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
    });

    // #1 increaseDuration
    test("increaseDuration increments duration", () => {
        useRideStore.setState({ startTime: Date.now() - 2000 });
        const { increaseDuration } = useRideStore.getState();

        increaseDuration();
        increaseDuration();

        expect(useRideStore.getState().duration).toBe(2);
    });

    test("duration sync starts at zero and follows wall-clock time", () => {
        jest.useFakeTimers();
        jest.setSystemTime(1000);
        useRideStore.setState({ startTime: 1000, duration: 0, pausedDurationMs: 0, pausedAt: null, isPaused: false });

        useRideStore.getState().syncDurationFromClock();
        expect(useRideStore.getState().duration).toBe(0);

        jest.setSystemTime(6500);
        useRideStore.getState().syncDurationFromClock();
        expect(useRideStore.getState().duration).toBe(5);

        jest.useRealTimers();
    });

    test("duration sync excludes paused time", () => {
        jest.useFakeTimers();
        jest.setSystemTime(10000);
        useRideStore.setState({ startTime: 1000, duration: 0, pausedDurationMs: 4000, pausedAt: null, isPaused: false });

        useRideStore.getState().syncDurationFromClock();

        expect(useRideStore.getState().duration).toBe(5);
        jest.useRealTimers();
    });

    // #2 setRecording
    test("setRecording updates recording state", () => {
        const { setRecording } = useRideStore.getState();

        setRecording(true);

        expect(useRideStore.getState().isRecording).toBe(true);

        setRecording(false);

        expect(useRideStore.getState().isRecording).toBe(false);
    });

    // #3 addAnnotation
    test("addAnnotation stores annotation", () => {
        const { addAnnotation } = useRideStore.getState();

        addAnnotation({
            annotationId: "annotation-1",
            type: "point",
            points: [],
        });

        const annotations = useRideStore.getState().annotations;

        expect(annotations).toHaveLength(1);

        expect(annotations[0].annotationId).toBe("annotation-1");

        expect(annotations[0].type).toBe("point");
    });

    // #4
    test("addAnnotation appends multiple annotations", () => {
        const { addAnnotation } = useRideStore.getState();

        addAnnotation({
            annotationId: "annotation-1",
            type: "point",
            points: [],
        });

        addAnnotation({
            annotationId: "annotation-2",
            type: "segment",
            points: [],
        });

        expect(useRideStore.getState().annotations).toHaveLength(2);

        expect(useRideStore.getState().annotations[1].annotationId).toBe(
            "annotation-2"
        );

        expect(useRideStore.getState().annotations[1].type).toBe("segment");
    });

    // #5 addPoint
    test("addPoint adds the first ride point", () => {
        const location = {
            coords: {
                latitude: 1,
                longitude: 2,
                altitude: 10,
            },
            timestamp: 1000,
        } as any;

        const { addPoint } = useRideStore.getState();

        addPoint(location);

        const state = useRideStore.getState();

        expect(state.points).toHaveLength(1);

        expect(state.displayPoints).toHaveLength(1);

        expect(state.totalDistance).toBe(0);

        expect(state.currentSpeed).toBe(0);

        expect(state.maxSpeed).toBe(0);

        expect(state.currentElevation).toBe(10);
    });

    // #6
    test("addPoint calculates distance after second point", () => {
        const { addPoint } = useRideStore.getState();

        addPoint({
            coords: {
                latitude: 1,
                longitude: 2,
                altitude: 10,
            },
            timestamp: 1000,
        } as any);

        addPoint({
            coords: {
                latitude: 1.0001,
                longitude: 2.0001,
                altitude: 15,
            },
            timestamp: 2000,
        } as any);

        const state = useRideStore.getState();

        expect(state.points).toHaveLength(2);

        expect(state.totalDistance).toBeGreaterThan(0);

        expect(state.currentSpeed).toBeGreaterThan(0);

        expect(state.maxSpeed).toBeGreaterThan(0);

        expect(state.totalElevationGain).toBe(5);
    });

    test("addPoint uses valid location speed and clamps unrealistic speed", () => {
        const { addPoint } = useRideStore.getState();

        addPoint({
            coords: {
                latitude: 1,
                longitude: 2,
                altitude: 10,
                speed: 120,
            },
            timestamp: 1000,
        } as any);

        addPoint({
            coords: {
                latitude: 1.0001,
                longitude: 2.0001,
                altitude: 10,
                speed: 120,
            },
            timestamp: 3000,
        } as any);

        expect(useRideStore.getState().currentSpeed).toBeLessThanOrEqual(35);
        expect(useRideStore.getState().currentSpeed).toBeGreaterThan(0);
    });

    test("addPoint keeps speed and distance at zero for stationary GPS jitter", () => {
        const { addPoint } = useRideStore.getState();

        addPoint({
            coords: {
                latitude: 14.0,
                longitude: 121.0,
                altitude: 10,
                speed: 1,
                accuracy: 12,
            },
            timestamp: 1000,
        } as any);

        addPoint({
            coords: {
                latitude: 14.00001,
                longitude: 121.00001,
                altitude: 10,
                speed: 1,
                accuracy: 12,
            },
            timestamp: 3000,
        } as any);

        const state = useRideStore.getState();
        expect(state.currentSpeed).toBe(0);
        expect(state.totalDistance).toBe(0);
    });

    test("addPoint ignores poor accuracy movement for speed and distance", () => {
        const { addPoint } = useRideStore.getState();

        addPoint({
            coords: {
                latitude: 14.0,
                longitude: 121.0,
                altitude: 10,
                speed: 8,
                accuracy: 80,
            },
            timestamp: 1000,
        } as any);

        addPoint({
            coords: {
                latitude: 14.001,
                longitude: 121.001,
                altitude: 10,
                speed: 8,
                accuracy: 80,
            },
            timestamp: 3000,
        } as any);

        const state = useRideStore.getState();
        expect(state.currentSpeed).toBe(0);
        expect(state.totalDistance).toBe(0);
    });

    test("speed helpers sanitize invalid values and smooth changes", () => {
        expect(sanitizeLocationSpeed(-1)).toBeNull();
        expect(sanitizeLocationSpeed(null)).toBeNull();
        expect(sanitizeLocationSpeed(1)).toBeNull();
        expect(sanitizeLocationSpeed(8, 80)).toBeNull();
        expect(sanitizeLocationSpeed(120)).toBe(35);
        expect(calculateSpeedFromMovement(20, 2)).toBe(10);
        expect(calculateSpeedFromMovement(4, 2)).toBe(0);
        expect(calculateSpeedFromMovement(20, 2, 80)).toBe(0);
        expect(calculateSpeedFromMovement(1000, 1)).toBe(35);
        expect(smoothSpeed(10, 20)).toBeCloseTo(15.5);
        expect(smoothSpeed(1.5, 0)).toBe(0);
    });

    test("remaining distance starts from route distance and decreases with traveled distance", () => {
        const remaining = calculateRemainingDistanceM({
            routeDistanceM: 5000,
            traveledDistanceM: 1200,
        });

        expect(remaining).toBe(3800);
    });

    test("remaining distance falls back to destination distance and ignores small GPS increases", () => {
        const destination = {
            coordinate: { latitude: 14.01, longitude: 121.01 },
            timestamp: 1,
        };
        const currentLocation = {
            coordinate: { latitude: 14.0, longitude: 121.0 },
            timestamp: 1,
        };

        const firstRemaining = calculateRemainingDistanceM({
            currentLocation,
            destination,
            traveledDistanceM: 0,
        });
        const noisyRemaining = calculateRemainingDistanceM({
            currentLocation: {
                coordinate: { latitude: 13.99999, longitude: 120.99999 },
                timestamp: 2,
            },
            destination,
            traveledDistanceM: 0,
            previousRemainingM: firstRemaining,
        });

        expect(noisyRemaining).toBe(firstRemaining);
    });

    test("formats and selects the next navigation instruction", () => {
        const steps = [
            {
                instruction: "Turn left onto Taft Avenue",
                maneuverType: "turn",
                maneuverModifier: "left",
                location: [121.001, 14.001] as [number, number],
                distanceM: 250,
            },
            {
                instruction: "Continue straight",
                maneuverType: "continue",
                location: [121.02, 14.02] as [number, number],
                distanceM: 2000,
            },
        ];
        const currentLocation = {
            coordinate: { latitude: 14.0, longitude: 121.0 },
            timestamp: 1,
        };

        expect(formatNavigationInstruction(steps[0], 205)).toBe("Turn left onto Taft Avenue in 210 m");
        expect(getNextNavigationInstruction(currentLocation, steps)?.text).toContain("Turn left");
    });

    // #7 displayPoints
    test("displayPoints follows points while fewer than three points exist", () => {
        const { addPoint } = useRideStore.getState();

        addPoint({
            coords: {
                latitude: 1,
                longitude: 2,
                altitude: 0,
            },
            timestamp: 1,
        } as any);

        addPoint({
            coords: {
                latitude: 1.0001,
                longitude: 2.0001,
                altitude: 0,
            },
            timestamp: 2,
        } as any);

        const state = useRideStore.getState();

        expect(state.displayPoints).toHaveLength(2);

        expect(state.points).toHaveLength(2);
    });

    test("route snapping projects nearby GPS onto the active route", () => {
        const snapped = snapLngLatToRoute(
            [121.005, 14.00012],
            [
                [121.0, 14.0],
                [121.01, 14.0],
            ],
            55
        );

        expect(snapped).not.toBeNull();
        expect(snapped?.coordinate[0]).toBeCloseTo(121.005, 4);
        expect(snapped?.coordinate[1]).toBeCloseTo(14.0, 4);
    });

    test("route snapping rejects GPS points far from the active route", () => {
        const snapped = snapLngLatToRoute(
            [121.005, 14.01],
            [
                [121.0, 14.0],
                [121.01, 14.0],
            ],
            55
        );

        expect(snapped).toBeNull();
    });

    test("addPoint keeps raw GPS but only moves display trace when near the active route", () => {
        useRideStore.setState({
            activeRouteCoordinates: [
                [121.0, 14.0],
                [121.01, 14.0],
            ],
        });
        const { addPoint } = useRideStore.getState();

        addPoint({
            coords: {
                latitude: 14.0001,
                longitude: 121.001,
                altitude: 0,
                accuracy: 10,
            },
            timestamp: 1000,
        } as any);

        addPoint({
            coords: {
                latitude: 14.01,
                longitude: 121.002,
                altitude: 0,
                accuracy: 10,
            },
            timestamp: 3000,
        } as any);

        const state = useRideStore.getState();
        expect(state.points).toHaveLength(2);
        expect(state.displayPoints).toHaveLength(1);
        expect(state.displayPoints[0].coordinate.latitude).toBeCloseTo(14.0, 4);
    });

    test("display trace remains still when a raw GPS point is far off-route", () => {
        const existingDisplayPoint = {
            coordinate: { latitude: 14.0, longitude: 121.001 },
            timestamp: 1,
        };
        const nextDisplayPoints = getNextDisplayPoints({
            rawPoint: {
                coordinate: { latitude: 14.01, longitude: 121.002 },
                timestamp: 2,
            },
            rawPoints: [],
            displayPoints: [existingDisplayPoint],
            routeCoordinates: [
                [121.0, 14.0],
                [121.01, 14.0],
            ],
        });

        expect(nextDisplayPoints).toEqual([existingDisplayPoint]);
    });

    // #8 haverineDistance
    test("haversineDistance returns 0 for identical points", () => {
        const point = {
            coordinate: {
                latitude: 1,
                longitude: 2,
            },
            timestamp: 1,
        };

        expect(haversineDistance(point, point)).toBe(0);
    });

    // #9
    test("haversineDistance returns a positive distance", () => {
        const point1 = {
            coordinate: {
                latitude: 1,
                longitude: 2,
            },
            timestamp: 1,
        };

        const point2 = {
            coordinate: {
                latitude: 1.001,
                longitude: 2.001,
            },
            timestamp: 2,
        };

        expect(haversineDistance(point1, point2)).toBeGreaterThan(0);
    });

    // #10
    test("haversineDistance is symmetric", () => {
        const point1 = {
            coordinate: {
                latitude: 1,
                longitude: 2,
            },
            timestamp: 1,
        };

        const point2 = {
            coordinate: {
                latitude: 1.001,
                longitude: 2.001,
            },
            timestamp: 2,
        };

        expect(haversineDistance(point1, point2)).toBeCloseTo(
            haversineDistance(point2, point1),
            10
        );
    });

    // #11 Simplify
    test("simplify keeps two points unchanged", () => {
        const points = [
            {
                coordinate: {
                    latitude: 1,
                    longitude: 2,
                },
                timestamp: 1,
            },
            {
                coordinate: {
                    latitude: 2,
                    longitude: 3,
                },
                timestamp: 2,
            },
        ];

        expect(simplify(points, 0.00005)).toEqual(points);
    });

    // #12
    test("simplify reduces a straight line to endpoints", () => {
        const points = [
            {
                coordinate: {
                    latitude: 1,
                    longitude: 1,
                },
                timestamp: 1,
            },
            {
                coordinate: {
                    latitude: 2,
                    longitude: 2,
                },
                timestamp: 2,
            },
            {
                coordinate: {
                    latitude: 3,
                    longitude: 3,
                },
                timestamp: 3,
            },
        ];

        const simplified = simplify(points, 0.00005);

        expect(simplified).toHaveLength(2);

        expect(simplified[0]).toEqual(points[0]);

        expect(simplified[1]).toEqual(points[2]);
    });

    // #13 resetRide
    test("resetRide resets all ride state", async () => {
        useRideStore.setState({
            isRecording: true,
            isPaused: true,
            startTime: 123,

            duration: 50,

            currentElevation: 10,
            totalElevationGain: 100,
            totalDistance: 500,

            currentSpeed: 20,
            averageSpeed: 15,
            maxSpeed: 30,

            points: [
                {
                    coordinate: {
                        latitude: 1,
                        longitude: 2,
                    },
                    timestamp: 1,
                },
            ],

            displayPoints: [
                {
                    coordinate: {
                        latitude: 1,
                        longitude: 2,
                    },
                    timestamp: 1,
                },
            ],

            annotations: [
                {
                    annotationId: "a1",
                    type: "point",
                    points: [],
                },
            ],
        });

        await useRideStore.getState().resetRide();

        const state = useRideStore.getState();

        expect(state.isRecording).toBe(false);
        expect(state.isPaused).toBe(false);
        expect(state.startTime).toBeNull();

        expect(state.points).toEqual([]);
        expect(state.displayPoints).toEqual([]);
        expect(state.annotations).toEqual([]);

        expect(state.duration).toBe(0);

        expect(state.totalDistance).toBe(0);
        expect(state.totalElevationGain).toBe(0);

        expect(state.currentSpeed).toBe(0);
        expect(state.averageSpeed).toBe(0);
        expect(state.maxSpeed).toBe(0);
    });

    // #14
    test("resetRide updates AsyncStorage flags", async () => {
        await useRideStore.getState().resetRide();

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            "isRecording",
            "false"
        );

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            "isPaused",
            "false"
        );
    });

    // #15 startRide
    test("startRide starts recording successfully", async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
        (Location.startLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);

        const result = await useRideStore.getState().startRide();

        expect(result).toBe(true);

        const state = useRideStore.getState();

        expect(state.isRecording).toBe(true);
        expect(state.isPaused).toBe(false);
        expect(state.startTime).not.toBeNull();

        expect(Location.startLocationUpdatesAsync).toHaveBeenCalled();
    });

    test("startRide preserves active generated route for recording map", async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
        (Location.startLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);

        useRideStore.getState().setActiveRoute(
            {
                coordinates: [
                    [121.0, 14.0],
                    [121.1, 14.1],
                ],
                durationSec: 900,
                mapboxDurationSec: 900,
                distanceM: 5000,
                congestionSegments: [
                    {
                        coordinates: [
                            [121.0, 14.0],
                            [121.1, 14.1],
                        ],
                        congestion: "heavy",
                        distanceM: 5000,
                    },
                ],
                score: 1,
                trafficDelaySec: 0,
                restrictedRoadExposure: 0,
                congestionSummary: {
                    unknown: { distanceM: 0, count: 0 },
                    low: { distanceM: 0, count: 0 },
                    moderate: { distanceM: 0, count: 0 },
                    heavy: { distanceM: 5000, count: 1 },
                    severe: { distanceM: 0, count: 0 },
                },
                steps: [
                    {
                        instruction: "Turn left",
                        maneuverType: "turn",
                        maneuverModifier: "left",
                        location: [121.0, 14.0],
                        distanceM: 100,
                    },
                ],
            },
            [121.1, 14.1]
        );

        await useRideStore.getState().startRide();

        const state = useRideStore.getState();
        expect(state.activeRouteCoordinates).toHaveLength(2);
        expect(state.activeRouteCongestionSegments[0].congestion).toBe("heavy");
        expect(state.activeRouteDestination).toEqual([121.1, 14.1]);
        expect(state.activeRouteDurationSec).toBe(900);
        expect(state.activeRouteDistanceM).toBe(5000);
        expect(state.suggestedRouteDurationSec).toBe(900);
        expect(state.suggestedRouteDistanceM).toBe(5000);
    });

    test("setActiveRoute preserves original suggested route while recording reroutes", () => {
        useRideStore.setState({
            isRecording: true,
            suggestedRouteDurationSec: 900,
            suggestedRouteDistanceM: 5000,
        });

        useRideStore.getState().setActiveRoute(
            {
                coordinates: [
                    [121.0, 14.0],
                    [121.2, 14.2],
                ],
                durationSec: 1200,
                mapboxDurationSec: 1200,
                distanceM: 7000,
                congestionSegments: [],
                score: 1,
                trafficDelaySec: 0,
                restrictedRoadExposure: 0,
                congestionSummary: {
                    unknown: { distanceM: 0, count: 0 },
                    low: { distanceM: 0, count: 0 },
                    moderate: { distanceM: 0, count: 0 },
                    heavy: { distanceM: 0, count: 0 },
                    severe: { distanceM: 0, count: 0 },
                },
                steps: [],
            },
            [121.2, 14.2]
        );

        const state = useRideStore.getState();
        expect(state.activeRouteDurationSec).toBe(1200);
        expect(state.activeRouteDistanceM).toBe(7000);
        expect(state.suggestedRouteDurationSec).toBe(900);
        expect(state.suggestedRouteDistanceM).toBe(5000);
    });

    // #16
    test("startRide stops existing location updates before starting", async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);

        (Location.stopLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);

        (Location.startLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);

        await useRideStore.getState().startRide();

        expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(
            "location-recording"
        );

        expect(Location.startLocationUpdatesAsync).toHaveBeenCalled();
    });

    // #17
    test("startRide returns false when location updates fail", async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);

        (Location.startLocationUpdatesAsync as jest.Mock).mockRejectedValue(
            new Error("Location failed")
        );

        const result = await useRideStore.getState().startRide();

        expect(result).toBe(false);

        const state = useRideStore.getState();

        expect(state.isRecording).toBe(false);

        expect(state.isPaused).toBe(false);
    });

    // #18 finishRide
    test("finishRide saves ride successfully", async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);

        (saveRide as jest.Mock).mockResolvedValue("ride-123");

        useRideStore.setState({
            startTime: 1000,
            duration: 100,
            totalDistance: 500,
            totalElevationGain: 20,
            averageSpeed: 5,
            maxSpeed: 10,
            points: [
                {
                    coordinate: {
                        latitude: 1,
                        longitude: 2,
                    },
                    timestamp: Date.now(),
                },
            ],
            annotations: [],
        });

        const result = await useRideStore.getState().finishRide();

        expect(result.success).toBe(true);

        expect(result.rideId).toBe("ride-123");

        expect(saveRide).toHaveBeenCalledTimes(1);

        expect(useRideStore.getState().isRecording).toBe(false);

        expect(useRideStore.getState().isPaused).toBe(false);
    });

    // #23 finishRide
    test("finishRide stops active location updates", async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);

        (Location.stopLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);

        (saveRide as jest.Mock).mockResolvedValue("ride-123");

        useRideStore.setState({
            points: [
                {
                    coordinate: {
                        latitude: 1,
                        longitude: 2,
                    },
                    timestamp: Date.now(),
                },
            ],
        });

        await useRideStore.getState().finishRide();

        expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(
            "location-recording"
        );
    });

    // #24
    test("finishRide records current location when there are no ride points", async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);

        (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
            coords: {
                latitude: 10,
                longitude: 20,
                altitude: 5,
            },
            timestamp: 12345,
        });

        (saveRide as jest.Mock).mockResolvedValue("ride-123");

        useRideStore.setState({
            points: [],
        });

        await useRideStore.getState().finishRide();

        expect(Location.getCurrentPositionAsync).toHaveBeenCalled();

        expect(saveRide).toHaveBeenCalled();
    });

    // #25
    test("finishRide returns failure when saveRide throws", async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);

        (saveRide as jest.Mock).mockRejectedValue(
            new Error("Save failed")
        );

        useRideStore.setState({
            points: [
                {
                    coordinate: {
                        latitude: 1,
                        longitude: 2,
                    },
                    timestamp: Date.now(),
                },
            ],
        });

        const result = await useRideStore.getState().finishRide();

        expect(result.success).toBe(false);

        expect(result.error).toBeInstanceOf(Error);
    });

    // #26
    test("finishRide passes correct ride data to saveRide", async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);

        (saveRide as jest.Mock).mockResolvedValue("ride-123");

        useRideStore.setState({
            startTime: 100,
            duration: 60,
            totalDistance: 200,
            totalElevationGain: 15,
            averageSpeed: 4,
            maxSpeed: 8,
            suggestedRouteDistanceM: 1200,
            suggestedRouteDurationSec: 420,
            annotations: [],
            points: [
                {
                    coordinate: {
                        latitude: 1,
                        longitude: 2,
                    },
                    timestamp: 1,
                },
            ],
        });

        await useRideStore.getState().finishRide();

        expect(saveRide).toHaveBeenCalledWith(
            expect.objectContaining({
                distance: 200,
                elevationGain: 15,
                averageSpeed: 4,
                maxSpeed: 8,
                duration: 60,
                suggestedRouteDistanceM: 1200,
                suggestedRouteDurationSec: 420,
                points: expect.any(Array),
                annotations: [],
                rideName: "Metro Manila Trip",
                isPublic: false,
            })
        );
    });

    test("finishRide uses provided trip route title", async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
        (saveRide as jest.Mock).mockResolvedValue("ride-123");

        useRideStore.setState({
            startTime: 100,
            duration: 60,
            totalDistance: 200,
            totalElevationGain: 15,
            averageSpeed: 4,
            maxSpeed: 8,
            annotations: [],
            points: [
                {
                    coordinate: {
                        latitude: 14.56,
                        longitude: 120.99,
                    },
                    timestamp: 1,
                },
            ],
        });

        await useRideStore.getState().finishRide("Manila → Quezon City");

        expect(saveRide).toHaveBeenCalledWith(
            expect.objectContaining({
                rideName: "Manila → Quezon City",
            })
        );
    });
});
