import { Annotation, deleteAnnotation } from '@/lib/firebase-crud/annotations';
import {
    deleteRide,
    FetchRideData,
    getRide,
    getRideAnnotations,
    getRidePoints,
    getRides,
    getTotalRideCount,
} from '@/lib/firebase-crud/rides';
import { auth } from '@/lib/utils/firebaseConfig';
import { create } from 'zustand';
import { RidePoint } from './useRideStore';

interface RidesState {
    rides: FetchRideData[];
    selectedRide: FetchRideData | null;
    selectedRidePoints: RidePoint[] | null;
    totalRideCount: number;
    isLoading: boolean;
    isRefreshing: boolean;
    isFetchingMore: boolean;
    error: string | null;
    pagination: {
        lastDocId: string | null;
        hasMore: boolean;
    };
    addAnnotation: (annotation: Annotation) => Promise<void>;
    fetchRides: (refresh?: boolean) => Promise<void>;
    fetchMoreRides: () => Promise<void>;
    selectRide: (rideId: string) => Promise<FetchRideData | undefined>;
    clearSelectedRide: () => void;
    updateRideName: (rideId: string, newName: string) => void;
    clearRides: () => void;
    removeAnnotation: (annotation: Annotation) => Promise<void>;
    removeRide: (ride: FetchRideData) => Promise<void>;
}

const PAGE_SIZE = 5;

export const useRidesStore = create<RidesState>((set, get) => ({
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

            const [response, totalRideCount] = await Promise.all([
                getRides(userId, {
                    limit: PAGE_SIZE,
                    startAfter: refresh ? null : undefined,
                }),
                getTotalRideCount(userId),
            ]);

            set({
                rides: refresh ? response.items : [...get().rides, ...response.items],
                totalRideCount,
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

            const response = await getRides(userId, {
                limit: PAGE_SIZE,
                startAfter: pagination.lastDocId,
            });

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
            let ride = get().rides.find(r => r.id === rideId);
            if (!ride) {
                const res = await getRide(userId, rideId);
                if (res) {
                    ride = res;
                } else {
                    throw new Error('Trip not found');
                }
            }

            const points = await getRidePoints(userId, rideId);
            const annotations = await getRideAnnotations(userId, rideId);

            ride = { ...ride, points, annotations };

            // Update the ride in the list
            set({
                rides: get().rides.map(r => (r.id === rideId ? ride : r)),
            });

            return ride;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to select ride' });
        } finally {
            set({ isLoading: false });
        }
    },

    clearSelectedRide: () => {
        set({ selectedRide: null, selectedRidePoints: null });
    },

    updateRideName: (rideId, newName) => {
        set(state => ({
            rides: state.rides.map(r => (r.id === rideId ? { ...r, rideName: newName } : r)),
            selectedRide:
                state.selectedRide && state.selectedRide.id === rideId
                    ? { ...state.selectedRide, rideName: newName }
                    : state.selectedRide,
        }));
    },

    clearRides: () => {
        set({ rides: [], selectedRide: null, selectedRidePoints: null, totalRideCount: 0 });
    },

    addAnnotation: async (annotation: Annotation) => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            set({ error: 'User not authenticated' });
            return;
        }

        try {
            const ride = await get().selectRide(annotation.rideId);
            if (!ride) {
                throw new Error('Trip not found');
            }

            const updatedRide = { ...ride, annotations: [...ride.annotations, annotation] };

            // set({ selectedRide: updatedRide });
            set({
                rides: get().rides.map(r => (r.id === ride.id ? updatedRide : r)),
                // selectedRide: updatedRide,
            });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to add annotation' });
        }
    },
    removeAnnotation: async (annotation: Annotation) => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            set({ error: 'User not authenticated' });
            return;
        }

        try {
            await deleteAnnotation(annotation);
            set({
                rides: get().rides.map(r => ({
                    ...r,
                    annotations: r.annotations.filter(a => a.id !== annotation.id),
                })),
            });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to remove annotation' });
        }
    },
    removeRide: async (ride: FetchRideData) => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            set({ error: 'User not authenticated' });
            return;
        }

        try {
            await deleteRide(ride);
            set({
                rides: get().rides.filter(r => r.id !== ride.id),
                totalRideCount: Math.max(0, get().totalRideCount - 1),
            });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to remove ride' });
        }
    },
}));
