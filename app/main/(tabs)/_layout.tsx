import { useTripNavigationGuard } from '@/lib/hooks/useTripNavigationGuard';
import { showRequiredReviewNotice } from '@/lib/hooks/useRequiredTripReview';
import { useTripReviews } from '@/lib/store/useTripReviews';
import { useRideStore } from '@/lib/store/useRideStore';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { router, Tabs, useGlobalSearchParams, useSegments } from 'expo-router';
import React from 'react';
import { Platform, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Icon, IconButton, useTheme } from 'react-native-paper';

export default function TabLayout() {
    const theme = useTheme();
    const guardTripNavigation = useTripNavigationGuard();
    const segments = useSegments();
    const { rideId } = useGlobalSearchParams<{ rideId?: string }>();
    const reviewed = useTripReviews(state => !!rideId && state.reviews[rideId]?.status === 'reviewed');
    const reviewRequired = segments.some(segment =>
        ['post-trip-questionnaire', 'change-routes', 'reason-for-deviation'].includes(segment)
    ) && !reviewed;
    const navigate = (action: () => void) => {
        if (reviewRequired) { showRequiredReviewNotice(); return; }
        guardTripNavigation(action);
    };

    const headerStyle: ViewStyle = {
        backgroundColor: theme.colors.surface,
    };

    const headerTextStyle = {
        fontSize: fontSizes.regular,
        fontFamily: 'LGEIHeadline-Bold',
        color: theme.colors.secondary,
    };

    const commonScreenOptions: BottomTabNavigationOptions = {
        tabBarActiveTintColor: theme.colors.primary,
        tabBarStyle: {
            height: sizes.size72,
            paddingBottom: sizes.large,
            backgroundColor: theme.colors.surface,
        },
        tabBarIconStyle: {
            width: sizes.large,
            height: sizes.large,
        },
        tabBarLabelStyle: {
            fontFamily: 'LGEIHeadline-Regular',
            fontSize: fontSizes.tiny,
        },

        headerStyle: {
            ...headerStyle,
            ...(Platform.OS === 'ios' && { height: 110 }),
        },
        headerTitleStyle: headerTextStyle,
        headerTitleAlign: 'left',
    };

    const guardedTabListeners = (tab: 'home' | 'community' | 'map' | 'profile') => ({
        tabPress: (event: { preventDefault: () => void }) => {
            if (!reviewRequired && !useRideStore.getState().isRecording) return;
            event.preventDefault();
            navigate(() => router.navigate(`/main/(tabs)/${tab}`));
        },
    });

    return (
        <Tabs screenOptions={commonScreenOptions}>
            <Tabs.Screen
                name="home"
                listeners={guardedTabListeners('home')}
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }: { color: string }) => (
                        <Icon size={sizes.large} source="home" color={color} />
                    ),
                    headerTitle: 'Home',
                }}
            />
            <Tabs.Screen
                name="community"
                listeners={guardedTabListeners('community')}
                options={{
                    title: 'Studies',
                    tabBarLabel: ({ color }: { focused: boolean; color: string }) => (
                        <Text numberOfLines={1} style={{ fontFamily: 'LGEIHeadline-Regular', color: color }}>
                            Studies
                        </Text>
                    ),
                    tabBarIcon: ({ color }: { color: string }) => (
                        <Icon size={sizes.large} source="flask-outline" color={color} />
                    ),
                    headerTitle: 'Studies',
                }}
            />
            <Tabs.Screen
                name="record"
                options={{
                    title: 'Record',
                    tabBarButton: () => (
                        <TouchableOpacity
                            onPress={() => navigate(() => router.push('/main/(tabs)/record/destination'))}
                            style={{
                                alignSelf: 'center',
                                backgroundColor: theme.colors.surface,
                                bottom: sizes.regular,
                                borderRadius: sizes.size48,
                                width: sizes.size48,
                                height: sizes.size48,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <IconButton
                                size={sizes.size28}
                                icon="record"
                                iconColor={theme.colors.primary}
                                style={{
                                    borderWidth: sizes.tiny,
                                    borderColor: theme.colors.primary,
                                }}
                                mode="outlined"
                            />
                            <Text style={{ fontFamily: 'LGEIHeadline-Regular', color: theme.colors.primary }}>
                                Record
                            </Text>
                        </TouchableOpacity>
                    ),
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="map"
                listeners={guardedTabListeners('map')}
                options={({ route }) => ({
                    title: 'Trips',
                    tabBarIcon: ({ color }: { color: string }) => (
                        <Icon size={sizes.large} source="map-marker-path" color={color} />
                    ),
                    // Show the standard "Trips" header only on the list; the detail
                    // screens render their own back-button headers.
                    headerShown: (getFocusedRouteNameFromRoute(route) ?? 'index') === 'index',
                    headerTitle: 'Trips',
                    headerTitleAlign: 'left',
                })}
            />
            <Tabs.Screen
                name="profile"
                listeners={guardedTabListeners('profile')}
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }: { color: string }) => (
                        <Icon size={sizes.large} source="account" color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
