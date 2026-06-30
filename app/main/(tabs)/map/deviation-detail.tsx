import { getTripById } from '@/lib/mock/trips';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, MD3Theme, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';
const RED = '#DC2626';

export default function DeviationDetail() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { id, index } = useLocalSearchParams<{ id?: string; index?: string }>();
    const trip = getTripById(id ?? '');
    const i = Number(index ?? 0);
    const deviation = trip?.deviations[i];

    if (!trip || !deviation) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <Text style={styles.empty}>Deviation not found.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <IconButton icon="chevron-left" size={sizes.size32} onPress={() => router.back()} />
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {deviation.title}
                </Text>
                <View style={{ width: sizes.size48 }} />
            </View>

            <View style={styles.content}>
                {/* Map placeholder (TODO: real Mapbox segment) */}
                <View style={styles.map}>
                    <Icon source="map-marker-path" size={sizes.size64} color={theme.colors.onSurfaceVariant} />
                    <Text style={styles.mapNote}>Deviation location</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.turnRow}>
                        <Icon source="arrow-up" size={sizes.medium} color={TEAL} />
                        <Text style={styles.turnLabel}>Suggested:</Text>
                        <Text style={[styles.turnValue, { color: TEAL }]}>{deviation.from}</Text>
                    </View>
                    <View style={styles.turnRow}>
                        <Icon source="arrow-right-top" size={sizes.medium} color={RED} />
                        <Text style={styles.turnLabel}>Actual:</Text>
                        <Text style={[styles.turnValue, { color: RED }]}>{deviation.to}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.factRow}>
                        <Text style={styles.factLabel}>Time</Text>
                        <Text style={styles.factValue}>{deviation.time}</Text>
                    </View>
                    <View style={styles.factRow}>
                        <Text style={styles.factLabel}>Location</Text>
                        <Text style={styles.factValue}>{deviation.location}</Text>
                    </View>
                </View>
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
            height: sizes.size256,
            borderRadius: sizes.medium,
            backgroundColor: theme.colors.surfaceVariant,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
        },
        mapNote: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant, marginTop: sizes.small },
        card: {
            marginTop: sizes.medium,
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            padding: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
        },
        turnRow: { flexDirection: 'row', alignItems: 'center', gap: sizes.small, paddingVertical: sizes.small },
        turnLabel: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant, width: sizes.size96 },
        turnValue: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tinyPlus, flex: 1 },
        divider: { height: 1, backgroundColor: theme.colors.outlineVariant ?? '#E2E8F0', marginVertical: sizes.small },
        factRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: sizes.small },
        factLabel: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant },
        factValue: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurface },
        empty: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: sizes.large },
    });
