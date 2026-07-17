import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import { create } from 'zustand';
import { Annotation } from '../firebase-crud/annotations';
import { NewRideData, saveRide } from '../firebase-crud/rides';
import { LngLat, RouteStep } from '../utils/directions';

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

export interface NavigationInstruction {
    text: string;
    distanceM: number;
    step: RouteStep;
}

interface RideState {
    // Ride recording state
    isRecording: boolean;
    isPaused: boolean;
    startTime: number | null;
    pausedAt: number | null;
    pausedDurationMs: number;

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
    activeRouteSteps: RouteStep[];
    annotations: Omit<Annotation, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'rideId'>[];

    // Actions
    startRide: () => Promise<boolean>;
    finishRide: () => Promise<{ success: boolean; rideId?: string; error?: any }>;
    increaseDuration: () => void;
    syncDurationFromClock: () => void;
    addPoint: (location: LocationObject) => void;
    resetRide: () => void;
    addAnnotation: (annotation: Omit<Annotation, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'rideId'>) => void;
    setRecording: (isRecording: boolean) => void;
    setActiveRouteSteps: (steps: RouteStep[]) => void;
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
    pausedAt: null,
    pausedDurationMs: 0,
    points: [],
    displayPoints: [],
    currentElevation: 0,
    duration: 0,
    totalElevationGain: 0,
    totalDistance: 0,
    currentSpeed: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    activeRouteSteps: [],
    annotations: [],

    // Actions
    startRide: async (): Promise<boolean> => {
        try {
            const activeRouteSteps = get().activeRouteSteps;
            // First, reset the ride state
            get().resetRide();

            // Then set the recording state
            set({
                isRecording: true,
                isPaused: false,
                startTime: Date.now(),
                pausedAt: null,
                pausedDurationMs: 0,
                duration: 0,
                currentSpeed: 0,
                activeRouteSteps,
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

    finishRide: async () => {
        try {
            const stillRunning = await Location.hasStartedLocationUpdatesAsync('location-recording');
            if (stillRunning) {
                await Location.stopLocationUpdatesAsync('location-recording');
            }

            set({
                // isRecording: false,
                isPaused: true,
                pausedAt: Date.now(),
                currentSpeed: 0,
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
        get().syncDurationFromClock();
    },

    syncDurationFromClock: () => {
        const { startTime, pausedDurationMs, pausedAt, isPaused } = get();
        if (!startTime) {
            set({ duration: 0 });
            return;
        }

        const pausedSoFar = isPaused && pausedAt ? pausedDurationMs + Math.max(0, Date.now() - pausedAt) : pausedDurationMs;
        const elapsedMs = Math.max(0, Date.now() - startTime - pausedSoFar);
        set({ duration: Math.floor(elapsedMs / 1000) });
    },

    addPoint: (location: LocationObject) => {
        const { points, displayPoints, currentElevation, totalElevationGain, totalDistance, maxSpeed } = get();

        const newPoint = locationToRidePoint(location);

        // Calculate new metrics
        let newTotalDistance = totalDistance;
        let newTotalElevationGain = totalElevationGain;
        let newMaxSpeed = maxSpeed;
        let newCurrentSpeed = sanitizeLocationSpeed(location.coords.speed, location.coords.accuracy) ?? 0;

        if (points.length > 0) {
            const lastPoint = points[points.length - 1];
            const distance = haversineDistance(lastPoint, newPoint);
            const timeDiff = (newPoint.timestamp - lastPoint.timestamp) / 1000; // Convert to seconds
            const movementDistance = filterGpsNoiseDistance(distance, timeDiff, location.coords.accuracy);

            if (timeDiff > 0) {
                newTotalDistance = totalDistance + movementDistance;
                const calculatedSpeed = calculateSpeedFromMovement(movementDistance, timeDiff, location.coords.accuracy);
                newCurrentSpeed = smoothSpeed(get().currentSpeed, newCurrentSpeed || calculatedSpeed);
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

        const elapsedSinceStartSec = Math.max(0, (Date.now() - (get().startTime || Date.now())) / 1000);

        set({
            points: newPoints,
            displayPoints: newDisplayPoints,
            currentElevation: newPoint.elevation || currentElevation,
            totalElevationGain: newTotalElevationGain,
            totalDistance: newTotalDistance,
            currentSpeed: newCurrentSpeed,
            maxSpeed: newMaxSpeed,
            averageSpeed: elapsedSinceStartSec > 0 ? newTotalDistance / elapsedSinceStartSec : 0,
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
            pausedAt: null,
            pausedDurationMs: 0,
            currentElevation: 0,
            totalElevationGain: 0,
            totalDistance: 0,
            currentSpeed: 0,
            averageSpeed: 0,
            maxSpeed: 0,
            activeRouteSteps: [],
            annotations: [],
        });

        // Also clear AsyncStorage flags to maintain consistency
        await setAsyncFlag('isRecording', false);
        await setAsyncFlag('isPaused', false);
    },
    setRecording: (isRecording: boolean) => {
        set({ isRecording });
    },
    setActiveRouteSteps: (steps: RouteStep[]) => {
        set({ activeRouteSteps: steps });
    },
}));

export function simplify(points: RidePoint[], tolerance: number): RidePoint[] {
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

const MAX_REASONABLE_SPEED_MPS = 35;
const MIN_MOVING_SPEED_MPS = 1.35;
const MIN_LOCATION_TIME_DIFF_SEC = 0.5;
const GPS_NOISE_DISTANCE_M = 5;
const MAX_GOOD_ACCURACY_M = 35;

export function sanitizeLocationSpeed(speed?: number | null, accuracyM?: number | null): number | null {
    if (typeof accuracyM === 'number' && Number.isFinite(accuracyM) && accuracyM > MAX_GOOD_ACCURACY_M) return null;
    if (typeof speed !== 'number' || !Number.isFinite(speed) || speed < MIN_MOVING_SPEED_MPS) return null;
    return Math.min(speed, MAX_REASONABLE_SPEED_MPS);
}

export function calculateSpeedFromMovement(distanceM: number, timeDiffSec: number, accuracyM?: number | null): number {
    if (typeof accuracyM === 'number' && Number.isFinite(accuracyM) && accuracyM > MAX_GOOD_ACCURACY_M) return 0;
    if (!Number.isFinite(distanceM) || !Number.isFinite(timeDiffSec) || timeDiffSec < MIN_LOCATION_TIME_DIFF_SEC || distanceM < GPS_NOISE_DISTANCE_M) {
        return 0;
    }
    const speed = distanceM / timeDiffSec;
    return speed < MIN_MOVING_SPEED_MPS ? 0 : Math.min(speed, MAX_REASONABLE_SPEED_MPS);
}

export function smoothSpeed(previousSpeedMps: number, nextSpeedMps: number): number {
    if (!Number.isFinite(previousSpeedMps) || previousSpeedMps <= 0) return Math.max(0, nextSpeedMps);
    if (nextSpeedMps <= 0 && previousSpeedMps < MIN_MOVING_SPEED_MPS * 1.5) return 0;
    return previousSpeedMps * 0.45 + Math.max(0, nextSpeedMps) * 0.55;
}

function filterGpsNoiseDistance(distanceM: number, timeDiffSec: number, accuracyM?: number | null): number {
    if (typeof accuracyM === 'number' && Number.isFinite(accuracyM) && accuracyM > MAX_GOOD_ACCURACY_M) return 0;
    const noiseFloorM = Math.max(GPS_NOISE_DISTANCE_M, typeof accuracyM === 'number' && Number.isFinite(accuracyM) ? accuracyM * 0.35 : 0);
    if (timeDiffSec < MIN_LOCATION_TIME_DIFF_SEC || distanceM < noiseFloorM) return 0;
    return distanceM;
}

export function calculateRemainingDistanceM(options: {
    currentLocation?: RidePoint | null;
    destination?: RidePoint | null;
    routeDistanceM?: number;
    traveledDistanceM: number;
    previousRemainingM?: number;
}): number {
    const routeRemaining =
        typeof options.routeDistanceM === 'number' && Number.isFinite(options.routeDistanceM)
            ? Math.max(0, options.routeDistanceM - options.traveledDistanceM)
            : null;
    const directRemaining = options.currentLocation && options.destination ? haversineDistance(options.currentLocation, options.destination) : null;
    const remaining = routeRemaining ?? directRemaining ?? 0;

    if (typeof options.previousRemainingM === 'number' && remaining > options.previousRemainingM) {
        const noiseAllowanceM = Math.max(10, options.previousRemainingM * 0.03);
        if (remaining - options.previousRemainingM <= noiseAllowanceM) {
            return options.previousRemainingM;
        }
    }

    return Math.max(0, remaining);
}

function routeStepToRidePoint(location: LngLat): RidePoint {
    return {
        coordinate: {
            longitude: location[0],
            latitude: location[1],
        },
        timestamp: Date.now(),
    };
}

export function formatNavigationDistance(distanceM: number): string {
    if (!Number.isFinite(distanceM)) return '';
    if (distanceM < 1000) return `${Math.max(0, Math.round(distanceM / 10) * 10)} m`;
    return `${(distanceM / 1000).toFixed(distanceM < 10000 ? 1 : 0)} km`;
}

function getInstructionVerb(step: RouteStep): string {
    const modifier = step.maneuverModifier?.toLowerCase() ?? '';
    const type = step.maneuverType.toLowerCase();
    if (modifier.includes('left')) return 'Turn left';
    if (modifier.includes('right')) return 'Turn right';
    if (type.includes('arrive')) return 'Arrive';
    if (type.includes('roundabout')) return 'Take the roundabout';
    return 'Continue straight';
}

export function formatNavigationInstruction(step: RouteStep, distanceM: number): string {
    const base = step.instruction && !/^continue on/i.test(step.instruction) ? step.instruction : getInstructionVerb(step);
    const distance = formatNavigationDistance(distanceM);
    return distance ? `${base} in ${distance}` : base;
}

export function getNextNavigationInstruction(currentLocation: RidePoint | null, steps: RouteStep[]): NavigationInstruction | null {
    if (steps.length === 0) return null;
    if (!currentLocation) {
        const firstStep = steps[0];
        return {
            text: formatNavigationInstruction(firstStep, firstStep.distanceM),
            distanceM: firstStep.distanceM,
            step: firstStep,
        };
    }

    const candidates = steps
        .map(step => {
            const distanceM = haversineDistance(currentLocation, routeStepToRidePoint(step.location));
            return { step, distanceM };
        })
        .filter(candidate => candidate.distanceM > 20)
        .sort((a, b) => a.distanceM - b.distanceM);
    const next = candidates[0] ?? { step: steps[steps.length - 1], distanceM: 0 };

    return {
        text: formatNavigationInstruction(next.step, next.distanceM),
        distanceM: next.distanceM,
        step: next.step,
    };
}
