import HeaderBackButton from '@/components/common/HeaderBackButton';
import {
    AVOID_ROAD_FREQUENCY_OPTIONS,
    BLOCKAGE_OPTIONS,
    DeviationQuestionnaireAnswers,
    FREQUENCY_OPTIONS,
    LANGUAGE_LABELS,
    PERSONAL_STOP_OPTIONS,
    PRIMARY_REASON_OPTIONS,
    PrimaryDeviationReason,
    QUESTION_TEXT,
    QuestionnaireLanguage,
    STOP_DURATION_OPTIONS,
    TRAFFIC_SEVERITY_OPTIONS,
    YES_NO_UNSURE_OPTIONS,
    isDeviationQuestionnaireComplete,
    shouldAskBlockageFollowUp,
    shouldAskPersonalStopFollowUps,
    shouldAskTrafficFollowUps,
} from '@/lib/deviation-questionnaire';
import { DeviationMetadata, useTripReviews } from '@/lib/store/useTripReviews';
import { RideDeviationEvent, useRideStore } from '@/lib/store/useRideStore';
import { submitTripReview } from '@/lib/firebase-crud/reviews';
import { formatRouteInstructionSummary } from '@/lib/trip-record-display';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import Mapbox from '@rnmapbox/maps';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Button, Checkbox, MD3Theme, RadioButton, SegmentedButtons, Surface, Text, TextInput, useTheme, ActivityIndicator } from 'react-native-paper';

const emptyAnswers = (): DeviationQuestionnaireAnswers => ({
    primaryReason: '',
    personalStopReason: [],
    deviateAgainFrequency: '',
    avoidRoadFrequency: '',
});

const dayName = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long' });

function formatDateTime(timestamp?: number) {
    if (!timestamp) return 'Not available';
    return new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function extractStreetName(instruction?: string) {
    if (!instruction) return null;
    const match = instruction.match(/\b(?:onto|on|toward|towards)\s+(.+?)(?:\s+in\s+\d|\s+for\s+\d|$)/i);
    return match?.[1]?.replace(/[.,]$/, '').trim() || null;
}

function buildDeviationMetadata(
    deviationIndex: number,
    rideId?: string,
    event?: RideDeviationEvent
): DeviationMetadata {
    const now = new Date(event?.timestamp ?? Date.now());
    const dayOfWeek = dayName(now);
    const isFaster =
        typeof event?.previousEtaSec === 'number' && typeof event?.newEtaSec === 'number'
            ? event.newEtaSec < event.previousEtaSec
            : null;
    const generatedInstruction = event?.previousInstruction ?? null;
    const deviationInstruction = event?.newInstruction ?? null;
    const streetName = extractStreetName(generatedInstruction ?? undefined) ?? extractStreetName(deviationInstruction ?? undefined);
    return {
        deviationId: rideId ? `dev-${rideId}-${deviationIndex}` : null,
        routeId: event?.activeRouteId ?? null,
        rideId: rideId ?? null,
        userId: null,
        index: deviationIndex,
        originalRoute: generatedInstruction,
        dateTime: now.toISOString(),
        isFaster,
        timestamp: now.getTime(),
        hour: now.getHours(),
        dayOfWeek,
        dayType: ['Saturday', 'Sunday'].includes(dayOfWeek) ? 'Weekend' : 'Weekday',
        gpsLocation: event ? { latitude: event.location[1], longitude: event.location[0] } : null,
        suggestedPoint: null,
        actualPoint: event ? { latitude: event.location[1], longitude: event.location[0] } : null,
        originalRouteEdge: generatedInstruction,
        deviatedEdge: deviationInstruction,
        streetName,
        generatedInstruction,
        deviationInstruction,
        type: event ? 'point' : null,
        points: event ? [{ latitude: event.location[1], longitude: event.location[0] }] : null,
        start_timestamp: event?.timestamp ?? null,
        end_timestamp: event?.timestamp ?? null,
        createdAt: now.getTime(),
        mapMatchedEdge: null,
        imageUri: null,
    };
}

export default function ReasonForDeviation() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const colorScheme = useColorScheme();
    const mapboxStyle =
        colorScheme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';
    const { rideId, deviationIndex, deviationCount, language: languageParam } = useLocalSearchParams<{
        rideId?: string;
        deviationIndex?: string;
        deviationCount?: string;
        language?: QuestionnaireLanguage;
    }>();
    const saveDeviation = useTripReviews(state => state.saveDeviation);
    const markReviewed = useTripReviews(state => state.markReviewed);
    const deviationEvents = useRideStore(state => state.deviationEvents);
    const [language, setLanguage] = useState<QuestionnaireLanguage>(languageParam === 'tl' ? 'tl' : 'en');
    const [answers, setAnswers] = useState<DeviationQuestionnaireAnswers>(emptyAnswers);
    const [submitting, setSubmitting] = useState(false);
    const currentDeviationIndex = Math.max(0, Number(deviationIndex || 0));
    const totalDeviationCount = Math.max(1, Number(deviationCount || 1));
    const currentEvent = deviationEvents[currentDeviationIndex];
    const metadata = useMemo(
        () => buildDeviationMetadata(currentDeviationIndex, rideId, currentEvent),
        [currentDeviationIndex, currentEvent, rideId]
    );
    const contextPoint = metadata.gpsLocation ?? metadata.actualPoint;
    const contextCenter: [number, number] | null = contextPoint
        ? [contextPoint.longitude, contextPoint.latitude]
        : null;
    const canContinue = !!rideId && isDeviationQuestionnaireComplete(answers) && !submitting;

    const setAnswer = <K extends keyof DeviationQuestionnaireAnswers>(key: K, value: DeviationQuestionnaireAnswers[K]) => {
        setAnswers(prev => ({ ...prev, [key]: value }));
    };

    const selectPrimaryReason = (reason: PrimaryDeviationReason) => {
        setAnswers({
            ...emptyAnswers(),
            primaryReason: reason,
        });
    };

    const togglePersonalStopReason = (value: string) => {
        setAnswers(prev => {
            const selected = prev.personalStopReason ?? [];
            const next = selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value];
            return { ...prev, personalStopReason: next };
        });
    };

    const handleNext = async () => {
        if (!rideId || !canContinue) return;
        const deviationId = `dev-${rideId}-${currentDeviationIndex}`;

        saveDeviation(rideId, deviationId, {
            whyRoute: answers.primaryReason === 'Other' ? `Other: ${answers.primaryReasonOther?.trim()}` : answers.primaryReason,
            affect: answers.deviateAgainFrequency,
            confidence: answers.avoidRoadFrequency,
            questionnaire: answers,
            metadata,
            language,
        });

        const nextDeviationIndex = currentDeviationIndex + 1;
        if (nextDeviationIndex < totalDeviationCount) {
            router.replace(
                `/main/(tabs)/record/reason-for-deviation?rideId=${encodeURIComponent(
                    rideId
                )}&deviationIndex=${nextDeviationIndex}&deviationCount=${totalDeviationCount}&language=${language}`
            );
            return;
        }

        try {
            setSubmitting(true);
            await submitTripReview(rideId);
            markReviewed(rideId);
            router.replace('/main/(tabs)/map');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to submit review. Please check your connection and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Stack.Screen
                options={{
                    title: 'Change Route Questions',
                    headerLeft: () => <HeaderBackButton onPress={() => router.back()} />,
                }}
            />
            <ScrollView
                contentContainerStyle={styles.pageContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Text style={styles.title}>Change Route {currentDeviationIndex + 1} of {totalDeviationCount}</Text>
                    <SegmentedButtons
                        value={language}
                        onValueChange={value => setLanguage(value as QuestionnaireLanguage)}
                        buttons={[
                            { value: 'en', label: LANGUAGE_LABELS.en },
                            { value: 'tl', label: LANGUAGE_LABELS.tl },
                        ]}
                        style={styles.languageToggle}
                    />

                    <View style={styles.contextCard}>
                        <Text style={styles.contextTitle}>Change Route context</Text>
                        <View style={styles.contextMap}>
                            {contextCenter ? (
                                <Mapbox.MapView
                                    style={styles.map}
                                    styleURL={mapboxStyle}
                                    scrollEnabled={false}
                                    zoomEnabled={false}
                                    rotateEnabled={false}
                                    pitchEnabled={false}
                                    logoEnabled={false}
                                    attributionEnabled={false}
                                >
                                    <Mapbox.Camera
                                        animationDuration={0}
                                        zoomLevel={17}
                                        centerCoordinate={contextCenter}
                                    />
                                    <Mapbox.PointAnnotation id={`route-change-${currentDeviationIndex}`} coordinate={contextCenter}>
                                        <View style={styles.pinMarker} />
                                    </Mapbox.PointAnnotation>
                                </Mapbox.MapView>
                            ) : (
                                <View style={styles.mapFallback}>
                                    <Text style={styles.contextLine}>Map pin not available yet</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.contextLine}>Street: {metadata.streetName ?? 'Not available yet'}</Text>
                        <View style={styles.routeCompareRow}>
                            <View style={styles.routePillSuggested} />
                            <Text style={styles.contextLine}>
                                Suggested route: {formatRouteInstructionSummary(metadata.generatedInstruction, metadata.streetName)}
                            </Text>
                        </View>
                        <View style={styles.routeCompareRow}>
                            <View style={styles.routePillActual} />
                            <Text style={styles.contextLine}>
                                Actual route: {formatRouteInstructionSummary(metadata.deviationInstruction, metadata.streetName)}
                            </Text>
                        </View>
                        <Text style={styles.contextLine}>Time: {formatDateTime(metadata.timestamp ?? undefined)}</Text>
                        <Text style={styles.contextLine}>GPS location: {metadata.gpsLocation ? `${metadata.gpsLocation.latitude.toFixed(5)}, ${metadata.gpsLocation.longitude.toFixed(5)}` : 'Not available yet'}</Text>
                    </View>

                    <SingleChoice
                        title={QUESTION_TEXT.primaryReason[language]}
                        value={answers.primaryReason}
                        options={PRIMARY_REASON_OPTIONS}
                        language={language}
                        onChange={value => selectPrimaryReason(value as PrimaryDeviationReason)}
                        theme={theme}
                    />
                    {answers.primaryReason === 'Other' && (
                        <TextInput
                            label={language === 'tl' ? 'Ilagay ang dahilan' : 'Type the reason'}
                            value={answers.primaryReasonOther ?? ''}
                            onChangeText={value => setAnswer('primaryReasonOther', value)}
                            mode="outlined"
                            style={styles.input}
                        />
                    )}

                    {shouldAskTrafficFollowUps(answers.primaryReason) && (
                        <>
                            <SingleChoice
                                title={QUESTION_TEXT.trafficSeverity[language]}
                                value={answers.trafficSeverity ?? ''}
                                options={TRAFFIC_SEVERITY_OPTIONS}
                                language={language}
                                onChange={value => setAnswer('trafficSeverity', value)}
                                theme={theme}
                            />
                            <SingleChoice
                                title={QUESTION_TEXT.rushHourCause[language]}
                                value={answers.rushHourCause ?? ''}
                                options={YES_NO_UNSURE_OPTIONS}
                                language={language}
                                onChange={value => setAnswer('rushHourCause', value)}
                                theme={theme}
                            />
                            <SingleChoice
                                title={QUESTION_TEXT.chooseDuringNonRush[language]}
                                value={answers.chooseDuringNonRush ?? ''}
                                options={YES_NO_UNSURE_OPTIONS}
                                language={language}
                                onChange={value => setAnswer('chooseDuringNonRush', value)}
                                theme={theme}
                            />
                        </>
                    )}

                    {shouldAskBlockageFollowUp(answers.primaryReason) && (
                        <>
                            <SingleChoice
                                title={QUESTION_TEXT.blockageReason[language]}
                                value={answers.blockageReason ?? ''}
                                options={BLOCKAGE_OPTIONS}
                                language={language}
                                onChange={value => setAnswer('blockageReason', value)}
                                theme={theme}
                            />
                            {answers.blockageReason === 'Other' && (
                                <TextInput
                                    label={language === 'tl' ? 'Ilagay kung ano ang harang' : 'Describe the blockage'}
                                    value={answers.blockageReasonOther ?? ''}
                                    onChangeText={value => setAnswer('blockageReasonOther', value)}
                                    mode="outlined"
                                    style={styles.input}
                                />
                            )}
                        </>
                    )}

                    {shouldAskPersonalStopFollowUps(answers.primaryReason) && (
                        <>
                            <MultiChoice
                                title={QUESTION_TEXT.personalStopReason[language]}
                                values={answers.personalStopReason ?? []}
                                options={PERSONAL_STOP_OPTIONS}
                                language={language}
                                onToggle={togglePersonalStopReason}
                                theme={theme}
                            />
                            {answers.personalStopReason?.includes('Other') && (
                                <TextInput
                                    label={language === 'tl' ? 'Ilagay ang dahilan ng stop' : 'Type the stop reason'}
                                    value={answers.personalStopOther ?? ''}
                                    onChangeText={value => setAnswer('personalStopOther', value)}
                                    mode="outlined"
                                    style={styles.input}
                                />
                            )}
                            <SingleChoice
                                title={QUESTION_TEXT.stopDuration[language]}
                                value={answers.stopDuration ?? ''}
                                options={STOP_DURATION_OPTIONS}
                                language={language}
                                onChange={value => setAnswer('stopDuration', value)}
                                theme={theme}
                            />
                        </>
                    )}

                    <SingleChoice
                        title={QUESTION_TEXT.deviateAgainFrequency[language]}
                        value={answers.deviateAgainFrequency}
                        options={FREQUENCY_OPTIONS}
                        language={language}
                        onChange={value => setAnswer('deviateAgainFrequency', value)}
                        theme={theme}
                    />
                    <SingleChoice
                        title={QUESTION_TEXT.avoidRoadFrequency[language]}
                        value={answers.avoidRoadFrequency}
                        options={AVOID_ROAD_FREQUENCY_OPTIONS}
                        language={language}
                        onChange={value => setAnswer('avoidRoadFrequency', value)}
                        theme={theme}
                    />

                    <View style={styles.actionsRow}>
                        <Button mode="outlined" onPress={() => router.back()} style={styles.navButton}>
                            Back
                        </Button>
                        <Button mode="contained" onPress={handleNext} style={styles.navButton} disabled={!canContinue}>
                            {submitting ? <ActivityIndicator size={16} color={theme.colors.onPrimary} /> : currentDeviationIndex < totalDeviationCount - 1 ? 'Next Change Route' : 'Finish'}
                        </Button>
                    </View>
                </Surface>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function SingleChoice({
    title,
    value,
    options,
    language,
    onChange,
    theme,
}: {
    title: string;
    value: string;
    options: { value: string; label: Record<QuestionnaireLanguage, string> }[];
    language: QuestionnaireLanguage;
    onChange: (value: string) => void;
    theme: MD3Theme;
}) {
    const styles = getStyles(theme);
    return (
        <View style={styles.questionBlock}>
            <Text style={styles.question}>{title}</Text>
            <RadioButton.Group onValueChange={onChange} value={value}>
                {options.map(option => (
                    <TouchableOpacity key={option.value} style={styles.optionRow} onPress={() => onChange(option.value)}>
                        <RadioButton value={option.value} />
                        <Text style={styles.optionText}>{option.label[language]}</Text>
                    </TouchableOpacity>
                ))}
            </RadioButton.Group>
        </View>
    );
}

function MultiChoice({
    title,
    values,
    options,
    language,
    onToggle,
    theme,
}: {
    title: string;
    values: string[];
    options: { value: string; label: Record<QuestionnaireLanguage, string> }[];
    language: QuestionnaireLanguage;
    onToggle: (value: string) => void;
    theme: MD3Theme;
}) {
    const styles = getStyles(theme);
    return (
        <View style={styles.questionBlock}>
            <Text style={styles.question}>{title}</Text>
            {options.map(option => (
                <TouchableOpacity key={option.value} style={styles.optionRow} onPress={() => onToggle(option.value)}>
                    <Checkbox status={values.includes(option.value) ? 'checked' : 'unchecked'} />
                    <Text style={styles.optionText}>{option.label[language]}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: { flex: 1 },
        pageContent: {
            flexGrow: 1,
            padding: sizes.large,
            paddingBottom: sizes.size48,
        },
        card: {
            padding: sizes.large,
            borderRadius: sizes.large,
        },
        title: {
            fontSize: fontSizes.regular,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.small,
            color: theme.colors.onSurface,
        },
        languageToggle: { marginBottom: sizes.medium },
        contextCard: {
            borderRadius: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            padding: sizes.medium,
            marginBottom: sizes.medium,
            backgroundColor: theme.colors.primaryContainer,
        },
        contextTitle: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.small, color: theme.colors.onPrimaryContainer },
        contextLine: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onPrimaryContainer, marginTop: 2 },
        contextMap: {
            height: 170,
            borderRadius: sizes.small,
            overflow: 'hidden',
            marginTop: sizes.small,
            marginBottom: sizes.small,
            backgroundColor: theme.colors.surfaceVariant,
        },
        map: {
            flex: 1,
        },
        mapFallback: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: sizes.medium,
        },
        pinMarker: {
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: theme.colors.error,
            borderWidth: 3,
            borderColor: theme.colors.surface,
        },
        description: {
            fontFamily: 'LGEIText-SemiBold',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onPrimaryContainer,
            marginTop: sizes.small,
            marginBottom: sizes.small,
        },
        routeCompareRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: sizes.small,
            marginTop: 2,
        },
        routePillSuggested: {
            width: 16,
            height: 5,
            borderRadius: 5,
            backgroundColor: '#16A34A',
            marginTop: 7,
        },
        routePillActual: {
            width: 16,
            height: 5,
            borderRadius: 5,
            backgroundColor: '#DC2626',
            marginTop: 7,
        },
        questionBlock: { marginBottom: sizes.medium },
        question: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIHeadline-Semibold',
            color: theme.colors.onSurface,
            marginBottom: sizes.small,
        },
        optionRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: sizes.small,
            paddingVertical: 2,
        },
        optionText: {
            flex: 1,
            fontSize: fontSizes.small,
            fontFamily: 'LGEIText-Regular',
            color: theme.colors.onSurface,
        },
        input: { marginBottom: sizes.medium },
        actionsRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: sizes.large,
            gap: sizes.small,
        },
        navButton: { flex: 1 },
    });
