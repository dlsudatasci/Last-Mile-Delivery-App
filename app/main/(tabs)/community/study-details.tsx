import HeaderBackButton from '@/components/common/HeaderBackButton';
import { DEVIA_ROUTE_STUDY, getStudyProgress } from '@/lib/studies';
import { useRidesStore } from '@/lib/store/useRidesStore';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, MD3Theme, ProgressBar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StudyDetails() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { rides, totalRideCount, fetchRides } = useRidesStore();

    const params = useLocalSearchParams<{
        name?: string;
        joined?: string;
        tripsDone?: string;
        tripsRequired?: string;
        reward?: string;
        dates?: string;
    }>();

    useFocusEffect(
        useCallback(() => {
            fetchRides(true);
        }, [fetchRides])
    );

    const name = params.name ?? DEVIA_ROUTE_STUDY.name;
    const tripsDone = Math.max(Number(params.tripsDone ?? 0), totalRideCount, rides.length);
    const tripsRequired = Number(params.tripsRequired ?? DEVIA_ROUTE_STUDY.tripsRequired) || DEVIA_ROUTE_STUDY.tripsRequired;
    const reward = Number(params.reward ?? DEVIA_ROUTE_STUDY.reward);
    const dates = params.dates || DEVIA_ROUTE_STUDY.dates;
    const { creditedTrips, overLimitTrips, progress } = getStudyProgress(tripsDone, tripsRequired);

    const whatYoullDo = [
        'Record your delivery trips',
        'Upload planned routes',
        'Answer a short survey',
        'Help improve navigation research',
    ];

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <HeaderBackButton onPress={() => router.back()} />
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {name}
                </Text>
                <View style={{ width: sizes.size48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Banner */}
                <View style={styles.banner}>
                    <Icon source="motorbike" size={sizes.size64} color={theme.colors.primary} />
                    <View style={[styles.badge, styles.badgeJoined]}>
                        <Text style={[styles.badgeText, styles.badgeTextJoined]}>Joined</Text>
                    </View>
                </View>

                {/* Key facts */}
                <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Duration</Text>
                    <Text style={styles.factValue}>{dates}</Text>
                </View>
                <View style={styles.factRow}>
                    <Text style={styles.factLabel}>Reward</Text>
                    <Text style={[styles.factValue, styles.reward]}>₱{reward}</Text>
                </View>

                <Text style={styles.progressLabel}>Progress</Text>
                <View style={styles.progressRow}>
                    <Text style={styles.progressValue}>
                        {creditedTrips} / {tripsRequired} credited trips
                    </Text>
                    <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
                </View>
                <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progressBar} />

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{tripsDone}</Text>
                        <Text style={styles.statLabel}>Trips Recorded</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: '#16A34A' }]}>{creditedTrips}</Text>
                        <Text style={styles.statLabel}>Credited</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: '#CA8A04' }]}>{overLimitTrips}</Text>
                        <Text style={styles.statLabel}>Over Limit</Text>
                    </View>
                </View>

                <View style={styles.rewardNote}>
                    <Icon source="gift-outline" size={sizes.medium} color={theme.colors.primary} />
                    <Text style={styles.rewardNoteText}>Up to ₱{reward} for {tripsRequired} credited trips</Text>
                </View>

                <Button
                    mode="contained"
                    buttonColor={theme.colors.primary}
                    textColor="#ffffff"
                    style={styles.primaryButton}
                    contentStyle={styles.primaryButtonContent}
                    labelStyle={styles.primaryButtonLabel}
                    onPress={() => router.push('/main/(tabs)/map')}
                >
                    View My Trips
                </Button>

                {/* Sections (always visible for easy reading) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About the Study</Text>
                    <Text style={styles.bodyHeading}>Purpose</Text>
                    <Text style={styles.bodyText}>
                        To understand how delivery riders choose routes and how real-time conditions influence their
                        decisions.
                    </Text>
                    <Text style={styles.bodyHeading}>Who Can Join?</Text>
                    <Text style={styles.bodyText}>Delivery riders in Metro Manila using any delivery platform.</Text>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Inclusion Criteria</Text>
                    <Text style={styles.bodyText}>
                        Active delivery riders aged 18 and above, operating in Metro Manila, who can record trips using
                        the Devia app.
                    </Text>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>What You&apos;ll Do</Text>
                    {whatYoullDo.map(item => (
                        <View key={item} style={styles.checkRow}>
                            <Icon source="check-circle" size={sizes.medium} color={theme.colors.primary} />
                            <Text style={styles.checkText}>{item}</Text>
                        </View>
                    ))}
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Compensation</Text>
                    <Text style={styles.bodyText}>
                        Up to {tripsRequired} trips per rider can be credited. Maximum study compensation is ₱{reward}
                        per user. Your data is confidential and used for research purposes only.
                    </Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.colors.background },
        header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sizes.small },
        headerTitle: {
            flex: 1,
            textAlign: 'center',
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.regular,
            color: theme.colors.onBackground,
        },
        content: { padding: sizes.large, paddingBottom: sizes.size48 },
        banner: {
            height: sizes.size160,
            borderRadius: sizes.medium,
            backgroundColor: theme.colors.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: sizes.medium,
        },
        badge: {
            position: 'absolute',
            top: sizes.regular,
            right: sizes.regular,
            paddingHorizontal: sizes.regular,
            paddingVertical: sizes.tiny,
            borderRadius: sizes.size32,
        },
        badgeJoined: { backgroundColor: '#DCFCE7' },
        badgeText: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny },
        badgeTextJoined: { color: '#16A34A' },
        factRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: sizes.small,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outlineVariant ?? '#E2E8F0',
        },
        factLabel: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant },
        factValue: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurface },
        reward: { color: theme.colors.primary, fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.small },
        progressLabel: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
            marginTop: sizes.medium,
        },
        progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: sizes.tiny },
        progressValue: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.regular, color: theme.colors.onSurface },
        progressPercent: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small, color: theme.colors.primary },
        progressBar: { marginTop: sizes.small, height: sizes.small, borderRadius: sizes.small },
        statsRow: { flexDirection: 'row', gap: sizes.small, marginTop: sizes.medium },
        statCard: {
            flex: 1,
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            paddingVertical: sizes.regular,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
        },
        statValue: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.regular, color: theme.colors.onSurface },
        statLabel: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant, marginTop: 2 },
        rewardNote: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: sizes.small,
            backgroundColor: theme.colors.primaryContainer,
            borderRadius: sizes.medium,
            padding: sizes.regular,
            marginTop: sizes.medium,
        },
        rewardNoteText: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurface },
        section: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            padding: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            marginTop: sizes.medium,
        },
        sectionTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.small,
            color: theme.colors.onSurface,
            marginBottom: sizes.tiny,
        },
        sectionDivider: { height: 1, backgroundColor: theme.colors.outlineVariant ?? '#E2E8F0', marginTop: sizes.medium },
        bodyHeading: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurface, marginTop: sizes.small },
        bodyText: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
            lineHeight: fontSizes.tinyPlus * 1.5,
            marginTop: sizes.tiny,
            textAlign: 'justify',
        },
        checkRow: { flexDirection: 'row', alignItems: 'center', gap: sizes.small, marginTop: sizes.tiny },
        checkText: { flex: 1, fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant },
        primaryButton: { borderRadius: sizes.small, marginTop: sizes.large },
        primaryButtonContent: { height: sizes.size56 },
        primaryButtonLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small },
    });
