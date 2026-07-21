import SpinningWheel from '@/components/common/SpinningWheel';
import { formatDuration } from '@/lib/common/formulas';
import { FetchRideData } from '@/lib/firebase-crud/rides';
import { useRidesStore } from '@/lib/store/useRidesStore';
import { DeviationAnswers, useTripReviews } from '@/lib/store/useTripReviews';
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
import { configureMapboxAccessToken } from '@/lib/utils/mapbox';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { getAuth } from '@react-native-firebase/auth';
import Mapbox from '@rnmapbox/maps';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Divider, Icon, MD3Theme, Surface, Text, useTheme } from 'react-native-paper';

type DetailTab = 'overview' | 'deviations' | 'responses';
type TripRecord = FetchRideData;

const STUDY_END_LABEL = 'Study ends July 24, 2025';

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

    useFocusEffect(
        React.useCallback(() => {
            let cancelled = false;
            const loadTrip = async () => {
                if (!id) return;

                const userId = getAuth().currentUser?.uid;
                if (!userId) return;

                const selectedTrip = await selectRide(id);
                if (!selectedTrip || cancelled) return;

                setTrip(selectedTrip);
            };

            loadTrip();
            return () => {
                cancelled = true;
            };
        }, [id, selectRide])
    );

    const review = trip ? reviews[trip.id] : undefined;
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
    });
