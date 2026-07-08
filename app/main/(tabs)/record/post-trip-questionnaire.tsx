import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Button, MD3Theme, Surface, Text, useTheme } from 'react-native-paper';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';

const arrivalOptions = ['Early', 'On time', 'Late'];
const ratingOptions = [1, 2, 3, 4, 5];

export default function PostTripQuestionnaire() {
    const { rideId, deviationCount } = useLocalSearchParams<{ rideId?: string; deviationCount?: string }>();
    const [arrival, setArrival] = useState<string>('');
    const [etaRating, setEtaRating] = useState<number>(0);
    const [stressRating, setStressRating] = useState<number>(0);
    const theme = useTheme();
    const styles = getStyles(theme);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Stack.Screen
                options={{
                    title: 'Post-Trip Questionnaire',
                    headerLeft: () => <Button onPress={() => router.back()}>Back</Button>,
                }}
            />
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}> 
                <Text style={styles.title}>Post-Trip Questionnaire</Text>

                <Text style={styles.question}>Q1: Did you arrive?</Text>
                <View style={styles.optionsRow}>
                    {arrivalOptions.map(option => (
                        <Button
                            key={option}
                            mode={arrival === option ? 'contained' : 'outlined'}
                            onPress={() => setArrival(option)}
                            style={styles.optionButton}
                        >
                            {option}
                        </Button>
                    ))}
                </View>

                <Text style={styles.question}>Q2: How accurate is the suggested ETA?</Text>
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

                <Text style={styles.question}>Q3: How stressful was the trip?</Text>
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
                    <Button mode="outlined" onPress={() => router.back()} style={styles.navButton}>
                        Back
                    </Button>
                    <Button
                        mode="contained"
                        onPress={() =>
                            rideId &&
                            router.push(
                                `/main/(tabs)/record/follow-route-confirmation?rideId=${encodeURIComponent(
                                    rideId
                                )}&deviationCount=${encodeURIComponent(deviationCount || '1')}`
                            )
                        }
                        style={styles.navButton}
                        disabled={!rideId || !arrival || etaRating === 0 || stressRating === 0}
                    >
                        Next
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
