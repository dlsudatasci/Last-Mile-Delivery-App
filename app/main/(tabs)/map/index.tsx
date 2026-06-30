import { formatStudyExpiry, getTripDisplay, MOCK_TRIPS, TripType } from '@/lib/mock/trips';
import { useTripReviews } from '@/lib/store/useTripReviews';
import { PERIOD_DAYS, useTripsFilter } from '@/lib/store/useTripsFilter';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, MD3Theme, Text, TouchableRipple, useTheme } from 'react-native-paper';

type Filter = 'All' | TripType;
const FILTERS: Filter[] = ['All', 'Study', 'Personal'];

export default function TripsList() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const [filter, setFilter] = useState<Filter>('All');
    const period = useTripsFilter(s => s.period);
    const reviews = useTripReviews(state => state.reviews);

    const now = Date.now();
    const trips = MOCK_TRIPS.filter(
        trip =>
            (filter === 'All' || trip.type === filter) &&
            now - trip.timestamp <= PERIOD_DAYS[period] * 24 * 60 * 60 * 1000
    );

    return (
        <View style={styles.container}>
            <View style={styles.filterRow}>
                <View style={styles.chips}>
                    {FILTERS.map(item => {
                        const active = filter === item;
                        return (
                            <TouchableRipple
                                key={item}
                                onPress={() => setFilter(item)}
                                style={[styles.filterChip, active && styles.filterChipActive]}
                                borderless
                            >
                                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item}</Text>
                            </TouchableRipple>
                        );
                    })}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                {trips.map(trip => {
                    const display = getTripDisplay(trip, reviews[trip.id]?.status === 'reviewed', now);
                    return (
                        <TouchableRipple
                            key={trip.id}
                            style={styles.card}
                            borderless
                            onPress={() => router.push({ pathname: '/main/(tabs)/map/trip-details', params: { id: trip.id } })}
                        >
                            <View style={styles.cardRow}>
                                <View style={[styles.accentBar, { backgroundColor: trip.type === 'Study' ? '#0E6E73' : '#64748B' }]} />
                                <View style={styles.flex}>
                                    <Text style={styles.dateText}>
                                        {trip.date} · {trip.time}
                                    </Text>
                                    <Text style={styles.routeText}>
                                        {trip.from} → {trip.to}
                                    </Text>
                                    {trip.type === 'Study' && (
                                        <View style={styles.studyRow}>
                                            <Icon source="flask-outline" size={sizes.regular} color={theme.colors.onSurfaceVariant} />
                                            <Text style={styles.studyText} numberOfLines={1}>
                                                {trip.studyName}
                                                {trip.studyExpiresAt ? ` · ends ${formatStudyExpiry(trip.studyExpiresAt)}` : ''}
                                            </Text>
                                        </View>
                                    )}
                                    {display.incomplete && (
                                        <View style={styles.incompleteRow}>
                                            <Icon source="map-marker-off" size={sizes.regular} color="#DC2626" />
                                            <Text style={styles.incompleteText}>Did not reach destination</Text>
                                        </View>
                                    )}
                                    {display.isStudy && (
                                        <View style={styles.badgeRow}>
                                            <View style={[styles.badge, { backgroundColor: display.bg }]}>
                                                <Text style={[styles.badgeText, { color: display.text }]}>{display.label}</Text>
                                            </View>
                                        </View>
                                    )}
                                    {display.canReview && !!display.dueLabel && (
                                        <View style={styles.dueRow}>
                                            <Icon source="clock-alert-outline" size={sizes.regular} color="#DC2626" />
                                            <Text style={styles.dueText}>{display.dueLabel}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.thumb}>
                                    <Icon source="map-marker-path" size={sizes.size32} color={theme.colors.primary} />
                                </View>
                            </View>
                        </TouchableRipple>
                    );
                })}
                {trips.length === 0 && <Text style={styles.empty}>No trips in this period.</Text>}
            </ScrollView>
        </View>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        flex: { flex: 1 },
        filterRow: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: sizes.large,
            paddingTop: sizes.medium,
            paddingBottom: sizes.small,
        },
        chips: { flexDirection: 'row', gap: sizes.small },
        filterChip: {
            paddingVertical: sizes.small,
            paddingHorizontal: sizes.large,
            borderRadius: sizes.size32,
            backgroundColor: theme.colors.surfaceVariant,
        },
        filterChipActive: { backgroundColor: theme.colors.primary },
        filterText: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant },
        filterTextActive: { color: '#ffffff' },
        list: { paddingHorizontal: sizes.large, paddingBottom: sizes.size48 },
        card: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            padding: sizes.medium,
            paddingLeft: sizes.medium + sizes.small,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            marginBottom: sizes.small,
            overflow: 'hidden',
        },
        // Colored stripe on the left edge — Study = deep teal, Personal = lighter teal.
        // Negative insets pull it out of the card padding to sit flush on the edge.
        accentBar: {
            position: 'absolute',
            left: -(sizes.medium + sizes.small),
            top: -sizes.medium,
            bottom: -sizes.medium,
            width: sizes.small,
        },
        cardRow: { flexDirection: 'row', alignItems: 'center', gap: sizes.medium },
        dateText: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant },
        routeText: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.small, color: theme.colors.onSurface, marginTop: 2 },
        studyRow: { flexDirection: 'row', alignItems: 'center', gap: sizes.tiny, marginTop: sizes.tiny },
        studyText: { flex: 1, fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant },
        badgeRow: { flexDirection: 'row' },
        dueRow: { flexDirection: 'row', alignItems: 'center', gap: sizes.tiny, marginTop: sizes.tiny },
        dueText: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny, color: '#DC2626' },
        incompleteRow: { flexDirection: 'row', alignItems: 'center', gap: sizes.tiny, marginTop: sizes.tiny },
        incompleteText: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny, color: '#DC2626' },
        badge: {
            alignSelf: 'flex-start',
            paddingHorizontal: sizes.regular,
            paddingVertical: sizes.tiny,
            borderRadius: sizes.size32,
            marginTop: sizes.small,
        },
        badgeText: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny },
        thumb: {
            width: sizes.size64,
            height: sizes.size64,
            borderRadius: sizes.small,
            backgroundColor: theme.colors.surfaceVariant,
            alignItems: 'center',
            justifyContent: 'center',
        },
        empty: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: sizes.large,
        },
    });
