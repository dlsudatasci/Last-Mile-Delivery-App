import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, MD3Theme, Portal, Text, TextInput, useTheme } from 'react-native-paper';

import CustomSnackbar from '@/components/common/Snackbar';
import { auth } from '@/lib/utils/firebaseConfig';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useUser } from '@/stores/useUser';
import { zodResolver } from '@hookform/resolvers/zod';
import { sendPasswordResetEmail } from '@react-native-firebase/auth';
import { router, useNavigation } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useLayoutEffect } from 'react';

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
    const theme = useTheme();
    const navigation = useNavigation();
    const { user, setUser } = useUser();
    const [password, setPassword] = useState('');
    const [passwordTooltipVisible, setPasswordTooltipVisible] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [showMessage, setShowMessage] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const styles = getStyles(theme);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerStyle: {
                backgroundColor: '#ffffff',
            },
            headerTintColor: '#000000',
        });
    }, [navigation]);

    const forgotPasswordForm = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, data.email);

            setShowSuccessMessage(true);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: '#ffffff' }]}>
            <View style={styles.menuContainer}>
                {showSuccessMessage ? (
                    <View style={styles.messageContainer}>
                        <Icon source="account-check" size={sizes.size112} color="#3F1D4F" />
                        <Text style={styles.messageText}>
                            If an account exists with this email, an email has been sent to reset your password.
                        </Text>
                        <Text style={styles.messageText}>
                            If you don't receive an email, please check your spam folder or contact support.
                        </Text>
                        <Button mode="contained" onPress={() => router.dismissTo('/login')} buttonColor="#3F1D4F">
                            Back to Login
                        </Button>
                    </View>
                ) : (
                    <>
                        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Email Address</Text>

                        <Controller
                            control={forgotPasswordForm.control}
                            name="email"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    mode="outlined"
                                    label="Email Address"
                                    value={value}
                                    onChangeText={onChange}
                                    style={{ marginBottom: sizes.medium }}
                                    activeOutlineColor="#3F1D4F"
                                    autoCapitalize="none"
                                    right={<TextInput.Icon icon="email" />}
                                />
                            )}
                        />
                        {forgotPasswordForm.formState.errors.email && (
                            <Text style={styles.errorText}>{forgotPasswordForm.formState.errors.email?.message}</Text>
                        )}
                        <Button
                            mode="contained"
                            onPress={forgotPasswordForm.handleSubmit(onSubmit)}
                            loading={isLoading}
                            disabled={isLoading}
                            buttonColor="#3F1D4F"
                            textColor="#ffffff"
                        >
                            Reset Password
                        </Button>
                    </>
                )}
            </View>
            <Portal>
                <CustomSnackbar
                    visible={showMessage}
                    message="An error occurred while sending the password reset email. Please try again."
                    onDismiss={() => setShowMessage(false)}
                />
            </Portal>
        </View>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            padding: sizes.large,
        },
        profileHeader: {
            padding: sizes.large,
            borderRadius: sizes.medium,
            marginBottom: sizes.large,
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1,
            elevation: 1,
        },
        profileInfo: {
            alignItems: 'center',
            marginTop: sizes.medium,
        },
        username: {
            fontSize: fontSizes.large,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.tiny,
        },
        email: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIText-Regular',
            opacity: 0.7,
        },
        menuContainer: {
            padding: sizes.large,
            borderRadius: sizes.medium,
            backgroundColor: '#ffffff',
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1,
            elevation: 1,
        },
        menuButton: {
            marginBottom: sizes.medium,
            borderRadius: sizes.small,
        },
        buttonContent: {
            height: sizes.size56,
            justifyContent: 'flex-start',
            paddingLeft: sizes.medium,
        },
        logoutButton: {
            marginTop: sizes.large,
        },
        sectionTitle: {
            fontSize: fontSizes.tinyPlus,
            fontFamily: 'LGEIHeadline-Semibold',
            color: '#ffffff',
        },
        editOverlay: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: sizes.tiny,
            alignItems: 'center',
            borderBottomLeftRadius: 50,
            borderBottomRightRadius: 50,
        },
        editText: {
            color: 'white',
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIHeadline-Regular',
        },
        messageContainer: {
            gap: sizes.large,
            justifyContent: 'center',
            alignItems: 'center',
        },
        messageText: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIHeadline-Regular',
            textAlign: 'center',
        },
        errorText: {
            color: 'red',
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-Regular',
            marginBottom: sizes.tiny,
        },
    });
