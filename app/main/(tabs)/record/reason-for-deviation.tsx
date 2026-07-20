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
import { submitTripReview } from '@/lib/firebase-crud/reviews';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { Button, Checkbox, MD3Theme, RadioButton, SegmentedButtons, Surface, Text, TextInput, useTheme, ActivityIndicator } from 'react-native-paper';

const emptyAnswers = (): DeviationQuestionnaireAnswers => ({
    primaryReason: '',
    personalStopReason: [],
    deviateAgainFrequency: '',
    avoidRoadFrequency: '',
});

const dayName = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long' });

function buildDeviationMetadata(deviationIndex: number): DeviationMetadata {
    const now = new Date();
    const dayOfWeek = dayName(now);
    return {
        originalRoute: null,
        dateTime: now.toISOString(),
        isFaster: null,
        timestamp: now.getTime(),
        hour: now.getHours(),
        dayOfWeek,
        dayType: ['Saturday', 'Sunday'].includes(dayOfWeek) ? 'Weekend' : 'Weekday',
        gpsLocation: null,
        originalRouteEdge: null,
        deviatedEdge: null,
        streetName: null,
        generatedInstruction: null,
        deviationInstruction: null,
        imageUri: null,
    };
}

export default function ReasonForDeviation() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { rideId, deviationIndex, deviationCount, language: languageParam } = useLocalSearchParams<{
        rideId?: string;
        deviationIndex?: string;
        deviationCount?: string;
        language?: QuestionnaireLanguage;
    }>();
    const saveDeviation = useTripReviews(state => state.saveDeviation);
    const markReviewed = useTripReviews(state => state.markReviewed);
    const [language, setLanguage] = useState<QuestionnaireLanguage>(languageParam === 'tl' ? 'tl' : 'en');
    const [answers, setAnswers] = useState<DeviationQuestionnaireAnswers>(emptyAnswers);
    const [submitting, setSubmitting] = useState(false);
    const currentDeviationIndex = Math.max(0, Number(deviationIndex || 0));
    const totalDeviationCount = Math.max(1, Number(deviationCount || 1));
    const metadata = useMemo(() => buildDeviationMetadata(currentDeviationIndex), [currentDeviationIndex]);
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
        const deviationId = `dev-${rideId}-${currentDeviationIndex}`; // temporary ID approach

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
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Stack.Screen
                options={{
                    title: 'Deviation Questions',
                    headerLeft: () => <Button onPress={() => router.back()}>Back</Button>,
                }}
            />
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Text style={styles.title}>Deviation {currentDeviationIndex + 1} of {totalDeviationCount}</Text>
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
                    <Text style={styles.contextTitle}>Deviation context</Text>
                    <Text style={styles.contextLine}>Street: {metadata.streetName ?? 'Not available'}</Text>
                    <Text style={styles.contextLine}>Generated route: {metadata.generatedInstruction ?? 'Not available'}</Text>
                    <Text style={styles.contextLine}>Route deviation: {metadata.deviationInstruction ?? 'Not available'}</Text>
                    <Text style={styles.contextLine}>Timestamp: {metadata.dateTime ?? 'Not available'}</Text>
                    <Text style={styles.contextHint}>Map snapshot will appear here when route segment capture data is available.</Text>
                </View>

                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                            label={language === 'tl' ? 'I-type ang sagot' : 'Type answer'}
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
                                    label={language === 'tl' ? 'Iba pa' : 'Other'}
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
                                    label={language === 'tl' ? 'I-type dito' : 'Type here'}
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
                </ScrollView>

                <View style={styles.actionsRow}>
                    <Button mode="outlined" onPress={() => router.back()} style={styles.navButton}>
                        Back
                    </Button>
                    <Button mode="contained" onPress={handleNext} style={styles.navButton} disabled={!canContinue}>
                        {submitting ? <ActivityIndicator size={16} color={theme.colors.onPrimary} /> : currentDeviationIndex < totalDeviationCount - 1 ? 'Next Deviation' : 'Finish'}
                    </Button>
                </View>
            </Surface>
        </View>
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
        card: {
            margin: sizes.large,
            padding: sizes.large,
            borderRadius: sizes.large,
            flex: 1,
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
        contextHint: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onPrimaryContainer, marginTop: sizes.small },
        scroll: { flex: 1 },
        scrollContent: { paddingBottom: sizes.small },
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
            marginTop: sizes.medium,
        },
        navButton: { minWidth: 120 },
    });
