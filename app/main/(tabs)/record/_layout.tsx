import HeaderBackButton from '@/components/common/HeaderBackButton';
import { router, Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

import { fontSizes } from '@/lib/utils/responsive-sizing';

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
