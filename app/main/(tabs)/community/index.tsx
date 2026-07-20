import { getJoinedDeviaRouteStudy } from '@/lib/studies';
import { useRidesStore } from '@/lib/store/useRidesStore';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, MD3Theme, Text, TouchableRipple, useTheme } from 'react-native-paper';

const QUICK_LINKS = [
    { key: 'announcements', icon: 'bullhorn-outline', label: 'Announcements' },
    { key: 'faqs', icon: 'help-circle-outline', label: 'FAQs' },
    { key: 'contact', icon: 'headset', label: 'Contact Research Team' },
];

export default function Studies() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { rides, totalRideCount, fetchRides } = useRidesStore();
    const recordedTrips = Math.max(totalRideCount, rides.length);
    const joinedStudies = useMemo(() => [getJoinedDeviaRouteStudy(recordedTrips)], [recordedTrips]);

    useFocusEffect(
        useCallback(() => {
            fetchRides(true);
        }, [fetchRides])
    );

    const openStudy = (study: {
        id: string;
        name: string;
        joined: boolean;
        tripsRecorded?: number;
        tripsDone?: number;
        tripsRequired?: number;
        reward?: number;
        dates?: string;
    }) => {
        router.push({
            pathname: '/main/(tabs)/community/study-details',
            params: {
                id: study.id,
                name: study.name,
                joined: study.joined ? '1' : '0',
                tripsDone: String(study.tripsRecorded ?? study.tripsDone ?? 0),
                tripsRequired: String(study.tripsRequired ?? 5),
                reward: String(study.reward ?? 250),
                dates: study.dates ?? '',
            },
        });
    };

    const openQuickLink = (label: string) => {
        Alert.alert(label, 'This section is coming soon.');
    };

    return (
        <View style={styles.safe}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Available studies */}
                <Text style={styles.sectionLabel}>AVAILABLE STUDIES</Text>
                {joinedStudies.map(study => (
                    <TouchableRipple
                        key={study.id}
                        style={styles.availCard}
                        borderless
                        onPress={() => openStudy(study)}
                    >
                        <View>
                            <View style={styles.cardTopRow}>
                                <View style={styles.flex}>
                                    <Text style={styles.availName}>{study.name}</Text>
                                    <Text style={styles.availOrg}>{study.org}</Text>
                                </View>
                                <View style={[styles.badge, styles.badgeJoined]}>
                                    <Text style={[styles.badgeText, styles.badgeTextJoined]}>Joined</Text>
                                </View>
                            </View>

                            <Text style={styles.availDesc}>{study.description}</Text>

                            <View style={styles.metaGrid}>
                                <View style={styles.metaItem}>
                                    <Icon source="cash" size={sizes.medium} color={theme.colors.primary} />
                                    <Text style={styles.metaText}>Earn ₱{study.reward}</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <Icon source="map-marker-path" size={sizes.medium} color={theme.colors.primary} />
                                    <Text style={styles.metaText}>
                                        {study.creditedTrips} / {study.tripsRequired} credited
                                    </Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <Icon source="calendar-range" size={sizes.medium} color={theme.colors.primary} />
                                    <Text style={styles.metaText}>{study.dates}</Text>
                                </View>
                            </View>

                            <View style={styles.progressMeta}>
                                <Text style={styles.progressMetaText}>{study.tripsRecorded} trips recorded</Text>
                                <Text style={styles.progressMetaText}>{study.overLimitTrips} over limit</Text>
                            </View>

                            <View style={styles.viewCta}>
                                <Text style={styles.viewCtaText}>View details</Text>
                                <Icon source="chevron-right" size={sizes.size28} color={theme.colors.primary} />
                            </View>
                        </View>
                    </TouchableRipple>
                ))}

                {/* Quick links */}
                <View style={styles.linksCard}>
                    {QUICK_LINKS.map((link, index) => (
                        <TouchableRipple
                            key={link.key}
                            onPress={() => openQuickLink(link.label)}
                            style={[styles.linkRow, index < QUICK_LINKS.length - 1 && styles.linkRowBorder]}
                            borderless
                        >
                            <View style={styles.linkInner}>
                                <Icon source={link.icon} size={sizes.medium} color={theme.colors.primary} />
                                <Text style={styles.linkLabel}>{link.label}</Text>
                                <Icon source="chevron-right" size={sizes.size28} color="#94A3B8" />
                            </View>
                        </TouchableRipple>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.colors.background },
        flex: { flex: 1 },
        content: { padding: sizes.large, paddingBottom: sizes.size48 },
        header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        pageTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.subtitle,
            color: theme.colors.onBackground,
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
            marginBottom: sizes.small,
        },
        cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
        studyName: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.small,
            color: theme.colors.onSurface,
        },
        // ---- Available study card (bigger, more detail) ----
        availCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            padding: sizes.large,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            marginBottom: sizes.medium,
        },
        availName: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.regular,
            color: theme.colors.onSurface,
        },
        availOrg: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
            marginTop: 2,
        },
        availDesc: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
            lineHeight: fontSizes.tinyPlus * 1.4,
            marginTop: sizes.small,
        },
        metaGrid: {
            marginTop: sizes.medium,
        },
        metaItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: sizes.small,
            marginBottom: sizes.small,
        },
        metaText: {
            flex: 1,
            fontFamily: 'LGEIText-SemiBold',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurface,
        },
        progressMeta: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: sizes.small,
            marginTop: sizes.tiny,
        },
        progressMetaText: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
        },
        viewCta: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: sizes.small,
            paddingTop: sizes.regular,
            borderTopWidth: 1,
            borderTopColor: theme.colors.outlineVariant ?? '#E2E8F0',
        },
        viewCtaText: {
            fontFamily: 'LGEIText-SemiBold',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.primary,
        },
        badge: {
            paddingHorizontal: sizes.regular,
            paddingVertical: sizes.tiny,
            borderRadius: sizes.size32,
        },
        badgeJoined: { backgroundColor: '#DCFCE7' },
        badgeNotJoined: { backgroundColor: theme.colors.surfaceVariant },
        badgeText: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny },
        badgeTextJoined: { color: '#16A34A' },
        badgeTextNotJoined: { color: theme.colors.onSurfaceVariant },
        progressLabel: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
            marginTop: sizes.regular,
        },
        progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: sizes.tiny },
        progressValue: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.regular,
            color: theme.colors.onSurface,
        },
        progressPercent: {
            fontFamily: 'LGEIText-SemiBold',
            fontSize: fontSizes.small,
            color: theme.colors.primary,
        },
        progressBar: { marginTop: sizes.small, height: sizes.small, borderRadius: sizes.small },
        rewardText: {
            fontFamily: 'LGEIText-SemiBold',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.primary,
            marginTop: sizes.tiny,
        },
        datesText: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
            marginTop: 2,
        },
        emptyText: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
        },
        linksCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            marginTop: sizes.small,
        },
        linkRow: { paddingHorizontal: sizes.medium },
        linkRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant ?? '#E2E8F0' },
        linkInner: { flexDirection: 'row', alignItems: 'center', gap: sizes.regular, paddingVertical: sizes.medium },
        linkLabel: {
            flex: 1,
            fontFamily: 'LGEIText-SemiBold',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurface,
        },
    });
