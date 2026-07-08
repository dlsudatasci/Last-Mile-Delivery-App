import { router, Stack } from 'expo-router';
import { Icon, useTheme } from 'react-native-paper';

import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { TouchableOpacity } from 'react-native';

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
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()}>
                        <Icon source={'chevron-left'} size={sizes.size32} />
                    </TouchableOpacity>
                ),
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
            <Stack.Screen name="trip-end" options={{ headerShown: false }} />
        </Stack>
    );
}
