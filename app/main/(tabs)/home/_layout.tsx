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
                    headerShown: false,
                    title: 'Home',
                }}
            />
        </Stack>
    );
}
