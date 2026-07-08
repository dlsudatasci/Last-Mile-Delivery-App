import { getTripById } from '@/lib/mock/trips';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, MD3Theme, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';
const RED = '#DC2626';

export default function RouteComparison() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { id } = useLocalSearchParams<{ id?: string }>();
    const trip = getTripById(id ?? '');

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <IconButton icon="chevron-left" size={sizes.size32} onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Route Comparison</Text>
                <View style={{ width: sizes.size48 }} />
            </View>

            <View style={styles.content}>
                {/* Map placeholder with legend (TODO: real Mapbox route geometry) */}
                <View style={styles.map}>
                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: TEAL }]} />
                            <Text style={styles.legendText}>Suggested Route</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: RED }]} />
                            <Text style={styles.legendText}>Actual Route</Text>
                        </View>
                    </View>
                    <Icon source="map-marker-path" size={sizes.size96} color={theme.colors.onSurfaceVariant} />
                    <Text style={styles.mapNote}>Route map</Text>
                </View>

                {trip && (
                    <View style={styles.summaryRow}>
                        <View style={[styles.summaryCol, styles.summaryColBorder]}>
                            <View style={styles.summaryHead}>
                                <View style={[styles.dot, { backgroundColor: TEAL }]} />
                                <Text style={styles.summaryLabel}>Suggested</Text>
                            </View>
                            <Text style={styles.summaryValue}>
                                {trip.distanceKm} km · {trip.estTimeMin} min
                            </Text>
                        </View>
                        <View style={styles.summaryCol}>
                            <View style={styles.summaryHead}>
                                <View style={[styles.dot, { backgroundColor: RED }]} />
                                <Text style={styles.summaryLabel}>Actual</Text>
                            </View>
                            <Text style={styles.summaryValue}>
                                {trip.actualDistanceKm} km · {trip.actualTimeMin} min
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.colors.background },
        header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sizes.small },
        headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.regular, color: theme.colors.onBackground },
        content: { flex: 1, padding: sizes.large },
        map: {
            flex: 1,
            borderRadius: sizes.medium,
            backgroundColor: theme.colors.surfaceVariant,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
        },
        legend: {
            position: 'absolute',
            top: sizes.medium,
            left: sizes.medium,
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.small,
            padding: sizes.regular,
            gap: sizes.tiny,
        },
        legendItem: { flexDirection: 'row', alignItems: 'center', gap: sizes.small },
        legendText: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurface },
        dot: { width: sizes.regular, height: sizes.regular, borderRadius: sizes.regular / 2 },
        mapNote: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant, marginTop: sizes.small },
        summaryRow: {
            flexDirection: 'row',
            marginTop: sizes.medium,
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
        },
        summaryCol: { flex: 1, padding: sizes.medium },
        summaryColBorder: { borderRightWidth: 1, borderRightColor: theme.colors.outlineVariant ?? '#E2E8F0' },
        summaryHead: { flexDirection: 'row', alignItems: 'center', gap: sizes.small },
        summaryLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant },
        summaryValue: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.small, color: theme.colors.onSurface, marginTop: sizes.tiny },
    });
