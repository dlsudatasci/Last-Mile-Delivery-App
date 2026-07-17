import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Button, MD3Theme, Surface, Text, useTheme } from 'react-native-paper';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { FetchRideData, getRide } from '@/lib/firebase-crud/rides';
import { getAuth } from '@react-native-firebase/auth';

export default function TripSummary() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { rideId } = useLocalSearchParams<{ rideId?: string }>();
    const [ride, setRide] = useState<FetchRideData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadRide = async () => {
            const userId = getAuth().currentUser?.uid;
            if (!rideId || !userId) return;

            try {
                setLoading(true);
                setRide(await getRide(userId, rideId));
            } catch (error) {
                console.error('Failed to load trip summary:', error);
            } finally {
                setLoading(false);
            }
        };

        loadRide();
    }, [rideId]);

    const formatDuration = (seconds?: number) => {
        const totalSeconds = seconds || 0;
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
            .toString()
            .padStart(2, '0')}`;
    };

    const duration = formatDuration(ride?.duration);
    const distance = `${((ride?.distance || 0) / 1000).toFixed(2)} km`;
    const avgSpeed = `${((ride?.averageSpeed || 0) * 3.6).toFixed(1)} km/h`;
    const maxSpeed = `${((ride?.maxSpeed || 0) * 3.6).toFixed(1)} km/h`;
    const elevationGain = `${(ride?.elevationGain || 0).toFixed(0)} m`;
    const deviationCount = 0;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Stack.Screen
                options={{
                    title: 'Trip Summary',
                    headerLeft: () => <Button onPress={() => router.back()}>Back</Button>,
                }}
            />
            <ScrollView contentContainerStyle={styles.content}>
                <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Text style={styles.title}>Trip Summary</Text>

                    <Text style={styles.label}>Planned route</Text>
                    <Text style={styles.body}>Optimized route from the delivery screenshot.</Text>

                    <Text style={styles.label}>Actual route</Text>
                    <Text style={styles.body}>{ride ? `${ride.points?.length || 0} GPS points recorded` : loading ? 'Loading trip data...' : 'Trip data unavailable'}</Text>

                    <Text style={styles.label}>Deviation review</Text>
                    <Text style={styles.body}>
                        Review each detected deviation after the trip. If no deviation happened, you can mark the
                        suggested route as followed on the next screen.
                    </Text>

                    <Text style={styles.label}>Trip stats</Text>
                    <View style={styles.statsRow}>
                        <Text style={styles.statItem}>Time: {duration}</Text>
                        <Text style={styles.statItem}>Distance: {distance}</Text>
                    </View>
                    <View style={styles.statsRow}>
                        <Text style={styles.statItem}>Avg speed: {avgSpeed}</Text>
                        <Text style={styles.statItem}>Max speed: {maxSpeed}</Text>
                    </View>
                    <View style={styles.statsRow}>
                        <Text style={styles.statItem}>Elevation: {elevationGain}</Text>
                    </View>

                    <Button
                        mode="contained"
                        onPress={() =>
                            rideId &&
                            router.push(
                                `/main/(tabs)/record/post-trip-questionnaire?rideId=${encodeURIComponent(
                                    rideId
                                )}&deviationCount=${deviationCount}`
                            )
                        }
                        style={styles.button}
                        disabled={!rideId}
                    >
                        Next
                    </Button>
                </Surface>
            </ScrollView>
        </View>
    );
}

const getStyles = (theme?: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        content: {
            padding: sizes.large,
        },
        card: {
            padding: sizes.large,
            borderRadius: sizes.large,
        },
        title: {
            fontSize: fontSizes.regular,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.medium,
        },
        label: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIHeadline-Semibold',
            marginTop: sizes.medium,
        },
        body: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIText-Regular',
            marginTop: sizes.small,
        },
        statsRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: sizes.small,
        },
        statItem: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIText-Regular',
        },
        button: {
            marginTop: sizes.large,
        },
    });
