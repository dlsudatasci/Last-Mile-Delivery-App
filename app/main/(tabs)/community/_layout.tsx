import HeaderBackButton from '@/components/common/HeaderBackButton';
import { router, Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';

export default function Layout() {
    const theme = useTheme();
    const headerStyle = {
        height: sizes.size112,
        backgroundColor: theme.colors.elevation.level1,
        shadowColor: theme.colors.onBackground,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    };

    const headerTextStyle = {
        fontSize: fontSizes.heading,
        fontFamily: 'LGEIHeadline-Bold',
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
            }}
        >
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false,
                    title: 'Studies',
                }}
            />
            <Stack.Screen
                name="study-details"
                options={{
                    headerShown: false,
                    title: 'Study Details',
                }}
            />
        </Stack>
    );
}
