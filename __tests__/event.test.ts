import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    startAfter
} from "@react-native-firebase/firestore";
import { getEvents } from "../lib/firebase-crud/events";
import { firestore } from "../lib/utils/firebaseConfig";

// Mocks

jest.mock("../lib/utils/firebaseConfig", () => ({
    firestore: "mockFirestore",
}));

jest.mock("@react-native-firebase/firestore", () => ({
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    limit: jest.fn(),
    orderBy: jest.fn(),
    query: jest.fn((...args) => args),
    startAfter: jest.fn(),
}));

beforeEach(() => {
    jest.clearAllMocks();

    (collection as jest.Mock).mockReturnValue("eventsCollection");
    (doc as jest.Mock).mockReturnValue("docRef");
    (limit as jest.Mock).mockReturnValue("limitQuery");
    (orderBy as jest.Mock).mockReturnValue("orderQuery");
    (startAfter as jest.Mock).mockReturnValue("startAfterQuery");
});

// getevents() testing
describe("getEvents()", () => {

    test("fetches events successfully", async () => {
        const mockDocs = [
            {
                id: "event1",
                data: () => ({
                    eventName: "Ride 1",
                    createdAt: 100,
                }),
            },
            {
                id: "event2",
                data: () => ({
                    eventName: "Ride 2",
                    createdAt: 200,
                }),
            },
        ];

        (getDocs as jest.Mock).mockResolvedValue({
            docs: mockDocs,
        });

        const result = await getEvents({
            limit: 5,
        });

        expect(collection).toHaveBeenCalledWith(
            firestore,
            "events"
        );

        expect(getDocs).toHaveBeenCalled();
        expect(result.items).toHaveLength(2);
        expect(result.items[0].id).toBe("event1");
        expect(result.items[1].id).toBe("event2");
        expect(result.lastDocId).toBe("event2");
        expect(result.hasMore).toBe(false);
    });

    test("returns an empty array when there are no events", async () => {
        (getDocs as jest.Mock).mockResolvedValue({
            docs: [],
        });

        const result = await getEvents({
            limit: 5,
        });

        expect(result.items).toEqual([]);
        expect(result.lastDocId).toBeNull();
        expect(result.hasMore).toBe(false);
    });

    test("uses startAfter when a valid document is provided (Pagination)", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
        });

        (getDocs as jest.Mock).mockResolvedValue({
            docs: [],
        });

        await getEvents({
            limit: 5,
            startAfter: "event123",
        });

        expect(doc).toHaveBeenCalledWith(
            "eventsCollection",
            "event123"
        );

        expect(getDoc).toHaveBeenCalled();
        expect(startAfter).toHaveBeenCalled();
    });

    test("does not call startAfter when the document does not exist", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        (getDocs as jest.Mock).mockResolvedValue({
            docs: [],
        });

        await getEvents({
            limit: 5,
            startAfter: "missingDoc",
        });

        expect(startAfter).not.toHaveBeenCalled();
    });

    test("returns hasMore = true when the number of documents equals the limit", async () => {
        const docs = Array.from({ length: 5 }, (_, i) => ({
            id: `event${i}`,
            data: () => ({
                createdAt: i,
            }),
        }));

        (getDocs as jest.Mock).mockResolvedValue({
            docs,
        });

        const result = await getEvents({
            limit: 5,
        });

        expect(result.hasMore).toBe(true);
    });

    test("returns hasMore = false when fewer documents than the limit are returned", async () => {
        const docs = Array.from({ length: 3 }, (_, i) => ({
            id: `event${i}`,
            data: () => ({
                createdAt: i,
            }),
        }));

        (getDocs as jest.Mock).mockResolvedValue({
            docs,
        });

        const result = await getEvents({
            limit: 5,
        });

        expect(result.hasMore).toBe(false);
    });

    test("throws an error when Firestore fails", async () => {
        (getDocs as jest.Mock).mockRejectedValue(
            new Error("Firestore error")
        );

        await expect(
            getEvents({
                limit: 5,
            })
        ).rejects.toThrow("Firestore error");
    });
});