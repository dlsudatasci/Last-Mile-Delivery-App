import { Redirect } from 'expo-router';

export default function LegacyTripsRedirect() {
    return <Redirect href="/main/(tabs)/map" />;
}
