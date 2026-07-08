import { ConfigContext, ExpoConfig } from '@expo/config';
import * as dotenv from 'dotenv';

// initialize dotenv
dotenv.config();

export default ({ config }: ConfigContext): ExpoConfig => {
    const expoConfig: ExpoConfig = {
        ...config,
        name: 'Devia',
        slug: 'devia',
        owner: 'andre.swe',
        version: '1.0.1',
        orientation: 'portrait',
        icon: './assets/images/devia2.png',
        scheme: 'com.samg.devia',
        userInterfaceStyle: 'automatic',
        newArchEnabled: true,
        ios: {
            supportsTablet: true,
            googleServicesFile: './GoogleService-Info.plist',
            bundleIdentifier: 'com.samg.devia',
            infoPlist: {
                ITSAppUsesNonExemptEncryption: false,
            },
        },
        android: {
            adaptiveIcon: {
                foregroundImage: './assets/images/devia2.png',
                backgroundColor: '#f2ffff',
            },
            package: 'com.samg.devia',
            googleServicesFile: './google-services.json',
            permissions: [
                'android.permission.ACCESS_COARSE_LOCATION',
                'android.permission.ACCESS_FINE_LOCATION',
                'android.permission.ACCESS_MEDIA_LOCATION',
                'android.permission.ACCESS_BACKGROUND_LOCATION',
                'android.permission.FOREGROUND_SERVICE',
                'android.permission.FOREGROUND_SERVICE_LOCATION',
            ],
        },
        web: {
            bundler: 'metro',
            output: 'static',
            favicon: './assets/images/favicon.png',
        },
        plugins: [
            'expo-router',
            [
                'expo-splash-screen',
                {
                    image: './assets/images/devia2.png',
                    imageWidth: 300,
                    resizeMode: 'contain',
                    backgroundColor: '#f2ffff',
                },
            ],
            [
                'expo-video',
                {
                    supportsBackgroundPlayback: true,
                    supportsPictureInPicture: true,
                },
            ],
            [
                'expo-location',
                {
                    locationAlwaysAndWhenInUsePermission: 'Allow $(PRODUCT_NAME) to use your location.',
                    isIosBackgroundLocationEnabled: true,
                    isAndroidBackgroundLocationEnabled: true,
                },
            ],
            [
                'expo-camera',
                {
                    cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera',
                    microphonePermission: 'Allow $(PRODUCT_NAME) to access your microphone',
                    recordAudioAndroid: true,
                },
            ],
            [
                'expo-image-picker',
                {
                    photosPermission: 'The app accesses your photos to let you share them with your friends.',
                },
            ],
            [
                '@rnmapbox/maps',
                {
                    RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
                },
            ],
            ['expo-localization'],
            [
                'expo-media-library',
                {
                    photosPermission: 'Allow $(PRODUCT_NAME) to access your photos',
                    isAccessMediaLocationEnabled: true,
                },
            ],
            '@react-native-firebase/app',
            '@react-native-firebase/auth',
            '@react-native-firebase/crashlytics',
            ['@react-native-google-signin/google-signin'],
            [
                'expo-build-properties',
                {
                    ios: {
                        useFrameworks: 'static',
                    },
                },
            ],
        ],
        experiments: {
            typedRoutes: true,
        },
        extra: {
            router: {
                origin: false,
            },
            eas: {
                projectId: 'de42ccc7-d87b-48b3-9c36-4135c9a8d736',
            },
        },
        runtimeVersion: {
            policy: 'appVersion',
        },
        updates: {
            url: 'https://u.expo.dev/de42ccc7-d87b-48b3-9c36-4135c9a8d736',
        },
    };
    return expoConfig;
};
