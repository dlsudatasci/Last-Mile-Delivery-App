//Imports
import { getRidePoints } from '@/lib/firebase-crud/rides';
import { getEvents } from "../lib/firebase-crud/events";
import { useEventsStore } from "../lib/store/useEventsStore";
import { auth } from "../lib/utils/firebaseConfig";

// Mocks
jest.mock("../lib/firebase-crud/events", () => ({
    getEvents: jest.fn(),
}));

jest.mock("../lib/firebase-crud/rides", () => ({
    getRidePoints: jest.fn(),
}));

jest.mock("../lib/utils/firebaseConfig", () => ({
    auth: {
        currentUser: {
            uid: "user123",
        },
    },
}));

// useEventsStore testing
describe("useEventsStore", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        useEventsStore.setState({
            events: [],
            selectedEvent: null,
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

    // #1
    test("has the correct initial state", () => {
        const state = useEventsStore.getState();

        expect(state.events).toEqual([]);
        expect(state.selectedEvent).toBeNull();
        expect(state.isLoading).toBe(false);
        expect(state.isRefreshing).toBe(false);
        expect(state.isFetchingMore).toBe(false);
        expect(state.error).toBeNull();

        expect(state.pagination).toEqual({
            lastDocId: null,
            hasMore: true,
        });
    });

    // #2 fetchEvents
    test("does not fetch events when user is not authenticated", async () => {
        (auth as any).currentUser = null;

        await useEventsStore.getState().fetchEvents();

        expect(getEvents).not.toHaveBeenCalled();

        expect(useEventsStore.getState().error).toBe(
            "User not authenticated"
        );

        (auth as any).currentUser = {
            uid: "user123",
        };
    });

    // #3 
    test("fetches events successfully", async () => {
        (getEvents as jest.Mock).mockResolvedValue({
            items: [
                {
                    id: "event1",
                    title: "Test Event",
                },
            ],
            lastDocId: "doc1",
            hasMore: true,
        });

        await useEventsStore.getState().fetchEvents();

        expect(getEvents).toHaveBeenCalledWith({
            limit: 5,
            startAfter: undefined,
        });

        const state = useEventsStore.getState();

        expect(state.events).toHaveLength(1);

        expect(state.pagination).toEqual({
            lastDocId: "doc1",
            hasMore: true,
        });

        expect(state.error).toBeNull();
        expect(state.isLoading).toBe(false);
    });

    // #4
    test("refresh replaces existing events", async () => {
        useEventsStore.setState({
            events: [
                {
                    id: "old",
                } as any,
            ],
        });

        (getEvents as jest.Mock).mockResolvedValue({
            items: [
                {
                    id: "new",
                },
            ],
            lastDocId: "doc2",
            hasMore: false,
        });

        await useEventsStore.getState().fetchEvents(true);

        expect(getEvents).toHaveBeenCalledWith({
            limit: 5,
            startAfter: null,
        });

        expect(useEventsStore.getState().events).toEqual([
            {
                id: "new",
            },
        ]);

        expect(useEventsStore.getState().isRefreshing).toBe(
            false
        );
    });

    //#5
    test("appends events when not refreshing", async () => {
        useEventsStore.setState({
            events: [
                {
                    id: "event1",
                } as any,
            ],
        });

        (getEvents as jest.Mock).mockResolvedValue({
            items: [
                {
                    id: "event2",
                },
            ],
            lastDocId: "doc2",
            hasMore: true,
        });

        await useEventsStore.getState().fetchEvents();

        expect(useEventsStore.getState().events).toEqual([
            {
                id: "event1",
            },
            {
                id: "event2",
            },
        ]);
    });

    // #6
    test("stores Firestore errors", async () => {
        (getEvents as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await useEventsStore.getState().fetchEvents();

        expect(useEventsStore.getState().error).toBe(
            "Firestore failed"
        );

        expect(useEventsStore.getState().isLoading).toBe(
            false
        );
    });

    // #7
    test("stores default error message for unknown errors", async () => {
        (getEvents as jest.Mock).mockRejectedValue(
            "unknown error"
        );

        await useEventsStore.getState().fetchEvents();

        expect(useEventsStore.getState().error).toBe(
            "Failed to fetch rides"
        );
    });

    // #8 fetchMoreEvents
    test("does not fetch more when already fetching", async () => {
        useEventsStore.setState({
            isFetchingMore: true,
        });

        await useEventsStore
            .getState()
            .fetchMoreEvents();

        expect(getEvents).not.toHaveBeenCalled();
    });

    // #9 
    test("does not fetch more when there are no more pages", async () => {
        useEventsStore.setState({
            pagination: {
                lastDocId: "doc1",
                hasMore: false,
            },
        });

        await useEventsStore
            .getState()
            .fetchMoreEvents();

        expect(getEvents).not.toHaveBeenCalled();
    });

    // #10
    test("does not fetch more when lastDocId is null", async () => {
        useEventsStore.setState({
            pagination: {
                lastDocId: null,
                hasMore: true,
            },
        });

        await useEventsStore
            .getState()
            .fetchMoreEvents();

        expect(getEvents).not.toHaveBeenCalled();
    });

    // #11
    test("does not fetch more when user is not authenticated", async () => {
        (auth as any).currentUser = null;

        useEventsStore.setState({
            pagination: {
                lastDocId: "doc1",
                hasMore: true,
            },
        });

        await useEventsStore
            .getState()
            .fetchMoreEvents();

        expect(getEvents).not.toHaveBeenCalled();

        expect(useEventsStore.getState().error).toBe(
            "User not authenticated"
        );

        (auth as any).currentUser = {
            uid: "user123",
        };
    });

    // #12 
    test("fetches more events successfully", async () => {
        useEventsStore.setState({
            events: [
                {
                    id: "event1",
                } as any,
            ],
            pagination: {
                lastDocId: "doc1",
                hasMore: true,
            },
        });

        (getEvents as jest.Mock).mockResolvedValue({
            items: [
                {
                    id: "event2",
                },
                {
                    id: "event3",
                },
            ],
            lastDocId: "doc2",
            hasMore: false,
        });

        await useEventsStore
            .getState()
            .fetchMoreEvents();

        expect(getEvents).toHaveBeenCalledWith({
            limit: 5,
            startAfter: "doc1",
        });

        expect(useEventsStore.getState().events).toEqual([
            {
                id: "event1",
            },
            {
                id: "event2",
            },
            {
                id: "event3",
            },
        ]);

        expect(
            useEventsStore.getState().pagination
        ).toEqual({
            lastDocId: "doc2",
            hasMore: false,
        });

        expect(
            useEventsStore.getState().isFetchingMore
        ).toBe(false);
    });

    // #13
    test("stores Firestore errors while fetching more", async () => {
        useEventsStore.setState({
            pagination: {
                lastDocId: "doc1",
                hasMore: true,
            },
        });

        (getEvents as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await useEventsStore
            .getState()
            .fetchMoreEvents();

        expect(useEventsStore.getState().error).toBe(
            "Firestore failed"
        );

        expect(
            useEventsStore.getState().isFetchingMore
        ).toBe(false);
    });

    // #14
    test("stores default error for unknown pagination errors", async () => {
        useEventsStore.setState({
            pagination: {
                lastDocId: "doc1",
                hasMore: true,
            },
        });

        (getEvents as jest.Mock).mockRejectedValue(
            "unknown error"
        );

        await useEventsStore
            .getState()
            .fetchMoreEvents();

        expect(useEventsStore.getState().error).toBe(
            "Failed to fetch more rides"
        );

        expect(
            useEventsStore.getState().isFetchingMore
        ).toBe(false);
    });

    // #15 selectEvent
    test("does not select an event when user is not authenticated", async () => {
        (auth as any).currentUser = null;

        await useEventsStore
            .getState()
            .selectEvent("event1");

        expect(getRidePoints).not.toHaveBeenCalled();

        expect(useEventsStore.getState().error).toBe(
            "User not authenticated"
        );

        (auth as any).currentUser = {
            uid: "user123",
        };
    });

    // #16
    test("stores error when selected event does not exist", async () => {
        useEventsStore.setState({
            events: [],
        });

        await useEventsStore
            .getState()
            .selectEvent("missing");

        expect(getRidePoints).not.toHaveBeenCalled();

        expect(useEventsStore.getState().error).toBe(
            "Event not found"
        );

        expect(useEventsStore.getState().isLoading).toBe(
            false
        );
    });

    // #17 
    test("selects an event successfully", async () => {
        const event = {
            id: "event1",
            title: "Sample Event",
        };

        useEventsStore.setState({
            events: [event as any],
        });

        (getRidePoints as jest.Mock).mockResolvedValue([
            {
                latitude: 1,
                longitude: 2,
            },
        ]);

        const result =
            await useEventsStore
                .getState()
                .selectEvent("event1");

        expect(getRidePoints).toHaveBeenCalledWith(
            "user123",
            "event1"
        );

        expect(result).toEqual({
            ...event,
            points: [
                {
                    latitude: 1,
                    longitude: 2,
                },
            ],
        });

        expect(useEventsStore.getState().events[0]).toEqual({
            ...event,
            points: [
                {
                    latitude: 1,
                    longitude: 2,
                },
            ],
        });

        expect(useEventsStore.getState().error).toBeNull();
    });

    // #18
    test("stores Firestore errors while selecting an event", async () => {
        useEventsStore.setState({
            events: [
                {
                    id: "event1",
                } as any,
            ],
        });

        (getRidePoints as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await useEventsStore
            .getState()
            .selectEvent("event1");

        expect(useEventsStore.getState().error).toBe(
            "Firestore failed"
        );

        expect(useEventsStore.getState().isLoading).toBe(
            false
        );
    });

    // #19
    test("stores default error for unknown selectEvent errors", async () => {
        useEventsStore.setState({
            events: [
                {
                    id: "event1",
                } as any,
            ],
        });

        (getRidePoints as jest.Mock).mockRejectedValue(
            "unknown error"
        );

        await useEventsStore
            .getState()
            .selectEvent("event1");

        expect(useEventsStore.getState().error).toBe(
            "Failed to select ride"
        );

        expect(useEventsStore.getState().isLoading).toBe(
            false
        );
    });

    // #20 clearEvents
    test("clearEvents removes all events and selectedEvent", () => {
        useEventsStore.setState({
            events: [
                {
                    id: "event1",
                } as any,
            ],
            selectedEvent: {
                id: "event1",
            } as any,
        });

        useEventsStore
            .getState()
            .clearEvents();

        expect(useEventsStore.getState().events).toEqual([]);

        expect(
            useEventsStore.getState().selectedEvent
        ).toBeNull();
    });
});
