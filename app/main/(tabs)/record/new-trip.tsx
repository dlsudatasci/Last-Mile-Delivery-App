import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon, MD3Theme, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';

export default function NewTrip() {
    const theme = useTheme();
    const styles = getStyles(theme);

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <View style={styles.content}>
                <Text style={styles.title}>New Trip</Text>
                <Text style={styles.subtitle}>What type of trip would you like to record?</Text>

                <TouchableRipple
                    style={[styles.card, styles.cardPrimary]}
                    borderless
                    onPress={() => router.push('/main/(tabs)/record/destination')}
                >
                    <View style={styles.cardRow}>
                        <View style={[styles.cardIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                            <Icon source="account" size={sizes.size32} color="#ffffff" />
                        </View>
                        <View style={styles.flex}>
                            <Text style={[styles.cardTitle, { color: '#ffffff' }]}>Personal Trip</Text>
                            <Text style={[styles.cardDesc, { color: 'rgba(255,255,255,0.85)' }]}>
                                Record and analyze your own route.
                            </Text>
                        </View>
                    </View>
                </TouchableRipple>

                <TouchableRipple
                    style={[styles.card, styles.cardSecondary]}
                    borderless
                    onPress={() => router.push('/main/(tabs)/record/select-study')}
                >
                    <View style={styles.cardRow}>
                        <View style={[styles.cardIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                            <Icon source="book-open-variant" size={sizes.size32} color={TEAL} />
                        </View>
                        <View style={styles.flex}>
                            <Text style={styles.cardTitle}>Study Trip</Text>
                            <Text style={styles.cardDesc}>Submit a trip to a research study and earn rewards.</Text>
                        </View>
                    </View>
                </TouchableRipple>
            </View>
        </SafeAreaView>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.colors.background },
        flex: { flex: 1 },
        content: { flex: 1, padding: sizes.large, justifyContent: 'center' },
        title: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.subtitle,
            color: theme.colors.onBackground,
            textAlign: 'center',
        },
        subtitle: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.small,
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: sizes.small,
            marginBottom: sizes.large,
        },
        card: { borderRadius: sizes.medium, padding: sizes.large, marginBottom: sizes.medium },
        cardPrimary: { backgroundColor: TEAL },
        cardSecondary: {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
        },
        cardRow: { flexDirection: 'row', alignItems: 'center', gap: sizes.medium },
        cardIcon: {
            width: sizes.size56,
            height: sizes.size56,
            borderRadius: sizes.small,
            alignItems: 'center',
            justifyContent: 'center',
        },
        cardTitle: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.regular, color: theme.colors.onSurface },
        cardDesc: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
            marginTop: sizes.tiny,
        },
    });
