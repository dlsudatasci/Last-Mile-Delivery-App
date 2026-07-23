import HeaderBackButton from '@/components/common/HeaderBackButton';
import { LANGUAGE_LABELS, QuestionnaireLanguage } from '@/lib/deviation-questionnaire';
import { RideDeviationEvent, useRideStore } from '@/lib/store/useRideStore';
import { formatRouteInstructionSummary } from '@/lib/trip-record-display';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
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
}

function buildChangeRoutes(count: number, events: RideDeviationEvent[]): ChangeRouteListItem[] {
    return Array.from({ length: count }, (_, index) => {
        const event = events[index];
        return {
            id: `change-route-${index + 1}`,
            index,
            time: formatTime(event?.timestamp),
            generatedInstruction: event?.previousInstruction,
            deviationInstruction: event?.newInstruction,
        };
    });
}

export default function ChangeRoutes() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { rideId, deviationCount, language: languageParam } = useLocalSearchParams<{
        rideId?: string;
        deviationCount?: string;
        language?: QuestionnaireLanguage;
    }>();
    const [language, setLanguage] = useState<QuestionnaireLanguage>(languageParam === 'tl' ? 'tl' : 'en');
    const deviationEvents = useRideStore(state => state.deviationEvents);
    const totalChangeRoutes = Math.max(0, Number(deviationCount || deviationEvents.length || 0));
    const changeRoutes = useMemo(
        () => buildChangeRoutes(totalChangeRoutes, deviationEvents),
        [deviationEvents, totalChangeRoutes]
    );

    const startReview = () => {
        if (!rideId || totalChangeRoutes <= 0) return;
        router.push(
            `/main/(tabs)/record/reason-for-deviation?rideId=${encodeURIComponent(
                rideId
            )}&deviationIndex=0&deviationCount=${totalChangeRoutes}&language=${language}`
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Stack.Screen
                options={{
                    title: 'Change Routes',
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

                <Text style={styles.sectionLabel}>DETECTED CHANGE ROUTES</Text>
                <Text style={styles.count}>{totalChangeRoutes}</Text>
                <Text style={styles.description}>
                    May nakita kaming {totalChangeRoutes} beses na nag-iba ka ng ruta mula sa suggested route. Review natin isa-isa.
                </Text>

                {changeRoutes.map(item => (
                    <Surface key={item.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.cardText}>
                            <Text style={styles.cardTitle}>Change Route {item.index + 1}</Text>
                            {!!item.time && <Text style={styles.cardMeta}>{item.time}</Text>}
                            {!!item.streetName && <Text style={styles.cardMeta}>Street: {item.streetName}</Text>}
                            {!!item.generatedInstruction && (
                                <Text style={styles.cardMeta}>Suggested: {formatRouteInstructionSummary(item.generatedInstruction, item.streetName)}</Text>
                            )}
                            {!!item.deviationInstruction && <Text style={styles.cardMeta}>Actual: {formatRouteInstructionSummary(item.deviationInstruction, item.streetName)}</Text>}
                            {!item.generatedInstruction && !item.deviationInstruction && (
                                <Text style={styles.cardMeta}>Details not available yet</Text>
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
                    Review Change Routes
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
