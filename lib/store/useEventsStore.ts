import { getRidePoints } from '@/lib/firebase-crud/rides';
import { auth } from '@/lib/utils/firebaseConfig';
import { create } from 'zustand';
import { FetchEventData, getEvents } from '../firebase-crud/events';

interface EventsState {
    events: FetchEventData[];
    selectedEvent: FetchEventData | null;
    isLoading: boolean;
    isRefreshing: boolean;
    isFetchingMore: boolean;
    error: string | null;
    pagination: {
        lastDocId: string | null;
        hasMore: boolean;
    };
    fetchEvents: (refresh?: boolean) => Promise<void>;
    fetchMoreEvents: () => Promise<void>;
    selectEvent: (eventId: string) => Promise<FetchEventData | undefined>;
    clearEvents: () => void;
}

const PAGE_SIZE = 5;

export const useEventsStore = create<EventsState>((set, get) => ({
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

    fetchEvents: async (refresh = false) => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            set({ error: 'User not authenticated' });
            return;
        }

        try {
            if (refresh) {
                set({ isRefreshing: true, error: null });
            } else {
                set({ isLoading: true, error: null });
            }

            const response = await getEvents({
                limit: PAGE_SIZE,
                startAfter: refresh ? null : undefined,
            });

            set({
                events: refresh ? response.items : [...get().events, ...response.items],
                pagination: {
                    lastDocId: response.lastDocId,
                    hasMore: response.hasMore,
                },
                error: null,
            });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch rides' });
        } finally {
            set({ isLoading: false, isRefreshing: false });
        }
    },

    fetchMoreEvents: async () => {
        const { pagination, isFetchingMore, events } = get();
        if (isFetchingMore || !pagination.hasMore || !pagination.lastDocId) return;

        const userId = auth.currentUser?.uid;
        if (!userId) {
            set({ error: 'User not authenticated' });
            return;
        }

        try {
            set({ isFetchingMore: true, error: null });

            const response = await getEvents({
                limit: PAGE_SIZE,
                startAfter: pagination.lastDocId,
            });

            set({
                events: [...events, ...response.items],
                pagination: {
                    lastDocId: response.lastDocId,
                    hasMore: response.hasMore,
                },
                error: null,
            });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch more rides' });
        } finally {
            set({ isFetchingMore: false });
        }
    },

    selectEvent: async (eventId: string) => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            set({ error: 'User not authenticated' });
            return;
        }

        try {
            set({ isLoading: true, error: null });

            // Find the event in the current list
            const event = get().events.find(e => e.id === eventId);
            if (!event) {
                throw new Error('Event not found');
            }

            // Fetch points for the selected ride
            const points = await getRidePoints(userId, eventId);

            // Update the selected ride with points
            const updatedEvent = { ...event, points };

            // Update the ride in the list
            set({
                events: get().events.map(e => (e.id === eventId ? updatedEvent : e)),
                selectedEvent: updatedEvent,
            });

            return updatedEvent;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to select ride' });
        } finally {
            set({ isLoading: false });
        }
    },

    clearEvents: () => {
        set({ events: [], selectedEvent: null });
    },
}));
