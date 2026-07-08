import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';

export default function EnrollmentComplete() {
    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <Icon source="clipboard-check-outline" size={sizes.size64} color={TEAL} />
                </View>
                <Text style={styles.title}>You&apos;re all set!</Text>
                <Text style={styles.subtitle}>You have successfully joined the Devia Route Study.</Text>
            </View>

            <View style={styles.footer}>
                <Button
                    mode="contained"
                    buttonColor={TEAL}
                    textColor="#ffffff"
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                    onPress={() => router.replace('/main/(tabs)/home')}
                >
                    Go to Home
                </Button>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: sizes.large },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    iconCircle: {
        width: sizes.size128,
        height: sizes.size128,
        borderRadius: sizes.size128 / 2,
        backgroundColor: '#E6F2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: sizes.large,
    },
    title: {
        fontFamily: 'LGEIHeadline-Bold',
        fontSize: fontSizes.subtitle,
        color: '#0F172A',
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.small,
        color: '#64748B',
        textAlign: 'center',
        marginTop: sizes.small,
        paddingHorizontal: sizes.large,
    },
    footer: { paddingBottom: sizes.large },
    button: { borderRadius: sizes.small },
    buttonContent: { height: sizes.size56 },
    buttonLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small },
});
