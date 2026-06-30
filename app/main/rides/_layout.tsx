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
                headerTitleAlign: 'center',
            }}
        >
            <Stack.Screen
                name="ride/[id]"
                options={{
                    title: 'Ride',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.dismiss()}>
                            <Icon source={'chevron-left'} size={sizes.size32} />
                        </TouchableOpacity>
                    ),
                    headerShown: true,
                }}
            />
            <Stack.Screen
                name="upload-gpx/index"
                options={{
                    title: 'Upload GPX',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.dismiss()}>
                            <Icon source={'chevron-left'} size={sizes.size32} />
                        </TouchableOpacity>
                    ),
                    headerShown: true,
                }}
            />
            <Stack.Screen
                name="annotations/selected-media"
                options={{
                    title: 'Add Annotation',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()}>
                            <Icon source={'chevron-left'} size={sizes.size32} />
                        </TouchableOpacity>
                    ),
                    headerShown: true,
                }}
            />
            <Stack.Screen
                name="annotations/select-point"
                options={{
                    title: 'Add Annotation',
                    headerShown: true,
                }}
            />
            <Stack.Screen
                name="annotations/select-segment"
                options={{
                    title: 'Add Annotation',
                    headerShown: true,
                }}
            />
            <Stack.Screen
                name="annotations/auto-generated-annotations"
                options={{
                    title: 'Auto-Generated Annotations',
                    headerShown: true,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()}>
                            <Icon source={'chevron-left'} size={sizes.size32} />
                        </TouchableOpacity>
                    ),
                }}
            />
        </Stack>
    );
}
