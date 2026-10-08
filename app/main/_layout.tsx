import HeaderBackButton from '@/components/common/HeaderBackButton';
import { router, Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

import { fontSizes } from '@/lib/utils/responsive-sizing';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

export default function Layout() {
    const theme = useTheme();

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
        headerStyle: headerStyle,
    };
    return (
        <BottomSheetModalProvider>
            <Stack
                screenOptions={{
                    ...commonScreenOptions,
                    headerTitleAlign: 'center',
                }}
            >
                <Stack.Screen
                    name="(tabs)"
                    options={{
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="rides"
                    options={{
                        title: 'Trips',
                        headerLeft: () => <HeaderBackButton onPress={() => router.dismiss()} />,
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="account/profile"
                    options={{
                        title: 'Profile',
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="events/ride-and-earn"
                    options={{
                        title: 'Devia Route Study',
                        headerShown: true,
                        headerLeft: () => <HeaderBackButton onPress={() => router.dismiss()} />,
                    }}
                />
                <Stack.Screen
                    name="events/[id]"
                    options={{
                        title: 'Event',
                        headerShown: true,
                    }}
                />
            </Stack>
        </BottomSheetModalProvider>
    );
}
