import { themeColors } from '@/lib/common/colors';
import { useCustomFonts } from '@/lib/hooks/useFonts';
import { getAsyncFlag, useRideStore } from '@/lib/store/useRideStore';
import { firestore } from '@/lib/utils/firebaseConfig';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { doc, getDoc } from '@react-native-firebase/firestore';
import Mapbox from '@rnmapbox/maps';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { router, Stack } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import * as Updates from 'expo-updates';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Linking, Platform, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Button, Dialog, Icon, MD3DarkTheme, MD3LightTheme, PaperProvider, Portal, useTheme } from 'react-native-paper';

Mapbox.setAccessToken('pk.eyJ1IjoibnZyenNhIiwiYSI6ImNtcDl3OGpneDB0amkydXByNTR3bG5uNzEifQ.hgL01z3Qc9KzOrQCKjzbsg');

if (!TaskManager.isTaskDefined('location-recording')) {
    TaskManager.defineTask(
        'location-recording',
        async ({ data, error }: { data: { locations: Location.LocationObject[] }; error: any }) => {
            if (error) {
                console.error('Location task error:', error);
                return;
            }
            if (data?.locations?.length > 0) {
                try {
                    const location = data.locations[0];

                    const isRecording = await getAsyncFlag('isRecording');
                    const isPaused = await getAsyncFlag('isPaused');

                    console.log('isRecording', isRecording, 'isPaused', isPaused);

                    const { addPoint } = useRideStore.getState();

                    if (isRecording && !isPaused) {
                        addPoint(location);
                    }
                } catch (e) {
                    console.error('Error processing location:', e);
                }
            }
        }
    );
}

// Add cleanup function for location updates
const cleanupLocationUpdates = async () => {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync('location-recording');
        if (isRegistered) {
            await Location.stopLocationUpdatesAsync('location-recording');
        }
    } catch (error) {
        console.error('Error cleaning up location updates:', error);
    }
};

// Version context
const VersionContext = createContext<{
    newAppVersionAvailable: boolean;
    setNewAppVersionAvailable: (v: boolean) => void;
    redirectUrl: string | null;
}>({
    newAppVersionAvailable: false,
    setNewAppVersionAvailable: () => {},
    redirectUrl: null,
});

export function useVersionDialog() {
    return useContext(VersionContext);
}

function VersionDialogProvider({ children }: { children: React.ReactNode }) {
    const theme = useTheme();
    const [newAppVersionAvailable, setNewAppVersionAvailable] = useState(false);
    const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const currentVersion = await getDoc(doc(firestore, 'app_version', 'current'));
                if (currentVersion.exists()) {
                    const currentVersionData = currentVersion.data();
                    if (currentVersionData?.version) {
                        const currentVersionNumber = currentVersionData.version;
                        const updatedAPKUrl = currentVersionData.updatedAPKUrl;
                        if (updatedAPKUrl) {
                            setRedirectUrl(updatedAPKUrl);
                        }

                        if (currentVersionNumber !== Constants.expoConfig?.version && Platform.OS === 'android') {
                            setNewAppVersionAvailable(true);
                        }
                    }
                }
            } catch (e) {
                // Optionally handle error
            }
        })();
    }, []);

    const handleNewAppVersion = async () => {
        setNewAppVersionAvailable(false);
        if (Platform.OS === 'android') {
            if (redirectUrl) {
                Linking.openURL(redirectUrl);
            } else {
                Alert.alert('Error', 'No redirect URL found');
            }
        } else {
            try {
                await Updates.reloadAsync();
            } catch (error) {
                Alert.alert('Error', 'Failed to reload app');
            }
        }
    };

    return (
        <VersionContext.Provider value={{ newAppVersionAvailable, setNewAppVersionAvailable, redirectUrl }}>
            <Portal>
                <Dialog
                    visible={newAppVersionAvailable}
                    onDismiss={() => setNewAppVersionAvailable(false)}
                    dismissable={false}
                    dismissableBackButton={false}
                >
                    <Dialog.Title style={{ color: theme.colors.onSurface, fontFamily: 'LGEIHeadline-Regular' }}>
                        New Version Available
                    </Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ color: theme.colors.onSurface, fontFamily: 'LGEIHeadline-Regular' }}>
                            {Platform.OS === 'android'
                                ? 'A new version of the app is available. You will be redirected to download the latest version.'
                                : 'A new version of the app is available. Please update through TestFlight to continue.'}
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={handleNewAppVersion}>
                            {Platform.OS === 'android' ? 'Download' : 'Reload'}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
            {children}
        </VersionContext.Provider>
    );
}

export default function RootLayout() {
    const colorScheme = useColorScheme();

    const [fontsLoaded] = useCustomFonts();

    // Add cleanup on unmount
    React.useEffect(() => {
        return () => {
            cleanupLocationUpdates();
        };
    }, []);

    if (!fontsLoaded) return null;

    const paperTheme =
        colorScheme === 'dark'
            ? {
                  ...MD3DarkTheme,
                  colors: themeColors.dark.colors,
              }
            : {
                  ...MD3LightTheme,
                  colors: themeColors.light.colors,
              };

    const headerStyle = {
        height: sizes.size112,
        backgroundColor: paperTheme.colors.elevation.level1,
        shadowColor: paperTheme.colors.onBackground,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    };

    const headerTextStyle = {
        fontSize: fontSizes.small,
        fontFamily: 'LGEIHeadline-Bold',
        color: paperTheme.colors.onSurface,
    };

    const commonScreenOptions = {
        headerTitleStyle: headerTextStyle,
        headerStyle,
    };
    return (
        <PaperProvider theme={paperTheme}>
            <VersionDialogProvider>
                <GestureHandlerRootView>
                    <Stack
                        initialRouteName="login"
                        screenOptions={{
                            ...commonScreenOptions,
                            headerLeft: () => (
                                <TouchableOpacity onPress={() => router.dismiss()}>
                                    <Icon source={'chevron-left'} size={sizes.size32} />
                                </TouchableOpacity>
                            ),
                        }}
                    >
                        <Stack.Screen
                            name="index"
                            options={{
                                title: 'Home',
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="login"
                            options={{
                                title: 'Login',
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="register"
                            options={{
                                title: 'Register',
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="get-started"
                            options={{
                                title: 'Get Started',
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="enter-phone"
                            options={{
                                title: 'Enter Phone Number',
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="create-profile"
                            options={{
                                title: 'Create Profile',
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="study-enrollment"
                            options={{
                                title: 'Study Enrollment',
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="study-consent"
                            options={{
                                title: 'Study Consent',
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="enrollment-complete"
                            options={{
                                title: 'Enrollment Complete',
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="main"
                            options={{
                                headerShown: false,
                            }}
                        />
                        <Stack.Screen
                            name="forgot-password"
                            options={{
                                title: 'Forgot Password',
                                headerShown: true,
                                headerLeft: () => (
                                    <TouchableOpacity onPress={() => router.dismiss()}>
                                        <Icon source={'chevron-left'} size={sizes.size32} />
                                    </TouchableOpacity>
                                ),
                            }}
                        />
                        <Stack.Screen
                            name="legal/privacy-policy"
                            options={{
                                title: 'Privacy Policy',
                                headerShown: true,
                            }}
                        />
                        <Stack.Screen
                            name="legal/terms-of-service"
                            options={{
                                title: 'Terms of Service',
                                headerShown: true,
                            }}
                        />
                    </Stack>
                </GestureHandlerRootView>
            </VersionDialogProvider>
        </PaperProvider>
    );
}
