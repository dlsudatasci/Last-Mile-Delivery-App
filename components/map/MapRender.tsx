import { useRideStore } from '@/lib/store/useRideStore';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { UserTrackingMode } from '@rnmapbox/maps';

import Mapbox from '@rnmapbox/maps';
import { useMemo, useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { FAB, MD3Theme, useTheme } from 'react-native-paper';
import { Polygon } from './polygon';

Mapbox.setAccessToken('pk.eyJ1IjoibnZyenNhIiwiYSI6ImNtcDl3OGpneDB0amkydXByNTR3bG5uNzEifQ.hgL01z3Qc9KzOrQCKjzbsg');

const TRAFFIC_RED = '#DC2626';
const TRAFFIC_DARK_RED = '#991B1B';
const TRAFFIC_ORANGE = '#F59E0B';
const TRAFFIC_TILESET_URL = 'mapbox://mapbox.mapbox-traffic-v1';
const TRAFFIC_SOURCE_LAYER = 'traffic';

export default function MapRender() {
    const theme = useTheme();
    const colorScheme = useColorScheme();
    const mapboxStyle =
        colorScheme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';

    const { displayPoints, activeRouteCoordinates, activeRouteCongestionSegments } = useRideStore();

    const [zoomLevel, setZoomLevel] = useState(16);
    const recenterMap = () => {
        if (zoomLevel >= 16) {
            setZoomLevel(zoomLevel - 1);
        } else {
            setZoomLevel(zoomLevel + 1);
        }
    };

    const styles = getStyles(theme);
    const activeRouteShape = useMemo(
        () =>
            activeRouteCoordinates.length > 1
                ? {
                      type: 'Feature' as const,
                      properties: {},
                      geometry: { type: 'LineString' as const, coordinates: activeRouteCoordinates },
                  }
                : null,
        [activeRouteCoordinates]
    );
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
                onPress={data => {
                    console.log('data', data);
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
                {displayPoints.length > 0 && (
                    <Polygon
                        points={displayPoints}
                        style={{ lineColor: theme.colors.secondary, lineWidth: 3, lineOpacity: 0.55 }}
                    />
                )}
                {activeRouteShape && (
                    <Mapbox.ShapeSource id="recordingActiveRouteSource" shape={activeRouteShape}>
                        <Mapbox.LineLayer
                            id="recordingActiveRouteLine"
                            style={{ lineColor: theme.colors.primary, lineWidth: 6, lineOpacity: 0.55, lineCap: 'round', lineJoin: 'round' }}
                        />
                    </Mapbox.ShapeSource>
                )}
                {congestionShape && (
                    <Mapbox.ShapeSource id="recordingTrafficRouteSource" shape={congestionShape}>
                        <Mapbox.LineLayer
                            id="recordingModerateTrafficRouteLine"
                            filter={['==', ['get', 'congestion'], 'moderate']}
                            style={{ lineColor: TRAFFIC_ORANGE, lineWidth: 9, lineOpacity: 0.98, lineCap: 'round', lineJoin: 'round' }}
                        />
                        <Mapbox.LineLayer
                            id="recordingHeavyTrafficRouteLine"
                            filter={['==', ['get', 'congestion'], 'heavy']}
                            style={{ lineColor: TRAFFIC_RED, lineWidth: 9, lineOpacity: 0.98, lineCap: 'round', lineJoin: 'round' }}
                        />
                        <Mapbox.LineLayer
                            id="recordingSevereTrafficRouteLine"
                            filter={['==', ['get', 'congestion'], 'severe']}
                            style={{ lineColor: TRAFFIC_DARK_RED, lineWidth: 10, lineOpacity: 1, lineCap: 'round', lineJoin: 'round' }}
                        />
                    </Mapbox.ShapeSource>
                )}
                <Mapbox.Camera
                    animationDuration={0}
                    animationMode="none"
                    followUserLocation={true}
                    followUserMode={UserTrackingMode.FollowWithCourse}
                    followZoomLevel={zoomLevel}
                />
                <Mapbox.LocationPuck puckBearing="course" puckBearingEnabled />
            </Mapbox.MapView>
            <View
                className="absolute flex flex-col items-center justify-center"
                style={{
                    position: 'absolute',
                    margin: 8,
                    right: 5,
                    bottom: 5,
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
    });
