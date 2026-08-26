import HeaderBackButton from '@/components/common/HeaderBackButton';
import { useRideStore } from '@/lib/store/useRideStore';
import { router, Stack } from 'expo-router';
import { Alert } from 'react-native';
import { useTheme } from 'react-native-paper';

import { fontSizes } from '@/lib/utils/responsive-sizing';

export default function Layout() {
    const theme = useTheme();
    const isRecording = useRideStore(state => state.isRecording);
    const resetRide = useRideStore(state => state.resetRide);

    const headerStyle = {
        backgroundColor: theme.colors.surface,
    };

    const headerTextStyle = {
        fontSize: fontSizes.regular,
        fontFamily: 'LGEIHeadline-Bold',
        color: theme.colors.secondary,
    };

    const commonScreenOptions = {
        headerTitleStyle: headerTextStyle,
        headerStyle,
    };
    return (
        <Stack
            initialRouteName="index"
            screenOptions={{
                ...commonScreenOptions,
                headerLeft: () => <HeaderBackButton onPress={() => router.back()} />,
                headerTitleAlign: 'center',
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    headerShown: true,
                    title: 'Trip Recording',
                    headerLeft: () => (
                        <HeaderBackButton
                            onPress={() => {
                                if (isRecording) {
                                    Alert.alert(
                                        'Cancel Trip?',
                                        'All recorded trip data will be lost. Are you sure you want to cancel?',
                                        [
                                            { text: 'Continue Trip', style: 'cancel' },
                                            {
                                                text: 'Cancel Trip',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    await resetRide();
                                                    router.back();
                                                },
                                            },
                                        ]
                                    );
                                } else {
                                    router.back();
                                }
                            }}
                        />
                    ),
                }}
            />
            <Stack.Screen name="new-trip" options={{ headerShown: false }} />
            <Stack.Screen name="select-study" options={{ headerShown: false }} />
            <Stack.Screen name="study-information" options={{ headerShown: false }} />
            <Stack.Screen name="destination" options={{ headerShown: false }} />
            <Stack.Screen name="route-preview" options={{ headerShown: false }} />
            <Stack.Screen name="post-trip-questionnaire" options={{ headerShown: true }} />
            <Stack.Screen name="change-routes" options={{ headerShown: true }} />
            <Stack.Screen name="reason-for-deviation" options={{ headerShown: true }} />
        </Stack>
    );
}
