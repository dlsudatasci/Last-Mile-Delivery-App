import { formatStudyExpiry, getTripById, getTripDisplay } from '@/lib/mock/trips';
import { useTripReviews } from '@/lib/store/useTripReviews';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, IconButton, MD3Theme, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';
const signed = (n: number, unit: string) => `${n > 0 ? '+' : ''}${n.toFixed(1)} ${unit}`;

export default function TripDetails() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { id } = useLocalSearchParams<{ id?: string }>();
    const trip = getTripById(id ?? '');
    const review = useTripReviews(state => state.reviews[id ?? '']);
    const [tab, setTab] = useState<'overview' | 'deviations' | 'responses'>('overview');

    if (!trip) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <Text style={styles.empty}>Trip not found.</Text>
            </SafeAreaView>
        );
    }

    const reviewed = review?.status === 'reviewed';
    const display = getTripDisplay(trip, reviewed);
    const hasDeviations = trip.deviations.length > 0;
    const TABS = [
        { key: 'overview', label: 'Overview' },
        { key: 'deviations', label: `Deviations (${trip.deviations.length})` },
        { key: 'responses', label: 'Responses' },
    ] as const;

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <IconButton icon="chevron-left" size={sizes.size32} onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Trip Details</Text>
                <View style={{ width: sizes.size48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Trip summary */}
                <View style={styles.tripHeadRow}>
                    <View style={styles.flex}>
                        <Text style={styles.dateText}>
                            {trip.date} · {trip.time}
                        </Text>
                        <Text style={styles.routeText}>
                            {trip.from} → {trip.to}
                        </Text>
                        {trip.type === 'Study' && (
                            <>
                                <Text style={styles.studyText}>Study Trip · {trip.studyName}</Text>
                                {!!trip.studyExpiresAt && (
                                    <Text style={styles.expiryText}>Study ends {formatStudyExpiry(trip.studyExpiresAt)}</Text>
                                )}
                            </>
                        )}
                        {display.incomplete && (
                            <View style={styles.incompleteTag}>
                                <Icon source="map-marker-off" size={sizes.small} color="#DC2626" />
                                <Text style={styles.incompleteTagText}>Did not reach destination</Text>
                            </View>
                        )}
                    </View>
                    {display.isStudy && (
                        <View style={[styles.badge, { backgroundColor: display.bg }]}>
                            <Text style={[styles.badgeText, { color: display.text }]}>{display.label}</Text>
                        </View>
                    )}
                </View>

                {/* Due banner — response must be submitted within the day */}
                {display.canReview && !!display.dueLabel && (
                    <View style={styles.dueBanner}>
                        <Icon source="clock-alert-outline" size={sizes.medium} color="#DC2626" />
                        <View style={styles.flex}>
                            <Text style={styles.dueBannerText}>{display.dueLabel}</Text>
                            <Text style={styles.dueBannerSub}>Responses can only be submitted on the day of the trip.</Text>
                        </View>
                    </View>
                )}

                {/* Tabs */}
                <View style={styles.tabsRow}>
                    {TABS.map(t => (
                        <TouchableRipple key={t.key} style={styles.tab} borderless onPress={() => setTab(t.key)}>
                            <View>
                                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
                                <View style={[styles.tabUnderline, tab === t.key && styles.tabUnderlineActive]} />
                            </View>
                        </TouchableRipple>
                    ))}
                </View>

                {tab === 'overview' && (
                    <>
                        <StatCard
                            title="Suggested Route"
                            cols={[
                                { label: 'Distance', value: `${trip.distanceKm} km` },
                                { label: 'Est. Time', value: `${trip.estTimeMin} min` },
                            ]}
                            theme={theme}
                        />
                        <StatCard
                            title="Actual Route"
                            cols={[
                                { label: 'Distance', value: `${trip.actualDistanceKm} km` },
                                { label: 'Time', value: `${trip.actualTimeMin} min` },
                            ]}
                            theme={theme}
                        />
                        <StatCard
                            title="Difference"
                            cols={[
                                { label: 'Distance', value: signed(trip.actualDistanceKm - trip.distanceKm, 'km') },
                                { label: 'Est. Time', value: `${trip.actualTimeMin - trip.estTimeMin > 0 ? '+' : ''}${trip.actualTimeMin - trip.estTimeMin} min` },
                            ]}
                            theme={theme}
                        />
                        <Button
                            mode="contained"
                            buttonColor={TEAL}
                            textColor="#ffffff"
                            style={styles.button}
                            contentStyle={styles.buttonContent}
                            labelStyle={styles.buttonLabel}
                            icon="map"
                            onPress={() => router.push({ pathname: '/main/(tabs)/map/route-comparison', params: { id: trip.id } })}
                        >
                            View Route Comparison
                        </Button>
                    </>
                )}

                {tab === 'deviations' && (
                    <>
                        {/* Response action / status — study trips need a response either way */}
                        {display.isStudy &&
                            (reviewed ? (
                                <View style={styles.reviewedBanner}>
                                    <Icon source="check-circle" size={sizes.medium} color="#16A34A" />
                                    <Text style={styles.reviewedBannerText}>
                                        {display.incomplete
                                            ? 'Trip response submitted'
                                            : hasDeviations
                                              ? 'All deviations reviewed'
                                              : 'Route feedback submitted'}
                                    </Text>
                                </View>
                            ) : display.expired ? (
                                <View style={styles.expiredBanner}>
                                    <Icon source="clock-alert-outline" size={sizes.medium} color="#DC2626" />
                                    <Text style={styles.expiredBannerText}>
                                        Response window expired — this trip can no longer be reviewed.
                                    </Text>
                                </View>
                            ) : display.canReview || display.incomplete ? (
                                <Button
                                    mode="contained"
                                    buttonColor={TEAL}
                                    textColor="#ffffff"
                                    style={[styles.button, { marginBottom: sizes.medium }]}
                                    contentStyle={styles.buttonContent}
                                    labelStyle={styles.buttonLabel}
                                    icon="clipboard-text-outline"
                                    onPress={() => router.push({ pathname: '/main/(tabs)/map/review-deviations', params: { id: trip.id } })}
                                >
                                    {display.incomplete
                                        ? review?.status === 'pending'
                                            ? 'Continue Questions'
                                            : 'Answer Trip Questions'
                                        : hasDeviations
                                          ? review?.status === 'pending'
                                              ? 'Continue Review'
                                              : 'Review Deviations'
                                          : review?.status === 'pending'
                                            ? 'Continue Questions'
                                            : 'Answer Route Questions'}
                                </Button>
                            ) : null)}

                        {hasDeviations ? (
                            trip.deviations.map((d, index) => (
                                <TouchableRipple
                                    key={d.id}
                                    style={styles.card}
                                    borderless
                                    onPress={() =>
                                        router.push({ pathname: '/main/(tabs)/map/deviation-detail', params: { id: trip.id, index: String(index) } })
                                    }
                                >
                                    <View style={styles.cardRow}>
                                        <View style={styles.flex}>
                                            <Text style={styles.devTitle}>{d.title}</Text>
                                            <Text style={styles.devTime}>{d.time} · {d.distanceIntoKm} km in</Text>
                                            <Text style={styles.devChange}>
                                                {d.from} → {d.to}
                                            </Text>
                                        </View>
                                        <Icon source="chevron-right" size={sizes.size28} color="#94A3B8" />
                                    </View>
                                </TouchableRipple>
                            ))
                        ) : (
                            <View style={styles.noDevCard}>
                                <Icon
                                    source={display.incomplete ? 'map-marker-off' : 'check-decagram'}
                                    size={sizes.size32}
                                    color={display.incomplete ? '#DC2626' : '#16A34A'}
                                />
                                <Text style={styles.noDevText}>
                                    {display.incomplete
                                        ? 'This trip ended before reaching the destination.'
                                        : 'No deviations — you followed the suggested route on this trip.'}
                                </Text>
                            </View>
                        )}
                    </>
                )}

                {tab === 'responses' &&
                    (!display.isStudy ? (
                        <Text style={styles.empty}>Personal trip — no response needed.</Text>
                    ) : hasDeviations ? (
                        !review || Object.keys(review.answers).length === 0 ? (
                            <Text style={styles.empty}>
                                No responses yet. Open the Deviations tab and tap “Review Deviations”.
                            </Text>
                        ) : (
                            trip.deviations.map((d, index) => {
                                const a = review.answers[d.id];
                                if (!a) return null;
                                return (
                                    <View key={d.id} style={styles.card}>
                                        <Text style={styles.devTitle}>{d.title}</Text>
                                        <View style={[styles.qaRow, styles.qaBorder]}>
                                            <Text style={styles.question}>Bakit ibang ruta?</Text>
                                            <Text style={styles.answer}>{a.whyRoute}</Text>
                                        </View>
                                        <View style={[styles.qaRow, styles.qaBorder]}>
                                            <Text style={styles.question}>Paano nakaapekto sa biyahe?</Text>
                                            <Text style={styles.answer}>{a.affect}</Text>
                                        </View>
                                        <View style={styles.qaRow}>
                                            <Text style={styles.question}>Gaano ka kasigurado?</Text>
                                            <Text style={styles.answer}>{a.confidence}</Text>
                                        </View>
                                    </View>
                                );
                            })
                        )
                    ) : display.incomplete ? (
                        !review?.incompleteFeedback ? (
                            <Text style={styles.empty}>
                                No responses yet. Open the Deviations tab and tap “Answer Trip Questions”.
                            </Text>
                        ) : (
                            <View style={styles.card}>
                                <Text style={styles.devTitle}>Trip Response</Text>
                                <View style={[styles.qaRow, styles.qaBorder]}>
                                    <Text style={styles.question}>Bakit naagang natapos ang biyahe?</Text>
                                    <Text style={styles.answer}>{review.incompleteFeedback.reason}</Text>
                                </View>
                                <View style={[styles.qaRow, styles.qaBorder]}>
                                    <Text style={styles.question}>Gaano kalayo nakarating?</Text>
                                    <Text style={styles.answer}>{review.incompleteFeedback.distanceReached}</Text>
                                </View>
                                <View style={styles.qaRow}>
                                    <Text style={styles.question}>Susubukan mo bang ulitin?</Text>
                                    <Text style={styles.answer}>{review.incompleteFeedback.willRetry}</Text>
                                </View>
                            </View>
                        )
                    ) : !review?.routeFeedback ? (
                        <Text style={styles.empty}>
                            No responses yet. Open the Deviations tab and tap “Answer Route Questions”.
                        </Text>
                    ) : (
                        <View style={styles.card}>
                            <Text style={styles.devTitle}>Route Feedback</Text>
                            <View style={[styles.qaRow, styles.qaBorder]}>
                                <Text style={styles.question}>Naging angkop ba ang ruta?</Text>
                                <Text style={styles.answer}>{review.routeFeedback.optimalRoute}</Text>
                            </View>
                            <View style={[styles.qaRow, styles.qaBorder]}>
                                <Text style={styles.question}>Bakit walang ibang rutang ginawa?</Text>
                                <Text style={styles.answer}>{review.routeFeedback.whyNoDeviation}</Text>
                            </View>
                            <View style={styles.qaRow}>
                                <Text style={styles.question}>Kabuuang karanasan sa ruta?</Text>
                                <Text style={styles.answer}>{review.routeFeedback.experience}</Text>
                            </View>
                        </View>
                    ))}
            </ScrollView>
        </SafeAreaView>
    );
}

function StatCard({
    title,
    cols,
    theme,
}: {
    title: string;
    cols: { label: string; value: string }[];
    theme: MD3Theme;
}) {
    const styles = getStyles(theme);
    return (
        <View style={styles.statCard}>
            <Text style={styles.statTitle}>{title}</Text>
            <View style={styles.statRow}>
                {cols.map(c => (
                    <View key={c.label} style={styles.statCol}>
                        <Text style={styles.statLabel}>{c.label}</Text>
                        <Text style={styles.statValue}>{c.value}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.colors.background },
        flex: { flex: 1 },
        header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sizes.small },
        headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.regular, color: theme.colors.onBackground },
        content: { padding: sizes.large, paddingTop: sizes.small },
        tripHeadRow: { flexDirection: 'row', alignItems: 'flex-start' },
        dateText: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant },
        routeText: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.regular, color: theme.colors.onSurface, marginTop: 2 },
        studyText: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant, marginTop: 2 },
        expiryText: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny, color: theme.colors.primary, marginTop: 2 },
        incompleteTag: { flexDirection: 'row', alignItems: 'center', gap: sizes.tiny, marginTop: sizes.tiny },
        incompleteTagText: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny, color: '#DC2626' },
        dueBanner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: sizes.small,
            backgroundColor: '#FEE2E2',
            borderRadius: sizes.medium,
            padding: sizes.medium,
            marginTop: sizes.medium,
        },
        dueBannerText: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tinyPlus, color: '#DC2626' },
        dueBannerSub: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: '#DC2626', marginTop: 1 },
        noDevCard: {
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            padding: sizes.large,
            gap: sizes.small,
        },
        noDevText: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant, textAlign: 'center' },
        badge: { paddingHorizontal: sizes.regular, paddingVertical: sizes.tiny, borderRadius: sizes.size32 },
        badgeText: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny },
        tabsRow: { flexDirection: 'row', marginTop: sizes.large, marginBottom: sizes.medium },
        tab: { flex: 1, alignItems: 'center' },
        tabText: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant, paddingBottom: sizes.small, textAlign: 'center' },
        tabTextActive: { color: TEAL },
        tabUnderline: { height: 2, backgroundColor: 'transparent', borderRadius: 2 },
        tabUnderlineActive: { backgroundColor: TEAL },
        statCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            padding: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            marginBottom: sizes.small,
        },
        statTitle: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurface, marginBottom: sizes.small },
        statRow: { flexDirection: 'row' },
        statCol: { flex: 1 },
        statLabel: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant },
        statValue: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.small, color: theme.colors.onSurface, marginTop: 2 },
        card: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            padding: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            marginBottom: sizes.small,
        },
        cardRow: { flexDirection: 'row', alignItems: 'center' },
        devTitle: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.small, color: theme.colors.onSurface },
        devTime: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant, marginTop: 2 },
        devChange: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurface, marginTop: sizes.tiny },
        qaRow: { paddingVertical: sizes.regular },
        qaBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant ?? '#E2E8F0' },
        question: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurface },
        answer: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.primary, marginTop: 2 },
        button: { marginTop: sizes.small, borderRadius: sizes.small },
        buttonContent: { height: sizes.size56 },
        buttonLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small },
        empty: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: sizes.large },
        reviewedBanner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: sizes.small,
            backgroundColor: '#DCFCE7',
            borderRadius: sizes.medium,
            padding: sizes.medium,
            marginBottom: sizes.medium,
        },
        reviewedBannerText: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tinyPlus, color: '#16A34A' },
        expiredBanner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: sizes.small,
            backgroundColor: '#FEE2E2',
            borderRadius: sizes.medium,
            padding: sizes.medium,
            marginBottom: sizes.medium,
        },
        expiredBannerText: { flex: 1, fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny, color: '#DC2626' },
    });
