import HeaderBackButton from '@/components/common/HeaderBackButton';
import CustomSnackbar, { SnackbarType } from '@/components/common/Snackbar';
import { signInWithPhone } from '@/lib/firebase-crud/auth';
import { isTransientFirestoreError } from '@/lib/firebase-crud/rides';
import { firestore } from '@/lib/utils/firebaseConfig';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useOnboarding } from '@/stores/useOnboarding';
import { useUser } from '@/stores/useUser';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';
const sanitizeRiderCode = (code: string) => code.replace(/\D/g, '').slice(0, 6);

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
        if (riderCode.length !== 6) {
            showError('Enter a valid 6-digit rider code.');
            return;
        }

        setIsLoading(true);
        try {
            // Check Firestore for the code
            const codeRef = doc(firestore, 'riderCodes', riderCode);
            const codeSnap = await getDoc(codeRef);

            if (!codeSnap.exists) {
                showError('Invalid code. Please check and try again.');
                setIsLoading(false);
                return;
            }

            const data = codeSnap.data();

            if (data?.isClaimed === false) {
                // Code is valid and unclaimed -> proceed to registration
                setRiderCode(riderCode);
                router.push('/study-enrollment');
                return;
            }

            // Code is already claimed. Route to enter-phone for login verification.
            const claimedBy = data?.claimedBy;
            const phone = data?.phone;

            if (!phone && !claimedBy) {
                showError('This code is claimed but missing user data.');
                setIsLoading(false);
                return;
            }

            setRiderCode(riderCode);
            router.push({ pathname: '/enter-phone', params: { loginOnly: 'true' } } as any);
        } catch (error) {
            if (isTransientFirestoreError(error)) {
                showError('You appear to be offline. Please connect to the internet to verify your code.');
            } else {
                showError(error instanceof Error ? error.message : 'Could not continue. Please try again.');
            }
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
