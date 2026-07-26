// Imports
import { useCommunityRidesStore } from "../lib/store/useCommunityRidesStore";

import {
    getRideAnnotations,
    getRidePoints,
    getRides,
} from "../lib/firebase-crud/rides";


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
    getRidePoints: jest.fn(),
    getRideAnnotations: jest.fn(),
}));

// Mock references
const mockedGetRides = getRides as jest.Mock;
const mockedGetRidePoints = getRidePoints as jest.Mock;
const mockedGetRideAnnotations = getRideAnnotations as jest.Mock;

// useCommunityRidesStore testing
describe("useCommunityRidesStore", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        useCommunityRidesStore.setState({
            rides: [],
            selectedRide: null,
            selectedRidePoints: null,

            isLoading: false,
            isRefreshing: false,
            isFetchingMore: false,

            error: null,

            pagination: {
                lastDocId: null,
                hasMore: true,
            },
        });
    });

    // #1 clearRides
    test("clearRides clears rides and selected ride", () => {
        useCommunityRidesStore.setState({
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

        useCommunityRidesStore.getState().clearRides();

        expect(useCommunityRidesStore.getState().rides).toEqual([]);
        expect(useCommunityRidesStore.getState().selectedRide).toBeNull();
        expect(useCommunityRidesStore.getState().selectedRidePoints).toBeNull();
    });

    // #2 clearSelectedRide
    test("clearSelectedRide clears selected ride only", () => {
        useCommunityRidesStore.setState({
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

        useCommunityRidesStore.getState().clearSelectedRide();

        expect(useCommunityRidesStore.getState().rides).toHaveLength(1);
        expect(useCommunityRidesStore.getState().selectedRide).toBeNull();
        expect(useCommunityRidesStore.getState().selectedRidePoints).toBeNull();
    });

    // #3 fetchRide
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

        await useCommunityRidesStore.getState().fetchRides();

        expect(mockedGetRides).toHaveBeenCalledWith(
            "user123",
            {
                limit: 5,
                startAfter: undefined,
            },
            true
        );

        expect(useCommunityRidesStore.getState().rides).toHaveLength(2);
        expect(useCommunityRidesStore.getState().pagination.lastDocId).toBe("ride2");
        expect(useCommunityRidesStore.getState().pagination.hasMore).toBe(true);
        expect(useCommunityRidesStore.getState().error).toBeNull();
    });

    // #4
    test("fetchRides refresh replaces existing rides", async () => {
        useCommunityRidesStore.setState({
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

        await useCommunityRidesStore.getState().fetchRides(true);

        expect(mockedGetRides).toHaveBeenCalledWith(
            "user123",
            {
                limit: 5,
                startAfter: null,
            },
            true
        );

        expect(useCommunityRidesStore.getState().rides).toHaveLength(1);
        expect(useCommunityRidesStore.getState().rides[0].id).toBe("newRide");
    });

    // #5
    test("fetchRides without refresh appends rides", async () => {
        useCommunityRidesStore.setState({
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

        await useCommunityRidesStore.getState().fetchRides(false);

        expect(useCommunityRidesStore.getState().rides).toHaveLength(2);
        expect(useCommunityRidesStore.getState().rides[0].id).toBe("ride1");
        expect(useCommunityRidesStore.getState().rides[1].id).toBe("ride2");
        expect(useCommunityRidesStore.getState().pagination.hasMore).toBe(true);
    });

    // #6
    test("fetchRides stores error when fetch fails", async () => {
        mockedGetRides.mockRejectedValue(
            new Error("Firestore failed")
        );

        await useCommunityRidesStore.getState().fetchRides();

        expect(useCommunityRidesStore.getState().error)
            .toBe("Firestore failed");

        expect(useCommunityRidesStore.getState().isLoading).toBe(false);
        expect(useCommunityRidesStore.getState().isRefreshing).toBe(false);
    });

    // #7
    test("fetchRides sets error when user is not authenticated", async () => {
        const firebaseConfig = require("../lib/utils/firebaseConfig");

        firebaseConfig.auth.currentUser = null;

        await useCommunityRidesStore.getState().fetchRides();

        expect(useCommunityRidesStore.getState().error)
            .toBe("User not authenticated");

        firebaseConfig.auth.currentUser = {
            uid: "user123",
        };
    });

    // #8
    test("fetchRides resets loading flags after success", async () => {
        mockedGetRides.mockResolvedValue({
            items: [],
            lastDocId: null,
            hasMore: false,
        });

        await useCommunityRidesStore.getState().fetchRides();

        expect(useCommunityRidesStore.getState().isLoading).toBe(false);
        expect(useCommunityRidesStore.getState().isRefreshing).toBe(false);
    });

    // #9 fetchMoreRides
    test("fetchMoreRides appends next page of rides", async () => {
        useCommunityRidesStore.setState({
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

        await useCommunityRidesStore.getState().fetchMoreRides();

        expect(mockedGetRides).toHaveBeenCalledWith(
            "user123",
            {
                limit: 5,
                startAfter: "ride1",
            },
            true
        );

        expect(useCommunityRidesStore.getState().rides).toHaveLength(2);
        expect(useCommunityRidesStore.getState().rides[1].id).toBe("ride2");
        expect(useCommunityRidesStore.getState().pagination.lastDocId).toBe("ride2");
        expect(useCommunityRidesStore.getState().pagination.hasMore).toBe(true);
    });

    // #10
    test("fetchMoreRides does nothing when hasMore is false", async () => {
        useCommunityRidesStore.setState({
            pagination: {
                lastDocId: "ride1",
                hasMore: false,
            },
        });

        await useCommunityRidesStore.getState().fetchMoreRides();

        expect(mockedGetRides).not.toHaveBeenCalled();
    });

    // #11
    test("fetchMoreRides does nothing while already fetching", async () => {
        useCommunityRidesStore.setState({
            isFetchingMore: true,
            pagination: {
                lastDocId: "ride1",
                hasMore: true,
            },
        });

        await useCommunityRidesStore.getState().fetchMoreRides();

        expect(mockedGetRides).not.toHaveBeenCalled();
    });

    // #12
    test("fetchMoreRides does nothing when lastDocId is null", async () => {
        useCommunityRidesStore.setState({
            pagination: {
                lastDocId: null,
                hasMore: true,
            },
        });

        await useCommunityRidesStore.getState().fetchMoreRides();

        expect(mockedGetRides).not.toHaveBeenCalled();
    });

    // #13
    test("fetchMoreRides stores error when user is not authenticated", async () => {
        const firebaseConfig = require("../lib/utils/firebaseConfig");

        firebaseConfig.auth.currentUser = null;

        useCommunityRidesStore.setState({
            pagination: {
                lastDocId: "ride1",
                hasMore: true,
            },
        });

        await useCommunityRidesStore.getState().fetchMoreRides();

        expect(useCommunityRidesStore.getState().error)
            .toBe("User not authenticated");

        firebaseConfig.auth.currentUser = {
            uid: "user123",
        };
    });

    // #14
    test("fetchMoreRides stores error when Firestore throws", async () => {
        useCommunityRidesStore.setState({
            pagination: {
                lastDocId: "ride1",
                hasMore: true,
            },
        });

        mockedGetRides.mockRejectedValue(
            new Error("Firestore failed")
        );

        await useCommunityRidesStore.getState().fetchMoreRides();

        expect(useCommunityRidesStore.getState().error)
            .toBe("Firestore failed");
    });

    // #15
    test("fetchMoreRides resets fetching flag after success", async () => {
        useCommunityRidesStore.setState({
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

        await useCommunityRidesStore.getState().fetchMoreRides();

        expect(useCommunityRidesStore.getState().isFetchingMore)
            .toBe(false);
    });

    // #16
    test("fetchMoreRides resets fetching flag after error", async () => {
        useCommunityRidesStore.setState({
            pagination: {
                lastDocId: "ride1",
                hasMore: true,
            },
        });

        mockedGetRides.mockRejectedValue(
            new Error("Firestore failed")
        );

        await useCommunityRidesStore.getState().fetchMoreRides();

        expect(useCommunityRidesStore.getState().isFetchingMore)
            .toBe(false);
    });

    // #17 selectRide
    test("selectRide loads points and annotations for existing ride", async () => {
        const ride = {
            id: "ride1",
            rideName: "Morning Ride",
            annotations: [],
        } as any;

        useCommunityRidesStore.setState({
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

        const result = await useCommunityRidesStore.getState().selectRide("ride1");

        expect(mockedGetRidePoints).toHaveBeenCalledWith(
            "user123",
            "ride1"
        );

        expect(mockedGetRideAnnotations).toHaveBeenCalledWith(
            "user123",
            "ride1"
        );

        expect(mockedGetRideAnnotations).toHaveBeenCalled();

        expect(result?.points).toHaveLength(1);

        expect(result?.annotations).toHaveLength(1);
    });

    // #18
    test("selectRide updates ride inside rides array", async () => {
        const ride = {
            id: "ride1",
            rideName: "Morning Ride",
            annotations: [],
        } as any;

        useCommunityRidesStore.setState({
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

        await useCommunityRidesStore.getState().selectRide("ride1");

        expect(useCommunityRidesStore.getState().rides[0].points)
            .toHaveLength(1);

        expect(useCommunityRidesStore.getState().rides[0].annotations)
            .toHaveLength(1);
    });

    // #19
    test("selectRide stores error when ride is not found", async () => {

        await useCommunityRidesStore.getState().selectRide("ride1");

        expect(useCommunityRidesStore.getState().error)
            .toBe("Trip not found");
    });

    // #20
    test("selectRide stores Firestore error", async () => {

        useCommunityRidesStore.setState({
            rides: [
                {
                    id: "ride1",
                    annotations: [],
                } as any,
            ],
        });

        mockedGetRidePoints.mockRejectedValue(
            new Error("Firestore failed")
        );

        await useCommunityRidesStore.getState().selectRide("ride1");

        expect(useCommunityRidesStore.getState().error)
            .toBe("Firestore failed");
    });

    // #21
    test("selectRide stores error when user is not authenticated", async () => {
        const firebaseConfig = require("../lib/utils/firebaseConfig");

        firebaseConfig.auth.currentUser = null;

        await useCommunityRidesStore.getState().selectRide("ride1");

        expect(useCommunityRidesStore.getState().error)
            .toBe("User not authenticated");

        firebaseConfig.auth.currentUser = {
            uid: "user123",
        };
    });

    // #22
    test("selectRide resets loading flag after success", async () => {
        useCommunityRidesStore.setState({
            rides: [
                {
                    id: "ride1",
                    annotations: [],
                } as any,
            ],
        });

        mockedGetRidePoints.mockResolvedValue([]);
        mockedGetRideAnnotations.mockResolvedValue([]);

        await useCommunityRidesStore.getState().selectRide("ride1");

        expect(useCommunityRidesStore.getState().isLoading).toBe(false);
    });

    // #23
    test("selectRide resets loading flag after failure", async () => {
        useCommunityRidesStore.setState({
            rides: [
                {
                    id: "ride1",
                    annotations: [],
                } as any,
            ],
        });

        mockedGetRidePoints.mockRejectedValue(
            new Error("Firestore failed")
        );

        await useCommunityRidesStore.getState().selectRide("ride1");

        expect(useCommunityRidesStore.getState().isLoading).toBe(false);
    });
});
