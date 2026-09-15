import HeaderBackButton from '@/components/common/HeaderBackButton';
import { themeColors } from '@/lib/common/colors';
import { useCustomFonts } from '@/lib/hooks/useFonts';
import { getAsyncFlag, useRideStore } from '@/lib/store/useRideStore';
import { firestore } from '@/lib/utils/firebaseConfig';
import { configureMapboxAccessToken } from '@/lib/utils/mapbox';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { doc, getDoc } from '@react-native-firebase/firestore';
import Mapbox from '@rnmapbox/maps';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { router, Stack } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import * as Updates from 'expo-updates';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Linking, Platform, Text, useColorScheme, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Button, Dialog, MD3DarkTheme, MD3LightTheme, PaperProvider, Portal, useTheme } from 'react-native-paper';

// Suppress noisy warnings/errors that are expected on flaky mobile networks or
// come from third-party native modules we don't control:
// - NativeEventEmitter warnings are emitted by native modules (Firebase, Location).
// - Mapbox logs one "Map load failed" error per failed tile when offline; a single
//   dropped connection can produce thousands of these. They are cosmetic — the map
//   recovers automatically once connectivity returns.
// - Firestore [firestore/unavailable] is handled gracefully with a cache fallback.
LogBox.ignoreLogs([
    'new NativeEventEmitter',
    '`removeEventListener`',
    'Mapbox [error] RNMBXMapView',
    'Map load failed',
    'firestore/unavailable',
]);

configureMapboxAccessToken(Mapbox);

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
                    const isRecording = await getAsyncFlag('isRecording');
                    const isPaused = await getAsyncFlag('isPaused');

                    console.log('isRecording', isRecording, 'isPaused', isPaused);

                    const { addPoint } = useRideStore.getState();

                    if (isRecording && !isPaused) {
                        for (const location of data.locations) {
                            addPoint(location);
                        }
                    }
                } catch (e) {
                    console.error('Error processing location:', e);
                }
            }
        }
    );
}

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
                        initialRouteName="index"
                        screenOptions={{
                            ...commonScreenOptions,
                            headerLeft: () => <HeaderBackButton onPress={() => router.dismiss()} />,
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
                            name="rider-code"
                            options={{
                                title: 'Rider Code',
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
                            name="main"
                            options={{
                                headerShown: false,
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
