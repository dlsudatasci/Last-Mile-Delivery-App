import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';

import { configureMapboxAccessToken } from '@/lib/utils/mapbox';
import Mapbox from '@rnmapbox/maps';
import { useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { Dialog, FAB, MD3Theme, Portal, Text, useTheme } from 'react-native-paper';

configureMapboxAccessToken(Mapbox);

export default function PublicMapRender() {
    const theme = useTheme();
    const colorScheme = useColorScheme();
    const mapboxStyle =
        colorScheme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';

    const [zoomLevel, setZoomLevel] = useState(16);
    const [visible, setVisible] = useState(false);
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
                {/* {displayPoints.length > 0 && (
                    <Polygon
                        points={displayPoints}
                        style={{ lineColor: theme.colors.primary, lineWidth: 4, lineOpacity: 1 }}
                    />
                )} */}
                <Mapbox.Camera animationDuration={0} animationMode="none" zoomLevel={zoomLevel} />
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
                <FAB icon={'information-outline'} size="small" style={styles.mapFAB} onPress={() => setVisible(true)} />

                <FAB icon={'plus'} size="small" style={styles.mapFAB} onPress={() => setZoomLevel(zoomLevel + 1)} />
                <FAB icon={'minus'} size="small" style={styles.mapFAB} onPress={() => setZoomLevel(zoomLevel - 1)} />
                <FAB icon={'crosshairs-gps'} style={styles.mapFAB} size="small" onPress={recenterMap} />
            </View>

            <Portal>
                <Dialog visible={visible} onDismiss={() => setVisible(false)}>
                    <Dialog.Title
                        style={{
                            fontFamily: 'LGEIHeadline-Bold',
                            fontSize: fontSizes.small,
                            color: theme.colors.onSurface,
                        }}
                    >
                        Devia Public Map
                    </Dialog.Title>
                    <Dialog.Content>
                        <Text
                            style={{
                                marginBottom: 8,
                                fontFamily: 'LGEIHeadline-Regular',
                                fontSize: fontSizes.tinyPlus,
                                color: theme.colors.onSurface,
                            }}
                        >
                            Welcome to the Devia Public Map — a delivery-route research map.
                        </Text>
                        <Text
                            style={{
                                fontFamily: 'LGEIHeadline-Regular',
                                fontSize: fontSizes.tiny,
                                color: theme.colors.onSurfaceVariant,
                            }}
                        >
                            This map showcases delivery routes shared by fellow users, along with annotations such as
                            points of interest, road hazards, or scenic spots. Routes and annotations are only visible
                            if users have chosen to make them public.
                        </Text>
                    </Dialog.Content>
                </Dialog>
            </Portal>
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
