import HeaderBackButton from '@/components/common/HeaderBackButton';
import CustomSnackbar, { SnackbarType } from '@/components/common/Snackbar';
import { isValidPhilippineMobileNumber } from '@/lib/firebase-crud/auth';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useOnboarding } from '@/stores/useOnboarding';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Icon, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';

// Convert the digits typed after +63 into the local 09XXXXXXXXX format.
const toLocalPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) return digits;
    if (digits.length === 10 && digits.startsWith('9')) return `0${digits}`;
    if (digits.length === 12 && digits.startsWith('63')) return `0${digits.slice(2)}`;
    return digits;
};

export default function EnterPhone() {
    const setOnboardingPhone = useOnboarding(state => state.setPhone);

    const [phone, setPhone] = useState('');
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState<SnackbarType>('error');

    const showError = (message: string) => {
        setSnackbarMessage(message);
        setSnackbarType('error');
        setSnackbarVisible(true);
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/get-started');
        }
    };

    const handleContinue = async () => {
        const localPhone = toLocalPhone(phone);
        if (!isValidPhilippineMobileNumber(localPhone)) {
            showError('Enter a valid Philippine mobile number (e.g. 912 345 6789).');
            return;
        }

        setOnboardingPhone(localPhone);
        router.push('/create-profile');
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.content}>
                    <HeaderBackButton onPress={handleBack} style={styles.backButton} />
                    <Text style={styles.title}>Enter your{'\n'}phone number</Text>
                    <Text style={styles.subtitle}>
                        This number will be linked to your rider account and used for compensation verification through
                        GCash, Maya, or Maribank.
                    </Text>

                    <View style={styles.phoneRow}>
                        <View style={styles.countryCode}>
                            <Text style={styles.countryCodeText}>+63</Text>
                            <Icon source="chevron-down" size={sizes.size28} color="#64748B" />
                        </View>
                        <TextInput
                            mode="outlined"
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="912 345 6789"
                            keyboardType="phone-pad"
                            maxLength={13}
                            style={styles.phoneInput}
                            contentStyle={styles.phoneInputText}
                            outlineStyle={{ borderRadius: sizes.small }}
                            activeOutlineColor={TEAL}
                        />
                    </View>
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
                    >
                        Continue
                    </Button>

                    <View style={styles.secureRow}>
                        <Icon source="lock-outline" size={sizes.medium} color="#94A3B8" />
                        <Text style={styles.secureText}>We&apos;ll keep your number secure and private.</Text>
                    </View>
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
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: sizes.small,
    },
    countryCode: {
        flexDirection: 'row',
        alignItems: 'center',
        height: sizes.size56,
        paddingHorizontal: sizes.regular,
        borderWidth: 1,
        borderColor: '#79747E',
        borderRadius: sizes.small,
        backgroundColor: '#ffffff',
    },
    countryCodeText: {
        fontFamily: 'LGEIText-SemiBold',
        fontSize: fontSizes.small,
        color: '#0F172A',
    },
    phoneInput: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    phoneInputText: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.small,
    },
    footer: { paddingBottom: sizes.large },
    button: { borderRadius: sizes.small },
    buttonContent: { height: sizes.size56 },
    buttonLabel: {
        fontFamily: 'LGEIText-SemiBold',
        fontSize: fontSizes.small,
    },
    secureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sizes.tiny,
        marginTop: sizes.medium,
    },
    secureText: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.tiny,
        color: '#94A3B8',
    },
});
