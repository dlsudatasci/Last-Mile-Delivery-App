import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useRidesStore } from '@/lib/store/useRidesStore';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, MD3Theme, Text, TouchableRipple, useTheme } from 'react-native-paper';

export default function TripsList() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { rides, isLoading, isRefreshing, error, fetchRides } = useRidesStore();

    useFocusEffect(
        useCallback(() => {
            fetchRides(true);
        }, [fetchRides])
    );

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchRides(true)} />}
            >
                {isLoading && rides.length === 0 && (
                    <View style={styles.emptyCard}>
                        <ActivityIndicator color={theme.colors.primary} />
                        <Text style={styles.empty}>Loading trips...</Text>
                    </View>
                )}

                {!isLoading && rides.length === 0 && (
                    <View style={styles.emptyCard}>
                        <Icon source="map-marker-path" size={sizes.size48} color={theme.colors.primary} />
                        <Text style={styles.emptyTitle}>No trips recorded yet</Text>
                        <Text style={styles.empty}>{error || 'Your completed trips will appear here after recording.'}</Text>
                    </View>
                )}

                {rides.map(ride => {
                    const date = new Date(ride.createdAt || ride.endTime || ride.startTime);
                    return (
                        <TouchableRipple
                            key={ride.id}
                            style={styles.tripCard}
                            borderless
                            onPress={() => router.push({ pathname: '/main/rides/ride/[id]', params: { id: ride.id } })}
                        >
                            <View style={styles.tripRow}>
                                <View style={styles.tripIcon}>
                                    <Icon source="map-marker-path" size={sizes.medium} color={theme.colors.primary} />
                                </View>
                                <View style={styles.tripInfo}>
                                    <Text style={styles.tripTitle}>{ride.rideName || 'Recorded Trip'}</Text>
                                    <Text style={styles.tripMeta}>
                                        {date.toLocaleDateString()} · {(ride.distance / 1000).toFixed(2)} km · {Math.round(ride.duration / 60)} min
                                    </Text>
                                    <Text style={styles.tripMeta}>No deviation required unless detected during review.</Text>
                                </View>
                                <Icon source="chevron-right" size={sizes.size28} color={theme.colors.onSurfaceVariant} />
                            </View>
                        </TouchableRipple>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        list: { flexGrow: 1, padding: sizes.large, paddingBottom: sizes.size48 },
        emptyCard: {
            flex: 1,
            minHeight: sizes.size256,
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            padding: sizes.large,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            alignItems: 'center',
            justifyContent: 'center',
        },
        emptyTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.regular,
            color: theme.colors.onSurface,
            marginTop: sizes.medium,
            marginBottom: sizes.tiny,
        },
        empty: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: sizes.large,
        },
        tripCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            padding: sizes.medium,
            marginBottom: sizes.small,
        },
        tripRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: sizes.medium,
        },
        tripIcon: {
            width: sizes.size48,
            height: sizes.size48,
            borderRadius: sizes.size48 / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.primaryContainer,
        },
        tripInfo: {
            flex: 1,
        },
        tripTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.small,
            color: theme.colors.onSurface,
        },
        tripMeta: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
            marginTop: 2,
        },
    });
