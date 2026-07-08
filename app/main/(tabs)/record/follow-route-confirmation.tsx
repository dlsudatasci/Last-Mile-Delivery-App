import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Button, MD3Theme, Surface, Text, useTheme } from 'react-native-paper';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';

const options = ['Yes, completely', 'Mostly', 'No'];

export default function FollowRouteConfirmation() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { rideId, deviationCount } = useLocalSearchParams<{ rideId?: string; deviationCount?: string }>();
    const [choice, setChoice] = React.useState('');
    const shouldAskDeviationReason = choice !== 'Yes, completely';

    const handleNext = () => {
        if (!rideId) return;

        if (!shouldAskDeviationReason) {
            router.replace(`/main/rides/ride/${rideId}`);
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
                        disabled={!rideId || !choice}
                    >
                        {shouldAskDeviationReason ? 'Next' : 'Finish'}
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
