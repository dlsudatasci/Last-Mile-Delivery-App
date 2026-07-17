import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, MD3Theme, Text, useTheme } from 'react-native-paper';

export default function TripsList() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const trips: [] = [];

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                {trips.length === 0 && (
                    <View style={styles.emptyCard}>
                        <Icon source="map-marker-path" size={sizes.size48} color={theme.colors.primary} />
                        <Text style={styles.emptyTitle}>No trips recorded yet</Text>
                        <Text style={styles.empty}>Your completed trips will appear here after recording.</Text>
                    </View>
                )}
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
    });
