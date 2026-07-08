import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, MD3Theme, Text, TextInput, useTheme } from 'react-native-paper';

import { PasswordChecklist } from '@/components/auth/PasswordChecklist';
import { auth } from '@/lib/utils/firebaseConfig';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useUser } from '@/stores/useUser';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from '@react-native-firebase/auth';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Current password is required'),
        password: z
            .string()
            .min(8, 'Must be at least 8 characters.')
            .max(15, 'Must not be longer than 15 characters.')
            .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
            .regex(/[0-9]/, 'Must contain at least one number')
            .regex(/[a-z]/, 'Must contain at least one lowercase letter')
            .regex(/^[A-Za-z0-9]*[!@#$%^&*]+[A-Za-z0-9]*$/, 'Must have a special character.'),
        confirmPassword: z.string().min(8, 'Confirm password is required'),
    })
    .refine(data => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function ChangePassword() {
    const theme = useTheme();
    const { user, setUser } = useUser();
    const [password, setPassword] = useState('');
    const [passwordTooltipVisible, setPasswordTooltipVisible] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [showMessage, setShowMessage] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const styles = getStyles(theme);

    const changePasswordForm = useForm<ChangePasswordFormData>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: '',
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data: ChangePasswordFormData) => {
        setIsLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('User not found');
            }

            const res = await reauthenticateWithCredential(
                user,
                EmailAuthProvider.credential(user.email || '', data.currentPassword)
            );

            if (!res.user) {
                changePasswordForm.setError('currentPassword', { message: 'Invalid credentials.' });
            }

            await updatePassword(user, data.password);

            setShowSuccessMessage(true);
        } catch (error: any) {
            if (error.code === 'auth/invalid-credential') {
                changePasswordForm.setError('currentPassword', { message: 'Invalid credentials.' });
            }
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.menuContainer}>
                {showSuccessMessage ? (
                    <View style={styles.messageContainer}>
                        <Icon source="account-check" size={sizes.size112} color={theme.colors.primary} />
                        <Text style={styles.messageText}>Password changed successfully!</Text>
                        <Button mode="contained" onPress={() => router.dismissTo('/main/(tabs)/profile')}>
                            Back to Profile
                        </Button>
                    </View>
                ) : (
                    <>
                        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
                            Current Password
                        </Text>

                        <Controller
                            control={changePasswordForm.control}
                            name="currentPassword"
                            render={({ field: { onChange, value } }) => (
                                <TextInput
                                    mode="outlined"
                                    label="Current Password"
                                    value={value}
                                    onChangeText={onChange}
                                    style={{ marginBottom: sizes.medium }}
                                />
                            )}
                        />
                        {changePasswordForm.formState.errors.currentPassword && (
                            <Text style={styles.errorText}>
                                {changePasswordForm.formState.errors.currentPassword?.message}
                            </Text>
                        )}
                        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>New Password</Text>
                        <Controller
                            control={changePasswordForm.control}
                            name="password"
                            render={({ field: { onChange, value } }) => (
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        mode="outlined"
                                        label="New Password"
                                        value={value}
                                        onChangeText={text => {
                                            onChange(text);
                                            setPassword(text);
                                        }}
                                        onFocus={() => setPasswordTooltipVisible(true)}
                                        onBlur={() => setPasswordTooltipVisible(false)}
                                        secureTextEntry={!showNewPassword}
                                        style={styles.passwordInput}
                                        right={
                                            <TextInput.Icon
                                                icon={showNewPassword ? 'eye' : 'eye-off'}
                                                onPress={() => setShowNewPassword(!showNewPassword)}
                                            />
                                        }
                                    />
                                </View>
                            )}
                        />
                        {passwordTooltipVisible && <PasswordChecklist password={password} />}
                        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
                            Confirm Password
                        </Text>
                        <Controller
                            control={changePasswordForm.control}
                            name="confirmPassword"
                            render={({ field: { onChange, value } }) => (
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        mode="outlined"
                                        label="Confirm Password"
                                        value={value}
                                        onChangeText={onChange}
                                        right={
                                            <TextInput.Icon
                                                icon={showConfirmPassword ? 'eye' : 'eye-off'}
                                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                            />
                                        }
                                        secureTextEntry={!showConfirmPassword}
                                        style={styles.passwordInput}
                                    />
                                </View>
                            )}
                        />
                        {changePasswordForm.formState.errors.confirmPassword && (
                            <Text style={styles.errorText}>
                                {changePasswordForm.formState.errors.confirmPassword?.message}
                            </Text>
                        )}
                        <Button
                            mode="contained"
                            onPress={changePasswordForm.handleSubmit(onSubmit)}
                            loading={isLoading}
                            disabled={isLoading}
                        >
                            Save Password
                        </Button>
                    </>
                )}
            </View>
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
            backgroundColor: theme.colors.surface,
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
        passwordContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: sizes.medium,
        },
        passwordInput: {
            flex: 1,
        },
        eyeIcon: {
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: [{ translateY: -12 }],
        },
    });
