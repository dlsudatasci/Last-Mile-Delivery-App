import { useRideStore } from '@/lib/store/useRideStore';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { UserTrackingMode } from '@rnmapbox/maps';

import Mapbox from '@rnmapbox/maps';
import { useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { FAB, MD3Theme, useTheme } from 'react-native-paper';
import { Polygon } from './polygon';

Mapbox.setAccessToken('pk.eyJ1IjoibnZyenNhIiwiYSI6ImNtcDl3OGpneDB0amkydXByNTR3bG5uNzEifQ.hgL01z3Qc9KzOrQCKjzbsg');

export default function MapRender() {
    const theme = useTheme();
    const colorScheme = useColorScheme();
    const mapboxStyle =
        colorScheme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';

    const { displayPoints } = useRideStore();

    const [zoomLevel, setZoomLevel] = useState(16);
    const recenterMap = () => {
        if (zoomLevel >= 16) {
            setZoomLevel(zoomLevel - 1);
        } else {
            setZoomLevel(zoomLevel + 1);
        }
    };

    const styles = getStyles(theme);

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
                {displayPoints.length > 0 && (
                    <Polygon
                        points={displayPoints}
                        style={{ lineColor: theme.colors.primary, lineWidth: 4, lineOpacity: 1 }}
                    />
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
