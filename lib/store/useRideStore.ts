import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import { create } from 'zustand';
import { Annotation } from '../firebase-crud/annotations';
import { isTransientFirestoreError, NewRideData, saveRide } from '../firebase-crud/rides';
import { LngLat, RouteCongestionSegment, RouteResult, RouteStep } from '../utils/directions';
import { snapLngLatToRoute } from '../utils/routeSnapping';

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

export interface GeneratedRoute {
    routeId: string;
    rideId: string; // Will be set when saving the ride
    type: 'Initial Route' | 'Regenerated Route';
    routePoints: LngLat[];
    sequence: number;
    generatedAt: number;
    remainingTravelTimeOriginal: number | null;
    remainingTravelTimeNew: number;
    remainingDistanceOriginal: number | null;
    remainingDistanceNew: number;
}

export interface RideDeviationEvent {
    timestamp: number;
    location: LngLat;
    offRouteDistanceM: number;
    previousInstruction?: string;
    newInstruction?: string;
    previousEtaSec?: number;
    newEtaSec?: number;
    activeRouteId?: string;
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
    activeRouteCoordinates: LngLat[];
    activeRouteCongestionSegments: RouteCongestionSegment[];
    activeRouteDestination: LngLat | null;
    activeRouteDurationSec: number;
    activeRouteDistanceM: number;
    suggestedRouteDurationSec: number;
    suggestedRouteDistanceM: number;
    activeRouteUpdatedAt: number | null;
    routeUpdateStatus: 'idle' | 'traffic' | 'rerouting';
    deviationEvents: RideDeviationEvent[];
    generatedRoutes: GeneratedRoute[];
    activeGeneratedRouteId: string | null;
    annotations: Omit<Annotation, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'rideId'>[];

    // Actions
    startRide: () => Promise<boolean>;
    finishRide: (tripName?: string) => Promise<{ success: boolean; rideId?: string; error?: any }>;
    increaseDuration: () => void;
    syncDurationFromClock: () => void;
    addPoint: (location: LocationObject) => void;
    resetRide: () => void;
    addAnnotation: (annotation: Omit<Annotation, 'id' | 'timestamp' | 'userId' | 'createdAt' | 'rideId'>) => void;
    setRecording: (isRecording: boolean) => void;
    setActiveRouteSteps: (steps: RouteStep[]) => void;
    setActiveRoute: (route: RouteResult, destination?: LngLat | null) => void;
    setRouteUpdateStatus: (status: RideState['routeUpdateStatus']) => void;
    addDeviationEvent: (event: RideDeviationEvent) => void;
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
    activeRouteCoordinates: [],
    activeRouteCongestionSegments: [],
    activeRouteDestination: null,
    activeRouteDurationSec: 0,
    activeRouteDistanceM: 0,
    suggestedRouteDurationSec: 0,
    suggestedRouteDistanceM: 0,
    activeRouteUpdatedAt: null,
    routeUpdateStatus: 'idle',
    deviationEvents: [],
    generatedRoutes: [],
    activeGeneratedRouteId: null,
    annotations: [],

    // Actions
    startRide: async (): Promise<boolean> => {
        try {
            const {
                activeRouteSteps,
                activeRouteCoordinates,
                activeRouteCongestionSegments,
                activeRouteDestination,
                activeRouteDurationSec,
                activeRouteDistanceM,
                suggestedRouteDurationSec,
                suggestedRouteDistanceM,
                activeRouteUpdatedAt,
            } = get();
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
                activeRouteCoordinates,
                activeRouteCongestionSegments,
                activeRouteDestination,
                activeRouteDurationSec,
                activeRouteDistanceM,
                suggestedRouteDurationSec,
                suggestedRouteDistanceM,
                activeRouteUpdatedAt,
                generatedRoutes: [],
                activeGeneratedRouteId: null,
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

    finishRide: async (tripName?: string) => {
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
                activeRouteDurationSec,
                activeRouteDistanceM,
                suggestedRouteDurationSec,
                suggestedRouteDistanceM,
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
                suggestedRouteDistanceM: suggestedRouteDistanceM || activeRouteDistanceM || undefined,
                suggestedRouteDurationSec: suggestedRouteDurationSec || activeRouteDurationSec || undefined,
                rideName: tripName?.trim() || 'Metro Manila Trip',
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
            // The record screen shows a retry state on failure and the ride data stays
            // in this store, so an offline/transient failure is expected, not a crash.
            if (isTransientFirestoreError(error)) {
                console.warn('Failed to save ride (offline/unavailable) — rider can retry.');
            } else {
                console.error('Failed to save ride:', error);
            }
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
        const { points, displayPoints, currentElevation, totalElevationGain, totalDistance, maxSpeed, activeRouteCoordinates } = get();

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

        const newDisplayPoints = getNextDisplayPoints({
            rawPoint: newPoint,
            rawPoints: newPoints,
            displayPoints,
            routeCoordinates: activeRouteCoordinates,
        });

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
            activeRouteCoordinates: [],
            activeRouteCongestionSegments: [],
            activeRouteDestination: null,
            activeRouteDurationSec: 0,
            activeRouteDistanceM: 0,
            suggestedRouteDurationSec: 0,
            suggestedRouteDistanceM: 0,
            activeRouteUpdatedAt: null,
            routeUpdateStatus: 'idle',
            deviationEvents: [],
            generatedRoutes: [],
            activeGeneratedRouteId: null,
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
    setActiveRoute: (route: RouteResult, destination = get().activeRouteDestination) => {
        const state = get();
        const shouldRefreshSuggestedRoute =
            !state.isRecording || state.suggestedRouteDistanceM <= 0 || state.suggestedRouteDurationSec <= 0;
            
        let newGeneratedRoutes = state.generatedRoutes;
        let newActiveGeneratedRouteId = state.activeGeneratedRouteId;

        // If we are recording, save this as a generated route snapshot
        if (state.isRecording) {
            const sequence = state.generatedRoutes.length + 1;
            const routeId = `route-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            
            const newGeneratedRoute: GeneratedRoute = {
                routeId,
                rideId: '', // Will be populated in saveRide
                type: sequence === 1 ? 'Initial Route' : 'Regenerated Route',
                routePoints: route.coordinates,
                sequence,
                generatedAt: Date.now(),
                remainingTravelTimeOriginal: sequence === 1 ? null : state.activeRouteDurationSec,
                remainingTravelTimeNew: route.durationSec,
                remainingDistanceOriginal: sequence === 1 ? null : state.activeRouteDistanceM,
                remainingDistanceNew: route.distanceM,
            };
            
            newGeneratedRoutes = [...state.generatedRoutes, newGeneratedRoute];
            newActiveGeneratedRouteId = routeId;
        }

        set({
            activeRouteSteps: route.steps,
            activeRouteCoordinates: route.coordinates,
            activeRouteCongestionSegments: route.congestionSegments,
            activeRouteDestination: destination ?? null,
            activeRouteDurationSec: route.durationSec,
            activeRouteDistanceM: route.distanceM,
            suggestedRouteDurationSec: shouldRefreshSuggestedRoute ? route.durationSec : state.suggestedRouteDurationSec,
            suggestedRouteDistanceM: shouldRefreshSuggestedRoute ? route.distanceM : state.suggestedRouteDistanceM,
            activeRouteUpdatedAt: Date.now(),
            generatedRoutes: newGeneratedRoutes,
            activeGeneratedRouteId: newActiveGeneratedRouteId,
        });
    },
    setRouteUpdateStatus: status => {
        set({ routeUpdateStatus: status });
    },
    addDeviationEvent: event => {
        const activeRouteId = get().activeGeneratedRouteId ?? undefined;
        set(state => ({ deviationEvents: [...state.deviationEvents, { ...event, activeRouteId }] }));
    },
}));

const DISPLAY_ROUTE_SNAP_THRESHOLD_M = 55;
const MIN_DISPLAY_POINT_DISTANCE_M = 1.5;

export function getNextDisplayPoints({
    rawPoint,
    rawPoints,
    displayPoints,
    routeCoordinates,
}: {
    rawPoint: RidePoint;
    rawPoints: RidePoint[];
    displayPoints: RidePoint[];
    routeCoordinates: LngLat[];
}): RidePoint[] {
    if (routeCoordinates.length > 1) {
        const snapped = snapLngLatToRoute(
            [rawPoint.coordinate.longitude, rawPoint.coordinate.latitude],
            routeCoordinates,
            DISPLAY_ROUTE_SNAP_THRESHOLD_M
        );

        if (!snapped) {
            return displayPoints;
        }

        const snappedPoint: RidePoint = {
            ...rawPoint,
            coordinate: {
                longitude: snapped.coordinate[0],
                latitude: snapped.coordinate[1],
            },
        };
        const lastDisplayPoint = displayPoints[displayPoints.length - 1];
        if (lastDisplayPoint && haversineDistance(lastDisplayPoint, snappedPoint) < MIN_DISPLAY_POINT_DISTANCE_M) {
            return displayPoints;
        }
        return [...displayPoints, snappedPoint];
    }

    if (rawPoints.length < 3) {
        return rawPoints;
    }

    if (rawPoints.length % 5 === 0) {
        return simplify(rawPoints, 0.00005);
    }

    return displayPoints;
}

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
