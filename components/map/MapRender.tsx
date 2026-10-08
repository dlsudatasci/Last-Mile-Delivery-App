import { useRideStore } from '@/lib/store/useRideStore';
import { configureMapboxAccessToken } from '@/lib/utils/mapbox';
import { getRouteProgress } from '@/lib/utils/routeProgress';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import Mapbox from '@rnmapbox/maps';
import { useMemo, useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { FAB, Icon, MD3Theme, useTheme } from 'react-native-paper';
import { Polygon } from './polygon';

configureMapboxAccessToken(Mapbox);

const TRAFFIC_RED = '#DC2626';
const TRAFFIC_DARK_RED = '#991B1B';
const TRAFFIC_ORANGE = '#F59E0B';
// Upcoming/generated route = blue, already-travelled route = green.
const ROUTE_BLUE = '#2563EB';
const ROUTE_GREEN = '#16A34A';
const TRAFFIC_TILESET_URL = 'mapbox://mapbox.mapbox-traffic-v1';
const TRAFFIC_SOURCE_LAYER = 'traffic';

export default function MapRender() {
    const theme = useTheme();
    const colorScheme = useColorScheme();
    const mapboxStyle =
        colorScheme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';

    const { displayPoints, activeRouteCoordinates, activeRouteCongestionSegments, activeRouteDestination } = useRideStore();

    const [zoomLevel, setZoomLevel] = useState(16);
    const [isFollowingUser, setIsFollowingUser] = useState(true);

    const recenterMap = () => {
        setIsFollowingUser(true);
        setZoomLevel(16);
    };

    const styles = getStyles(theme);
    const displayedLocation = displayPoints.length > 0 ? displayPoints[displayPoints.length - 1] : null;

    // Split the active route at the rider's snapped position so the portion ahead renders
    // blue and the portion behind renders green. When the rider can't be snapped (off route
    // or no points yet) we fall back to drawing the whole route blue.
    const riderProgress = useMemo(() => {
        if (!displayedLocation || activeRouteCoordinates.length < 2) return null;
        return getRouteProgress(
            [displayedLocation.coordinate.longitude, displayedLocation.coordinate.latitude],
            activeRouteCoordinates
        );
    }, [displayedLocation, activeRouteCoordinates]);

    const upcomingCoordinates = riderProgress ? riderProgress.upcomingCoordinates : activeRouteCoordinates;
    const upcomingRouteShape = useMemo(
        () =>
            upcomingCoordinates.length > 1
                ? {
                      type: 'Feature' as const,
                      properties: {},
                      geometry: { type: 'LineString' as const, coordinates: upcomingCoordinates },
                  }
                : null,
        [upcomingCoordinates]
    );
    const displayedLocationCoordinate = displayedLocation
        ? ([displayedLocation.coordinate.longitude, displayedLocation.coordinate.latitude] as [number, number])
        : null;
    const cameraCenter = displayedLocationCoordinate ?? activeRouteCoordinates[0] ?? activeRouteDestination;
    const congestionShape = useMemo(() => {
        const segments = activeRouteCongestionSegments.filter(
            segment => segment.congestion === 'moderate' || segment.congestion === 'heavy' || segment.congestion === 'severe'
        );
        if (segments.length === 0) return null;
        return {
            type: 'FeatureCollection' as const,
            features: segments.map(segment => ({
                type: 'Feature' as const,
                properties: { congestion: segment.congestion },
                geometry: { type: 'LineString' as const, coordinates: segment.coordinates },
            })),
        };
    }, [activeRouteCongestionSegments]);

    return (
        <View style={styles.mapContainer}>
            <Mapbox.MapView
                style={{ flex: 1 }}
                styleURL={mapboxStyle}
                zoomEnabled
                rotateEnabled
                compassEnabled
                onRegionIsChanging={(e) => {
                    if (e.properties.isUserInteraction) {
                        setIsFollowingUser(false);
                    }
                }}
            >
                <Mapbox.VectorSource id="recordingMapboxTrafficTiles" url={TRAFFIC_TILESET_URL}>
                    <Mapbox.LineLayer
                        id="recordingMapboxTrafficModerate"
                        sourceLayerID={TRAFFIC_SOURCE_LAYER}
                        filter={['==', ['get', 'congestion'], 'moderate']}
                        style={{ lineColor: TRAFFIC_ORANGE, lineWidth: 2.5, lineOpacity: 0.45, lineCap: 'round', lineJoin: 'round' }}
                    />
                    <Mapbox.LineLayer
                        id="recordingMapboxTrafficHeavy"
                        sourceLayerID={TRAFFIC_SOURCE_LAYER}
                        filter={['==', ['get', 'congestion'], 'heavy']}
                        style={{ lineColor: TRAFFIC_RED, lineWidth: 3, lineOpacity: 0.55, lineCap: 'round', lineJoin: 'round' }}
                    />
                    <Mapbox.LineLayer
                        id="recordingMapboxTrafficSevere"
                        sourceLayerID={TRAFFIC_SOURCE_LAYER}
                        filter={['==', ['get', 'congestion'], 'severe']}
                        style={{ lineColor: TRAFFIC_DARK_RED, lineWidth: 3.5, lineOpacity: 0.65, lineCap: 'round', lineJoin: 'round' }}
                    />
                </Mapbox.VectorSource>
                {/* Upcoming route ahead of the rider — blue, drawn a little wider so it stays
                    visible as a casing around the traffic overlay. */}
                {upcomingRouteShape && (
                    <Mapbox.ShapeSource id="recordingUpcomingRouteSource" shape={upcomingRouteShape}>
                        <Mapbox.LineLayer
                            id="recordingUpcomingRouteLine"
                            style={{ lineColor: ROUTE_BLUE, lineWidth: 8, lineOpacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
                        />
                    </Mapbox.ShapeSource>
                )}
                {/* Traffic congestion on the upcoming route — sits on top of the blue casing but
                    is narrower, so the blue remains visible around it. */}
                {congestionShape && (
                    <Mapbox.ShapeSource id="recordingTrafficRouteSource" shape={congestionShape}>
                        <Mapbox.LineLayer
                            id="recordingModerateTrafficRouteLine"
                            filter={['==', ['get', 'congestion'], 'moderate']}
                            style={{ lineColor: TRAFFIC_ORANGE, lineWidth: 5, lineOpacity: 0.98, lineCap: 'round', lineJoin: 'round' }}
                        />
                        <Mapbox.LineLayer
                            id="recordingHeavyTrafficRouteLine"
                            filter={['==', ['get', 'congestion'], 'heavy']}
                            style={{ lineColor: TRAFFIC_RED, lineWidth: 5, lineOpacity: 0.98, lineCap: 'round', lineJoin: 'round' }}
                        />
                        <Mapbox.LineLayer
                            id="recordingSevereTrafficRouteLine"
                            filter={['==', ['get', 'congestion'], 'severe']}
                            style={{ lineColor: TRAFFIC_DARK_RED, lineWidth: 5.5, lineOpacity: 1, lineCap: 'round', lineJoin: 'round' }}
                        />
                    </Mapbox.ShapeSource>
                )}
                {/* Already-travelled path — green, drawn on top so it clearly marks progress. */}
                {displayPoints.length > 0 && (
                    <Polygon
                        points={displayPoints}
                        style={{ lineColor: ROUTE_GREEN, lineWidth: 6, lineOpacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
                        showEndpointMarkers={false}
                    />
                )}
                <Mapbox.Camera
                    animationDuration={isFollowingUser ? 500 : 0}
                    animationMode={isFollowingUser ? 'flyTo' : 'none'}
                    followUserLocation={!cameraCenter}
                    centerCoordinate={isFollowingUser ? cameraCenter : undefined}
                    heading={isFollowingUser ? (displayedLocation?.heading || 0) : undefined}
                    zoomLevel={zoomLevel}
                />
                {displayedLocationCoordinate && (
                    <Mapbox.PointAnnotation id="snapped-rider-location" coordinate={displayedLocationCoordinate}>
                        <View style={[styles.riderMarker, { transform: [{ rotate: isFollowingUser ? '0deg' : `${displayedLocation?.heading || 0}deg` }] }]}>
                            <Icon source="navigation" size={24} color={theme.colors.primary} />
                        </View>
                    </Mapbox.PointAnnotation>
                )}
                {activeRouteDestination && (
                    <Mapbox.PointAnnotation id="active-route-destination" coordinate={activeRouteDestination}>
                        <View style={styles.destinationMarker}>
                            <Icon source="map-marker" size={sizes.size32} color={theme.colors.primary} />
                        </View>
                    </Mapbox.PointAnnotation>
                )}
            </Mapbox.MapView>
            <View
                className="absolute flex flex-col items-center justify-center"
                style={{
                    position: 'absolute',
                    margin: 8,
                    right: 5,
                    bottom: 180,
                    gap: 5,
                }}
            >
                <FAB icon={'plus'} size="small" style={styles.mapFAB} onPress={() => setZoomLevel(zoomLevel + 1)} />
                <FAB icon={'minus'} size="small" style={styles.mapFAB} onPress={() => setZoomLevel(zoomLevel - 1)} />
                <FAB icon={'crosshairs-gps'} style={styles.mapFAB} size="small" onPress={recenterMap} />
            </View>
        </View>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        mapContainer: {
            flex: 1,
        },
        map: {
            flex: 1,
        },
        controlsContainer: {
            padding: sizes.large,
            margin: sizes.medium,
            marginTop: 0,
            borderRadius: sizes.medium,
            backgroundColor: theme.colors.surface,
        },
        activeControls: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: sizes.medium,
        },
        button: {
            borderRadius: sizes.medium,
            height: sizes.size56,
            justifyContent: 'center',
            backgroundColor: theme.colors.primary,
        },
        buttonLabel: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIHeadline-Semibold',
        },
        pauseButton: {
            flex: 1,
            backgroundColor: theme.colors.surfaceDisabled,
        },
        resumeButton: {
            flex: 1,
        },
        finishButton: {
            flex: 1,
        },
        mapFAB: {
            backgroundColor: theme.colors.surface,
        },
        riderMarker: {
            width: sizes.size32,
            height: sizes.size32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.surface,
            borderWidth: 2,
            borderColor: theme.colors.primary,
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
        },
        destinationMarker: {
            width: sizes.size48,
            height: sizes.size48,
            alignItems: 'center',
            justifyContent: 'center',
        },
    });
