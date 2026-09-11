import { FetchRideData, getRideAnnotations, getRidePoints, getRides } from '@/lib/firebase-crud/rides';
import { auth } from '@/lib/utils/firebaseConfig';
import { create } from 'zustand';
import { RidePoint } from './useRideStore';

interface RidesState {
    rides: FetchRideData[];
    selectedRide: FetchRideData | null;
    selectedRidePoints: RidePoint[] | null;
    isLoading: boolean;
    isRefreshing: boolean;
    isFetchingMore: boolean;
    error: string | null;
    pagination: {
        lastDocId: string | null;
        hasMore: boolean;
    };
    fetchRides: (refresh?: boolean) => Promise<void>;
    fetchMoreRides: () => Promise<void>;
    selectRide: (rideId: string) => Promise<FetchRideData | undefined>;
    clearSelectedRide: () => void;
    clearRides: () => void;
}

const PAGE_SIZE = 5;

export const useCommunityRidesStore = create<RidesState>((set, get) => ({
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

    fetchRides: async (refresh = false) => {
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

            const response = await getRides(
                userId,
                {
                    limit: PAGE_SIZE,
                    startAfter: refresh ? null : undefined,
                },
                true
            );

            set({
                rides: refresh ? response.items : [...get().rides, ...response.items],
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

    fetchMoreRides: async () => {
        const { pagination, isFetchingMore, rides } = get();
        if (isFetchingMore || !pagination.hasMore || !pagination.lastDocId) return;

        const userId = auth.currentUser?.uid;
        if (!userId) {
            set({ error: 'User not authenticated' });
            return;
        }

        try {
            set({ isFetchingMore: true, error: null });

            const response = await getRides(
                userId,
                {
                    limit: PAGE_SIZE,
                    startAfter: pagination.lastDocId,
                },
                true
            );

            set({
                rides: [...rides, ...response.items],
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

    selectRide: async (rideId: string) => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            set({ error: 'User not authenticated' });
            return;
        }

        try {
            set({ isLoading: true, error: null });

            // Find the ride in the current list
            const ride = get().rides.find(r => r.id === rideId);
            if (!ride) {
                throw new Error('Trip not found');
            }

            // Fetch points for the selected ride
            const points = await getRidePoints(userId, rideId);
            const annotations = await getRideAnnotations(userId, rideId);

            // Update the selected ride with points
            const updatedRide = { ...ride, points, annotations };

            // Update the ride in the list
            set({
                rides: get().rides.map(r => (r.id === rideId ? updatedRide : r)),
                selectedRide: updatedRide,
                selectedRidePoints: points,
            });

            return updatedRide;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to select ride' });
        } finally {
            set({ isLoading: false });
        }
    },

    clearSelectedRide: () => {
        set({ selectedRide: null, selectedRidePoints: null });
    },

    clearRides: () => {
        set({ rides: [], selectedRide: null, selectedRidePoints: null });
    },
}));
