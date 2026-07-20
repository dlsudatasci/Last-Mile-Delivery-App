import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Button, MD3Theme, Surface, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { submitTripReview } from '@/lib/firebase-crud/reviews';
import { useTripReviews } from '@/lib/store/useTripReviews';

const options = ['Yes, completely', 'Mostly', 'No'];

export default function FollowRouteConfirmation() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { rideId, deviationCount } = useLocalSearchParams<{ rideId?: string; deviationCount?: string }>();
    const [choice, setChoice] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const shouldAskDeviationReason = choice !== 'Yes, completely';
    const markReviewed = useTripReviews(state => state.markReviewed);

    const handleNext = async () => {
        if (!rideId) return;

        if (!shouldAskDeviationReason) {
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

        router.push(
            `/main/(tabs)/record/reason-for-deviation?rideId=${encodeURIComponent(
                rideId
            )}&deviationIndex=0&deviationCount=${encodeURIComponent(deviationCount || '1')}`
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Stack.Screen
                options={{
                    title: 'Suggested Route Followed',
                    headerLeft: () => <Button onPress={() => router.back()}>Back</Button>,
                }}
            />
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}> 
                <Text style={styles.title}>Did you follow the suggested route?</Text>
                <View style={styles.optionsRow}>
                    {options.map(option => (
                        <Button
                            key={option}
                            mode={choice === option ? 'contained' : 'outlined'}
                            onPress={() => setChoice(option)}
                            style={styles.optionButton}
                        >
                            {option}
                        </Button>
                    ))}
                </View>

                <View style={styles.actionsRow}>
                    <Button mode="outlined" onPress={() => router.back()} style={styles.navButton}>
                        Back
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleNext}
                        style={styles.navButton}
                        disabled={!rideId || !choice || submitting}
                    >
                        {submitting ? <ActivityIndicator size={16} color={theme.colors.onPrimary} /> : shouldAskDeviationReason ? 'Next' : 'Finish'}
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
        },
        title: {
            fontSize: fontSizes.regular,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.medium,
        },
        optionsRow: {
            flexDirection: 'column',
            gap: sizes.small,
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
