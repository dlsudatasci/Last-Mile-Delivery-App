// Imports
import { useRidesStore } from "../lib/store/useRidesStore";

import {
    deleteRide,
    getRide,
    getRideAnnotations,
    getRidePoints,
    getRides,
    getTotalRideCount,
} from "../lib/firebase-crud/rides";

import { deleteAnnotation } from "../lib/firebase-crud/annotations";

// Mocks
jest.mock("../lib/utils/firebaseConfig", () => ({
    auth: {
        currentUser: {
            uid: "user123",
        },
    },
}));

jest.mock("../lib/firebase-crud/rides", () => ({
    getRides: jest.fn(),
    getRide: jest.fn(),
    getRidePoints: jest.fn(),
    getRideAnnotations: jest.fn(),
    getTotalRideCount: jest.fn(),
    deleteRide: jest.fn(),
}));

jest.mock("../lib/firebase-crud/annotations", () => ({
    deleteAnnotation: jest.fn(),
}));

// Mock References
const mockedGetRides = getRides as jest.Mock;
const mockedGetRide = getRide as jest.Mock;
const mockedGetRidePoints = getRidePoints as jest.Mock;
const mockedGetRideAnnotations = getRideAnnotations as jest.Mock;
const mockedGetTotalRideCount = getTotalRideCount as jest.Mock;
const mockedDeleteRide = deleteRide as jest.Mock;
const mockedDeleteAnnotation = deleteAnnotation as jest.Mock;

// useRidesStore testing
describe("useRidesStore", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();

        useRidesStore.setState({
            rides: [],
            selectedRide: null,
            selectedRidePoints: null,
            totalRideCount: 0,

            isLoading: false,
            isRefreshing: false,
            isFetchingMore: false,

            error: null,

            pagination: {
                lastDocId: null,
                hasMore: true,
            },
        });
        mockedGetTotalRideCount.mockResolvedValue(0);
    });

    // #1 clearRides
    test("clearRides clears rides and selected ride", () => {
        useRidesStore.setState({
            rides: [
                {
                    id: "ride1",
                    rideName: "Morning Ride",
                } as any,
            ],
            selectedRide: {
                id: "ride1",
                rideName: "Morning Ride",
            } as any,
            selectedRidePoints: [
                {
                    coordinate: {
                        latitude: 1,
                        longitude: 1,
                    },
                    timestamp: 1,
                },
            ],
        });

        useRidesStore.getState().clearRides();

        expect(useRidesStore.getState().rides).toEqual([]);
        expect(useRidesStore.getState().selectedRide).toBeNull();
        expect(useRidesStore.getState().selectedRidePoints).toBeNull();
    });

    // #2 clearSelectedRide
    test("clearSelectedRide clears selected ride only", () => {
        useRidesStore.setState({
            rides: [
                {
                    id: "ride1",
                } as any,
            ],
            selectedRide: {
                id: "ride1",
            } as any,
            selectedRidePoints: [
                {
                    coordinate: {
                        latitude: 1,
                        longitude: 1,
                    },
                    timestamp: 1,
                },
            ],
        });

        useRidesStore.getState().clearSelectedRide();

        expect(useRidesStore.getState().rides).toHaveLength(1);
        expect(useRidesStore.getState().selectedRide).toBeNull();
        expect(useRidesStore.getState().selectedRidePoints).toBeNull();
    });

    // #3 updateRideName
    test("updateRideName updates ride name in rides array", () => {
        useRidesStore.setState({
            rides: [
                {
                    id: "ride1",
                    rideName: "Old Ride",
                    annotations: [],
                } as any,
                {
                    id: "ride2",
                    rideName: "Second Ride",
                    annotations: [],
                } as any,
            ],
        });

        useRidesStore.getState().updateRideName("ride1", "Morning Ride");

        expect(useRidesStore.getState().rides[0].rideName).toBe("Morning Ride");
        expect(useRidesStore.getState().rides[1].rideName).toBe("Second Ride");
    });

    // #4
    test("updateRideName updates selectedRide when selected ride matches", () => {
        useRidesStore.setState({
            rides: [
                {
                    id: "ride1",
                    rideName: "Old Ride",
                    annotations: [],
                } as any,
            ],
            selectedRide: {
                id: "ride1",
                rideName: "Old Ride",
                annotations: [],
            } as any,
        });

        useRidesStore.getState().updateRideName("ride1", "Morning Ride");

        expect(useRidesStore.getState().selectedRide?.rideName).toBe(
            "Morning Ride"
        );
    });

    // #5
    test("updateRideName does not update selectedRide when different ride is renamed", () => {
        useRidesStore.setState({
            rides: [
                {
                    id: "ride1",
                    rideName: "Old Ride",
                    annotations: [],
                } as any,
                {
                    id: "ride2",
                    rideName: "Second Ride",
                    annotations: [],
                } as any,
            ],
            selectedRide: {
                id: "ride1",
                rideName: "Old Ride",
                annotations: [],
            } as any,
        });

        useRidesStore.getState().updateRideName("ride2", "Updated Ride");

        expect(useRidesStore.getState().selectedRide?.rideName).toBe("Old Ride");
    });

    // #6 addAnnotation
    test("addAnnotation adds annotation to ride", async () => {
        const ride = {
            id: "ride1",
            rideName: "Morning Ride",
            annotations: [],
        } as any;

        useRidesStore.setState({
            rides: [ride],
        });

        mockedGetRidePoints.mockResolvedValue([]);
        mockedGetRideAnnotations.mockResolvedValue([]);

        const annotation = {
            id: "annotation1",
            rideId: "ride1",
        } as any;

        await useRidesStore.getState().addAnnotation(annotation);

        expect(useRidesStore.getState().rides[0].annotations)
            .toHaveLength(1);

        expect(useRidesStore.getState().rides[0].annotations[0].id)
            .toBe("annotation1");
    });

    // #7 removedAnnotation
    test("removeAnnotation removes annotation from ride", async () => {
        mockedDeleteAnnotation.mockResolvedValue(undefined);

        useRidesStore.setState({
            rides: [
                {
                    id: "ride1",
                    annotations: [
                        {
                            id: "annotation1",
                            rideId: "ride1",
                        },
                    ],
                } as any,
            ],
        });

        const annotation = {
            id: "annotation1",
            rideId: "ride1",
        } as any;

        await useRidesStore.getState().removeAnnotation(annotation);

        expect(mockedDeleteAnnotation).toHaveBeenCalledWith(annotation);

        expect(useRidesStore.getState().rides[0].annotations)
            .toHaveLength(0);
    });

    // #8 removeRide
    test("removeRide removes ride from store", async () => {
        mockedDeleteRide.mockResolvedValue(undefined);

        const ride = {
            id: "ride1",
            rideName: "Morning Ride",
            annotations: [],
        } as any;

        useRidesStore.setState({
            rides: [
                ride,
                {
                    id: "ride2",
                    rideName: "Evening Ride",
                    annotations: [],
                } as any,
            ],
        });

        await useRidesStore.getState().removeRide(ride);

        expect(mockedDeleteRide).toHaveBeenCalledWith(ride);

        expect(useRidesStore.getState().rides).toHaveLength(1);
        expect(useRidesStore.getState().rides[0].id).toBe("ride2");
    });

    // #9 fetchRide
    test("fetchRides loads rides into store", async () => {
        mockedGetRides.mockResolvedValue({
            items: [
                {
                    id: "ride1",
                    rideName: "Morning Ride",
                    annotations: [],
                },
                {
                    id: "ride2",
                    rideName: "Evening Ride",
                    annotations: [],
                },
            ],
            lastDocId: "ride2",
            hasMore: true,
        });

        await useRidesStore.getState().fetchRides();

        expect(mockedGetRides).toHaveBeenCalledWith("user123", {
            limit: 5,
            startAfter: undefined,
        });

        expect(useRidesStore.getState().rides).toHaveLength(2);
        expect(useRidesStore.getState().pagination.lastDocId).toBe("ride2");
        expect(useRidesStore.getState().pagination.hasMore).toBe(true);
        expect(useRidesStore.getState().error).toBeNull();
    });

    // #10
    test("fetchRides refresh replaces existing rides", async () => {
        useRidesStore.setState({
            rides: [
                {
                    id: "oldRide",
                    rideName: "Old Ride",
                    annotations: [],
                } as any,
            ],
        });

        mockedGetRides.mockResolvedValue({
            items: [
                {
                    id: "newRide",
                    rideName: "New Ride",
                    annotations: [],
                },
            ],
            lastDocId: "newRide",
            hasMore: false,
        });

        await useRidesStore.getState().fetchRides(true);

        expect(mockedGetRides).toHaveBeenCalledWith("user123", {
            limit: 5,
            startAfter: null,
        });

        expect(useRidesStore.getState().rides).toHaveLength(1);
        expect(useRidesStore.getState().rides[0].id).toBe("newRide");
    });

    // #11
    test("fetchRides without refresh appends rides", async () => {
        useRidesStore.setState({
            rides: [
                {
                    id: "ride1",
                    rideName: "Ride 1",
                    annotations: [],
                } as any,
            ],
        });

        mockedGetRides.mockResolvedValue({
            items: [
                {
                    id: "ride2",
                    rideName: "Ride 2",
                    annotations: [],
                },
            ],
            lastDocId: "ride2",
            hasMore: true,
        });

        await useRidesStore.getState().fetchRides(false);

        expect(useRidesStore.getState().rides).toHaveLength(2);
        expect(useRidesStore.getState().rides[0].id).toBe("ride1");
        expect(useRidesStore.getState().rides[1].id).toBe("ride2");
    });

    // #12
    test("fetchRides stores error when fetch fails", async () => {
        mockedGetRides.mockRejectedValue(
            new Error("Firestore failed")
        );

        await useRidesStore.getState().fetchRides();

        expect(useRidesStore.getState().error)
            .toBe("Firestore failed");

        expect(useRidesStore.getState().isLoading).toBe(false);
        expect(useRidesStore.getState().isRefreshing).toBe(false);
    });

    // #13
    test("fetchRides sets error when user is not authenticated", async () => {
        const firebaseConfig = require("../lib/utils/firebaseConfig");

        firebaseConfig.auth.currentUser = null;

        await useRidesStore.getState().fetchRides();

        expect(useRidesStore.getState().error)
            .toBe("User not authenticated");

        firebaseConfig.auth.currentUser = {
            uid: "user123",
        };
    });

    // #14
    test("fetchRides resets loading flags after success", async () => {
        mockedGetRides.mockResolvedValue({
            items: [],
            lastDocId: null,
            hasMore: false,
        });

        await useRidesStore.getState().fetchRides();

        expect(useRidesStore.getState().isLoading).toBe(false);
        expect(useRidesStore.getState().isRefreshing).toBe(false);
    });

    // #15 fetchMoreRides
    test("fetchMoreRides appends next page of rides", async () => {
        useRidesStore.setState({
            rides: [
                {
                    id: "ride1",
                    rideName: "Ride 1",
                    annotations: [],
                } as any,
            ],
            pagination: {
                lastDocId: "ride1",
                hasMore: true,
            },
        });

        mockedGetRides.mockResolvedValue({
            items: [
                {
                    id: "ride2",
                    rideName: "Ride 2",
                    annotations: [],
                },
            ],
            lastDocId: "ride2",
            hasMore: true,
        });

        await useRidesStore.getState().fetchMoreRides();

        expect(mockedGetRides).toHaveBeenCalledWith("user123", {
            limit: 5,
            startAfter: "ride1",
        });

        expect(useRidesStore.getState().rides).toHaveLength(2);

        expect(useRidesStore.getState().rides[1].id).toBe("ride2");

        expect(useRidesStore.getState().pagination.lastDocId)
            .toBe("ride2");
    });

    // #16 
    test("fetchMoreRides does nothing when hasMore is false", async () => {
        useRidesStore.setState({
            pagination: {
                lastDocId: "ride1",
                hasMore: false,
            },
        });

        await useRidesStore.getState().fetchMoreRides();

        expect(mockedGetRides).not.toHaveBeenCalled();
    });

    // #17
    test("fetchMoreRides does nothing while already fetching", async () => {
        useRidesStore.setState({
            isFetchingMore: true,
            pagination: {
                lastDocId: "ride1",
                hasMore: true,
            },
        });

        await useRidesStore.getState().fetchMoreRides();

        expect(mockedGetRides).not.toHaveBeenCalled();
    });

    // #18
    test("fetchMoreRides does nothing when lastDocId is null", async () => {
        useRidesStore.setState({
            pagination: {
                lastDocId: null,
                hasMore: true,
            },
        });

        await useRidesStore.getState().fetchMoreRides();

        expect(mockedGetRides).not.toHaveBeenCalled();
    });

    // #19
    test("fetchMoreRides stores error when user is not authenticated", async () => {
        const firebaseConfig = require("../lib/utils/firebaseConfig");

        firebaseConfig.auth.currentUser = null;

        useRidesStore.setState({
            pagination: {
                lastDocId: "ride1",
                hasMore: true,
            },
        });

        await useRidesStore.getState().fetchMoreRides();

        expect(useRidesStore.getState().error)
            .toBe("User not authenticated");

        firebaseConfig.auth.currentUser = {
            uid: "user123",
        };
    });

    // #20
    test("fetchMoreRides stores error when Firestore throws", async () => {
        useRidesStore.setState({
            pagination: {
                lastDocId: "ride1",
                hasMore: true,
            },
        });

        mockedGetRides.mockRejectedValue(
            new Error("Firestore failed")
        );

        await useRidesStore.getState().fetchMoreRides();

        expect(useRidesStore.getState().error)
            .toBe("Firestore failed");
    });

    // #21
    test("fetchMoreRides resets fetching flag after success", async () => {
        useRidesStore.setState({
            pagination: {
                lastDocId: "ride1",
                hasMore: true,
            },
        });

        mockedGetRides.mockResolvedValue({
            items: [],
            lastDocId: null,
            hasMore: false,
        });

        await useRidesStore.getState().fetchMoreRides();

        expect(useRidesStore.getState().isFetchingMore)
            .toBe(false);
    });

    // #22
    test("fetchMoreRides resets fetching flag after error", async () => {
        useRidesStore.setState({
            pagination: {
                lastDocId: "ride1",
                hasMore: true,
            },
        });

        mockedGetRides.mockRejectedValue(
            new Error("Firestore failed")
        );

        await useRidesStore.getState().fetchMoreRides();

        expect(useRidesStore.getState().isFetchingMore)
            .toBe(false);
    });

    // #23 selectRide
    test("selectRide loads points and annotations for existing ride", async () => {
        const ride = {
            id: "ride1",
            rideName: "Morning Ride",
            annotations: [],
        } as any;

        useRidesStore.setState({
            rides: [ride],
        });

        mockedGetRidePoints.mockResolvedValue([
            {
                coordinate: {
                    latitude: 1,
                    longitude: 1,
                },
                timestamp: 1,
            },
        ]);

        mockedGetRideAnnotations.mockResolvedValue([
            {
                id: "annotation1",
            },
        ]);

        const result = await useRidesStore.getState().selectRide("ride1");

        expect(mockedGetRide).not.toHaveBeenCalled();

        expect(mockedGetRidePoints).toHaveBeenCalled();

        expect(mockedGetRideAnnotations).toHaveBeenCalled();

        expect(result?.points).toHaveLength(1);

        expect(result?.annotations).toHaveLength(1);
    });

    // #24
    test("selectRide fetches ride when not already in store", async () => {
        mockedGetRide.mockResolvedValue({
            id: "ride1",
            rideName: "Morning Ride",
            annotations: [],
        });

        mockedGetRidePoints.mockResolvedValue([]);

        mockedGetRideAnnotations.mockResolvedValue([]);

        const ride = await useRidesStore.getState().selectRide("ride1");

        expect(mockedGetRide).toHaveBeenCalledWith(
            "user123",
            "ride1"
        );

        expect(ride?.id).toBe("ride1");
    });

    // #25
    test("selectRide updates ride inside rides array", async () => {
        const ride = {
            id: "ride1",
            rideName: "Morning Ride",
            annotations: [],
        } as any;

        useRidesStore.setState({
            rides: [ride],
        });

        mockedGetRidePoints.mockResolvedValue([
            {
                coordinate: {
                    latitude: 1,
                    longitude: 1,
                },
                timestamp: 1,
            },
        ]);

        mockedGetRideAnnotations.mockResolvedValue([
            {
                id: "annotation1",
            },
        ]);

        await useRidesStore.getState().selectRide("ride1");

        expect(useRidesStore.getState().rides[0].points)
            .toHaveLength(1);

        expect(useRidesStore.getState().rides[0].annotations)
            .toHaveLength(1);
    });

    // #26
    test("selectRide stores error when ride is not found", async () => {
        mockedGetRide.mockResolvedValue(undefined);

        await useRidesStore.getState().selectRide("ride1");

        expect(useRidesStore.getState().error)
            .toBe("Trip not found");
    });

    // #27
    test("selectRide stores Firestore error", async () => {
        mockedGetRide.mockRejectedValue(
            new Error("Firestore failed")
        );

        await useRidesStore.getState().selectRide("ride1");

        expect(useRidesStore.getState().error)
            .toBe("Firestore failed");
    });

    // #28
    test("selectRide stores error when user is not authenticated", async () => {
        const firebaseConfig = require("../lib/utils/firebaseConfig");

        firebaseConfig.auth.currentUser = null;

        await useRidesStore.getState().selectRide("ride1");

        expect(useRidesStore.getState().error)
            .toBe("User not authenticated");

        firebaseConfig.auth.currentUser = {
            uid: "user123",
        };
    });

    // #29
    test("selectRide resets loading flag after success", async () => {
        mockedGetRide.mockResolvedValue({
            id: "ride1",
            annotations: [],
        });

        mockedGetRidePoints.mockResolvedValue([]);

        mockedGetRideAnnotations.mockResolvedValue([]);

        await useRidesStore.getState().selectRide("ride1");

        expect(useRidesStore.getState().isLoading)
            .toBe(false);
    });

    // #30
    test("selectRide resets loading flag after failure", async () => {
        mockedGetRide.mockRejectedValue(
            new Error("Firestore failed")
        );

        await useRidesStore.getState().selectRide("ride1");

        expect(useRidesStore.getState().isLoading)
            .toBe(false);
    });
});
