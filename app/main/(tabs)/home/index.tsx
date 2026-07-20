import ActiveStudyCard from '@/components/studies/ActiveStudyCard';
import { getJoinedDeviaRouteStudy } from '@/lib/studies';
import { useRidesStore } from '@/lib/store/useRidesStore';
import { formatRideRouteTitle } from '@/lib/trip-record-display';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useUser } from '@/stores/useUser';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, MD3Theme, Text, TouchableRipple, useTheme } from 'react-native-paper';

const greetingForNow = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
};

const startOfWeekMs = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    const start = new Date(now);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
};

const formatDuration = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.round(seconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

const rideTimestamp = (ride: { createdAt?: number; endTime?: number; startTime: number }) =>
    ride.createdAt || ride.endTime || ride.startTime;

export default function Home() {
    const theme = useTheme();
    const styles = getStyles(theme);

    const { user } = useUser();
    const { rides, totalRideCount, isRefreshing, fetchRides } = useRidesStore();

    useFocusEffect(
        useCallback(() => {
            fetchRides(true);
        }, [fetchRides])
    );

    // --- Derived display values ----------------------------------------------
    const firstName = (user?.fullName || user?.username || 'there').split(' ')[0];
    const stats = useMemo(() => {
        const weekStart = startOfWeekMs();
        const weeklyRides = rides.filter(ride => rideTimestamp(ride) >= weekStart);
        const totalDistanceKm = rides.reduce((sum, ride) => sum + ride.distance / 1000, 0);
        const totalDurationSec = rides.reduce((sum, ride) => sum + ride.duration, 0);
        const weeklyDistanceKm = weeklyRides.reduce((sum, ride) => sum + ride.distance / 1000, 0);
        const weeklyDurationSec = weeklyRides.reduce((sum, ride) => sum + ride.duration, 0);
        const recordedTrips = Math.max(totalRideCount, rides.length);
        return {
            weeklyTrips: weeklyRides.length,
            weeklyDistanceKm,
            weeklyTime: formatDuration(weeklyDurationSec),
            totalTrips: recordedTrips,
            totalDistanceKm,
            totalTime: formatDuration(totalDurationSec),
            recentTrips: rides.slice(0, 3),
        };
    }, [rides, totalRideCount]);
    const activeStudy = getJoinedDeviaRouteStudy(stats.totalTrips);

    return (
        <View style={styles.safe}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.greeting}>
                    {greetingForNow()}, {firstName}!
                </Text>

                {/* Overview */}
                <Text style={styles.sectionLabel}>OVERVIEW</Text>
                <ActiveStudyCard
                    study={activeStudy}
                    onPress={() =>
                        router.push({
                            pathname: '/main/(tabs)/community/study-details',
                            params: {
                                id: activeStudy.id,
                                name: activeStudy.name,
                                joined: '1',
                                tripsDone: String(activeStudy.tripsRecorded),
                                tripsRequired: String(activeStudy.tripsRequired),
                                reward: String(activeStudy.reward),
                                dates: activeStudy.dates,
                            },
                        })
                    }
                />

                {/* This week */}
                <Text style={styles.sectionLabel}>THIS WEEK</Text>
                <View style={styles.statRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Trips Recorded</Text>
                        <Text style={styles.statValue}>{stats.weeklyTrips}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Distance Traveled</Text>
                        <Text style={styles.statValue}>{stats.weeklyDistanceKm.toFixed(1)} km</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Time Spent</Text>
                        <Text style={styles.statValue}>{stats.weeklyTime}</Text>
                    </View>
                </View>

                {/* Recent trip */}
                <Text style={styles.sectionLabel}>RECENT TRIP</Text>
                {stats.recentTrips.length === 0 ? (
                    <View style={styles.card}>
                        <Text style={styles.emptyText}>{isRefreshing ? 'Refreshing trips...' : 'No trips recorded yet.'}</Text>
                    </View>
                ) : (
                    stats.recentTrips.map(ride => {
                        const date = new Date(rideTimestamp(ride));
                        return (
                            <TouchableRipple
                                key={ride.id}
                                style={styles.recentTripCard}
                                borderless
                                onPress={() =>
                                    router.push({
                                        pathname: '/main/(tabs)/map/trip-record' as never,
                                        params: { id: ride.id },
                                    })
                                }
                            >
                                <View style={styles.recentTripRow}>
                                    <View style={styles.recentTripIcon}>
                                        <Icon source="map-marker-path" size={sizes.medium} color={theme.colors.primary} />
                                    </View>
                                    <View style={styles.flex}>
                                        <Text style={styles.recentTripTitle}>{formatRideRouteTitle(ride)}</Text>
                                        <Text style={styles.recentTripMeta}>
                                            {date.toLocaleDateString()} · {(ride.distance / 1000).toFixed(2)} km · {formatDuration(ride.duration)}
                                        </Text>
                                    </View>
                                    <Icon source="chevron-right" size={sizes.size28} color={theme.colors.onSurfaceVariant} />
                                </View>
                            </TouchableRipple>
                        );
                    })
                )}

                {/* Quick summary */}
                <Text style={styles.sectionLabel}>QUICK SUMMARY (All Time)</Text>
                <View style={styles.card}>
                    <SummaryRow icon="map-marker-path" label="Total Trips" value={String(stats.totalTrips)} theme={theme} />
                    <SummaryRow
                        icon="check-decagram"
                        label="Credited Study Trips"
                        value={`${activeStudy.creditedTrips} / ${activeStudy.tripsRequired}`}
                        theme={theme}
                    />
                    <SummaryRow
                        icon="map-marker-distance"
                        label="Total Distance"
                        value={`${stats.totalDistanceKm.toFixed(1)} km`}
                        theme={theme}
                    />
                    <SummaryRow icon="clock-outline" label="Total Time" value={stats.totalTime} theme={theme} last />
                </View>
            </ScrollView>

        </View>
    );
}

function SummaryRow({
    icon,
    label,
    value,
    theme,
    last,
}: {
    icon: string;
    label: string;
    value: string;
    theme: MD3Theme;
    last?: boolean;
}) {
    const styles = getStyles(theme);
    return (
        <View style={[styles.summaryRow, !last && styles.summaryRowBorder]}>
            <View style={styles.summaryLabelWrap}>
                <Icon source={icon} size={sizes.medium} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.summaryLabel}>{label}</Text>
            </View>
            <Text style={styles.summaryValue}>{value}</Text>
        </View>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.colors.background },
        flex: { flex: 1 },
        content: { padding: sizes.large, paddingBottom: sizes.size48 },
        header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        greeting: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.regular,
            color: theme.colors.onBackground,
        },
        recentTripCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            padding: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            marginBottom: sizes.small,
        },
        recentTripRow: { flexDirection: 'row', alignItems: 'center', gap: sizes.medium },
        recentTripIcon: {
            width: sizes.size48,
            height: sizes.size48,
            borderRadius: sizes.size48 / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.primaryContainer,
        },
        recentTripTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.small,
            color: theme.colors.onSurface,
        },
        recentTripMeta: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
            marginTop: 2,
        },
        greetingSub: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
        },
        sectionLabel: {
            fontFamily: 'LGEIText-SemiBold',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
            letterSpacing: 1,
            marginTop: sizes.large,
            marginBottom: sizes.small,
        },
        card: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            padding: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
        },
        overviewRow: { flexDirection: 'row', alignItems: 'center' },
        overviewIcon: {
            width: sizes.size56,
            height: sizes.size56,
            borderRadius: sizes.small,
            backgroundColor: theme.colors.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: sizes.medium,
        },
        overviewStat: { flex: 1 },
        overviewStatRight: { alignItems: 'flex-end' },
        overviewStatLabel: {
            fontFamily: 'LGEIText-SemiBold',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
        },
        overviewStatValue: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.large,
            color: theme.colors.onSurface,
        },
        overviewStatHint: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
        },
        progressBar: { marginTop: sizes.medium, marginBottom: sizes.small, height: sizes.small, borderRadius: sizes.small },
        studyCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            padding: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            marginBottom: sizes.small,
        },
        studyName: {
            fontFamily: 'LGEIText-SemiBold',
            fontSize: fontSizes.small,
            color: theme.colors.onSurface,
        },
        joinTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.regular,
            color: theme.colors.onSurface,
            marginBottom: sizes.tiny,
        },
        joinButton: { marginTop: sizes.medium, borderRadius: sizes.small },
        joinButtonLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small },
        statRow: { flexDirection: 'row', gap: sizes.small },
        statCard: {
            flex: 1,
            minHeight: sizes.size96,
            justifyContent: 'space-between',
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            padding: sizes.regular,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
        },
        statLabel: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
        },
        statValue: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.regular,
            color: theme.colors.onSurface,
            marginTop: sizes.tiny,
        },
        emptyText: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
        },
        summaryRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: sizes.regular,
        },
        summaryRowBorder: {
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outlineVariant ?? '#E2E8F0',
        },
        summaryLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: sizes.small },
        summaryLabel: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
        },
        summaryValue: {
            fontFamily: 'LGEIText-SemiBold',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurface,
        },
    });
