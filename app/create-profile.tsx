import CustomSnackbar, { SnackbarType } from '@/components/common/Snackbar';
import { SelectField } from '@/components/onboarding/FormFields';
import { saveOnboardingProfile, signUpOrSignInWithPhone } from '@/lib/firebase-crud/auth';
import { saveLocalAccount } from '@/lib/local-db/accounts';
import { firestore } from '@/lib/utils/firebaseConfig';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useOnboarding } from '@/stores/useOnboarding';
import { useUser } from '@/stores/useUser';
import { doc, setDoc } from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';

const GENDERS = ['Male', 'Female', 'Prefer not to say', 'Other'];
const CITIES = [
    'Manila',
    'Quezon City',
    'Makati',
    'Pasig',
    'Taguig',
    'Mandaluyong',
    'San Juan',
    'Caloocan',
    'Parañaque',
    'Pasay',
    'Marikina',
    'Other',
];
const EXPERIENCE = ['Less than 6 months', '6 months–1 year', '1–3 years', '3–5 years', 'More than 5 years'];
const AGE_RANGES = ['18–24', '25–34', '35–44', '45–54', '55+'];
const PLATFORMS = ['Grab', 'Foodpanda', 'Lalamove', 'JoyRide', 'Borzo', 'Other'];

export default function CreateProfile() {
    const { riderCode, phone, acceptedPolicies, reset } = useOnboarding();
    const { setUser } = useUser();

    const [fullName, setFullName] = useState('');
    const [gender, setGender] = useState('');
    const [ageRange, setAgeRange] = useState('');
    const [city, setCity] = useState('');
    const [yearsExperience, setYearsExperience] = useState('');
    const [deliveryPlatform, setDeliveryPlatform] = useState('');

    const [submitted, setSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState<SnackbarType>('error');

    const showError = (message: string) => {
        setSnackbarMessage(message);
        setSnackbarType('error');
        setSnackbarVisible(true);
    };

    const handleRegister = async () => {
        if (isLoading) return;
        setSubmitted(true);

        if (!fullName.trim() || !gender || !ageRange || !city || !yearsExperience || !deliveryPlatform) {
            showError('Please complete all fields to continue.');
            return;
        }

        if (!phone) {
            // Phone was lost (e.g. app reloaded mid-flow) → restart at the phone step.
            router.replace('/enter-phone');
            return;
        }

        if (!riderCode) {
            router.replace('/rider-code');
            return;
        }

        const trimmedName = fullName.trim();
        const profile = {
            fullName: trimmedName,
            preferredName: trimmedName,
            gender,
            ageRange,
            city,
            yearsExperience,
            deliveryPlatform,
        };

        setIsLoading(true);
        try {
            const { user } = await signUpOrSignInWithPhone(phone);

            try {
                await saveOnboardingProfile(user.uid, {
                    ...profile,
                    phone,
                    riderCode,
                    acceptedPolicies,
                });
            } catch (remoteError) {
                console.warn('Remote profile save failed (kept locally after registration):', remoteError);
            }

            const createdAt = new Date().toISOString();
            await saveLocalAccount({
                riderCode,
                phone,
                ...profile,
                acceptedPolicies,
                createdAt,
            });

            // Mark the rider code as claimed in Firestore
            await setDoc(doc(firestore, 'riderCodes', riderCode), {
                isClaimed: true,
                claimedBy: user.uid,
                claimedAt: Date.now()
            }, { merge: true });

            setUser({
                id: user.uid,
                username: trimmedName,
                fullName: trimmedName,
                avatarUrl: null,
                email: user.email,
                phone,
                gender,
                ageRange,
                city,
                yearsExperience,
                createdAt: new Date(createdAt),
            });

            reset();
            router.replace('/main/(tabs)/home');
        } catch (error) {
            showError(error instanceof Error ? error.message : 'Could not register. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={styles.title}>Tell us about yourself</Text>
                    <Text style={styles.subtitle}>This helps us personalize your experience.</Text>

                    <View style={styles.fieldWrap}>
                        <Text style={styles.fieldLabel}>Preferred Name</Text>
                        <TextInput
                            mode="outlined"
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="What should we call you?"
                            style={styles.input}
                            contentStyle={styles.inputText}
                            outlineStyle={{ borderRadius: sizes.small }}
                            activeOutlineColor={TEAL}
                            error={submitted && !fullName.trim()}
                        />
                    </View>

                    <SelectField
                        label="Gender"
                        value={gender}
                        placeholder="Select gender"
                        options={GENDERS}
                        onSelect={setGender}
                        error={submitted && !gender}
                    />
                    <SelectField
                        label="Age Range"
                        value={ageRange}
                        placeholder="Select your age range"
                        options={AGE_RANGES}
                        onSelect={setAgeRange}
                        error={submitted && !ageRange}
                    />
                    <SelectField
                        label="City / Municipality"
                        value={city}
                        placeholder="Select your city / municipality"
                        options={CITIES}
                        onSelect={setCity}
                        error={submitted && !city}
                    />
                    <SelectField
                        label="Years of Experience as a Driver"
                        value={yearsExperience}
                        placeholder="Select experience"
                        options={EXPERIENCE}
                        onSelect={setYearsExperience}
                        error={submitted && !yearsExperience}
                    />
                    <SelectField
                        label="Delivery Platform"
                        value={deliveryPlatform}
                        placeholder="Select your primary platform"
                        options={PLATFORMS}
                        onSelect={setDeliveryPlatform}
                        error={submitted && !deliveryPlatform}
                    />

                    <Button
                        mode="contained"
                        buttonColor={TEAL}
                        textColor="#ffffff"
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        labelStyle={styles.buttonLabel}
                        onPress={handleRegister}
                        loading={isLoading}
                        disabled={isLoading}
                    >
                        Register
                    </Button>
                </ScrollView>
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
    flex: { flex: 1 },
    content: { paddingHorizontal: sizes.large, paddingTop: sizes.large, paddingBottom: sizes.size48 },
    title: {
        fontFamily: 'LGEIHeadline-Bold',
        fontSize: fontSizes.large,
        color: '#0F172A',
    },
    subtitle: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.small,
        color: '#64748B',
        marginTop: sizes.tiny,
        marginBottom: sizes.large,
    },
    fieldWrap: { marginBottom: sizes.medium },
    fieldLabel: {
        fontFamily: 'LGEIText-SemiBold',
        fontSize: fontSizes.tiny,
        color: '#334155',
        marginBottom: sizes.tiny,
    },
    input: { backgroundColor: '#ffffff' },
    inputText: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.small },
    button: { marginTop: sizes.small, borderRadius: sizes.small },
    buttonContent: { height: sizes.size56 },
    buttonLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small },
});
