// Imports
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

import { saveRide } from "../lib/firebase-crud/rides";

import {
    haversineDistance,
    simplify,
    useRideStore,
} from "../lib/store/useRideStore";

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

            points: [],
            displayPoints: [],

            duration: 0,

            currentElevation: 0,
            totalElevationGain: 0,
            totalDistance: 0,

            currentSpeed: 0,
            averageSpeed: 0,
            maxSpeed: 0,

            annotations: [],
        });
        jest.clearAllMocks();

        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
        (Location.stopLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
        (Location.startLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
    });

    // #1 increaseDuration
    test("increaseDuration increments duration", () => {
        const { increaseDuration } = useRideStore.getState();

        increaseDuration();
        increaseDuration();

        expect(useRideStore.getState().duration).toBe(2);
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

    // #18 pauseRide 
    test("pauseRide pauses an active ride", async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);
        (Location.stopLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);

        const result = await useRideStore.getState().pauseRide();

        expect(result).toBe(true);

        expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(
            "location-recording"
        );

        expect(useRideStore.getState().isPaused).toBe(true);
    });

    // #19 
    test("pauseRide returns false when stopping location updates fails", async () => {
        (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockRejectedValue(
            new Error("Failed")
        );

        const result = await useRideStore.getState().pauseRide();

        expect(result).toBe(false);

        expect(useRideStore.getState().isPaused).toBe(false);
    });

    // #20 resumeRide
    test("resumeRide resumes location tracking", async () => {
        (Location.startLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);

        const result = await useRideStore.getState().resumeRide();

        expect(result).toBe(true);

        expect(Location.startLocationUpdatesAsync).toHaveBeenCalled();

        expect(useRideStore.getState().isPaused).toBe(false);
    });

    // #21
    test("resumeRide returns false when location updates fail", async () => {
        (Location.startLocationUpdatesAsync as jest.Mock).mockRejectedValue(
            new Error("Resume failed")
        );

        const result = await useRideStore.getState().resumeRide();

        expect(result).toBe(false);

        expect(useRideStore.getState().isPaused).toBe(true);
    });

    // #22 finishRide 
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
                points: expect.any(Array),
                annotations: [],
                rideName: "New Delivery Trip",
                isPublic: false,
            })
        );
    });
});