import HeaderBackButton from '@/components/common/HeaderBackButton';
import { LANGUAGE_LABELS, QuestionnaireLanguage } from '@/lib/deviation-questionnaire';
import { FetchedGeneratedRoute, getGeneratedRoutesByRideId } from '@/lib/firebase-crud/rides';
import { useRideStore } from '@/lib/store/useRideStore';
import { useRidesStore } from '@/lib/store/useRidesStore';
import { useTripReviews } from '@/lib/store/useTripReviews';
import { formatRouteInstructionSummary, getDeviationTimeImpact } from '@/lib/trip-record-display';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, MD3Theme, SegmentedButtons, Surface, Text, useTheme } from 'react-native-paper';

function formatTime(timestamp?: number) {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

interface ChangeRouteListItem {
    id: string;
    index: number;
    time: string | null;
    generatedInstruction?: string;
    deviationInstruction?: string;
    streetName?: string;
    arrivalSummary: (language: QuestionnaireLanguage) => string | null;
}

const changeRoutesText = {
    title: { en: 'Change Routes', tl: 'Mga Pagbabago ng Ruta' },
    sectionLabel: { en: 'DETECTED CHANGE ROUTES', tl: 'MGA NATUKOY NA PAGBABAGO NG RUTA' },
    description: {
        en: (count: number) =>
            `We detected ${count} ${count === 1 ? 'route change' : 'route changes'} from the suggested route. Let's review them one by one.`,
        tl: (count: number) =>
            `May nakita kaming ${count} beses na nag-iba ka ng ruta mula sa suggested route. Review natin isa-isa.`,
    },
    routeTitle: { en: 'Change Route', tl: 'Pagbabago ng Ruta' },
    street: { en: 'Street', tl: 'Kalsada' },
    suggested: { en: 'Suggested', tl: 'Iminungkahing ruta' },
    actual: { en: 'Actual', tl: 'Aktuwal na ruta' },
    arrivalTime: { en: 'Arrival time', tl: 'Oras ng dating' },
    detailsNotAvailable: { en: 'Details not available yet', tl: 'Wala pang available na detalye' },
    review: { en: 'Review Change Routes', tl: 'Suriin ang Mga Pagbabago ng Ruta' },
};

export default function ChangeRoutes() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { rideId, deviationCount, language: languageParam, fromTripRecord } = useLocalSearchParams<{
        rideId?: string;
        deviationCount?: string;
        language?: QuestionnaireLanguage;
        fromTripRecord?: string;
    }>();
    const [language, setLanguage] = useState<QuestionnaireLanguage>(languageParam === 'tl' ? 'tl' : 'en');
    const [remoteRoutes, setRemoteRoutes] = useState<FetchedGeneratedRoute[]>([]);
    const deviationEvents = useRideStore(state => state.deviationEvents);
    const liveGeneratedRoutes = useRideStore(state => state.generatedRoutes);
    const liveStartTime = useRideStore(state => state.startTime);
    const liveDuration = useRideStore(state => state.duration);
    const liveSuggestedDuration = useRideStore(
        state => state.suggestedRouteDurationSec || state.activeRouteDurationSec
    );
    const selectedRide = useRidesStore(state => state.selectedRide);
    const rides = useRidesStore(state => state.rides);
    const reviews = useTripReviews(state => state.reviews);
    const matchedRide = selectedRide?.id === rideId ? selectedRide : rides.find(r => r.id === rideId);
    const savedReview = rideId ? reviews[rideId] : undefined;
    const totalChangeRoutes = Math.max(0, Number(deviationCount || deviationEvents.length || 0));

    useEffect(() => {
        let cancelled = false;
        if (rideId && deviationEvents.length === 0 && liveGeneratedRoutes.length === 0) {
            getGeneratedRoutesByRideId(rideId)
                .then(routes => {
                    if (!cancelled) setRemoteRoutes(routes);
                })
                .catch(() => undefined);
        }
        return () => {
            cancelled = true;
        };
    }, [deviationEvents.length, liveGeneratedRoutes.length, rideId]);

    const changeRoutes = useMemo(() => {
        const tripFallback = matchedRide ?? {
            startTime: liveStartTime ?? undefined,
            duration: liveDuration,
            suggestedRouteDurationSec: liveSuggestedDuration,
        };
        const allRoutes = liveGeneratedRoutes.length > 0 ? liveGeneratedRoutes : remoteRoutes;
        const regeneratedOnly = allRoutes.filter(r => r.sequence > 1 && r.type === 'Regenerated Route');
        const reroutedList = regeneratedOnly.length > 0 ? regeneratedOnly : allRoutes.filter(r => r.sequence > 1);
        return Array.from({ length: totalChangeRoutes }, (_, index) => {
            const event = deviationEvents[index];
            const savedAnswer = rideId ? savedReview?.answers[`dev-${rideId}-${index}`] : undefined;
            const metadata = savedAnswer?.metadata;
            const generatedRoute = reroutedList[index];
            const impact = getDeviationTimeImpact({
                metadata,
                event,
                trip: tripFallback,
                generatedRoute,
            });
            return {
                id: `change-route-${index + 1}`,
                index,
                time: formatTime(event?.timestamp ?? metadata?.timestamp ?? generatedRoute?.generatedAt ?? undefined),
                generatedInstruction: event?.previousInstruction ?? metadata?.generatedInstruction ?? undefined,
                deviationInstruction: event?.newInstruction ?? metadata?.deviationInstruction ?? undefined,
                streetName: metadata?.streetName ?? undefined,
                arrivalSummary: impact.formatSummary,
            };
        });
    }, [deviationEvents, liveDuration, liveGeneratedRoutes, liveStartTime, liveSuggestedDuration, matchedRide, remoteRoutes, rideId, savedReview, totalChangeRoutes]);

    const startReview = () => {
        if (!rideId || totalChangeRoutes <= 0) return;
        router.push(
            `/main/(tabs)/record/reason-for-deviation?rideId=${encodeURIComponent(
                rideId
            )}&deviationIndex=0&deviationCount=${totalChangeRoutes}&language=${language}${fromTripRecord === '1' ? '&fromTripRecord=1' : ''}`
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Stack.Screen
                options={{
                    title: changeRoutesText.title[language],
                    headerLeft: () => <HeaderBackButton onPress={() => router.back()} />,
                }}
            />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <SegmentedButtons
                    value={language}
                    onValueChange={value => setLanguage(value as QuestionnaireLanguage)}
                    buttons={[
                        { value: 'en', label: LANGUAGE_LABELS.en },
                        { value: 'tl', label: LANGUAGE_LABELS.tl },
                    ]}
                    style={styles.languageToggle}
                />

                <Text style={styles.sectionLabel}>{changeRoutesText.sectionLabel[language]}</Text>
                <Text style={styles.count}>{totalChangeRoutes}</Text>
                <Text style={styles.description}>{changeRoutesText.description[language](totalChangeRoutes)}</Text>

                {changeRoutes.map(item => (
                    <Surface key={item.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.cardText}>
                            <Text style={styles.cardTitle}>{changeRoutesText.routeTitle[language]} {item.index + 1}</Text>
                            {!!item.time && <Text style={styles.cardMeta}>{item.time}</Text>}
                            {!!item.streetName && <Text style={styles.cardMeta}>{changeRoutesText.street[language]}: {item.streetName}</Text>}
                            {!!item.generatedInstruction && (
                                <Text style={styles.cardMeta}>{changeRoutesText.suggested[language]}: {formatRouteInstructionSummary(item.generatedInstruction, item.streetName)}</Text>
                            )}
                            {!!item.deviationInstruction && <Text style={styles.cardMeta}>{changeRoutesText.actual[language]}: {formatRouteInstructionSummary(item.deviationInstruction, item.streetName)}</Text>}
                            {!!item.arrivalSummary(language) && (
                                <Text style={styles.cardMeta}>{changeRoutesText.arrivalTime[language]}: {item.arrivalSummary(language)}</Text>
                            )}
                            {!item.generatedInstruction && !item.deviationInstruction && !item.arrivalSummary(language) && (
                                <Text style={styles.cardMeta}>{changeRoutesText.detailsNotAvailable[language]}</Text>
                            )}
                        </View>
                        <View style={styles.iconBox}>
                            <Icon source="map-marker-path" size={sizes.size32} color={theme.colors.secondary} />
                        </View>
                    </Surface>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    mode="contained"
                    onPress={startReview}
                    disabled={!rideId || totalChangeRoutes <= 0}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                >
                    {changeRoutesText.review[language]}
                </Button>
            </View>
        </View>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: { flex: 1 },
        content: {
            padding: sizes.large,
            paddingBottom: sizes.large,
        },
        languageToggle: {
            marginBottom: sizes.large,
        },
        sectionLabel: {
            fontFamily: 'LGEIHeadline-Semibold',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
            letterSpacing: 0,
        },
        count: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.display,
            color: theme.colors.onSurface,
            marginTop: sizes.small,
        },
        description: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.small,
            color: theme.colors.onSurfaceVariant,
            marginBottom: sizes.large,
        },
        card: {
            borderRadius: sizes.medium,
            padding: sizes.medium,
            marginBottom: sizes.medium,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
        },
        cardText: { flex: 1 },
        cardTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.small,
            color: theme.colors.onSurface,
            marginBottom: 2,
        },
        cardMeta: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
            marginTop: 2,
        },
        iconBox: {
            width: 58,
            height: 58,
            borderRadius: sizes.small,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.primaryContainer,
            marginLeft: sizes.medium,
        },
        footer: {
            padding: sizes.large,
            backgroundColor: theme.colors.background,
        },
        buttonContent: {
            minHeight: sizes.size48,
        },
        buttonLabel: {
            fontFamily: 'LGEIHeadline-Semibold',
            fontSize: fontSizes.small,
        },
    });
