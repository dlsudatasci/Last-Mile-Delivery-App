import CustomSnackbar, { SnackbarType } from '@/components/common/Snackbar';
import { resolveAuthenticatedSession } from '@/lib/firebase-crud/auth';
import { auth } from '@/lib/utils/firebaseConfig';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useUser } from '@/stores/useUser';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInWithEmailAndPassword } from '@react-native-firebase/auth';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import { Button, MD3Theme, Portal, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { z } from 'zod';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const colorScheme = useColorScheme();

    const logo = require('@/assets/images/devia.png');

    /* const logo =
        colorScheme === 'dark'
            ? require('@/assets/images/icon-dark-transparent.png')
            : require('@/assets/images/icon-light-transparent.png'); */

    const [isLoading, setIsLoading] = useState(false);
    const [isSnackbarVisible, setIsSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState<SnackbarType>('info');

    const [showPassword, setShowPassword] = useState(false);

    const { setUser } = useUser();

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        if (isLoading) return;

        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, data.email, data.password);

            if (auth.currentUser) {
                const { destination, profile } = await resolveAuthenticatedSession(auth.currentUser);

                if (profile) {
                    setUser(profile);
                }
                router.replace(destination);
            }
            setSnackbarMessage('Login successful');
            setSnackbarType('success');
            setIsSnackbarVisible(true);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Firebase: Error (auth/invalid-credential).') {
                    setSnackbarMessage('Invalid email or password');
                    setSnackbarType('error');
                    setIsSnackbarVisible(true);
                } else if (error.message === 'Firebase: Error (auth/user-not-found).') {
                    setSnackbarMessage('User not found');
                    setSnackbarType('error');
                    setIsSnackbarVisible(true);
                }
            }
            // console.error(error);
            setSnackbarMessage('Invalid email or password');
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

                    <Surface style={styles.formContainer} elevation={1}>
                        <Text style={styles.title}>Login</Text>

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
                                    activeOutlineColor={theme.colors.primary}
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
                                <>
                                    <TextInput
                                        mode="outlined"
                                        label="Password"
                                        value={value}
                                        contentStyle={styles.inputText}
                                        outlineStyle={{ borderRadius: sizes.small }}
                                        activeOutlineColor={theme.colors.primary}
                                        onChangeText={onChange}
                                        error={!!errors.password}
                                        style={styles.input}
                                        secureTextEntry={!showPassword}
                                        right={
                                            <TextInput.Icon
                                                icon={showPassword ? 'eye' : 'eye-off'}
                                                onPress={e => {
                                                    Keyboard.dismiss();
                                                    setShowPassword(!showPassword);
                                                }}
                                            />
                                        }
                                    />
                                    <View style={styles.passwordContainer}>
                                        <Link href="/forgot-password" asChild>
                                            <Button mode="text" compact labelStyle={styles.linkText}>
                                                Forgot Password?
                                            </Button>
                                        </Link>
                                    </View>
                                </>
                            )}
                        />

                        {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}


                        <Button
                            mode="contained"
                            onPress={handleSubmit(onSubmit)}
                            labelStyle={styles.signInButtonText}
                            style={styles.button}
                            loading={isLoading}
                            disabled={isLoading}
                        >
                            Sign In
                        </Button>

                        <View style={styles.signupContainer}>
                            <Text style={styles.signupText}>Don't have an account? </Text>
                            <Button
                                mode="text"
                                labelStyle={{ ...styles.linkText, textDecorationLine: 'underline' }}
                                compact
                                disabled={isLoading}
                                onPress={() => {
                                    router.replace('/register');
                                }}
                            >
                                Sign Up
                            </Button>
                        </View>
                    </Surface>
                    <Portal>
                        <CustomSnackbar
                            visible={isSnackbarVisible}
                            message={snackbarMessage}
                            onDismiss={() => setIsSnackbarVisible(false)}
                            type={snackbarType}
                        />
                    </Portal>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingTop: sizes.large,
            paddingHorizontal: sizes.large,
            paddingBottom: sizes.large,
        },
        logo: {
            width: sizes.size160,
            height: sizes.size128,
            marginBottom: sizes.large,
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
            backgroundColor: '#FFFFFF',
        },
        title: {
            textAlign: 'center',
            marginBottom: sizes.medium,
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.regular,
            color: theme.colors.primary,
        },
        input: { marginTop: sizes.medium },
        inputText: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
        },
        inputLabel: {
            color: '#7F5F8A',
        },
        button: {
            marginTop: sizes.medium,
            backgroundColor: theme.colors.primary,
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
            color: theme.colors.primary,
        },
        linkText: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-SemiBold',
            color: theme.colors.primary,
        },
        signInButtonText: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-SemiBold',
            color: '#ffffff',
        },
        passwordContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
        },
    });
