import { PasswordChecklist } from '@/components/auth/PasswordChecklist';
import CustomSnackbar, { SnackbarType } from '@/components/common/Snackbar';
import { auth } from '@/lib/utils/firebaseConfig';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserWithEmailAndPassword } from '@react-native-firebase/auth';
import { Image } from 'expo-image';
import { Link, router, useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import { Button, MD3Theme, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { z } from 'zod';

const registerSchema = z
    .object({
        email: z.string().email('Invalid email address'),
        password: z
            .string()
            .min(8, 'Must be at least 8 characters.')
            .max(15, 'Must not be longer than 15 characters.')
            .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
            .regex(/[0-9]/, 'Must contain at least one number')
            .regex(/[a-z]/, 'Must contain at least one lowercase letter')
            .regex(/^[A-Za-z0-9]*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]+[A-Za-z0-9]*$/, 'Must have a special character.'),
        confirmPassword: z.string(),
    })
    .refine(data => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation();
    const logo = require('@/assets/images/devia.png');

    useLayoutEffect(() => {
        navigation.setOptions({
            headerStyle: {
                backgroundColor: '#ffffff',
            },
            headerTintColor: '#000000',
        });
    }, [navigation]);

    const [isLoading, setIsLoading] = useState(false);
    const [isSnackbarVisible, setIsSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState<SnackbarType>('info');

    const [password, setPassword] = useState('');
    const [passwordTooltipVisible, setPasswordTooltipVisible] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data: RegisterFormData) => {
        setIsLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, data.email, data.password);
            setSnackbarMessage('Registration successful!');
            setSnackbarType('success');
            setIsSnackbarVisible(true);
            router.replace('/create-profile');
        } catch (error: any) {
            // console.error(error);
            setSnackbarMessage('Registration failed. Please try again.');
            setSnackbarType('error');
            setIsSnackbarVisible(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
            <KeyboardAvoidingView
                style={{
                    flex: 1,
                }}
                behavior="padding"
                enabled
            >
                <ScrollView
                    style={{ flex: 1, backgroundColor: '#ffffff' }}
                    contentContainerStyle={[styles.container, { backgroundColor: '#ffffff' }]}
                    showsVerticalScrollIndicator={false}
                >
                    <Image source={logo} style={styles.logo} contentFit="contain" />

                    <Surface style={[styles.formContainer, { backgroundColor: '#ffffff' }]} elevation={2}>
                        <Text style={styles.title}>Create Account</Text>

                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    mode="outlined"
                                    label="Email"
                                    value={value}
                                    onChangeText={onChange}
                                    contentStyle={styles.inputText}
                                    error={!!errors.email}
                                    outlineStyle={{ borderRadius: sizes.small }}
                                    activeOutlineColor="#3F1D4F"
                                    style={styles.input}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    right={<TextInput.Icon icon="email" />}
                                />
                            )}
                        />
                        {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

                        <Controller
                            control={control}
                            name="password"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    mode="outlined"
                                    label="Password"
                                    value={value}
                                    contentStyle={styles.inputText}
                                    outlineStyle={{ borderRadius: sizes.small }}
                                    activeOutlineColor="#3F1D4F"
                                    onChangeText={text => {
                                        onChange(text);
                                        setPassword(text);
                                    }}
                                    onFocus={() => setPasswordTooltipVisible(true)}
                                    onBlur={() => setPasswordTooltipVisible(false)}
                                    error={!!errors.password}
                                    style={styles.input}
                                    secureTextEntry={!showPassword}
                                    right={
                                        <TextInput.Icon
                                            icon={showPassword ? 'eye' : 'eye-off'}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setShowPassword(!showPassword);
                                            }}
                                        />
                                    }
                                />
                            )}
                        />
                        {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
                        {passwordTooltipVisible && <PasswordChecklist password={password} />}
                        <Controller
                            control={control}
                            name="confirmPassword"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    mode="outlined"
                                    label="Confirm Password"
                                    value={value}
                                    contentStyle={styles.inputText}
                                    outlineStyle={{ borderRadius: sizes.small }}
                                    activeOutlineColor="#3F1D4F"
                                    onChangeText={onChange}
                                    error={!!errors.confirmPassword}
                                    style={styles.input}
                                    secureTextEntry={!showConfirmPassword}
                                    right={
                                        <TextInput.Icon
                                            icon={showConfirmPassword ? 'eye' : 'eye-off'}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setShowConfirmPassword(!showConfirmPassword);
                                            }}
                                        />
                                    }
                                />
                            )}
                        />
                        {errors.confirmPassword && (
                            <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
                        )}

                        <View style={styles.termsContainer}>
                            <Text style={styles.termsText}>
                                By signing up, you agree to our{' '}
                                <Link href="/legal/terms-of-service" asChild>
                                    <Text style={styles.termsLink}>Terms of Service</Text>
                                </Link>{' '}
                                and{' '}
                                <Link href="/legal/privacy-policy" asChild>
                                    <Text style={styles.termsLink}>Privacy Policy</Text>
                                </Link>
                            </Text>
                        </View>

                        <Button
                            mode="contained"
                            onPress={handleSubmit(onSubmit)}
                            labelStyle={styles.buttonText}
                            style={styles.button}
                            buttonColor="#3F1D4F"
                            textColor="#ffffff"
                            loading={isLoading}
                            disabled={isLoading}
                        >
                            Sign Up
                        </Button>

                        <View style={styles.signupContainer}>
                            <Text style={styles.signupText}>Already have an account? </Text>
                            <Button
                                mode="text"
                                labelStyle={{ ...styles.buttonText, textDecorationLine: 'underline', color: '#3F1D4F' }}
                                compact
                                onPress={() => {
                                    router.replace('/login');
                                }}
                            >
                                Sign In
                            </Button>
                        </View>
                    </Surface>
                    <CustomSnackbar
                        visible={isSnackbarVisible}
                        message={snackbarMessage}
                        onDismiss={() => setIsSnackbarVisible(false)}
                        type={snackbarType}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: sizes.large,
        },

        logo: {
            width: sizes.size256,
            height: sizes.size192,
        },
        appTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.medium,
            color: theme.colors.onSurface,
            marginBottom: sizes.medium,
        },
        formContainer: {
            width: '100%',
            padding: sizes.large,
            borderRadius: sizes.medium,
        },
        title: {
            textAlign: 'center',
            marginBottom: sizes.large,
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.regular,
            // color: '#3F1D4F',
        },
        input: {
            marginBottom: sizes.medium,
        },
        inputText: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
        },
        button: {
            marginTop: sizes.medium,
        },
        errorText: {
            color: 'red',
            fontSize: fontSizes.tiny,
            marginBottom: sizes.medium,
            fontFamily: 'LGEIText-Regular',
        },
        signupContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: sizes.large,
        },
        signupText: {
            fontSize: fontSizes.tiny,
            marginRight: sizes.small,
            fontFamily: 'LGEIText-SemiBold',
        },
        buttonText: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-SemiBold',
        },
        termsContainer: {
            marginTop: sizes.medium,
        },
        termsText: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-Regular',
            textAlign: 'center',
        },
        termsLink: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-SemiBold',
            textDecorationLine: 'underline',
        },
    });
