import OpenCameraView from '@/components/camera/CameraView';
import SpinningWheel from '@/components/common/SpinningWheel';
import MapRender from '@/components/map/MapRender';
import { PredefinedAnnotation, predefinedAnnotations } from '@/lib/common/annotations';
import { calculateRemainingDistanceM, getAsyncFlag, getNextNavigationInstruction, RidePoint, useRideStore } from '@/lib/store/useRideStore';
import { calculateSpeedAdjustedEtaSec, getDistanceToRouteM, getRoute, LngLat } from '@/lib/utils/directions';
import { clampFraction, DEFAULT_ROUTE_PROGRESS_SNAP_M, estimateRemainingEtaSec, getRouteProgress } from '@/lib/utils/routeProgress';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { buildTripRouteTitle } from '@/lib/utils/tripTitle';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
    Button,
    Icon,
    IconButton,
    MD3Theme,
    Modal,
    Portal,
    Surface,
    Text,
    useTheme,
} from 'react-native-paper';

export default function Record() {
    const theme = useTheme();

    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [annotation, setAnnotation] = useState<PredefinedAnnotation | null>(null);
    const [reportDescription, setReportDescription] = useState('');
    const [reportMedia, setReportMedia] = useState<{ type: 'image' | 'video'; uri: string } | null>(null);
    const [showCamera, setShowCamera] = useState(false);

    // variables for saving ride
    const [isSaving, setIsSaving] = useState(false);
    const [progressText, setProgressText] = useState('Preparing trip data...');
    const [error, setError] = useState(false);

    const {
        isRecording,
        isPaused,
        startTime,
        totalDistance,
        currentSpeed,
        duration,
        points,
        activeRouteSteps,
        activeRouteCoordinates,
        activeRouteDestination,
        activeRouteDurationSec,
        activeRouteDistanceM,
        activeRouteUpdatedAt,
        routeUpdateStatus,
        deviationEvents,
        startRide,
        finishRide,
        increaseDuration,
        syncDurationFromClock,
        resetRide,
        addAnnotation,
        setRecording,
        setActiveRoute,
        setRouteUpdateStatus,
        addDeviationEvent,
    } = useRideStore();

    // const [duration, setDuration] = useState(0);
    const [backgroundPermissionWarningShown, setBackgroundPermissionWarningShown] = useState(false);

    // ETA generated on the Route Preview screen; counts down as the trip runs.
    const { etaSec, routeDistanceM, destLng, destLat, destination } = useLocalSearchParams<{
        etaSec?: string;
        destination?: string;
        routeDistanceM?: string;
        destLng?: string;
        destLat?: string;
    }>();
    const etaTotalSec = activeRouteDurationSec || Number(etaSec ?? 0);
    const initialRouteDistanceM = Number(routeDistanceM ?? 0);
    const currentRouteDistanceM = activeRouteDistanceM || initialRouteDistanceM;
    const destinationCoordinates: LngLat | null = useMemo(
        () =>
            activeRouteDestination ??
            (destLng && destLat && Number.isFinite(Number(destLng)) && Number.isFinite(Number(destLat))
                ? [Number(destLng), Number(destLat)]
                : null),
        [activeRouteDestination, destLat, destLng]
    );
    const destinationPoint: RidePoint | null = destinationCoordinates
            ? {
                  coordinate: {
                      longitude: destinationCoordinates[0],
                      latitude: destinationCoordinates[1],
                  },
                  timestamp: Date.now(),
              }
            : null;
    const currentPoint = points.length > 0 ? points[points.length - 1] : null;
    const nextInstruction = getNextNavigationInstruction(currentPoint, activeRouteSteps);
    const [previousRemainingDistanceM, setPreviousRemainingDistanceM] = useState<number | undefined>(undefined);

    // Snap the rider onto the active route to derive progress-based metrics. When the
    // rider is off-route (snap fails) this is null and we fall back to the last reliable
    // value / raw GPS accumulation so the numbers don't jump around.
    const routeProgress = useMemo(() => {
        if (!currentPoint || activeRouteCoordinates.length < 2) return null;
        return getRouteProgress(
            [currentPoint.coordinate.longitude, currentPoint.coordinate.latitude],
            activeRouteCoordinates,
            DEFAULT_ROUTE_PROGRESS_SNAP_M
        );
    }, [currentPoint, activeRouteCoordinates]);

    // Remaining distance measured along the route; smoothed against the previous value so a
    // temporary snapping failure doesn't cause a wild jump (see calculateRemainingDistanceM).
    const remainingDistanceM = calculateRemainingDistanceM({
        currentLocation: currentPoint,
        destination: destinationPoint,
        routeDistanceM: routeProgress
            ? routeProgress.totalRouteDistanceM
            : currentRouteDistanceM > 0
              ? currentRouteDistanceM
              : undefined,
        traveledDistanceM: routeProgress ? routeProgress.traveledDistanceM : totalDistance,
        previousRemainingM: previousRemainingDistanceM,
    });

    // ETA = traffic-aware route duration x fraction of the route still ahead. The duration is
    // refreshed from the rider's current position by the traffic/reroute effects below, so this
    // decreases naturally as the rider advances instead of resetting on a wall-clock countdown.
    const fractionRemaining = routeProgress
        ? clampFraction(routeProgress.totalRouteDistanceM > 0 ? remainingDistanceM / routeProgress.totalRouteDistanceM : 1)
        : clampFraction(currentRouteDistanceM > 0 ? remainingDistanceM / currentRouteDistanceM : 1);
    const etaRemainingSec = estimateRemainingEtaSec(etaTotalSec, fractionRemaining);
    const speedAdjustedEtaRemainingSec = calculateSpeedAdjustedEtaSec({
        trafficRemainingSec: etaRemainingSec,
        remainingDistanceM,
        currentSpeedMps: currentSpeed,
    });
    const autoStartedRef = useRef(false);
    const offRouteCountRef = useRef(0);
    const lastRerouteAtRef = useRef(0);
    const lastTrafficRefreshAtRef = useRef(0);
    const isRouteRequestActiveRef = useRef(false);

    // Timer effect for duration
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording && !isPaused && startTime) {
            syncDurationFromClock();
            interval = setInterval(() => increaseDuration(), 1000);
        }
        return () => clearInterval(interval);
    }, [increaseDuration, isPaused, isRecording, startTime, syncDurationFromClock]);

    useEffect(() => {
        setPreviousRemainingDistanceM(remainingDistanceM);
    }, [remainingDistanceM]);

    useEffect(() => {
        if (!isRecording || isPaused || !currentPoint || !destinationCoordinates || activeRouteCoordinates.length < 2 || isRouteRequestActiveRef.current) {
            return;
        }

        const currentLngLat: LngLat = [currentPoint.coordinate.longitude, currentPoint.coordinate.latitude];
        const distanceFromRouteM = getDistanceToRouteM(currentLngLat, activeRouteCoordinates);
        const now = Date.now();

        if (distanceFromRouteM < 90) {
            offRouteCountRef.current = 0;
            return;
        }

        offRouteCountRef.current += 1;
        if (offRouteCountRef.current < 2 || now - lastRerouteAtRef.current < 45000) {
            return;
        }

        lastRerouteAtRef.current = now;
        offRouteCountRef.current = 0;
        isRouteRequestActiveRef.current = true;
        const previousInstruction = nextInstruction?.text;
        const previousEtaSec = etaRemainingSec;
        setRouteUpdateStatus('rerouting');

        getRoute(currentLngLat, destinationCoordinates)
            .then(route => {
                if (!route) return;
                setActiveRoute(route, destinationCoordinates, 'Regenerated Route');
                setPreviousRemainingDistanceM(route.distanceM);
                addDeviationEvent({
                    timestamp: now,
                    location: currentLngLat,
                    offRouteDistanceM: distanceFromRouteM,
                    previousInstruction,
                    newInstruction: route.steps[0]?.instruction,
                    previousEtaSec,
                    newEtaSec: route.durationSec,
                });
            })
            .catch(error => {
                console.warn('Failed to reroute after deviation:', error);
            })
            .finally(() => {
                isRouteRequestActiveRef.current = false;
                setRouteUpdateStatus('idle');
            });
    }, [
        activeRouteCoordinates,
        addDeviationEvent,
        currentPoint,
        destinationCoordinates,
        etaRemainingSec,
        isPaused,
        isRecording,
        nextInstruction?.text,
        setActiveRoute,
        setRouteUpdateStatus,
    ]);

    useEffect(() => {
        if (!isRecording || isPaused || !currentPoint || !destinationCoordinates || isRouteRequestActiveRef.current) {
            return;
        }

        const now = Date.now();
        const refreshEveryMs = 3 * 60 * 1000;
        const lastRefresh = lastTrafficRefreshAtRef.current || activeRouteUpdatedAt || 0;
        if (now - lastRefresh < refreshEveryMs) return;

        lastTrafficRefreshAtRef.current = now;
        isRouteRequestActiveRef.current = true;
        setRouteUpdateStatus('traffic');

        const currentLngLat: LngLat = [currentPoint.coordinate.longitude, currentPoint.coordinate.latitude];
        getRoute(currentLngLat, destinationCoordinates)
            .then(route => {
                if (!route) return;
                setActiveRoute(route, destinationCoordinates, 'Traffic Update');
                setPreviousRemainingDistanceM(route.distanceM);
            })
            .catch(error => {
                console.warn('Failed to refresh live traffic route:', error);
            })
            .finally(() => {
                isRouteRequestActiveRef.current = false;
                setRouteUpdateStatus('idle');
            });
    }, [activeRouteUpdatedAt, currentPoint, destinationCoordinates, isPaused, isRecording, setActiveRoute, setRouteUpdateStatus]);

    // Check background location permission on mount
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.error('Location permission not granted');
                return;
            }

            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            if (backgroundStatus !== 'granted') {
                console.error('Background location permission not granted');
                if (!backgroundPermissionWarningShown) {
                    setBackgroundPermissionWarningShown(true);
                    Alert.alert(
                        'Background Location Recommended',
                        'Devia can keep recording while the app is in the background when background location is enabled.'
                    );
                }
                return;
            }
        })();
    }, [backgroundPermissionWarningShown]);

    // State recovery effect - sync AsyncStorage with Zustand state
    useEffect(() => {
        (async () => {
            try {
                const asyncIsRecording = await getAsyncFlag('isRecording');
                const asyncIsPaused = await getAsyncFlag('isPaused');

                // If AsyncStorage says we're recording but Zustand state doesn't match, sync them
                if (asyncIsRecording !== isRecording || asyncIsPaused !== isPaused) {
                    console.log('State mismatch detected, syncing...');
                    setRecording(asyncIsRecording);

                    if (asyncIsRecording && !isRecording) {
                        const isLocationRunning = await Location.hasStartedLocationUpdatesAsync('location-recording');
                        if (!isLocationRunning && !asyncIsPaused) {
                            console.log('Location updates not running, attempting to resume tracking');
                            await Location.startLocationUpdatesAsync('location-recording', {
                                accuracy: Location.Accuracy.BestForNavigation,
                                timeInterval: 2000,
                                distanceInterval: 2,
                                foregroundService: {
                                    notificationTitle: 'Recording Delivery',
                                    notificationBody: 'Devia is recording your delivery trip',
                                },
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error during state recovery:', error);
            }
        })();
    }, []);

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
            .toString()
            .padStart(2, '0')}`;
    };

    const formatEta = (seconds: number) => {
        if (etaTotalSec <= 0) return '—';
        if (seconds <= 0) return 'Arriving';
        if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
        return `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
    };

    const handleStart = async () => {
        try {
            // Check permissions before starting
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Location Permission Required',
                    'Devia needs location permission to record your trip. Please enable it in your device settings.',
                    [{ text: 'OK' }]
                );
                return;
            }

            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            if (backgroundStatus !== 'granted') {
                Alert.alert(
                    'Background Location Permission Required',
                    'Devia needs background location permission to continue recording the trip when the app is in the background.',
                    [{ text: 'OK' }]
                );
                return;
            }

            const result = await startRide();
            if (!result) {
                Alert.alert('Failed to Start Recording', 'Unable to start location tracking. Please try again.', [
                    { text: 'OK' },
                ]);
            }
        } catch (error) {
            console.error('Error starting ride:', error);
            Alert.alert('Error', 'An unexpected error occurred while starting the ride. Please try again.', [
                { text: 'OK' },
            ]);
        }
    };

    // The trip was already confirmed on Route Preview ("Start Trip"), so begin
    // recording automatically on entry — no need for a second Start button.
    useEffect(() => {
        if (!isRecording && !autoStartedRef.current) {
            autoStartedRef.current = true;
            handleStart();
        }
    }, []);

    const finishRideProcess = async () => {
        const messages = [
            'Preparing trip data...',
            'Processing GPS points...',
            'Uploading to cloud...',
            'Finalizing trip...',
        ];

        for (let i = 0; i < messages.length; i++) {
            setProgressText(messages[i]);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const latestRidePoints = useRideStore.getState().points;
        let originPoint = latestRidePoints[0] ?? currentPoint;
        if (!originPoint) {
            try {
                const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                originPoint = {
                    coordinate: {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    },
                    timestamp: location.timestamp,
                };
            } catch (locationError) {
                console.warn('Unable to resolve current location for trip title', locationError);
            }
        }

        const tripName = buildTripRouteTitle({
            origin: originPoint?.coordinate,
            destination: destinationPoint?.coordinate,
            destinationLabel: destination,
        });
        const result = await finishRide(tripName);

        if (result.success) {
            setProgressText('Trip saved successfully!');
            router.replace(
                `/main/(tabs)/record/post-trip-questionnaire?rideId=${encodeURIComponent(
                    result.rideId as string
                )}&deviationCount=${deviationEvents.length}`
            );
            setIsSaving(false);
        } else {
            setError(true);
            setProgressText('Something went wrong! Please try again.');
        }
    };

    const handleFinish = async () => {
        try {
            setIsSaving(true);

            // Check if there are coordinates and distance before finishing
            // if (totalDistance === 0) {
            //     Alert.alert(
            //         'Cannot finish ride',
            //         'Your ride needs to have some distance recorded before it can be finished.',
            //         [{ text: 'OK' }]
            //     );
            //     setIsSaving(false);
            //     return;
            // }

            if (totalDistance === 0) {
                Alert.alert(
                    'No distance recorded',
                    'This trip has no recorded distance. Finish anyway?',
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                            onPress: () => setIsSaving(false),
                        },
                        {
                            text: 'Finish anyway',
                            onPress: finishRideProcess,
                        },
                    ],
                    { cancelable: true }
                );
                return;
            }

            await finishRideProcess();
        } catch (error) {
            console.error('Error finishing ride:', error);
        }
    };

    const handleAddReport = async () => {
        try {
            const location = await Location.getCurrentPositionAsync({});
            addAnnotation({
                sentiment: reportDescription,
                points: [
                    {
                        coordinate: {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        },
                        timestamp: Date.now(),
                        elevation: 0,
                    },
                ],
                annotationId: annotation?.id || '',
                type: annotation?.type || 'point',
                mediaUri: reportMedia?.uri,
                mediaType: reportMedia?.type,
            });
            setReportModalVisible(false);
            setReportDescription('');
            setReportMedia(null);
        } catch (error) {
            console.error('Error adding report:', error);
        }
    };

    const handlePickMedia = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos', 'livePhotos'],
                quality: 0.8,
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                setReportMedia({
                    type: asset.type === 'video' ? 'video' : 'image',
                    uri: asset.uri,
                });
            }
        } catch (error) {
            console.error('Error picking media:', error);
        }
    };

    const handleCaptureMedia = async () => {
        setShowCamera(true);
    };

    const handleCameraCapture = (uri: string, type: 'image' | 'video') => {
        setReportMedia({ type, uri });
        setShowCamera(false);
    };

    const styles = getStyles(theme);

    return (
        <>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <IconButton
                            icon="restart"
                            iconColor={theme.colors.onSurface}
                            onPress={() => {
                                Alert.alert('Reset Trip', 'Are you sure you want to reset this trip recording?', [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Reset', onPress: () => resetRide() },
                                ]);
                            }}
                        />
                    ),
                }}
            />
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                {/* Saving Ride UI */}
                {isSaving && (
                    <View style={styles.savingContainer}>
                        {progressText === 'Trip saved successfully!' ? (
                            <Icon source="cloud-check" size={sizes.size112} color={theme.colors.primary} />
                        ) : (
                            <SpinningWheel />
                        )}
                        <Text style={styles.savingText}>Saving Trip</Text>
                        <Text style={styles.progressText}>{progressText}</Text>
                        {error && (
                            <Button
                                icon="refresh"
                                mode="contained"
                                onPress={() => {
                                    setIsSaving(false);
                                    setError(false);
                                    setProgressText('Preparing trip data...');
                                }}
                            >
                                Try again
                            </Button>
                        )}
                    </View>
                )}
                {/* Paused Bar UI */}
                {isRecording && isPaused && (
                    <View
                        style={{
                            backgroundColor: theme.colors.tertiaryContainer,
                            padding: sizes.tiny,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Text
                            style={{
                                color: theme.colors.onTertiaryContainer,
                                fontFamily: 'LGEIHeadline-Bold',
                                fontSize: fontSizes.small,
                            }}
                        >
                            Trip Paused
                        </Text>
                    </View>
                )}
                {isRecording && nextInstruction && (
                    <Surface style={styles.guidanceBanner}>
                        <Icon source={routeUpdateStatus === 'idle' ? 'navigation-variant' : 'routes'} size={sizes.medium} color={theme.colors.onPrimaryContainer} />
                        <Text style={styles.guidanceText} numberOfLines={1}>
                            {routeUpdateStatus === 'rerouting'
                                ? 'Adjusting route from your current location...'
                                : routeUpdateStatus === 'traffic'
                                  ? 'Updating traffic and ETA...'
                                  : nextInstruction.text}
                        </Text>
                    </Surface>
                )}
                {/* Map View */}
                <MapRender />

                {/* Trip Stats — rider view: focus on Speed & ETA */}
                <Surface style={styles.statsContainer}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Speed</Text>
                            <Text style={styles.statNumber}>{(currentSpeed * 3.6).toFixed(1)}</Text>
                            <Text style={styles.statUnit}>km/h</Text>
                        </View>
                        <View style={{ width: 1, backgroundColor: theme.colors.outlineVariant, height: '70%' }} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>ETA</Text>
                            <Text style={styles.statNumber}>{formatEta(speedAdjustedEtaRemainingSec)}</Text>
                            <Text style={styles.statUnit}>remaining</Text>
                        </View>
                    </View>
                    <View style={styles.subStatsRow}>
                        <Text style={styles.subStat}>
                            <Text style={styles.subStatLabel}>Time </Text>
                            {formatDuration(duration)}
                        </Text>
                        <Text style={styles.subStat}>
                            <Text style={styles.subStatLabel}>Distance </Text>
                            {(remainingDistanceM / 1000).toFixed(2)} km
                        </Text>
                    </View>
                </Surface>

                {/* Controls — single Stop while recording (Start is just a fallback) */}
                <Surface style={styles.controlsContainer}>
                    {!isRecording ? (
                        <Button
                            mode="contained"
                            onPress={handleStart}
                            style={[styles.button]}
                            labelStyle={styles.buttonLabel}
                        >
                            Start Trip
                        </Button>
                    ) : (
                        <Button
                            mode="contained"
                            onPress={handleFinish}
                            icon="stop"
                            style={[styles.button, styles.stopButton]}
                            labelStyle={styles.buttonLabel}
                            contentStyle={{ flexDirection: 'row-reverse', height: sizes.size56 }}
                        >
                            Stop
                        </Button>
                    )}
                </Surface>

                {/* Report Modal */}
                <Portal>
                    <Modal
                        visible={reportModalVisible}
                        onDismiss={() => setReportModalVisible(false)}
                        contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
                    >
                        <Text style={styles.modalTitle}>Quick Annotation</Text>

                        <View
                            style={{
                                marginTop: sizes.medium,
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: sizes.regular,
                            }}
                        >
                            {predefinedAnnotations
                                .filter((annotation: PredefinedAnnotation) => annotation.type === 'point')
                                .map((predefinedAnnotation: PredefinedAnnotation) => (
                                    <TouchableOpacity
                                        key={predefinedAnnotation.id}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: sizes.small,
                                            borderRadius: sizes.small,
                                            borderWidth: 1,
                                            borderColor: theme.colors.onSurface,
                                            padding: sizes.regular,
                                            backgroundColor:
                                                predefinedAnnotation.id === annotation?.id
                                                    ? theme.colors.secondaryContainer
                                                    : theme.colors.surface,
                                        }}
                                        onPress={() => {
                                            setAnnotation(predefinedAnnotation);
                                        }}
                                    >
                                        <Icon
                                            source={predefinedAnnotation.icon}
                                            size={sizes.medium}
                                            color={theme.colors.onSurface}
                                        />
                                        <Text
                                            style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.tinyPlus }}
                                        >
                                            {predefinedAnnotation.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                        </View>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: sizes.small,
                                marginVertical: sizes.small,
                            }}
                        >
                            <View
                                style={{ flex: 1, height: 1, backgroundColor: theme.colors.onSurface, opacity: 0.4 }}
                            />
                            <Text style={{ fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.tiny }}>or</Text>
                            <View
                                style={{ flex: 1, height: 1, backgroundColor: theme.colors.onSurface, opacity: 0.4 }}
                            />
                        </View>

                        <View style={styles.mediaContainer}>
                            {reportMedia ? (
                                <View style={styles.mediaPreview}>
                                    <IconButton
                                        icon={reportMedia.type === 'image' ? 'image' : 'video'}
                                        size={24}
                                        onPress={() => setReportMedia(null)}
                                    />
                                    <Text style={styles.mediaText}>
                                        {reportMedia.type === 'image' ? 'Image' : 'Video'} attached
                                    </Text>
                                    <IconButton icon="close" size={24} onPress={() => setReportMedia(null)} />
                                </View>
                            ) : (
                                <View style={styles.mediaButtonsContainer}>
                                    <Button
                                        mode="contained"
                                        onPress={handleCaptureMedia}
                                        icon="camera"
                                        style={[styles.mediaButton]}
                                    >
                                        Take Photo/Video
                                    </Button>
                                    <Button
                                        mode="outlined"
                                        onPress={handlePickMedia}
                                        icon="image"
                                        style={[styles.mediaButton]}
                                    >
                                        Choose from Gallery
                                    </Button>
                                </View>
                            )}
                        </View>

                        <View style={styles.modalButtons}>
                            <Button
                                mode="outlined"
                                onPress={() => setReportModalVisible(false)}
                                style={styles.modalButton}
                            >
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleAddReport}
                                style={styles.modalButton}
                                disabled={!annotation && !reportMedia}
                            >
                                Add Annotation
                            </Button>
                        </View>
                    </Modal>
                </Portal>

                {/* Camera Modal */}
                <Portal>
                    <Modal
                        visible={showCamera}
                        onDismiss={() => setShowCamera(false)}
                        contentContainerStyle={styles.cameraModal}
                    >
                        <OpenCameraView onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
                    </Modal>
                </Portal>
            </View>
        </>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        mapContainer: {
            flex: 1,
        },
        map: {
            flex: 1,
        },
        statsContainer: {
            paddingVertical: sizes.small,
            paddingHorizontal: sizes.medium,
            marginHorizontal: sizes.medium,
            marginTop: sizes.small,
            borderRadius: sizes.medium,
            backgroundColor: theme.colors.surface,
        },
        guidanceBanner: {
            position: 'absolute',
            top: sizes.small,
            left: sizes.medium,
            right: sizes.medium,
            zIndex: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: sizes.small,
            paddingHorizontal: sizes.medium,
            paddingVertical: sizes.small,
            borderRadius: sizes.medium,
            backgroundColor: theme.colors.primaryContainer,
        },
        guidanceText: {
            flex: 1,
            fontSize: fontSizes.tinyPlus,
            fontFamily: 'LGEIText-SemiBold',
            color: theme.colors.onPrimaryContainer,
        },
        statsRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        statItem: {
            flex: 1,
            alignItems: 'center',
        },
        statNumber: {
            fontSize: fontSizes.subtitle,
            fontFamily: 'LGEIHeadline-Bold',
            color: theme.colors.onSurface,
        },
        statUnit: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-Regular',
            color: theme.colors.onSurfaceVariant,
        },
        statLabel: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-SemiBold',
            color: theme.colors.onSurfaceVariant,
            marginBottom: sizes.tiny,
        },
        subStatsRow: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            marginTop: sizes.small,
            paddingTop: sizes.small,
            borderTopWidth: 1,
            borderTopColor: theme.colors.outlineVariant,
        },
        subStat: {
            fontSize: fontSizes.tinyPlus,
            fontFamily: 'LGEIHeadline-Bold',
            color: theme.colors.onSurface,
        },
        subStatLabel: {
            fontFamily: 'LGEIText-Regular',
            color: theme.colors.onSurfaceVariant,
        },
        controlsContainer: {
            padding: sizes.large,
            margin: sizes.medium,
            marginTop: 0,
            borderRadius: sizes.medium,
            backgroundColor: theme.colors.surface,
        },
        button: {
            borderRadius: sizes.medium,
            height: sizes.size56,
            justifyContent: 'center',
            backgroundColor: theme.colors.primary,
        },
        buttonLabel: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIHeadline-Semibold',
        },
        stopButton: {
            backgroundColor: theme.colors.error,
        },
        mapFAB: {
            backgroundColor: theme.colors.surface,
        },
        reportFAB: {
            flex: 1,
            backgroundColor: theme.colors.tertiary,
            borderRadius: sizes.medium,
            height: sizes.size56,
            justifyContent: 'center',
        },
        modalContainer: {
            margin: sizes.medium,
            padding: sizes.medium,
            borderRadius: sizes.medium,
        },
        modalTitle: {
            fontSize: fontSizes.regular,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.medium,
        },
        segmentedButtons: {
            marginBottom: sizes.medium,
        },
        textInput: {
            marginBottom: sizes.medium,
        },
        mediaContainer: {
            marginBottom: sizes.medium,
        },
        mediaButtonsContainer: {
            flexDirection: 'column',
            gap: sizes.small,
        },
        mediaButton: {
            marginBottom: sizes.small,
        },
        mediaPreview: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surfaceVariant,
            justifyContent: 'space-between',
            padding: sizes.small,
            borderRadius: sizes.small,
        },
        mediaText: {
            marginLeft: sizes.small,
            fontSize: fontSizes.tinyPlus,
        },
        modalButtons: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: sizes.small,
        },
        modalButton: {
            minWidth: 100,
        },
        cameraModal: {
            flex: 1,
            margin: 0,
            backgroundColor: 'black',
        },
        savingContainer: {
            flex: 1,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.colors.background,
            padding: sizes.large,
            zIndex: 1000,
        },
        savingText: {
            fontSize: fontSizes.regular,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.small,
        },
        progressText: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIHeadline-Regular',
        },
    });
