import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, MD3Theme, Text, TextInput, useTheme } from 'react-native-paper';

import { getUserProfile, updateUserProfile } from '@/lib/firebase-crud/auth';
import { auth } from '@/lib/utils/firebaseConfig';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useUser } from '@/stores/useUser';

export default function EditProfile() {
    const theme = useTheme();
    const { user, setUser } = useUser();
    const [username, setUsername] = useState(user?.username || '');
    const [isLoading, setIsLoading] = useState(false);

    const styles = getStyles(theme);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            if (!username.trim()) {
                Alert.alert('Missing name', 'Please enter your name.');
                return;
            }

            const currentUser = auth.currentUser;

            if (!currentUser) {
                throw new Error('User not found');
            }

            await updateUserProfile(currentUser.uid, username.trim());
            const userProfile = await getUserProfile(currentUser.uid);

            if (userProfile.success && userProfile.data) {
                setUser(userProfile.data);
            } else {
                throw new Error('Failed to update user profile');
            }

            router.back();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.profileHeader}>
                <Text style={styles.appName}>Devia</Text>
                <Text style={styles.profileSubtitle}>Research profile</Text>
            </View>

            <View style={styles.menuContainer}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Edit Your Details</Text>
                <TextInput
                    mode="outlined"
                    label="Phone Number"
                    value={user?.phone ?? ''}
                    readOnly
                    style={{ marginTop: sizes.medium }}
                />
                <TextInput
                    mode="outlined"
                    label="Full Name"
                    value={username}
                    onChangeText={setUsername}
                    style={{ marginTop: sizes.medium }}
                />
                <Button
                    mode="contained"
                    onPress={handleSave}
                    style={{ marginTop: sizes.large }}
                    loading={isLoading}
                    disabled={isLoading}
                >
                    Save Changes
                </Button>
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
        appName: {
            fontSize: fontSizes.large,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.tiny,
        },
        profileSubtitle: {
            fontSize: fontSizes.tinyPlus,
            fontFamily: 'LGEIText-SemiBold',
            marginBottom: sizes.medium,
            opacity: 0.75,
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
            fontSize: fontSizes.small,
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
    });
