// Imports
import {
    fetchTripReview,
    submitTripReview,
} from "../lib/firebase-crud/reviews";

import { getAuth } from "@react-native-firebase/auth";

import {
    doc,
    getDoc,
    getDocs,
    writeBatch
} from "@react-native-firebase/firestore";

import { useTripReviews } from "@/lib/store/useTripReviews";

// Mocks
const mockBatch = {
    set: jest.fn(),
    commit: jest.fn(),
};

jest.mock("../lib/utils/firebaseConfig", () => ({
    firestore: {},
}));

jest.mock("@react-native-firebase/auth", () => ({
    getAuth: jest.fn(),
}));

jest.mock("@react-native-firebase/firestore", () => ({
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    writeBatch: jest.fn(),
}));

jest.mock("@/lib/store/useTripReviews", () => ({
    useTripReviews: {
        getState: jest.fn(),
    },
}));

// submitTripReview() testing
describe("submitTripReview()", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("throws an error when the user is not authenticated", async () => {
        (getAuth as jest.Mock).mockReturnValue({
            currentUser: null,
        });

        await expect(
            submitTripReview("ride123")
        ).rejects.toThrow("User not authenticated");

        expect(writeBatch).not.toHaveBeenCalled();
    });

    test("throws an error when no review data exists for the trip", async () => {
        (getAuth as jest.Mock).mockReturnValue({
            currentUser: {
                uid: "user123",
            },
        });

        (useTripReviews.getState as jest.Mock).mockReturnValue({
            reviews: {},
        });

        await expect(
            submitTripReview("ride123")
        ).rejects.toThrow("No review data found for this trip");

        expect(writeBatch).not.toHaveBeenCalled();
    });

    test("submits the post-trip questionnaire", async () => {
        (getAuth as jest.Mock).mockReturnValue({
            currentUser: {
                uid: "user123",
            },
        });

        (useTripReviews.getState as jest.Mock).mockReturnValue({
            reviews: {
                ride123: {
                    status: "pending",
                    answers: {},
                    postTrip: {
                        arrival: "On time",
                        etaRating: "4",
                        stressRating: "2",
                        language: "en",
                    },
                },
            },
        });

        (writeBatch as jest.Mock).mockReturnValue(mockBatch);

        mockBatch.commit.mockResolvedValue(undefined);

        (doc as jest.Mock).mockReturnValue("post-trip-doc");

        await submitTripReview("ride123");

        expect(writeBatch).toHaveBeenCalledTimes(1);

        expect(doc).toHaveBeenCalledWith(
            expect.anything(),
            "postTripQuestionnaire_response",
            "ride123"
        );

        expect(mockBatch.set).toHaveBeenCalledWith(
            "post-trip-doc",
            expect.objectContaining({
                rideId: "ride123",
                arrival: "On time",
                etaRating: "4",
                stressRating: "2",
                language: "en",
            }),
            { merge: true }
        );

        expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    test("submits deviation metadata to Firestore", async () => {
        (getAuth as jest.Mock).mockReturnValue({
            currentUser: {
                uid: "user123",
            },
        });

        (useTripReviews.getState as jest.Mock).mockReturnValue({
            reviews: {
                ride123: {
                    status: "pending",
                    answers: {
                        deviation123: {
                            whyRoute: "",
                            affect: "",
                            metadata: {
                                deviationId: "deviation123",
                                routeId: "route456",
                                rideId: "ride123",
                                userId: "user123",
                                dateTime: 1720000000000,
                                isFaster: true,
                                gpsLocation: {
                                    latitude: 14.5995,
                                    longitude: 120.9842,
                                },
                                originalRouteEdge: "edge-original",
                                deviatedEdge: "edge-deviated",
                                streetName: "Taft Avenue",
                                generatedInstruction: "Turn left",
                                deviationInstruction: "Turn left to avoid traffic",
                                timestamp: 1720000001000,
                                createdAt: 1720000002000,
                            },
                        },
                    },
                },
            },
        });

        (writeBatch as jest.Mock).mockReturnValue(mockBatch);

        mockBatch.commit.mockResolvedValue(undefined);

        (doc as jest.Mock).mockReturnValue("deviation-doc");

        await submitTripReview("ride123");

        expect(doc).toHaveBeenCalledWith(
            expect.anything(),
            "deviations",
            "deviation123"
        );

        expect(mockBatch.set).toHaveBeenCalledWith(
            "deviation-doc",
            expect.objectContaining({
                deviationId: "deviation123",
                routeId: "route456",
                rideId: "ride123",
                userId: "user123",
                dateTime: 1720000000000,
                isFaster: true,
                gpsLocation: "14.5995,120.9842",
                originalRouteEdge: "edge-original",
                deviatedEdge: "edge-deviated",
                streetName: "Taft Avenue",
                generatedInstruction: "Turn left",
                deviationInstruction: "Turn left to avoid traffic",
                points: [
                    {
                        latitude: 14.5995,
                        longitude: 120.9842,
                    },
                ],
                timestamp: 1720000001000,
                createdAt: expect.any(Number),
            }),
            { merge: true }
        );

        expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });


    test("submits deviation questionnaire response to Firestore", async () => {
        (getAuth as jest.Mock).mockReturnValue({
            currentUser: {
                uid: "user123",
            },
        });

        (useTripReviews.getState as jest.Mock).mockReturnValue({
            reviews: {
                ride123: {
                    status: "pending",
                    answers: {
                        deviation123: {
                            whyRoute: "Traffic Congestion",
                            affect: "Often",
                            language: "tl",
                            questionnaire: {
                                primaryReason: "Traffic Congestion",
                                primaryReasonOther: "",
                                trafficSeverity: "4 = Heavy",
                                rushHourCause: "Yes",
                                chooseDuringNonRush: "No",
                                blockageReason: "",
                                blockageReasonOther: "",
                                personalStopReason: [],
                                personalStopOther: "",
                                stopDuration: "",
                                deviateAgainFrequency: "Often",
                                avoidRoadFrequency: "Sometimes",
                            },
                        },
                    },
                },
            },
        });

        (writeBatch as jest.Mock).mockReturnValue(mockBatch);
        mockBatch.commit.mockResolvedValue(undefined);

        (doc as jest.Mock).mockReturnValue({
            id: "response123",
        });

        await submitTripReview("ride123");

        expect(doc).toHaveBeenCalled();

        expect(mockBatch.set).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "response123",
            }),
            expect.objectContaining({
                responseId: "response123",
                deviationId: "deviation123",
                rideId: "ride123",
                primaryReason: "Traffic Congestion",
                primaryReasonOther: "",
                trafficSeverity: "4 = Heavy",
                rushHourCause: "Yes",
                chooseDuringNonRush: "No",
                blockageReason: "",
                blockageReasonOther: "",
                personalStopReason: [],
                personalStopOther: "",
                stopDuration: "",
                deviateAgain: "Often",
                avoidRoadFrequency: "Sometimes",
                language: "tl",
                submittedAt: expect.any(Number),
                createdAt: expect.any(Number),
            })
        );

        expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    test("uses default values for missing optional questionnaire fields", async () => {
        (getAuth as jest.Mock).mockReturnValue({
            currentUser: {
                uid: "user123",
            },
        });

        (useTripReviews.getState as jest.Mock).mockReturnValue({
            reviews: {
                ride123: {
                    status: "pending",
                    answers: {
                        deviation123: {
                            whyRoute: "",
                            questionnaire: {
                                primaryReason: "Other",
                            },
                        },
                    },
                },
            },
        });

        (writeBatch as jest.Mock).mockReturnValue(mockBatch);
        mockBatch.commit.mockResolvedValue(undefined);

        const responseDoc = {
            id: "response123",
        };

        (doc as jest.Mock).mockReturnValue(responseDoc);

        await submitTripReview("ride123");

        expect(mockBatch.set).toHaveBeenCalledWith(
            responseDoc,
            expect.objectContaining({
                responseId: "response123",
                deviationId: "deviation123",
                rideId: "ride123",

                primaryReason: "Other",

                primaryReasonOther: null,
                trafficSeverity: null,
                rushHourCause: null,
                chooseDuringNonRush: null,
                blockageReason: null,
                blockageReasonOther: null,

                personalStopReason: [],
                personalStopOther: null,
                stopDuration: null,

                deviateAgain: null,
                avoidRoadFrequency: null,

                language: "en",

                submittedAt: expect.any(Number),
                createdAt: expect.any(Number),
            })
        );

        expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    test("rethrows an error when submitting the batch fails", async () => {
        (getAuth as jest.Mock).mockReturnValue({
            currentUser: {
                uid: "user123",
            },
        });

        (useTripReviews.getState as jest.Mock).mockReturnValue({
            reviews: {
                ride123: {
                    status: "pending",
                    answers: {},
                },
            },
        });

        (writeBatch as jest.Mock).mockReturnValue(mockBatch);

        const error = new Error("Firestore batch failed");
        mockBatch.commit.mockRejectedValue(error);

        await expect(
            submitTripReview("ride123")
        ).rejects.toThrow("Firestore batch failed");

        expect(writeBatch).toHaveBeenCalledTimes(1);
        expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });
});

// fetchTripReview() testing
describe("fetchTripReview()", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns null when no review data exists", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        (getDocs as jest.Mock).mockResolvedValue({
            forEach: jest.fn(),
        });

        const result = await fetchTripReview("ride123");

        expect(result).toBeNull();

        expect(getDoc).toHaveBeenCalled();
        expect(getDocs).toHaveBeenCalledTimes(2);
    });

    test("returns the post-trip questionnaire when it exists", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => ({
                arrival: "On time",
                etaRating: "4",
                stressRating: "2",
                language: "tl",
            }),
        });

        (getDocs as jest.Mock).mockResolvedValue({
            forEach: jest.fn(),
        });

        const result = await fetchTripReview("ride123");

        expect(result).not.toBeNull();

        expect(result).toEqual({
            status: "reviewed",
            answers: {},
            postTrip: {
                arrival: "On time",
                etaRating: "4",
                stressRating: "2",
                language: "tl",
            },
        });
    });

    test("fetches deviation metadata and converts GPS coordinates", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        const deviationDoc = {
            data: () => ({
                deviationId: "deviation123",
                routeId: "route456",
                rideId: "ride123",
                userId: "user123",
                dateTime: 1720000000000,
                isFaster: true,
                gpsLocation: "14.5995,120.9842",
                originalRouteEdge: "edge-original",
                deviatedEdge: "edge-deviated",
                streetName: "Taft Avenue",
                generatedInstruction: "Turn left",
                deviationInstruction: "Turn left to avoid traffic",
                timestamp: 1720000001000,
                createdAt: 1720000002000,
            }),
        };

        const deviationsSnapshot = {
            forEach: (callback: (docSnap: any) => void) => {
                callback(deviationDoc);
            },
        };

        (getDocs as jest.Mock)
            .mockResolvedValueOnce(deviationsSnapshot)
            .mockResolvedValueOnce({
                forEach: jest.fn(),
            });

        const result = await fetchTripReview("ride123");

        expect(result).not.toBeNull();

        expect(result?.status).toBe("pending");

        expect(result?.answers.deviation123).toEqual({
            whyRoute: "",
            affect: "",
            metadata: {
                deviationId: "deviation123",
                routeId: "route456",
                rideId: "ride123",
                userId: "user123",
                dateTime: 1720000000000,
                isFaster: true,
                gpsLocation: {
                    latitude: 14.5995,
                    longitude: 120.9842,
                },
                originalRouteEdge: "edge-original",
                deviatedEdge: "edge-deviated",
                streetName: "Taft Avenue",
                generatedInstruction: "Turn left",
                deviationInstruction: "Turn left to avoid traffic",
                timestamp: 1720000001000,
                createdAt: 1720000002000,
            },
        });
    });

    test("merges deviation questionnaire response into existing deviation", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        const deviationDoc = {
            data: () => ({
                deviationId: "deviation123",
                routeId: "route456",
                rideId: "ride123",
                userId: "user123",
                dateTime: 1720000000000,
                isFaster: true,
                gpsLocation: "14.5995,120.9842",
                originalRouteEdge: "edge-original",
                deviatedEdge: "edge-deviated",
                streetName: "Taft Avenue",
                generatedInstruction: "Turn left",
                deviationInstruction: "Turn left to avoid traffic",
                timestamp: 1720000001000,
                createdAt: 1720000002000,
            }),
        };

        const responseDoc = {
            data: () => ({
                deviationId: "deviation123",
                primaryReason: "Traffic Congestion",
                primaryReasonOther: null,
                trafficSeverity: "4 = Heavy",
                rushHourCause: "Yes",
                chooseDuringNonRush: "No",
                blockageReason: null,
                blockageReasonOther: null,
                personalStopReason: [],
                personalStopOther: null,
                stopDuration: null,
                deviateAgain: "Often",
                avoidRoadFrequency: "Sometimes",
                language: "tl",
            }),
        };

        const deviationsSnapshot = {
            forEach: (callback: (docSnap: any) => void) => {
                callback(deviationDoc);
            },
        };

        const responsesSnapshot = {
            forEach: (callback: (docSnap: any) => void) => {
                callback(responseDoc);
            },
        };

        (getDocs as jest.Mock)
            .mockResolvedValueOnce(deviationsSnapshot)
            .mockResolvedValueOnce(responsesSnapshot);

        const result = await fetchTripReview("ride123");

        expect(result).not.toBeNull();
        expect(result?.status).toBe("reviewed");

        expect(result?.answers.deviation123).toEqual(
            expect.objectContaining({
                whyRoute: "Traffic Congestion",
                affect: "Often",
                language: "tl",
                questionnaire: {
                    primaryReason: "Traffic Congestion",
                    primaryReasonOther: null,
                    trafficSeverity: "4 = Heavy",
                    rushHourCause: "Yes",
                    chooseDuringNonRush: "No",
                    blockageReason: null,
                    blockageReasonOther: null,
                    personalStopReason: [],
                    personalStopOther: null,
                    stopDuration: null,
                    deviateAgainFrequency: "Often",
                    avoidRoadFrequency: "Sometimes",
                },
            })
        );
        
    });

    test("handles missing or malformed GPS coordinates", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        (getDocs as jest.Mock)
            .mockResolvedValueOnce({
                forEach: (callback: any) => {
                    callback({
                        data: () => ({
                            deviationId: "deviation123",
                            routeId: "route456",
                            rideId: "ride123",
                            userId: "user123",
                            gpsLocation: "invalid-gps",
                        }),
                    });
                },
            })
            .mockResolvedValueOnce({
                forEach: jest.fn(),
            });

        const result = await fetchTripReview("ride123");

        expect(result?.answers.deviation123.metadata?.gpsLocation).toBeNull();
    });

    test("defaults post-trip questionnaire language to English when missing", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => ({
                arrival: "Late",
                etaRating: "3",
                stressRating: "4",
                // language intentionally missing
            }),
        });

        (getDocs as jest.Mock).mockResolvedValue({
            forEach: jest.fn(),
        });

        const result = await fetchTripReview("ride123");

        expect(result?.postTrip).toEqual({
            arrival: "Late",
            etaRating: "3",
            stressRating: "4",
            language: "en",
        });
    });

    test("defaults deviation questionnaire language to English when missing", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        (getDocs as jest.Mock)
            .mockResolvedValueOnce({
                // First getDocs call: deviations
                forEach: (callback: any) => {
                    callback({
                        data: () => ({
                            deviationId: "deviation123",
                            routeId: "route456",
                            rideId: "ride123",
                            userId: "user123",
                            gpsLocation: "14.5995,120.9842",
                        }),
                    });
                },
            })
            .mockResolvedValueOnce({
                // Second getDocs call: deviation responses
                forEach: (callback: any) => {
                    callback({
                        data: () => ({
                            deviationId: "deviation123",
                            primaryReason: "Traffic Congestion",
                            deviateAgain: "Often",
                            // language intentionally missing
                        }),
                    });
                },
            });

        const result = await fetchTripReview("ride123");

        expect(result?.answers.deviation123.language).toBe("en");
    });

    test("ignores deviation questionnaire responses without matching deviation metadata", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        (getDocs as jest.Mock)
            .mockResolvedValueOnce({
                // First getDocs call: deviations
                forEach: jest.fn(),
            })
            .mockResolvedValueOnce({
                // Second getDocs call: deviation responses
                forEach: (callback: any) => {
                    callback({
                        data: () => ({
                            deviationId: "unknown-deviation",
                            primaryReason: "Traffic Congestion",
                            deviateAgain: "Often",
                            language: "en",
                        }),
                    });
                },
            });

        const result = await fetchTripReview("ride123");

        expect(result).toBeNull();
    });

    test("returns null when Firestore fetch fails", async () => {
        const firestoreError = new Error("Firestore unavailable");
        const consoleWarnSpy = jest
            .spyOn(console, "warn")
            .mockImplementation(() => {});

        (getDoc as jest.Mock).mockRejectedValue(firestoreError);

        const result = await fetchTripReview("ride123");

        expect(result).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            "Failed to fetch remote trip review:",
            firestoreError
        );

        consoleWarnSpy.mockRestore();
    });

    test("reconstructs multiple deviations", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        (getDocs as jest.Mock)
            .mockResolvedValueOnce({
                // First getDocs call: deviations
                forEach: (callback: any) => {
                    callback({
                        data: () => ({
                            deviationId: "deviation123",
                            routeId: "route123",
                            rideId: "ride123",
                            userId: "user123",
                            gpsLocation: "14.5995,120.9842",
                        }),
                    });

                    callback({
                        data: () => ({
                            deviationId: "deviation456",
                            routeId: "route456",
                            rideId: "ride123",
                            userId: "user123",
                            gpsLocation: "14.6095,121.0042",
                        }),
                    });
                },
            })
            .mockResolvedValueOnce({
                // Second getDocs call: no questionnaire responses
                forEach: jest.fn(),
            });

        const result = await fetchTripReview("ride123");

        expect(result?.answers).toHaveProperty("deviation123");
        expect(result?.answers).toHaveProperty("deviation456");

        expect(result?.answers.deviation123.metadata?.routeId).toBe(
            "route123"
        );

        expect(result?.answers.deviation456.metadata?.routeId).toBe(
            "route456"
        );

        expect(
            result?.answers.deviation123.metadata?.gpsLocation
        ).toEqual({
            latitude: 14.5995,
            longitude: 120.9842,
        });

        expect(
            result?.answers.deviation456.metadata?.gpsLocation
        ).toEqual({
            latitude: 14.6095,
            longitude: 121.0042,
        });
    });

    test("merges questionnaire responses into the correct deviations", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        (getDocs as jest.Mock)
            .mockResolvedValueOnce({
                // First getDocs call: deviations
                forEach: (callback: any) => {
                    callback({
                        data: () => ({
                            deviationId: "deviation123",
                            routeId: "route123",
                            rideId: "ride123",
                            userId: "user123",
                            gpsLocation: "14.5995,120.9842",
                        }),
                    });

                    callback({
                        data: () => ({
                            deviationId: "deviation456",
                            routeId: "route456",
                            rideId: "ride123",
                            userId: "user123",
                            gpsLocation: "14.6095,121.0042",
                        }),
                    });
                },
            })
            .mockResolvedValueOnce({
                // Second getDocs call: questionnaire responses
                forEach: (callback: any) => {
                    callback({
                        data: () => ({
                            deviationId: "deviation123",
                            primaryReason: "Traffic Congestion",
                            trafficSeverity: "4 = Heavy",
                            rushHourCause: "Yes",
                            chooseDuringNonRush: "No",
                            deviateAgain: "Often",
                            avoidRoadFrequency: "Sometimes",
                            language: "en",
                        }),
                    });

                    callback({
                        data: () => ({
                            deviationId: "deviation456",
                            primaryReason: "Wrong Turn",
                            deviateAgain: "Rarely",
                            avoidRoadFrequency: "Never",
                            language: "tl",
                        }),
                    });
                },
            });

        const result = await fetchTripReview("ride123");

        expect(result?.status).toBe("reviewed");

        expect(result?.answers.deviation123.whyRoute).toBe(
            "Traffic Congestion"
        );
        expect(result?.answers.deviation123.affect).toBe("Often");
        expect(result?.answers.deviation123.language).toBe("en");

        expect(result?.answers.deviation456.whyRoute).toBe(
            "Wrong Turn"
        );
        expect(result?.answers.deviation456.affect).toBe("Rarely");
        expect(result?.answers.deviation456.language).toBe("tl");

        expect(
            result?.answers.deviation123.questionnaire?.trafficSeverity
        ).toBe("4 = Heavy");

        expect(
            result?.answers.deviation456.questionnaire?.primaryReason
        ).toBe("Wrong Turn");
    });
});

