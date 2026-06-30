import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Button, MD3Theme, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';

const buildFollowUpQuestions = (reasons: string[]) => {
    const questions = new Set<string>();

    reasons.forEach(reason => {
        const normalizedReason = reason.toLowerCase();

        if (normalizedReason.includes('traffic') || normalizedReason.includes('bottleneck')) {
            questions.add('Was this traffic temporary or common in this area?');
        }
        if (normalizedReason.includes('construction') || normalizedReason.includes('flood') || normalizedReason.includes('accident')) {
            questions.add('Was the obstruction visible before you reached the turn?');
        }
        if (normalizedReason.includes('safety') || normalizedReason.includes('narrow') || normalizedReason.includes('one-way')) {
            questions.add('What made this road feel unsafe or difficult to pass?');
        }
        if (normalizedReason.includes('gps') || normalizedReason.includes('wrong turn')) {
            questions.add('What did the navigation show when you changed direction?');
        }
        if (normalizedReason.includes('parking') || normalizedReason.includes('pick-up') || normalizedReason.includes('drop-off')) {
            questions.add('What access issue made the suggested route less practical?');
        }
    });

    if (questions.size === 0) {
        questions.add('What was the main situation at this turn?');
    }

    questions.add('Would you take this deviation again on a similar delivery?');
    return Array.from(questions);
};

export default function SmartFollowUpQuestions() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { rideId, deviationIndex, deviationCount, reasons } = useLocalSearchParams<{
        rideId?: string;
        deviationIndex?: string;
        deviationCount?: string;
        reasons?: string;
    }>();
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const currentDeviationIndex = Number(deviationIndex || 0);
    const totalDeviationCount = Math.max(1, Number(deviationCount || 1));
    const selectedReasons = React.useMemo(() => {
        if (!reasons) return [];
        try {
            const parsed = JSON.parse(reasons);
            return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
        } catch {
            return [];
        }
    }, [reasons]);
    const questions = React.useMemo(() => buildFollowUpQuestions(selectedReasons), [selectedReasons]);
    const canContinue = !!rideId && questions.every(question => answers[question]?.trim());

    const handleNext = () => {
        if (!rideId || !canContinue) return;

        const nextDeviationIndex = currentDeviationIndex + 1;
        if (nextDeviationIndex < totalDeviationCount) {
            router.push(
                `/main/(tabs)/record/reason-for-deviation?rideId=${encodeURIComponent(
                    rideId
                )}&deviationIndex=${nextDeviationIndex}&deviationCount=${totalDeviationCount}`
            );
            return;
        }

        router.replace(`/main/rides/ride/${rideId}`);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
            <Stack.Screen
                options={{
                    title: 'Smart Follow-up Questions',
                    headerLeft: () => <Button onPress={() => router.back()}>Back</Button>,
                }}
            />
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}> 
                <Text style={styles.title}>Follow-up Questions</Text>
                <Text style={styles.counter}>
                    Deviation {currentDeviationIndex + 1} of {totalDeviationCount}
                </Text>
                <Text style={styles.body}>
                    Based on the reasons you selected, please answer the following to help improve future route suggestions.
                </Text>

                {selectedReasons.length > 0 && (
                    <Text style={styles.reasons}>Selected: {selectedReasons.join(', ')}</Text>
                )}

                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                    {questions.map(question => (
                        <View key={question}>
                            <Text style={styles.question}>{question}</Text>
                            <TextInput
                                label="Answer"
                                value={answers[question] || ''}
                                onChangeText={value => setAnswers(prev => ({ ...prev, [question]: value }))}
                                mode="outlined"
                                multiline
                                style={styles.input}
                            />
                        </View>
                    ))}
                </ScrollView>

                <View style={styles.actionsRow}>
                    <Button mode="outlined" onPress={() => router.back()} style={styles.navButton}>
                        Back
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleNext}
                        style={styles.navButton}
                        disabled={!canContinue}
                    >
                        {currentDeviationIndex + 1 < totalDeviationCount ? 'Next Deviation' : 'Finish'}
                    </Button>
                </View>
            </Surface>
        </View>
    );
}

const getStyles = (theme?: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        card: {
            margin: sizes.large,
            padding: sizes.large,
            borderRadius: sizes.large,
            flex: 1,
        },
        title: {
            fontSize: fontSizes.regular,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.tiny,
        },
        counter: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-SemiBold',
            marginBottom: sizes.small,
        },
        body: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIText-Regular',
            marginBottom: sizes.medium,
        },
        reasons: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-SemiBold',
            marginBottom: sizes.small,
        },
        scroll: {
            flex: 1,
        },
        scrollContent: {
            paddingBottom: sizes.small,
        },
        question: {
            marginTop: sizes.medium,
            fontSize: fontSizes.small,
            fontFamily: 'LGEIHeadline-Semibold',
        },
        input: {
            marginTop: sizes.small,
        },
        actionsRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: sizes.large,
        },
        navButton: {
            minWidth: 120,
        },
    });
