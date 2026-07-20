import HeaderBackButton from '@/components/common/HeaderBackButton';
import CustomSnackbar, { SnackbarType } from '@/components/common/Snackbar';
import { signUpOrSignInWithPhone } from '@/lib/firebase-crud/auth';
import { getAccountForRiderCode, isValidRiderCode, sanitizeRiderCode } from '@/lib/local-db/riderCodes';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useOnboarding } from '@/stores/useOnboarding';
import { useUser } from '@/stores/useUser';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';

export default function RiderCode() {
    const { setRiderCode, reset } = useOnboarding();
    const setUser = useUser(state => state.setUser);

    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState<SnackbarType>('error');

    const showError = (message: string) => {
        setSnackbarMessage(message);
        setSnackbarType('error');
        setSnackbarVisible(true);
    };

    const handleBack = () => {
        reset();
        router.replace('/get-started');
    };

    const handleContinue = async () => {
        if (isLoading) return;

        const riderCode = sanitizeRiderCode(code);
        if (!isValidRiderCode(riderCode)) {
            showError('Enter a valid 6-digit rider code.');
            return;
        }

        setIsLoading(true);
        try {
            const account = await getAccountForRiderCode(riderCode);
            if (!account) {
                setRiderCode(riderCode);
                router.push('/study-enrollment');
                return;
            }

            const { user } = await signUpOrSignInWithPhone(account.phone);
            setUser({
                id: user.uid,
                username: account.fullName,
                fullName: account.fullName,
                avatarUrl: null,
                email: user.email,
                phone: account.phone,
                gender: account.gender,
                ageRange: account.ageRange,
                city: account.city,
                yearsExperience: account.yearsExperience,
                createdAt: new Date(account.createdAt),
            });
            reset();
            router.replace('/main/(tabs)/home');
        } catch (error) {
            showError(error instanceof Error ? error.message : 'Could not continue. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.content}>
                    <HeaderBackButton onPress={handleBack} style={styles.backButton} />
                    <Text style={styles.title}>Enter your{'\n'}rider code</Text>
                    <Text style={styles.subtitle}>Use the 6-digit study code assigned to you by the research team.</Text>

                    <TextInput
                        mode="outlined"
                        value={code}
                        onChangeText={value => setCode(sanitizeRiderCode(value))}
                        placeholder="000000"
                        keyboardType="number-pad"
                        maxLength={6}
                        style={styles.input}
                        contentStyle={styles.inputText}
                        outlineStyle={{ borderRadius: sizes.small }}
                        activeOutlineColor={TEAL}
                    />
                </View>

                <View style={styles.footer}>
                    <Button
                        mode="contained"
                        buttonColor={TEAL}
                        textColor="#ffffff"
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        labelStyle={styles.buttonLabel}
                        onPress={handleContinue}
                        loading={isLoading}
                        disabled={isLoading || code.length < 6}
                    >
                        Continue
                    </Button>
                </View>
            </KeyboardAvoidingView>

            <CustomSnackbar
                visible={snackbarVisible}
                message={snackbarMessage}
                onDismiss={() => setSnackbarVisible(false)}
                type={snackbarType}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#ffffff' },
    flex: { flex: 1, paddingHorizontal: sizes.large },
    content: { flex: 1, paddingTop: sizes.small },
    backButton: { alignSelf: 'flex-start', marginLeft: -sizes.small, marginBottom: sizes.small },
    title: {
        fontFamily: 'LGEIHeadline-Bold',
        fontSize: fontSizes.large,
        color: '#0F172A',
    },
    subtitle: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.small,
        color: '#64748B',
        marginTop: sizes.small,
        marginBottom: sizes.large,
    },
    input: { backgroundColor: '#ffffff' },
    inputText: {
        fontFamily: 'LGEIText-SemiBold',
        fontSize: fontSizes.subtitle,
        letterSpacing: 4,
        textAlign: 'center',
    },
    footer: { paddingBottom: sizes.large },
    button: { borderRadius: sizes.small },
    buttonContent: { height: sizes.size56 },
    buttonLabel: {
        fontFamily: 'LGEIText-SemiBold',
        fontSize: fontSizes.small,
    },
});
