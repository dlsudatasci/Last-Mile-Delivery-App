import { formatDistance, formatEta, getRoute, LngLat, RouteCongestionLevel, RouteResult } from '@/lib/utils/directions';
import { useRideStore } from '@/lib/store/useRideStore';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';
import { Button, Icon, IconButton, MD3Theme, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

Mapbox.setAccessToken('pk.eyJ1IjoibnZyenNhIiwiYSI6ImNtcDl3OGpneDB0amkydXByNTR3bG5uNzEifQ.hgL01z3Qc9KzOrQCKjzbsg');

const TRAFFIC_RED = '#DC2626';
const TRAFFIC_ORANGE = '#F97316';
const TRAFFIC_YELLOW = '#FACC15';

export default function RoutePreview() {
    const theme = useTheme();
    const colorScheme = useColorScheme();
    const styles = getStyles(theme);
    const mapStyle = colorScheme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';

    const { destination, destLng, destLat } = useLocalSearchParams<{ destination?: string; destLng?: string; destLat?: string }>();

    const [from, setFrom] = useState<LngLat | null>(null);
    const [to, setTo] = useState<LngLat | null>(null);
    const [route, setRoute] = useState<RouteResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const setActiveRouteSteps = useRideStore(state => state.setActiveRouteSteps);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setError('Location permission is needed to generate a route.');
                    return;
                }
                const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const origin: LngLat = [pos.coords.longitude, pos.coords.latitude];
                if (!active) return;
                setFrom(origin);

                let dest: LngLat | null = null;
                if (destLng && destLat) {
                    const parsedDest: LngLat = [parseFloat(destLng), parseFloat(destLat)];
                    dest = parsedDest.every(Number.isFinite) ? parsedDest : null;
                }
                if (!active) return;
                if (!dest) {
                    setError('Select a destination from search results before generating a route.');
                    return;
                }
                setTo(dest);

                const r = await getRoute(origin, dest);
                if (!active) return;
                if (!r) {
                    setError("Couldn't generate a route to that destination.");
                    return;
                }
                setRoute(r);
            } catch {
                if (active) setError('Something went wrong generating the route.');
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [destination, destLng, destLat]);

    const lineShape = useMemo(
        () =>
            route
                ? { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: route.coordinates } }
                : null,
        [route]
    );

    const congestionShape = useMemo(() => {
        const segments =
            route?.congestionSegments.filter(segment => segment.congestion === 'moderate' || segment.congestion === 'heavy' || segment.congestion === 'severe') ??
            [];
        if (segments.length === 0) return null;
        return {
            type: 'FeatureCollection' as const,
            features: segments.map(segment => ({
                type: 'Feature' as const,
                properties: { congestion: segment.congestion satisfies RouteCongestionLevel },
                geometry: { type: 'LineString' as const, coordinates: segment.coordinates },
            })),
        };
    }, [route]);

    const bounds = useMemo(() => {
        if (!route || route.coordinates.length === 0) return null;
        const lons = route.coordinates.map(c => c[0]);
        const lats = route.coordinates.map(c => c[1]);
        return {
            ne: [Math.max(...lons), Math.max(...lats)] as LngLat,
            sw: [Math.min(...lons), Math.min(...lats)] as LngLat,
        };
    }, [route]);

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <IconButton icon="chevron-left" size={sizes.size32} onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Route Preview</Text>
                <View style={{ width: sizes.size48 }} />
            </View>

            <View style={styles.mapWrap}>
                <Mapbox.MapView style={StyleSheet.absoluteFill} styleURL={mapStyle} logoEnabled={false} attributionEnabled={false}>
                    <Mapbox.Camera
                        bounds={bounds ? { ne: bounds.ne, sw: bounds.sw, paddingLeft: 40, paddingRight: 40, paddingTop: 60, paddingBottom: 60 } : undefined}
                        followUserLocation={!route}
                        followZoomLevel={14}
                    />
                    <Mapbox.LocationPuck />
                    {lineShape && (
                        <Mapbox.ShapeSource id="routeSource" shape={lineShape}>
                            <Mapbox.LineLayer
                                id="routeLine"
                                style={{ lineColor: theme.colors.primary, lineWidth: 5, lineCap: 'round', lineJoin: 'round' }}
                            />
                        </Mapbox.ShapeSource>
                    )}
                    {congestionShape && (
                        <Mapbox.ShapeSource id="trafficRouteSource" shape={congestionShape}>
                            <Mapbox.LineLayer
                                id="moderateTrafficRouteLine"
                                filter={['==', ['get', 'congestion'], 'moderate']}
                                style={{ lineColor: TRAFFIC_YELLOW, lineWidth: 6, lineCap: 'round', lineJoin: 'round' }}
                            />
                            <Mapbox.LineLayer
                                id="heavyTrafficRouteLine"
                                filter={['==', ['get', 'congestion'], 'heavy']}
                                style={{ lineColor: TRAFFIC_ORANGE, lineWidth: 6, lineCap: 'round', lineJoin: 'round' }}
                            />
                            <Mapbox.LineLayer
                                id="severeTrafficRouteLine"
                                filter={['==', ['get', 'congestion'], 'severe']}
                                style={{ lineColor: TRAFFIC_RED, lineWidth: 6, lineCap: 'round', lineJoin: 'round' }}
                            />
                        </Mapbox.ShapeSource>
                    )}
                    {to && (
                        <Mapbox.PointAnnotation id="dest" coordinate={to}>
                            <Icon source="map-marker" size={sizes.size32} color={theme.colors.error} />
                        </Mapbox.PointAnnotation>
                    )}
                </Mapbox.MapView>

                {loading && (
                    <View style={styles.mapOverlay}>
                        <ActivityIndicator color={theme.colors.primary} />
                        <Text style={styles.overlayText}>Generating recommended rider route…</Text>
                    </View>
                )}
                {!loading && error !== '' && (
                    <View style={styles.mapOverlay}>
                        <Icon source="alert-circle-outline" size={sizes.size32} color={theme.colors.error} />
                        <Text style={styles.overlayText}>{error}</Text>
                    </View>
                )}
            </View>

            <View style={styles.footer}>
                <View style={styles.etaRow}>
                    <View style={styles.etaItem}>
                        <Text style={styles.etaValue}>{route ? formatEta(route.durationSec) : '—'}</Text>
                        <Text style={styles.etaLabel}>ETA</Text>
                    </View>
                    <View style={styles.etaDivider} />
                    <View style={styles.etaItem}>
                        <Text style={styles.etaValue}>{route ? formatDistance(route.distanceM) : '—'}</Text>
                        <Text style={styles.etaLabel}>Distance</Text>
                    </View>
                </View>

                <Button
                    mode="contained"
                    buttonColor={theme.colors.primary}
                    textColor={theme.colors.onPrimary}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                    disabled={!route}
                    onPress={() => {
                        if (route) {
                            setActiveRouteSteps(route.steps);
                        }
                        router.push({
                            pathname: '/main/(tabs)/record',
                            params:
                                from && to && route
                                    ? {
                                          destination: destination ?? '',
                                          etaSec: String(route.durationSec),
                                          routeDistanceM: String(route.distanceM),
                                          destLng: String(to[0]),
                                          destLat: String(to[1]),
                                      }
                                    : {},
                        });
                    }}
                >
                    Start Trip
                </Button>
            </View>
        </SafeAreaView>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.colors.background },
        header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sizes.small },
        headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.regular, color: theme.colors.onBackground },
        mapWrap: { flex: 1, overflow: 'hidden' },
        mapOverlay: {
            ...StyleSheet.absoluteFillObject,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.7)',
            gap: sizes.small,
            padding: sizes.large,
        },
        overlayText: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurface, textAlign: 'center' },
        footer: { padding: sizes.large, backgroundColor: theme.colors.background },
        etaRow: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            paddingVertical: sizes.medium,
            marginBottom: sizes.medium,
        },
        etaItem: { flex: 1, alignItems: 'center' },
        etaDivider: { width: 1, alignSelf: 'stretch', backgroundColor: theme.colors.outlineVariant ?? '#E2E8F0' },
        etaValue: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.regular, color: theme.colors.onSurface },
        etaLabel: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant, marginTop: 2 },
        button: { borderRadius: sizes.small },
        buttonContent: { height: sizes.size56 },
        buttonLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small },
    });
