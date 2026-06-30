import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import { create } from 'zustand';
import { Annotation } from '../firebase-crud/annotations';
import { NewRideData, saveRide } from '../firebase-crud/rides';

const setAsyncFlag = async (key: string, value: boolean) => {
    try {
        await AsyncStorage.setItem(key, value ? 'true' : 'false');
    } catch (e) {
        console.error(`Failed to set ${key} in AsyncStorage`, e);
    }
};

export const getAsyncFlag = async (key: string): Promise<boolean> => {
    try {
        const value = await AsyncStorage.getItem(key);
        return value === 'true';
    } catch (e) {
        console.error(`Failed to get ${key} from AsyncStorage`, e);
        return false;
    }
};

export interface RidePoint {
    coordinate: {
        latitude: number;
        longitude: number;
    };
    timestamp: number;
    elevation?: number;
}

export interface RideReport {
    id: string;
    type: 'hazard' | 'incident' | 'note' | 'other';
    description: string;
    timestamp: number;
    location: {
        latitude: number;
        longitude: number;
    };
    media?: {
        type: 'image' | 'video';
        uri: string;
    };
}
interface RideState {
    // Ride recording state
    isRecording: boolean;
    isPaused: boolean;
    startTime: number | null;

    // Ride data
    points: RidePoint[]; // All points for calculations
    displayPoints: RidePoint[]; // Subset of points for rendering
    currentElevation: number;
    totalElevationGain: number;
    totalDistance: number;
    duration: number;
    currentSpeed: number;
    averageSpeed: number;
    maxSpeed: number;
    annotations: Omit<Annotation, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'rideId'>[];

    // Actions
    startRide: () => Promise<boolean>;
    pauseRide: () => Promise<boolean>;
    resumeRide: () => Promise<boolean>;
    finishRide: () => Promise<{ success: boolean; rideId?: string; error?: any }>;
    increaseDuration: () => void;
    addPoint: (location: LocationObject) => void;
    resetRide: () => void;
    addAnnotation: (annotation: Omit<Annotation, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'rideId'>) => void;
    setRecording: (isRecording: boolean) => void;
}

const calculateElevationGain = (currentElevation: number, newElevation: number): number => {
    if (newElevation > currentElevation) {
        return newElevation - currentElevation;
    }
    return 0;
};

const locationToRidePoint = (location: LocationObject): RidePoint => ({
    coordinate: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
    },
    timestamp: location.timestamp,
    elevation: location.coords.altitude || 0,
});

export const useRideStore = create<RideState>((set, get) => ({
    // Initial state
    isRecording: false,
    isPaused: false,
    startTime: null,
    points: [],
    displayPoints: [],
    currentElevation: 0,
    duration: 0,
    totalElevationGain: 0,
    totalDistance: 0,
    currentSpeed: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    annotations: [],

    // Actions
    startRide: async (): Promise<boolean> => {
        try {
            // First, reset the ride state
            get().resetRide();

            // Then set the recording state
            set({
                isRecording: true,
                isPaused: false,
                startTime: Date.now(),
            });

            // Finally, update AsyncStorage flags
            await setAsyncFlag('isRecording', true);
            await setAsyncFlag('isPaused', false);

            // Check if location updates are already running and stop them
            const alreadyRunning = await Location.hasStartedLocationUpdatesAsync('location-recording');
            if (alreadyRunning) {
                await Location.stopLocationUpdatesAsync('location-recording');
            }

            // Start new location updates
            await Location.startLocationUpdatesAsync('location-recording', {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 2000,
                distanceInterval: 2,
                foregroundService: {
                    notificationTitle: 'Recording Delivery',
                    notificationBody: 'Devia is recording your delivery trip',
                },
            });

            console.log('Starting location updates');

            return true;
        } catch (error) {
            console.error('Failed to start location updates:', error);
            // If location updates fail to start, reset everything
            set({
                isRecording: false,
                isPaused: false,
            });
            await setAsyncFlag('isRecording', false);
            await setAsyncFlag('isPaused', false);
            return false;
        }
    },

    pauseRide: async (): Promise<boolean> => {
        try {
            const alreadyRunning = await Location.hasStartedLocationUpdatesAsync('location-recording');
            if (alreadyRunning) {
                await Location.stopLocationUpdatesAsync('location-recording');
            }
            set({
                isPaused: true,
            });
            await setAsyncFlag('isPaused', true);
            return true;
        } catch (error) {
            console.error('Failed to pause location updates:', error);
            await setAsyncFlag('isPaused', false);
            return false;
        }
    },

    resumeRide: async (): Promise<boolean> => {
        try {
            await Location.startLocationUpdatesAsync('location-recording', {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 2000,
                distanceInterval: 2,
                foregroundService: {
                    notificationTitle: 'Recording Delivery',
                    notificationBody: 'Devia is recording your delivery trip',
                },
            });
            set({
                isPaused: false,
            });
            await setAsyncFlag('isPaused', false);
            return true;
        } catch (error) {
            console.error('Failed to resume location updates:', error);
            // If location updates fail to start, we should keep the ride paused
            set({
                isPaused: true,
            });
            await setAsyncFlag('isPaused', true);
            return false;
        }
    },

    finishRide: async () => {
        try {
            const stillRunning = await Location.hasStartedLocationUpdatesAsync('location-recording');
            if (stillRunning) {
                await Location.stopLocationUpdatesAsync('location-recording');
            }

            set({
                // isRecording: false,
                isPaused: true,
            });

            await setAsyncFlag('isPaused', true);

            const {
                points,
                totalDistance,
                totalElevationGain,
                maxSpeed,
                averageSpeed,
                annotations,
                startTime,
                duration,
            } = get();
            let pointsForSave = points;
            if (pointsForSave.length === 0) {
                const location = await Location.getCurrentPositionAsync({});
                pointsForSave = [locationToRidePoint(location)];
            }

            const rideData: NewRideData = {
                points: pointsForSave,
                distance: totalDistance,
                elevationGain: totalElevationGain,
                maxSpeed,
                averageSpeed,
                startTime: startTime || Date.now(),
                endTime: Date.now(),
                duration: duration,
                rideName: 'New Delivery Trip',
                annotations,
                isPublic: false,
                isGPXUpload: false,
                fromWeb: false,
            };

            const rideId = await saveRide(rideData);

            set({
                isRecording: false,
                isPaused: false,
            });
            await setAsyncFlag('isPaused', false);
            await setAsyncFlag('isRecording', false);
            return { success: true, rideId };
        } catch (error) {
            console.error('Failed to save ride:', error);
            return { success: false, error };
        }
    },

    increaseDuration: () => {
        set(state => ({
            duration: state.duration + 1,
        }));
    },

    addPoint: (location: LocationObject) => {
        const { points, displayPoints, currentElevation, totalElevationGain, totalDistance, maxSpeed } = get();

        const newPoint = locationToRidePoint(location);

        // Calculate new metrics
        let newTotalDistance = totalDistance;
        let newTotalElevationGain = totalElevationGain;
        let newMaxSpeed = maxSpeed;
        let newCurrentSpeed = 0;

        if (points.length > 0) {
            const lastPoint = points[points.length - 1];
            const distance = haversineDistance(lastPoint, newPoint);
            newTotalDistance = totalDistance + distance;

            // Calculate current speed based on distance and time between points
            const timeDiff = (newPoint.timestamp - lastPoint.timestamp) / 1000; // Convert to seconds
            if (timeDiff > 0) {
                newCurrentSpeed = distance / timeDiff; // meters per second
                if (newCurrentSpeed > newMaxSpeed) {
                    newMaxSpeed = newCurrentSpeed;
                }
            }

            if (newPoint.elevation) {
                const elevationGain = calculateElevationGain(currentElevation, newPoint.elevation);
                newTotalElevationGain = totalElevationGain + elevationGain;
            }
        }

        const newPoints = [...points, newPoint];

        let newDisplayPoints = displayPoints;
        if (newPoints.length < 3) {
            newDisplayPoints = newPoints;
        } else {
            if (newPoints.length % 5 === 0) {
                newDisplayPoints = simplify(newPoints, 0.00005);
            }
        }

        console.log('newPoints', newPoints.length, 'newDisplayPoints', newDisplayPoints.length);

        set({
            points: newPoints,
            displayPoints: newDisplayPoints,
            currentElevation: newPoint.elevation || currentElevation,
            totalElevationGain: newTotalElevationGain,
            totalDistance: newTotalDistance,
            currentSpeed: newCurrentSpeed,
            maxSpeed: newMaxSpeed,
            averageSpeed: newTotalDistance / ((Date.now() - (get().startTime || Date.now())) / 1000),
        });
    },

    addAnnotation: (annotation: Omit<Annotation, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'rideId'>) => {
        set(state => ({
            annotations: [...state.annotations, annotation],
        }));
    },
    resetRide: async () => {
        set({
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

        // Also clear AsyncStorage flags to maintain consistency
        await setAsyncFlag('isRecording', false);
        await setAsyncFlag('isPaused', false);
    },
    setRecording: (isRecording: boolean) => {
        set({ isRecording });
    },
}));

function simplify(points: RidePoint[], tolerance: number): RidePoint[] {
    if (points.length <= 2) {
        return points;
    }

    let maxDist = 0;
    let maxIndex = 0;
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
        const dist = perpendicularDistance(points[i], firstPoint, lastPoint);
        if (dist > maxDist) {
            maxDist = dist;
            maxIndex = i;
        }
    }

    if (maxDist > tolerance) {
        const left = simplify(points.slice(0, maxIndex + 1), tolerance);
        const right = simplify(points.slice(maxIndex), tolerance);
        return [...left.slice(0, left.length - 1), ...right];
    } else {
        return [firstPoint, lastPoint];
    }
}

function perpendicularDistance(point: RidePoint, lineStart: RidePoint, lineEnd: RidePoint): number {
    const dx = lineEnd.coordinate.longitude - lineStart.coordinate.longitude;
    const dy = lineEnd.coordinate.latitude - lineStart.coordinate.latitude;

    if (dx === 0 && dy === 0) {
        return haversineDistance(point, lineStart);
    }

    const t =
        ((point.coordinate.longitude - lineStart.coordinate.longitude) * dx +
            (point.coordinate.latitude - lineStart.coordinate.latitude) * dy) /
        (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));

    const projection = {
        coordinate: {
            longitude: lineStart.coordinate.longitude + clampedT * dx,
            latitude: lineStart.coordinate.latitude + clampedT * dy,
        },
        timestamp: point.timestamp,
        elevation: point.elevation,
    };

    return haversineDistance(point, projection);
}

export const haversineDistance = (coord1: RidePoint, coord2: RidePoint): number => {
    const R = 6371e3; // Earth radius in meters
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

    const lat1 = toRadians(coord1.coordinate.latitude);
    const lat2 = toRadians(coord2.coordinate.latitude);
    const deltaLat = toRadians(coord2.coordinate.latitude - coord1.coordinate.latitude);
    const deltaLon = toRadians(coord2.coordinate.longitude - coord1.coordinate.longitude);

    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};
