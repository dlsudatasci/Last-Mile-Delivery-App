import HeaderBackButton from '@/components/common/HeaderBackButton';
import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Button, MD3Theme, SegmentedButtons, Surface, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { LANGUAGE_LABELS, QuestionnaireLanguage } from '@/lib/deviation-questionnaire';
import { useTripReviews } from '@/lib/store/useTripReviews';
import { submitTripReview } from '@/lib/firebase-crud/reviews';

const arrivalOptions = ['Early', 'On time', 'Late'];
const ratingOptions = [1, 2, 3, 4, 5];
const postTripText = {
    title: { en: 'Post-Trip Questionnaire', tl: 'Post-Trip Questionnaire' },
    arrival: { en: 'Q1: Did you arrive?', tl: 'Q1: Dumating ka ba?' },
    eta: { en: 'Q2: How accurate is the suggested ETA?', tl: 'Q2: Gaano katumpak ang iminungkahing ETA?' },
    stress: { en: 'Q3: How stressful was the trip?', tl: 'Q3: Gaano ka-stress ang biyahe?' },
    back: { en: 'Back', tl: 'Bumalik' },
    next: { en: 'Next', tl: 'Susunod' },
    finish: { en: 'Finish', tl: 'Tapusin' },
};
const arrivalLabels: Record<string, Record<QuestionnaireLanguage, string>> = {
    Early: { en: 'Early', tl: 'Maaga' },
    'On time': { en: 'On time', tl: 'Sakto sa oras' },
    Late: { en: 'Late', tl: 'Huli' },
};

export default function PostTripQuestionnaire() {
    const { rideId, deviationCount } = useLocalSearchParams<{ rideId?: string; deviationCount?: string }>();
    const [arrival, setArrival] = useState<string>('');
    const [etaRating, setEtaRating] = useState<number>(0);
    const [stressRating, setStressRating] = useState<number>(0);
    const [language, setLanguage] = useState<QuestionnaireLanguage>('en');
    const [submitting, setSubmitting] = useState(false);
    const theme = useTheme();
    const styles = getStyles(theme);
    const savePostTrip = useTripReviews(state => state.savePostTrip);
    const markReviewed = useTripReviews(state => state.markReviewed);
    const goBackToNewTrip = () => router.replace('/main/(tabs)/record/new-trip');
    const totalDeviationCount = Math.max(0, Number(deviationCount || 0));

    const handleNext = async () => {
        if (!rideId || !arrival || etaRating === 0 || stressRating === 0) return;

        savePostTrip(rideId, { arrival, etaRating, stressRating, language });

        if (totalDeviationCount <= 0) {
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
            return;
        }

        router.push({
            pathname: '/main/(tabs)/record/change-routes' as never,
            params: { rideId, deviationCount: String(totalDeviationCount), language },
        });
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Stack.Screen
                options={{
                    title: postTripText.title[language],
                    headerLeft: () => <HeaderBackButton onPress={goBackToNewTrip} />,
                }}
            />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Text style={styles.title}>{postTripText.title[language]}</Text>
                    <SegmentedButtons
                        value={language}
                        onValueChange={value => setLanguage(value as QuestionnaireLanguage)}
                        buttons={[
                            { value: 'en', label: LANGUAGE_LABELS.en },
                            { value: 'tl', label: LANGUAGE_LABELS.tl },
                        ]}
                        style={styles.languageToggle}
                    />

                    <Text style={styles.question}>{postTripText.arrival[language]}</Text>
                    <View style={styles.optionsRow}>
                        {arrivalOptions.map(option => (
                            <Button
                                key={option}
                                mode={arrival === option ? 'contained' : 'outlined'}
                                onPress={() => setArrival(option)}
                                style={styles.optionButton}
                            >
                                {arrivalLabels[option][language]}
                            </Button>
                        ))}
                    </View>

                    <Text style={styles.question}>{postTripText.eta[language]}</Text>
                    <View style={styles.optionsRow}>
                        {ratingOptions.map(value => (
                            <Button
                                key={value}
                                mode={etaRating === value ? 'contained' : 'outlined'}
                                onPress={() => setEtaRating(value)}
                                style={styles.optionButton}
                            >
                                {value}
                            </Button>
                        ))}
                    </View>

                    <Text style={styles.question}>{postTripText.stress[language]}</Text>
                    <View style={styles.optionsRow}>
                        {ratingOptions.map(value => (
                            <Button
                                key={value}
                                mode={stressRating === value ? 'contained' : 'outlined'}
                                onPress={() => setStressRating(value)}
                                style={styles.optionButton}
                            >
                                {value}
                            </Button>
                        ))}
                    </View>

                    <View style={styles.actionsRow}>
                        <Button mode="outlined" onPress={goBackToNewTrip} style={styles.navButton}>
                            {postTripText.back[language]}
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleNext}
                            style={styles.navButton}
                            disabled={!rideId || !arrival || etaRating === 0 || stressRating === 0 || submitting}
                        >
                            {submitting ? <ActivityIndicator size={16} color={theme.colors.onPrimary} /> : totalDeviationCount > 0 ? postTripText.next[language] : postTripText.finish[language]}
                        </Button>
                    </View>
                </Surface>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const getStyles = (theme?: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        scrollContent: {
            flexGrow: 1,
            paddingBottom: sizes.large,
        },
        card: {
            margin: sizes.large,
            padding: sizes.large,
            borderRadius: sizes.large,
        },
        title: {
            fontSize: fontSizes.regular,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.medium,
        },
        languageToggle: {
            marginBottom: sizes.medium,
        },
        question: {
            marginTop: sizes.medium,
            fontSize: fontSizes.small,
            fontFamily: 'LGEIHeadline-Semibold',
        },
        optionsRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: sizes.small,
            marginTop: sizes.small,
        },
        optionButton: {
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
