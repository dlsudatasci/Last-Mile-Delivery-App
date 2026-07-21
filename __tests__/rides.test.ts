// Imports
import {
    deleteRide,
    getLongestRide,
    getMonthlyDistanceAndCount,
    getRide,
    getRideAnnotations,
    getRidePoints,
    getRides,
    getTotalDistanceAndCountAndAverageSpeedAndElevation,
    getTotalRideCount,
    getWeeklyRideCount,
    saveRide,
    updateRideName,
    updateVisibilitySettings,
} from "../lib/firebase-crud/rides";

import {
    collection,
    doc,
    getAggregateFromServer,
    getCountFromServer,
    getDoc,
    getDocs,
    limit,
    orderBy,
    startAfter,
    updateDoc,
    where,
} from "@react-native-firebase/firestore";

import { getAuth } from "@react-native-firebase/auth";
import { deleteObject } from "@react-native-firebase/storage";

// Mocks
jest.mock("../lib/utils/firebaseConfig", () => ({
    firestore: {},
}));

const baseRide = {
    rideName: "Morning Ride",
    startTime: 1,
    endTime: 2,
    duration: 1,
    distance: 10,
    averageSpeed: 25,
    maxSpeed: 40,
    elevationGain: 100,

    isPublic: true,

    points: [
        {
            latitude: 1,
            longitude: 2,
        },
    ],

    annotations: [],
};

// getRides() testing
describe("getRides()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (collection as jest.Mock).mockReturnValue("rides");

        (where as jest.Mock).mockReturnValue("where");

        (orderBy as jest.Mock).mockReturnValue("orderBy");

        (limit as jest.Mock).mockReturnValue("limit");
    });

    test("returns paginated rides", async () => {
        (getDocs as jest.Mock).mockResolvedValue({
            docs: [
                {
                    id: "ride1",
                    data: () => ({
                        rideName: "Morning Ride",
                    }),
                },
                {
                    id: "ride2",
                    data: () => ({
                        rideName: "Evening Ride",
                    }),
                },
            ],
        });

        const result = await getRides("user123", {
            limit: 2,
        });

        expect(result.items).toHaveLength(2);

        expect(result.lastDocId).toBe("ride2");

        expect(result.hasMore).toBe(true);
    });

    test("returns empty list", async () => {
        (getDocs as jest.Mock).mockResolvedValue({
            docs: [],
        });

        const result = await getRides("user123", {
            limit: 5,
        });

        expect(result.items).toEqual([]);

        expect(result.lastDocId).toBeNull();

        expect(result.hasMore).toBe(false);
    });

    test("supports pagination", async () => {
        (doc as jest.Mock).mockReturnValue("lastDoc");

        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
        });

        (getDocs as jest.Mock).mockResolvedValue({
            docs: [],
        });

        await getRides("user123", {
            limit: 5,
            startAfter: "ride5",
        });

        expect(getDoc).toHaveBeenCalled();

        expect(startAfter).toHaveBeenCalled();
    });

    test("rethrows firestore errors", async () => {
        (getDocs as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            getRides("user123", {
                limit: 5,
            })
        ).rejects.toThrow("Firestore failed");
    });
});

// getRide() testing
describe("getRide()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (collection as jest.Mock).mockReturnValue("rides");

        (doc as jest.Mock).mockReturnValue({
            id: "ride123",
        });
    });

    test("returns ride", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => ({
                rideName: "Morning Ride",
            }),
        });

        const result = await getRide(
            "user123",
            "ride123"
        );

        expect(result.id).toBe("ride123");

        expect(result.rideName).toBe("Morning Ride");
    });

    test("throws when ride does not exist", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        await expect(
            getRide(
                "user123",
                "ride123"
            )
        ).rejects.toThrow("Trip not found");
    });

    test("rethrows firestore errors", async () => {
        (getDoc as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            getRide(
                "user123",
                "ride123"
            )
        ).rejects.toThrow("Firestore failed");
    });
});

// getRidePoints() testing
describe("getRidePoints()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (collection as jest.Mock).mockReturnValue("map");

        (doc as jest.Mock).mockReturnValue("points");
    });

    test("returns ride points", async () => {
        const points = [
            {
                latitude: 1,
                longitude: 2,
            },
        ];

        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => ({
                items: points,
            }),
        });

        const result = await getRidePoints(
            "user123",
            "ride123"
        );

        expect(result).toEqual(points);
    });

    test("returns empty array when points document is missing", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        const result = await getRidePoints(
            "user123",
            "ride123"
        );

        expect(result).toEqual([]);
    });

    test("rethrows firestore errors", async () => {
        (getDoc as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            getRidePoints(
                "user123",
                "ride123"
            )
        ).rejects.toThrow("Firestore failed");
    });
});

// getRideAnnotations()
describe("getRideAnnotations()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (collection as jest.Mock).mockReturnValue("annotations");
    });

    test("returns annotations", async () => {
        (getDocs as jest.Mock).mockResolvedValue({
            docs: [
                {
                    id: "a1",
                    data: () => ({
                        annotationId: "1",
                    }),
                },
                {
                    id: "a2",
                    data: () => ({
                        annotationId: "2",
                    }),
                },
            ],
        });

        const result = await getRideAnnotations(
            "user123",
            "ride123"
        );

        expect(result).toHaveLength(2);

        expect(result[0].id).toBe("a1");

        expect(result[1].id).toBe("a2");
    });

    test("returns empty annotations list", async () => {
        (getDocs as jest.Mock).mockResolvedValue({
            docs: [],
        });

        const result = await getRideAnnotations(
            "user123",
            "ride123"
        );

        expect(result).toEqual([]);
    });

    test("rethrows firestore errors", async () => {
        (getDocs as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            getRideAnnotations(
                "user123",
                "ride123"
            )
        ).rejects.toThrow("Firestore failed");
    });
});

// updateRideName() testing
describe("updateRideName()", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("updates ride name", async () => {
        (updateDoc as jest.Mock).mockResolvedValue(undefined);

        await updateRideName(
            "user123",
            "ride123",
            "New Ride Name"
        );

        expect(updateDoc).toHaveBeenCalled();
    });

    test("rethrows firestore error", async () => {
        (updateDoc as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            updateRideName(
                "user123",
                "ride123",
                "New Ride Name"
            )
        ).rejects.toThrow("Firestore failed");
    });

});

// updatevisibilitySettings() testing
describe("updateVisibilitySettings()", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("updates ride visibility", async () => {
        (updateDoc as jest.Mock).mockResolvedValue(undefined);

        await updateVisibilitySettings(
            "ride123",
            true
        );

        expect(updateDoc).toHaveBeenCalled();
    });

    test("rethrows firestore error", async () => {
        (updateDoc as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            updateVisibilitySettings(
                "ride123",
                true
            )
        ).rejects.toThrow("Firestore failed");
    });
});

// getTotalRideCount() testing
describe("getTotalRideCount()", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns total ride count", async () => {
        (getCountFromServer as jest.Mock).mockResolvedValue({
            data: () => ({
                count: 15,
            }),
        });

        const result = await getTotalRideCount("user123");

        expect(result).toBe(15);
    });

    test("rethrows firestore error", async () => {
        (getCountFromServer as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            getTotalRideCount("user123")
        ).rejects.toThrow("Firestore failed");
    });
});

// getWeeklyRideCount() testing
describe("getWeeklyRideCount()", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns weekly ride count", async () => {
        (getCountFromServer as jest.Mock).mockResolvedValue({
            data: () => ({
                count: 4,
            }),
        });

        const result = await getWeeklyRideCount("user123");

        expect(result).toBe(4);
    });

    test("rethrows firestore error", async () => {
        (getCountFromServer as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            getWeeklyRideCount("user123")
        ).rejects.toThrow("Firestore failed");
    });
});

// getMonthlyDistanceAndCount()
describe("getMonthlyDistanceAndCount()", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns monthly distance and count", async () => {
        (getAggregateFromServer as jest.Mock).mockResolvedValue({
            data: () => ({
                distance: 123,
                count: 8,
            }),
        });

        const result = await getMonthlyDistanceAndCount("user123");

        expect(result).toEqual({
            distance: 123,
            count: 8,
        });
    });

    test("returns zero values when aggregate data is missing", async () => {
        (getAggregateFromServer as jest.Mock).mockResolvedValue({
            data: () => null,
        });

        const result = await getMonthlyDistanceAndCount("user123");

        expect(result).toEqual({
            distance: 0,
            count: 0,
        });
    });

    test("rethrows firestore error", async () => {
        (getAggregateFromServer as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            getMonthlyDistanceAndCount("user123")
        ).rejects.toThrow("Firestore failed");
    });
});

// getTotalDistanceAndCountAndAverageSpeedAndElevation() testing
describe("getTotalDistanceAndCountAndAverageSpeedAndElevation()", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns ride statistics", async () => {
        (getAggregateFromServer as jest.Mock).mockResolvedValue({
            data: () => ({
                distance: 500,
                count: 20,
                averageSpeed: 27,
                elevationGain: 1500,
            }),
        });

        const result =
            await getTotalDistanceAndCountAndAverageSpeedAndElevation("user123");

        expect(result).toEqual({
            distance: 500,
            count: 20,
            averageSpeed: 27,
            elevation: 1500,
        });
    });

    test("returns zeros when aggregate data is missing", async () => {
        (getAggregateFromServer as jest.Mock).mockResolvedValue({
            data: () => null,
        });

        const result =
            await getTotalDistanceAndCountAndAverageSpeedAndElevation("user123");

        expect(result).toEqual({
            distance: 0,
            count: 0,
            averageSpeed: 0,
            elevation: 0,
        });
    });

    test("rethrows firestore error", async () => {
        (getAggregateFromServer as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            getTotalDistanceAndCountAndAverageSpeedAndElevation("user123")
        ).rejects.toThrow("Firestore failed");
    });
});

// getLongestRide() testing
describe("getLongestRide()", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns longest ride distance", async () => {
        (getDocs as jest.Mock).mockResolvedValue({
            docs: [
                {
                    data: () => ({
                        distance: 87,
                    }),
                },
            ],
        });

        const result = await getLongestRide("user123");

        expect(result).toBe(87);
    });

    test("returns zero when there are no rides", async () => {
        (getDocs as jest.Mock).mockResolvedValue({
            docs: [],
        });

        const result = await getLongestRide("user123");

        expect(result).toBe(0);
    });

    test("rethrows firestore error", async () => {
        (getDocs as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            getLongestRide("user123")
        ).rejects.toThrow("Firestore failed");
    });
});

// saveRide() testing
describe("saveRide()", () => {
    let batch: any;
    let storageRef: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset auth to an authenticated user before every test
        (getAuth as jest.Mock).mockReturnValue({
            currentUser: {
                uid: "user123",
            },
        });

        batch = {
            set: jest.fn(),
            commit: jest.fn().mockResolvedValue(undefined),
        };

        storageRef = {
            putFile: jest.fn(() => ({
                on: jest.fn(),
            })),
            getDownloadURL: jest
                .fn()
                .mockResolvedValue("https://firebase.storage/test.jpg"),
        };

        const firestore = require("@react-native-firebase/firestore");
        firestore.writeBatch.mockReturnValue(batch);

        const storage =
            require("@react-native-firebase/storage").default;

        storage.mockReturnValue({
            ref: jest.fn(() => storageRef),
        });

        (collection as jest.Mock).mockReturnValue("collection");

        let counter = 0;

        (doc as jest.Mock).mockImplementation(() => ({
            id: `doc-${counter++}`,
        }));
    });

    test("throws when user is not authenticated", async () => {
        (getAuth as jest.Mock).mockReturnValue({
            currentUser: null,
        });

        await expect(
            saveRide(baseRide as any)
        ).rejects.toThrow("User not authenticated");
    });

    test("throws when no ride points are provided", async () => {
        await expect(
            saveRide({
                ...baseRide,
                points: [],
            } as any)
        ).rejects.toThrow("No ride points provided");
    });

    test("saves ride successfully without annotations", async () => {
        const rideId = await saveRide(baseRide as any);

        expect(batch.set).toHaveBeenCalled();
        expect(batch.commit).toHaveBeenCalled();
        expect(rideId).toBe("doc-0");
    });

    test("uploads annotation media", async () => {
        await saveRide({
            ...baseRide,
            annotations: [
                {
                    title: "Photo",
                    description: "",
                    coordinate: {
                        latitude: 1,
                        longitude: 2,
                    },
                    mediaType: "image",
                    mediaUri: "/tmp/photo.jpg",
                },
            ],
        } as any);

        expect(storageRef.putFile).toHaveBeenCalledWith("/tmp/photo.jpg");
        expect(storageRef.getDownloadURL).toHaveBeenCalled();
    });

    test("stores uploaded media url", async () => {
        await saveRide({
            ...baseRide,
            annotations: [
                {
                    title: "Photo",
                    description: "",
                    coordinate: {
                        latitude: 1,
                        longitude: 2,
                    },
                    mediaType: "image",
                    mediaUri: "/tmp/photo.jpg",
                },
            ],
        } as any);

        expect(batch.set).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                mediaUri: "https://firebase.storage/test.jpg",
            })
        );
    });

    test("does not upload media when mediaUri is missing", async () => {
        await saveRide({
            ...baseRide,
            annotations: [
                {
                    title: "Marker",
                    description: "",
                    coordinate: {
                        latitude: 1,
                        longitude: 2,
                    },
                    mediaType: null,
                    mediaUri: null,
                },
            ],
        } as any);

        expect(storageRef.putFile).not.toHaveBeenCalled();
    });

    test("ignores undefined annotations", async () => {
        await saveRide({
            ...baseRide,
            annotations: [undefined],
        } as any);

        expect(batch.commit).toHaveBeenCalled();
    });

    test("stores GPX upload flag", async () => {
        await saveRide({
            ...baseRide,
            isGPXUpload: true,
        } as any);

        expect(batch.set).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                isGPXUpload: true,
            })
        );
    });

    test("stores fromWeb flag", async () => {
        await saveRide({
            ...baseRide,
            fromWeb: true,
        } as any);

        expect(batch.set).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                fromWeb: true,
            })
        );
    });

    test("defaults GPX and fromWeb flags to false", async () => {
        await saveRide(baseRide as any);

        expect(batch.set).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                isGPXUpload: false,
                fromWeb: false,
            })
        );
    });

    test("rethrows firestore errors", async () => {
        batch.commit.mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            saveRide(baseRide as any)
        ).rejects.toThrow("Firestore failed");
    });
});

// deleteRide() testing
describe("deleteRide()", () => {
    let batch: any;

    beforeEach(() => {
        jest.clearAllMocks();

        batch = {
            delete: jest.fn(),
            commit: jest.fn().mockResolvedValue(undefined),
        };

        const firestore = require("@react-native-firebase/firestore");
        firestore.writeBatch.mockReturnValue(batch);

        (collection as jest.Mock).mockReturnValue("collection");

        let counter = 0;

        (doc as jest.Mock).mockImplementation(() => ({
            id: `doc-${counter++}`,
        }));

        const storage =
            require("@react-native-firebase/storage").default;

        storage.mockReturnValue({
            ref: jest.fn(() => "storage-ref"),
        });

        (deleteObject as jest.Mock).mockResolvedValue(undefined);
    });

    test("deletes ride with no annotations", async () => {
        await deleteRide({
            id: "ride123",
            annotations: [],
        } as any);

        expect(batch.delete).toHaveBeenCalledTimes(2);

        expect(batch.commit).toHaveBeenCalled();
    });

    test("deletes annotation documents", async () => {
        await deleteRide({
            id: "ride123",
            annotations: [
                {
                    id: "annotation1",
                },
                {
                    id: "annotation2",
                },
            ],
        } as any);

        // ride + points + 2 annotations
        expect(batch.delete).toHaveBeenCalledTimes(4);

        expect(batch.commit).toHaveBeenCalled();
    });

    test("deletes annotation media from storage", async () => {
        await deleteRide({
            id: "ride123",
            annotations: [
                {
                    id: "annotation1",
                },
                {
                    id: "annotation2",
                },
            ],
        } as any);

        expect(deleteObject).toHaveBeenCalledTimes(2);
    });

    test("commits batch after deleting", async () => {
        await deleteRide({
            id: "ride123",
            annotations: [],
        } as any);

        expect(batch.commit).toHaveBeenCalledTimes(1);
    });

    test("handles multiple annotations", async () => {
        await deleteRide({
            id: "ride123",
            annotations: [
                { id: "a1" },
                { id: "a2" },
                { id: "a3" },
            ],
        } as any);

        // ride + points + 3 annotations
        expect(batch.delete).toHaveBeenCalledTimes(5);

        expect(deleteObject).toHaveBeenCalledTimes(3);
    });

    test("rethrows firestore errors", async () => {
        batch.commit.mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            deleteRide({
                id: "ride123",
                annotations: [],
            } as any)
        ).rejects.toThrow("Firestore failed");
    });
});
