import StudyOverviewModal from '@/components/onboarding/StudyOverviewModal';
import ActiveStudyCard from '@/components/studies/ActiveStudyCard';
import { MOCK_ACTIVE_STUDIES } from '@/lib/mock/studies';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useOnboarding } from '@/stores/useOnboarding';
import { useUser } from '@/stores/useUser';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, MD3Theme, Text, useTheme } from 'react-native-paper';

// TODO: replace with real data. Mock values so the dashboard previews fully.
const MOCK_STATS = {
    weeklyTrips: 26,
    weeklyDistanceKm: 142,
    weeklyTime: '4h 10m',
    totalTrips: 96,
    totalDistanceKm: 1245,
    totalTime: '38h 20m',
    deviationsFound: 23,
};

const MOCK_RECENT_TRIP = {
    date: 'June 13, 2025',
    name: 'Makati → BGC',
    status: 'Approved',
};

const greetingForNow = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
};

export default function Home() {
    const theme = useTheme();
    const styles = getStyles(theme);

    const { user } = useUser();
    const { pendingStudyOffer, setPendingStudyOffer } = useOnboarding();

    const [studyOfferVisible, setStudyOfferVisible] = useState(false);

    // Show the Join Study offer once, right after the user finishes onboarding.
    useEffect(() => {
        if (pendingStudyOffer) {
            setStudyOfferVisible(true);
            setPendingStudyOffer(false);
        }
    }, [pendingStudyOffer, setPendingStudyOffer]);

    const handleJoinStudyOffer = () => {
        setStudyOfferVisible(false);
        router.push('/study-consent');
    };

    // --- Derived display values ----------------------------------------------
    const firstName = (user?.fullName || user?.username || 'there').split(' ')[0];
    // Mock for now — swap these for the user's real studies/trip data later.
    const activeStudies = MOCK_ACTIVE_STUDIES;
    const recentTrip = MOCK_RECENT_TRIP;

    return (
        <View style={styles.safe}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.greeting}>
                    {greetingForNow()}, {firstName}!
                </Text>

                {/* Overview */}
                <Text style={styles.sectionLabel}>OVERVIEW</Text>
                {activeStudies.length === 0 ? (
                    <View style={styles.card}>
                        <View style={styles.overviewRow}>
                            <View style={styles.overviewIcon}>
                                <Icon source="book-open-variant" size={sizes.size32} color={theme.colors.primary} />
                            </View>
                            <View style={styles.overviewStat}>
                                <Text style={styles.joinTitle}>No study joined yet</Text>
                                <Text style={styles.overviewStatHint}>Your trips are still recorded. Join a study to contribute them to research and earn rewards.</Text>
                            </View>
                        </View>
                        <Button
                            mode="contained"
                            buttonColor={theme.colors.primary}
                            textColor="#ffffff"
                            style={styles.joinButton}
                            labelStyle={styles.joinButtonLabel}
                            onPress={() => router.push('/main/(tabs)/community')}
                        >
                            Browse Studies
                        </Button>
                    </View>
                ) : (
                    activeStudies.map(study => (
                        <ActiveStudyCard
                            key={study.id}
                            study={study}
                            onPress={() =>
                                router.push({
                                    pathname: '/main/(tabs)/community/study-details',
                                    params: {
                                        id: study.id,
                                        name: study.name,
                                        joined: '1',
                                        tripsDone: String(study.tripsDone),
                                        tripsRequired: String(study.tripsRequired),
                                        reward: '250',
                                        dates: '',
                                    },
                                })
                            }
                        />
                    ))
                )}

                {/* This week */}
                <Text style={styles.sectionLabel}>THIS WEEK</Text>
                <View style={styles.statRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Trips Recorded</Text>
                        <Text style={styles.statValue}>{MOCK_STATS.weeklyTrips}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Distance Traveled</Text>
                        <Text style={styles.statValue}>{MOCK_STATS.weeklyDistanceKm} km</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Time Spent</Text>
                        <Text style={styles.statValue}>{MOCK_STATS.weeklyTime}</Text>
                    </View>
                </View>

                {/* Recent trip */}
                <Text style={styles.sectionLabel}>RECENT TRIP</Text>
                <View style={styles.card}>
                    <View style={styles.recentRow}>
                        <View style={styles.flex}>
                            <Text style={styles.recentDate}>{recentTrip.date}</Text>
                            <Text style={styles.recentTitle} numberOfLines={1}>
                                {recentTrip.name}
                            </Text>
                        </View>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{recentTrip.status}</Text>
                        </View>
                    </View>
                </View>

                {/* Quick summary */}
                <Text style={styles.sectionLabel}>QUICK SUMMARY (All Time)</Text>
                <View style={styles.card}>
                    <SummaryRow icon="map-marker-path" label="Total Trips" value={String(MOCK_STATS.totalTrips)} theme={theme} />
                    <SummaryRow
                        icon="map-marker-distance"
                        label="Total Distance"
                        value={`${MOCK_STATS.totalDistanceKm.toLocaleString()} km`}
                        theme={theme}
                    />
                    <SummaryRow icon="clock-outline" label="Total Time" value={MOCK_STATS.totalTime} theme={theme} />
                    <SummaryRow
                        icon="alert-circle-outline"
                        label="Deviations Found"
                        value={String(MOCK_STATS.deviationsFound)}
                        theme={theme}
                        last
                    />
                </View>
            </ScrollView>

            <StudyOverviewModal
                visible={studyOfferVisible}
                onJoin={handleJoinStudyOffer}
                onClose={() => setStudyOfferVisible(false)}
            />
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
        recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        recentDate: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
        },
        recentTitle: {
            fontFamily: 'LGEIText-SemiBold',
            fontSize: fontSizes.small,
            color: theme.colors.onSurface,
            marginTop: 2,
        },
        statusBadge: {
            backgroundColor: '#DCFCE7',
            paddingHorizontal: sizes.regular,
            paddingVertical: sizes.tiny,
            borderRadius: sizes.size32,
        },
        statusText: {
            fontFamily: 'LGEIText-SemiBold',
            fontSize: fontSizes.tiny,
            color: '#16A34A',
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
