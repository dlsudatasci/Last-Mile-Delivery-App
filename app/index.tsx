import { resolveAuthenticatedSession } from '@/lib/firebase-crud/auth';
import { auth } from '@/lib/utils/firebaseConfig';
import { useUser } from '@/stores/useUser';

import { sizes } from '@/lib/utils/responsive-sizing';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, Dialog, Portal, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
    const theme = useTheme();

    const [permissionsGranted, setPermissionsGranted] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [reloadDialogVisible, setReloadDialogVisible] = useState<boolean>(false);

    async function onFetchUpdateAsync() {
        // expo-updates only works in a release build, not in dev mode.
        // Skip the check (and its dev-mode error alert) while developing.
        if (__DEV__ || !Updates.isEnabled) return;
        try {
            const update = await Updates.checkForUpdateAsync();

            if (update.isAvailable) {
                try {
                    await Updates.fetchUpdateAsync();
                    setReloadDialogVisible(true);
                } catch (error) {
                    alert('Error downloading update.:' + error);
                }
            }
        } catch (error) {
            alert('Error fetching the latest update.:' + error);
        }
    }

    const handleReload = async () => {
        setReloadDialogVisible(false);
        try {
            await Updates.reloadAsync();
        } catch (error) {
            alert('Error reloading app.:' + error);
        }
    };
    const hideReloadDialog = () => setReloadDialogVisible(false);

    useEffect(() => {
        const getPermissions = async () => {
            const { status: cameraStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
            if (locationStatus !== 'granted') {
                Alert.alert('Permissions Error', 'You need to grant location permissions to use this app');
                setPermissionsGranted(true);
                return;
            }

            if (cameraStatus !== 'granted') {
                Alert.alert('Permissions Error', 'You need to grant photos permissions to use this app');
                setPermissionsGranted(true);
                return;
            }

            setPermissionsGranted(true);
        };

        // Check auth state immediately
        const unsubscribe = onAuthStateChanged(auth, async user => {
            try {
                if (!user) {
                    router.replace('/get-started');
                } else {
                    const { destination, profile } = await resolveAuthenticatedSession(user);
                    if (profile) {
                        useUser.getState().setUser(profile);
                    }
                    router.replace(destination);
                }
            } catch (error) {
                console.error('Startup auth/profile check failed:', error);
                router.replace('/get-started');
            } finally {
                setLoading(false);
            }
        });

        // Run permissions check in parallel
        getPermissions();

        // Check for updates in background
        onFetchUpdateAsync();

        return () => unsubscribe();
    }, []);

    if (permissionsGranted && !loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f2ffff' }}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Image
                        source={require('@/assets/images/devia2.png')}
                        style={{ width: sizes.size256, height: sizes.size256 }}
                    />
                </View>
                <Portal>
                    <Dialog
                        visible={reloadDialogVisible}
                        onDismiss={hideReloadDialog}
                        dismissable={false}
                        dismissableBackButton={false}
                    >
                        <Dialog.Title style={{ color: theme.colors.onSurface, fontFamily: 'LGEIHeadline-Regular' }}>
                            Update Ready
                        </Dialog.Title>
                        <Dialog.Content>
                            <Text style={{ color: theme.colors.onSurface, fontFamily: 'LGEIHeadline-Regular' }}>
                                The new version is ready. Reload the app to continue.
                            </Text>
                        </Dialog.Content>
                        <Dialog.Actions>
                            <Button onPress={handleReload}>Reload</Button>
                        </Dialog.Actions>
                    </Dialog>
                </Portal>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f2ffff' }}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Image
                    source={require('@/assets/images/devia2.png')}
                    style={{ width: sizes.size256, height: sizes.size256 }}
                />
            </View>
        </SafeAreaView>
    );
}
