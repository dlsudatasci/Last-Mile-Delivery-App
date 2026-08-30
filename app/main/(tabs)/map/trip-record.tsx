import SpinningWheel from '@/components/common/SpinningWheel';
import { formatDuration } from '@/lib/common/formulas';
import { fetchTripReview } from '@/lib/firebase-crud/reviews';
import { FetchedGeneratedRoute, FetchRideData, getGeneratedRoutesByRideId, getRidePoints } from '@/lib/firebase-crud/rides';
import { useRidesStore } from '@/lib/store/useRidesStore';
import { RidePoint } from '@/lib/store/useRideStore';
import { DeviationAnswers, TripReview, useTripReviews } from '@/lib/store/useTripReviews';
import {
    DisplayRow,
    formatPoint,
    formatRideRouteTitle,
    formatRouteInstructionSummary,
    getChangeRouteCount,
    getDeviationRows,
    getPostTripRows,
    getReviewStatusLabel,
} from '@/lib/trip-record-display';
import { LngLat } from '@/lib/utils/directions';
import { configureMapboxAccessToken } from '@/lib/utils/mapbox';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { getAuth } from '@react-native-firebase/auth';
import Mapbox from '@rnmapbox/maps';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Divider, Icon, MD3Theme, Surface, Text, useTheme } from 'react-native-paper';

type DetailTab = 'overview' | 'map' | 'deviations' | 'responses';
type TripRecord = FetchRideData;

const STUDY_END_LABEL = 'Study ends July 24, 2025';

// Route overlay colors matching the design specification
const ROUTE_RED_SUGGESTED = '#DC2626';   // Red — Suggested/initial route
const ROUTE_GREEN_ACTUAL = '#16A34A';    // Green — Actual GPS trail
const ROUTE_BLUE_REROUTED = '#2563EB';   // Blue — Regenerated routes

configureMapboxAccessToken(Mapbox);

function formatClock(timestamp?: number | null) {
    if (!timestamp) return 'Not available';
    return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDate(timestamp?: number | null) {
    if (!timestamp) return 'Not available';
    return new Date(timestamp).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDelta(value: number, unit: string) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)} ${unit}`;
}

function routeText(answer: DeviationAnswers) {
    const generated = formatRouteInstructionSummary(answer.metadata?.generatedInstruction, answer.metadata?.streetName);
    const actual = formatRouteInstructionSummary(answer.metadata?.deviationInstruction, answer.metadata?.streetName);
    return `${generated} → ${actual}`;
}

function sortedDeviations(reviewAnswers?: Record<string, DeviationAnswers>) {
    return Object.entries(reviewAnswers ?? {}).sort(([, a], [, b]) => (a.metadata?.index ?? 0) - (b.metadata?.index ?? 0));
}

export default function TripRecordDetails() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const colorScheme = useColorScheme();
    const mapboxStyle =
        colorScheme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';
    const cameraRef = useRef<Mapbox.Camera>(null);
    const { id } = useLocalSearchParams<{ id?: string }>();
    const { selectRide } = useRidesStore();
    const reviews = useTripReviews(state => state.reviews);
    const [trip, setTrip] = useState<TripRecord | null>(null);
    const [activeTab, setActiveTab] = useState<DetailTab>('overview');
    const [selectedDeviationId, setSelectedDeviationId] = useState<string | null>(null);
    const [generatedRoutes, setGeneratedRoutes] = useState<FetchedGeneratedRoute[]>([]);
    const [gpsPoints, setGpsPoints] = useState<RidePoint[]>([]);
    const [remoteReview, setRemoteReview] = useState<TripReview | null>(null);
    const [mapDataLoading, setMapDataLoading] = useState(false);
    const [showSuggested, setShowSuggested] = useState(true);
    const [showActual, setShowActual] = useState(true);
    const [showRerouted, setShowRerouted] = useState(true);

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            const loadTrip = async () => {
                if (!id) return;

                const userId = getAuth().currentUser?.uid;
                if (!userId) return;

                const selectedTrip = await selectRide(id);
                if (!selectedTrip || cancelled) return;

                setTrip(selectedTrip);

                // Fetch map data (generated routes + GPS points) in parallel
                setMapDataLoading(true);
                try {
                    const [routes, points, fetchedReview] = await Promise.all([
                        getGeneratedRoutesByRideId(id).catch(() => [] as FetchedGeneratedRoute[]),
                        getRidePoints(userId, id).catch(() => [] as RidePoint[]),
                        fetchTripReview(id),
                    ]);
                    if (!cancelled) {
                        setGeneratedRoutes(routes);
                        setGpsPoints(points);
                        setRemoteReview(fetchedReview);
                    }
                } finally {
                    if (!cancelled) setMapDataLoading(false);
                }
            };

            loadTrip();
            return () => {
                cancelled = true;
            };
        }, [id, selectRide])
    );

    const localReview = trip ? reviews[trip.id] : undefined;
    const review = remoteReview ?? localReview;
    const postTripRows = getPostTripRows(review?.postTrip);
    const deviations = useMemo(() => sortedDeviations(review?.answers), [review?.answers]);
    const selectedDeviation = selectedDeviationId
        ? deviations.find(([deviationId]) => deviationId === selectedDeviationId)
        : null;

    if (!trip) {
        return (
            <View style={styles.loadingContainer}>
                <SpinningWheel />
            </View>
        );
    }

    const routeTitle = formatRideRouteTitle(trip);
    const tripDate = new Date(trip.createdAt || trip.endTime || trip.startTime);
    const actualDistanceM = trip.distance || 0;
    const actualDurationSec = trip.duration || 0;
    const deviationCount = getChangeRouteCount(review);
    const suggestedDistanceM = trip.suggestedRouteDistanceM;
    const suggestedDurationSec = trip.suggestedRouteDurationSec;
    const distanceDiffKm =
        typeof suggestedDistanceM === 'number' ? (actualDistanceM - suggestedDistanceM) / 1000 : null;
    const durationDiffMin =
        typeof suggestedDurationSec === 'number' ? (actualDurationSec - suggestedDurationSec) / 60 : null;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Trip Details' }} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <Text style={styles.headerDate}>
                            {formatDate(tripDate.getTime())} · {formatClock(tripDate.getTime())}
                        </Text>
                        <Text style={styles.statusBadge}>{getReviewStatusLabel(review)}</Text>
                    </View>
                    <Text style={styles.routeTitle}>{routeTitle}</Text>
                    <Text style={styles.studyLine}>Study Trip · DEVIA Route Study</Text>
                    <Text style={styles.studyEnd}>{STUDY_END_LABEL}</Text>
                </View>

                <View style={styles.tabBar}>
                    <TabButton label="Overview" tab="overview" activeTab={activeTab} onPress={setActiveTab} />
                    <TabButton label="Map View" tab="map" activeTab={activeTab} onPress={setActiveTab} />
                    <TabButton
                        label={`Route Changes (${deviationCount})`}
                        tab="deviations"
                        activeTab={activeTab}
                        onPress={setActiveTab}
                    />
                    <TabButton label="Responses" tab="responses" activeTab={activeTab} onPress={setActiveTab} />
                </View>

                {activeTab === 'overview' && (
                    <View style={styles.tabContent}>
                        <MetricSection
                            title="Suggested Route"
                            columns={[
                                ['Distance', suggestedDistanceM ? `${(suggestedDistanceM / 1000).toFixed(1)} km` : 'Not available'],
                                ['Est. Time', suggestedDurationSec ? formatDuration(suggestedDurationSec) : 'Not available'],
                            ]}
                        />
                        <MetricSection
                            title="Actual Route"
                            columns={[
                                ['Distance', `${(actualDistanceM / 1000).toFixed(1)} km`],
                                ['Time', formatDuration(actualDurationSec)],
                            ]}
                        />
                        <MetricSection
                            title="Difference"
                            columns={[
                                ['Distance', distanceDiffKm === null ? 'Not available' : formatDelta(distanceDiffKm, 'km')],
                                ['Time', durationDiffMin === null ? 'Not available' : formatDelta(durationDiffMin, 'min')],
                            ]}
                        />
                        <Surface style={styles.compactCompare}>
                            <View style={styles.compactHalf}>
                                <View style={styles.legendRow}>
                                    <View style={styles.suggestedDot} />
                                    <Text style={styles.compactLabel}>Suggested</Text>
                                </View>
                                <Text style={styles.compactValue}>
                                    {suggestedDistanceM && suggestedDurationSec
                                        ? `${(suggestedDistanceM / 1000).toFixed(1)} km · ${formatDuration(suggestedDurationSec)}`
                                        : 'Not available'}
                                </Text>
                            </View>
                            <View style={styles.compactDivider} />
                            <View style={styles.compactHalf}>
                                <View style={styles.legendRow}>
                                    <View style={styles.actualDot} />
                                    <Text style={styles.compactLabel}>Actual</Text>
                                </View>
                                <Text style={styles.compactValue}>
                                    {(actualDistanceM / 1000).toFixed(1)} km · {formatDuration(actualDurationSec)}
                                </Text>
                            </View>
                        </Surface>
                    </View>
                )}

                {activeTab === 'map' && (
                    <MapViewTab
                        generatedRoutes={generatedRoutes}
                        gpsPoints={gpsPoints}
                        loading={mapDataLoading}
                        showSuggested={showSuggested}
                        showActual={showActual}
                        showRerouted={showRerouted}
                        onToggleSuggested={() => setShowSuggested(v => !v)}
                        onToggleActual={() => setShowActual(v => !v)}
                        onToggleRerouted={() => setShowRerouted(v => !v)}
                        mapboxStyle={mapboxStyle}
                    />
                )}

                {activeTab === 'deviations' && (
                    <View style={styles.tabContent}>
                        {deviations.length === 0 ? (
                            <Surface style={styles.card}>
                                <Text style={styles.emptyText}>No route changes were detected for this trip.</Text>
                            </Surface>
                        ) : selectedDeviation ? (
                            <DeviationDetail
                                deviationId={selectedDeviation[0]}
                                answer={selectedDeviation[1]}
                                onBack={() => setSelectedDeviationId(null)}
                                mapboxStyle={mapboxStyle}
                            />
                        ) : (
                            deviations.map(([deviationId, answer], index) => (
                                <TouchableOpacity
                                    key={deviationId}
                                    style={styles.deviationListCard}
                                    onPress={() => setSelectedDeviationId(deviationId)}
                                >
                                    <View style={styles.deviationListText}>
                                        <Text style={styles.deviationTitle}>Route Change #{index + 1}</Text>
                                        <Text style={styles.deviationTime}>{formatClock(answer.metadata?.timestamp)}</Text>
                                        <Text style={styles.deviationRouteText}>{routeText(answer)}</Text>
                                    </View>
                                    <Icon source="chevron-right" size={sizes.size28} color={theme.colors.onSurfaceVariant} />
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}

                {activeTab === 'responses' && (
                    <View style={styles.tabContent}>
                        <Surface style={styles.card}>
                            <Text style={styles.sectionTitle}>Post-Trip Questionnaire</Text>
                            {postTripRows.length > 0 ? (
                                postTripRows.map(row => <ResponseRow key={row.label} row={row} />)
                            ) : (
                                <Text style={styles.emptyText}>No post-trip answers saved yet.</Text>
                            )}
                        </Surface>

                        {deviations.length > 0 ? (
                            deviations.map(([deviationId, answer], index) => (
                                <Surface key={deviationId} style={styles.card}>
                                    <Text style={styles.sectionTitle}>Route Change #{index + 1}</Text>
                                    {getDeviationRows(answer).map(row => (
                                        <ResponseRow key={`${deviationId}-${row.label}`} row={row} />
                                    ))}
                                </Surface>
                            ))
                        ) : (
                            <Surface style={styles.card}>
                                <Text style={styles.emptyText}>No route change survey was required for this trip.</Text>
                            </Surface>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );

    function TabButton({
        label,
        tab,
        activeTab,
        onPress,
    }: {
        label: string;
        tab: DetailTab;
        activeTab: DetailTab;
        onPress: (tab: DetailTab) => void;
    }) {
        const active = activeTab === tab;
        const isRouteChangesTab = tab === 'deviations';
        return (
            <TouchableOpacity
                style={[styles.tabButton, isRouteChangesTab && styles.routeChangesTabButton, active && styles.activeTabButton]}
                onPress={() => onPress(tab)}
            >
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86} style={[styles.tabText, active && styles.activeTabText]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    }

    function MetricSection({ title, columns }: { title: string; columns: [string, string][] }) {
        return (
            <Surface style={styles.card}>
                <Text style={styles.cardTitle}>{title}</Text>
                <View style={styles.metricRow}>
                    {columns.map(([label, value]) => (
                        <View key={`${title}-${label}`} style={styles.metricColumn}>
                            <Text style={styles.metricLabel}>{label}</Text>
                            <Text style={styles.metricValue}>{value}</Text>
                        </View>
                    ))}
                </View>
            </Surface>
        );
    }

    function DeviationDetail({
        answer,
        onBack,
        mapboxStyle,
    }: {
        deviationId: string;
        answer: DeviationAnswers;
        onBack: () => void;
        mapboxStyle: string;
    }) {
        const point = answer.metadata?.gpsLocation ?? answer.metadata?.actualPoint;
        const center: [number, number] = point ? [point.longitude, point.latitude] : [120.9936, 14.5646];
        return (
            <Surface style={styles.card}>
                <TouchableOpacity style={styles.detailBackRow} onPress={onBack}>
                    <Icon source="chevron-left" size={sizes.medium} color={theme.colors.primary} />
                    <Text style={styles.detailBackText}>Back to route changes</Text>
                </TouchableOpacity>
                <Text style={styles.cardTitle}>Route Change Details</Text>
                <View style={styles.deviationMap}>
                    {point ? (
                        <Mapbox.MapView
                            style={styles.map}
                            styleURL={mapboxStyle}
                            scrollEnabled={false}
                            zoomEnabled={false}
                            rotateEnabled={false}
                            pitchEnabled={false}
                        >
                            <Mapbox.Camera
                                ref={cameraRef}
                                animationDuration={0}
                                zoomLevel={17}
                                centerCoordinate={center}
                            />
                            <Mapbox.PointAnnotation id="deviation-pin" coordinate={center}>
                                <View style={styles.pinMarker} />
                            </Mapbox.PointAnnotation>
                        </Mapbox.MapView>
                    ) : (
                        <View style={styles.mapFallback}>
                            <Icon source="map-marker-off" size={sizes.size32} color={theme.colors.primary} />
                            <Text style={styles.emptyText}>GPS pin unavailable</Text>
                        </View>
                    )}
                </View>
                <InfoRow label="Street" value={answer.metadata?.streetName ?? answer.metadata?.originalRouteEdge ?? 'Not available'} />
                <InfoRow label="Time" value={formatClock(answer.metadata?.timestamp)} />
                <InfoRow label="GPS location" value={formatPoint(point)} />
                <Divider style={styles.detailDivider} />
                <InfoRow label="Suggested route" value={formatRouteInstructionSummary(answer.metadata?.generatedInstruction, answer.metadata?.streetName)} />
                <InfoRow label="Actual route" value={formatRouteInstructionSummary(answer.metadata?.deviationInstruction, answer.metadata?.streetName)} />
            </Surface>
        );
    }

    function InfoRow({ label, value }: { label: string; value: string }) {
        return (
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        );
    }

    function ResponseRow({ row }: { row: DisplayRow }) {
        return (
            <View style={styles.responseRow}>
                <Text style={styles.responseLabel}>{row.label}</Text>
                <Text style={styles.responseValue}>{row.value}</Text>
            </View>
        );
    }

    function MapViewTab({
        generatedRoutes,
        gpsPoints,
        loading,
        showSuggested,
        showActual,
        showRerouted,
        onToggleSuggested,
        onToggleActual,
        onToggleRerouted,
        mapboxStyle,
    }: {
        generatedRoutes: FetchedGeneratedRoute[];
        gpsPoints: RidePoint[];
        loading: boolean;
        showSuggested: boolean;
        showActual: boolean;
        showRerouted: boolean;
        onToggleSuggested: () => void;
        onToggleActual: () => void;
        onToggleRerouted: () => void;
        mapboxStyle: string;
    }) {
        const initialRoute = generatedRoutes.find(r => r.sequence === 1);
        const reroutedRoutes = generatedRoutes.filter(r => r.sequence > 1);

        // Build GeoJSON shapes
        const suggestedShape = useMemo(() => {
            if (!initialRoute || initialRoute.routePoints.length < 2) return null;
            return {
                type: 'Feature' as const,
                properties: {},
                geometry: { type: 'LineString' as const, coordinates: initialRoute.routePoints },
            };
        }, [initialRoute]);

        const actualShape = useMemo(() => {
            if (gpsPoints.length < 2) return null;
            const coordinates = gpsPoints
                .filter(p => p.coordinate.latitude != null && p.coordinate.longitude != null)
                .map(p => [p.coordinate.longitude, p.coordinate.latitude]);
            if (coordinates.length < 2) return null;
            return {
                type: 'Feature' as const,
                properties: {},
                geometry: { type: 'LineString' as const, coordinates },
            };
        }, [gpsPoints]);

        const reroutedShapes = useMemo(() => {
            return reroutedRoutes
                .filter(r => r.routePoints.length >= 2)
                .map(r => ({
                    routeId: r.routeId,
                    sequence: r.sequence,
                    shape: {
                        type: 'Feature' as const,
                        properties: {},
                        geometry: { type: 'LineString' as const, coordinates: r.routePoints },
                    },
                }));
        }, [reroutedRoutes]);

        // Compute map bounds from all visible polylines
        const bounds = useMemo(() => {
            const allCoords: LngLat[] = [];
            if (showSuggested && initialRoute) allCoords.push(...initialRoute.routePoints);
            if (showActual && gpsPoints.length > 0) {
                allCoords.push(
                    ...gpsPoints.map(p => [p.coordinate.longitude, p.coordinate.latitude] as LngLat)
                );
            }
            if (showRerouted) {
                reroutedRoutes.forEach(r => allCoords.push(...r.routePoints));
            }
            if (allCoords.length === 0) return null;
            const lons = allCoords.map(c => c[0]);
            const lats = allCoords.map(c => c[1]);
            return {
                ne: [Math.max(...lons), Math.max(...lats)] as LngLat,
                sw: [Math.min(...lons), Math.min(...lats)] as LngLat,
            };
        }, [showSuggested, showActual, showRerouted, initialRoute, gpsPoints, reroutedRoutes]);

        // Start and end markers from GPS points
        const startCoord: LngLat | null = gpsPoints.length > 0
            ? [gpsPoints[0].coordinate.longitude, gpsPoints[0].coordinate.latitude]
            : null;
        const endCoord: LngLat | null = gpsPoints.length > 1
            ? [gpsPoints[gpsPoints.length - 1].coordinate.longitude, gpsPoints[gpsPoints.length - 1].coordinate.latitude]
            : null;

        const hasNoData = !suggestedShape && gpsPoints.length < 2 && reroutedShapes.length === 0;

        if (loading) {
            return (
                <View style={styles.mapLoadingContainer}>
                    <ActivityIndicator color={theme.colors.primary} />
                    <Text style={styles.emptyText}>Loading map data…</Text>
                </View>
            );
        }

        if (hasNoData) {
            return (
                <Surface style={styles.card}>
                    <View style={styles.mapFallback}>
                        <Icon source="map-marker-off" size={sizes.size32} color={theme.colors.onSurfaceVariant} />
                        <Text style={styles.emptyText}>Route data is not available for this trip.</Text>
                    </View>
                </Surface>
            );
        }

        return (
            <View style={styles.tabContent}>
                {/* Map */}
                <Surface style={styles.mapViewContainer}>
                    <Mapbox.MapView
                        style={styles.mapViewMap}
                        styleURL={mapboxStyle}
                        logoEnabled={false}
                        attributionEnabled={false}
                    >
                        <Mapbox.Camera
                            bounds={
                                bounds
                                    ? {
                                        ne: bounds.ne,
                                        sw: bounds.sw,
                                        paddingLeft: 40,
                                        paddingRight: 40,
                                        paddingTop: 40,
                                        paddingBottom: 40,
                                    }
                                    : undefined
                            }
                            animationDuration={0}
                        />

                        {/* Red: Suggested/initial route (drawn first, under everything) */}
                        {showSuggested && suggestedShape && (
                            <Mapbox.ShapeSource id="suggested-route-source" shape={suggestedShape}>
                                <Mapbox.LineLayer
                                    id="suggested-route-line"
                                    style={{
                                        lineColor: ROUTE_RED_SUGGESTED,
                                        lineWidth: 6,
                                        lineOpacity: 0.8,
                                        lineCap: 'round',
                                        lineJoin: 'round',
                                    }}
                                />
                            </Mapbox.ShapeSource>
                        )}

                        {/* Blue: Regenerated routes */}
                        {showRerouted &&
                            reroutedShapes.map(({ routeId, shape }) => (
                                <Mapbox.ShapeSource key={routeId} id={`rerouted-${routeId}`} shape={shape}>
                                    <Mapbox.LineLayer
                                        id={`rerouted-line-${routeId}`}
                                        style={{
                                            lineColor: ROUTE_BLUE_REROUTED,
                                            lineWidth: 4,
                                            lineOpacity: 0.6,
                                            lineCap: 'round',
                                            lineJoin: 'round',
                                        }}
                                    />
                                </Mapbox.ShapeSource>
                            ))}

                        {/* Green: Actual GPS trail (drawn last, on top) */}
                        {showActual && actualShape && (
                            <Mapbox.ShapeSource id="actual-route-source" shape={actualShape}>
                                <Mapbox.LineLayer
                                    id="actual-route-line"
                                    style={{
                                        lineColor: ROUTE_GREEN_ACTUAL,
                                        lineWidth: 5,
                                        lineOpacity: 0.9,
                                        lineCap: 'round',
                                        lineJoin: 'round',
                                    }}
                                />
                            </Mapbox.ShapeSource>
                        )}

                        {/* Start marker */}
                        {startCoord && (
                            <Mapbox.PointAnnotation id="trip-start" coordinate={startCoord}>
                                <View style={styles.startMarker} />
                            </Mapbox.PointAnnotation>
                        )}
                        {/* End marker */}
                        {endCoord && (
                            <Mapbox.PointAnnotation id="trip-end" coordinate={endCoord}>
                                <View style={styles.endMarker} />
                            </Mapbox.PointAnnotation>
                        )}
                    </Mapbox.MapView>
                </Surface>

                {/* Legend */}
                <Surface style={styles.legendCard}>
                    <LegendItem
                        color={ROUTE_RED_SUGGESTED}
                        label="Suggested Route"
                        active={showSuggested}
                        onToggle={onToggleSuggested}
                    />
                    <LegendItem
                        color={ROUTE_GREEN_ACTUAL}
                        label="Actual Route"
                        active={showActual}
                        onToggle={onToggleActual}
                    />
                    {reroutedShapes.length > 0 && (
                        <LegendItem
                            color={ROUTE_BLUE_REROUTED}
                            label={`Rerouted (${reroutedShapes.length})`}
                            active={showRerouted}
                            onToggle={onToggleRerouted}
                        />
                    )}
                </Surface>

                {/* Route Summary Cards */}
                {initialRoute && (
                    <Surface style={styles.card}>
                        <View style={[styles.legendRow, { marginBottom: sizes.small }]}>
                            <View style={[styles.legendDot, { backgroundColor: ROUTE_RED_SUGGESTED }]} />
                            <Text style={styles.cardTitle}>Suggested Route</Text>
                        </View>
                        <View style={styles.metricRow}>
                            <View style={styles.metricColumn}>
                                <Text style={styles.metricLabel}>Distance</Text>
                                <Text style={styles.metricValue}>
                                    {(initialRoute.remainingDistanceNew / 1000).toFixed(1)} km
                                </Text>
                            </View>
                            <View style={styles.metricColumn}>
                                <Text style={styles.metricLabel}>Est. Time</Text>
                                <Text style={styles.metricValue}>
                                    {formatDuration(initialRoute.remainingTravelTimeNew)}
                                </Text>
                            </View>
                        </View>
                    </Surface>
                )}

                {trip && (
                    <Surface style={styles.card}>
                        <View style={[styles.legendRow, { marginBottom: sizes.small }]}>
                            <View style={[styles.legendDot, { backgroundColor: ROUTE_GREEN_ACTUAL }]} />
                            <Text style={styles.cardTitle}>Actual Route</Text>
                        </View>
                        <View style={styles.metricRow}>
                            <View style={styles.metricColumn}>
                                <Text style={styles.metricLabel}>Distance</Text>
                                <Text style={styles.metricValue}>
                                    {((trip.distance || 0) / 1000).toFixed(1)} km
                                </Text>
                            </View>
                            <View style={styles.metricColumn}>
                                <Text style={styles.metricLabel}>Time</Text>
                                <Text style={styles.metricValue}>
                                    {formatDuration(trip.duration || 0)}
                                </Text>
                            </View>
                        </View>
                    </Surface>
                )}

                {reroutedRoutes.map((route, index) => (
                    <Surface key={route.routeId} style={styles.card}>
                        <View style={[styles.legendRow, { marginBottom: sizes.small }]}>
                            <View style={[styles.legendDot, { backgroundColor: ROUTE_BLUE_REROUTED }]} />
                            <Text style={styles.cardTitle}>Rerouted #{index + 1}</Text>
                        </View>
                        <View style={styles.metricRow}>
                            <View style={styles.metricColumn}>
                                <Text style={styles.metricLabel}>Distance</Text>
                                <Text style={styles.metricValue}>
                                    {(route.remainingDistanceNew / 1000).toFixed(1)} km
                                </Text>
                            </View>
                            <View style={styles.metricColumn}>
                                <Text style={styles.metricLabel}>Est. Time</Text>
                                <Text style={styles.metricValue}>
                                    {formatDuration(route.remainingTravelTimeNew)}
                                </Text>
                            </View>
                        </View>
                    </Surface>
                ))}
            </View>
        );
    }

    function LegendItem({
        color,
        label,
        active,
        onToggle,
    }: {
        color: string;
        label: string;
        active: boolean;
        onToggle: () => void;
    }) {
        return (
            <TouchableOpacity style={styles.legendItem} onPress={onToggle} activeOpacity={0.6}>
                <View style={[styles.legendDot, { backgroundColor: color, opacity: active ? 1 : 0.3 }]} />
                <Text
                    style={[
                        styles.legendLabel,
                        !active && { opacity: 0.4, textDecorationLine: 'line-through' as const },
                    ]}
                >
                    {label}
                </Text>
            </TouchableOpacity>
        );
    }
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        loadingContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.background,
        },
        content: {
            padding: sizes.large,
            paddingBottom: sizes.size64,
        },
        header: {
            marginBottom: sizes.large,
        },
        headerTopRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: sizes.small,
            marginBottom: sizes.small,
        },
        headerDate: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
        },
        statusBadge: {
            fontFamily: 'LGEIHeadline-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onPrimaryContainer,
            backgroundColor: theme.colors.primaryContainer,
            borderRadius: sizes.large,
            overflow: 'hidden',
            paddingHorizontal: sizes.medium,
            paddingVertical: sizes.tiny,
        },
        routeTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.medium,
            color: theme.colors.onSurface,
        },
        studyLine: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
            marginTop: 2,
        },
        studyEnd: {
            fontFamily: 'LGEIHeadline-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.primary,
            marginTop: 2,
        },
        tabBar: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: sizes.large,
        },
        tabButton: {
            flex: 1,
            alignItems: 'center',
            paddingBottom: sizes.tiny,
            borderBottomWidth: 2,
            borderBottomColor: 'transparent',
        },
        routeChangesTabButton: {
            flex: 1.45,
        },
        activeTabButton: {
            borderBottomColor: theme.colors.primary,
        },
        tabText: {
            fontFamily: 'LGEIHeadline-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
        },
        activeTabText: {
            color: theme.colors.primary,
            fontFamily: 'LGEIHeadline-Bold',
        },
        tabContent: {
            gap: sizes.medium,
        },
        card: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            padding: sizes.medium,
            marginBottom: sizes.medium,
        },
        cardTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.small,
            color: theme.colors.onSurface,
            marginBottom: sizes.medium,
        },
        sectionTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.small,
            color: theme.colors.onSurface,
            marginBottom: sizes.medium,
        },
        metricRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: sizes.small,
        },
        metricColumn: {
            flex: 1,
        },
        metricLabel: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
            marginBottom: sizes.tiny,
        },
        metricValue: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.small,
            color: theme.colors.onSurface,
        },
        compactCompare: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            flexDirection: 'row',
            overflow: 'hidden',
            marginBottom: sizes.medium,
        },
        compactHalf: {
            flex: 1,
            padding: sizes.medium,
        },
        compactDivider: {
            width: 1,
            backgroundColor: theme.colors.outlineVariant,
        },
        legendRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: sizes.small,
            marginBottom: sizes.tiny,
        },
        suggestedDot: {
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: theme.colors.primary,
        },
        actualDot: {
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: theme.colors.error,
        },
        compactLabel: {
            fontFamily: 'LGEIHeadline-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
        },
        compactValue: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.small,
            color: theme.colors.onSurface,
        },
        deviationListCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            padding: sizes.medium,
            marginBottom: sizes.small,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: sizes.medium,
        },
        deviationListText: {
            flex: 1,
        },
        deviationTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.small,
            color: theme.colors.onSurface,
        },
        deviationTime: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
            marginTop: 2,
        },
        deviationRouteText: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurface,
            marginTop: sizes.tiny,
        },
        detailBackRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: sizes.tiny,
            marginBottom: sizes.medium,
        },
        detailBackText: {
            fontFamily: 'LGEIHeadline-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.primary,
        },
        deviationMap: {
            height: 190,
            borderRadius: sizes.small,
            overflow: 'hidden',
            backgroundColor: theme.colors.surfaceVariant,
            marginBottom: sizes.medium,
        },
        map: {
            flex: 1,
        },
        mapFallback: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: sizes.small,
        },
        pinMarker: {
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: theme.colors.error,
            borderWidth: 3,
            borderColor: theme.colors.surface,
        },
        emptyText: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
        },
        infoRow: {
            paddingVertical: sizes.small,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outlineVariant,
        },
        infoLabel: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
            marginBottom: 2,
        },
        infoValue: {
            fontFamily: 'LGEIHeadline-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurface,
        },
        responseRow: {
            paddingVertical: sizes.small,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outlineVariant,
        },
        responseLabel: {
            fontFamily: 'LGEIHeadline-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurface,
            marginBottom: sizes.tiny,
        },
        responseValue: {
            fontFamily: 'LGEIHeadline-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.primary,
        },
        answerButton: {
            marginTop: sizes.medium,
            borderRadius: sizes.small,
        },
        detailDivider: {
            marginVertical: sizes.medium,
            backgroundColor: theme.colors.outlineVariant,
        },
        // Map View tab styles
        mapLoadingContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: sizes.size64,
            gap: sizes.medium,
        },
        mapViewContainer: {
            borderRadius: sizes.medium,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            marginBottom: sizes.medium,
        },
        mapViewMap: {
            height: 300,
            width: '100%',
        },
        startMarker: {
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: '#1CAF50',
            borderWidth: 3,
            borderColor: '#ffffff',
        },
        endMarker: {
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: '#cd5c5c',
            borderWidth: 3,
            borderColor: '#ffffff',
        },
        legendCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            padding: sizes.medium,
            marginBottom: sizes.medium,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: sizes.medium,
        },
        legendItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: sizes.small,
        },
        legendDot: {
            width: 12,
            height: 12,
            borderRadius: 6,
        },
        legendLabel: {
            fontFamily: 'LGEIHeadline-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurface,
        },
    });
