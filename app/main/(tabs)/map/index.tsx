import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useRidesStore } from '@/lib/store/useRidesStore';
import { formatRideRouteTitle } from '@/lib/trip-record-display';
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
                            onPress={() =>
                                router.push({
                                    pathname: '/main/(tabs)/map/trip-record' as never,
                                    params: { id: ride.id },
                                })
                            }
                        >
                            <View style={styles.tripCardContent}>
                                <View style={styles.tripAccent} />
                                <View style={styles.tripInfo}>
                                    <Text style={styles.tripMeta}>
                                        {date.toLocaleDateString([], {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}{' '}
                                        · {date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                    </Text>
                                    <Text style={styles.tripTitle}>{formatRideRouteTitle(ride)}</Text>
                                </View>
                                <View style={styles.tripIcon}>
                                    <Icon source="map-marker-path" size={sizes.size28} color={theme.colors.primary} />
                                </View>
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
            borderColor: theme.colors.outlineVariant,
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
            borderColor: theme.colors.outlineVariant,
            marginBottom: sizes.small,
            overflow: 'hidden',
        },
        tripCardContent: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: sizes.medium,
            gap: sizes.small,
        },
        tripAccent: {
            alignSelf: 'stretch',
            width: 6,
            borderRadius: 3,
            backgroundColor: theme.colors.primary,
        },
        tripIcon: {
            width: sizes.size64,
            height: sizes.size64,
            borderRadius: sizes.small,
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
            marginTop: sizes.tiny,
        },
        tripMeta: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
            marginTop: 2,
        },
    });
