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
            screenOptions={{
                ...commonScreenOptions,
                headerLeft: () => <HeaderBackButton onPress={() => router.dismiss()} />,
                headerTitleAlign: 'center',
            }}
        >
            <Stack.Screen
                name="edit-profile"
                options={{
                    headerShown: true,
                    title: 'Edit Profile',
                }}
            />
            <Stack.Screen
                name="change-password"
                options={{
                    headerShown: true,
                    title: 'Change Password',
                }}
            />
        </Stack>
    );
}
