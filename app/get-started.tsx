import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';

export default function GetStarted() {
    const logo = require('@/assets/images/devia.png');

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.content}>
                <Image source={logo} style={styles.logo} contentFit="contain" />

                <Text style={styles.tagline}>Track routes.</Text>
                <Text style={styles.tagline}>Contribute to research.</Text>
                <Text style={styles.tagline}>Earn rewards.</Text>
            </View>

            <View style={styles.footer}>
                <Button
                    mode="contained"
                    buttonColor={TEAL}
                    textColor="#ffffff"
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                    onPress={() => router.push('/enter-phone')}
                >
                    Get Started
                </Button>

                <Button
                    mode="text"
                    textColor={TEAL}
                    labelStyle={styles.loginLink}
                    style={styles.loginRow}
                    onPress={() => router.push({ pathname: '/enter-phone', params: { mode: 'login' } })}
                >
                    Already have an account?
                </Button>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#ffffff',
        paddingHorizontal: sizes.large,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: sizes.size192,
        height: sizes.size128,
        marginBottom: sizes.large,
    },
    tagline: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.small,
        color: '#475569',
        textAlign: 'center',
        lineHeight: fontSizes.small * 1.5,
    },
    footer: {
        paddingBottom: sizes.large,
    },
    button: {
        borderRadius: sizes.small,
    },
    buttonContent: {
        height: sizes.size56,
    },
    buttonLabel: {
        fontFamily: 'LGEIText-SemiBold',
        fontSize: fontSizes.small,
    },
    loginRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: sizes.medium,
        flexWrap: 'wrap',
    },
    loginText: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.tiny,
        color: '#475569',
    },
    loginLink: {
        fontFamily: 'LGEIText-SemiBold',
        fontSize: fontSizes.tiny,
    },
});
