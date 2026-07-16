import CustomSnackbar, { SnackbarType } from '@/components/common/Snackbar';
import SpinningWheel from '@/components/common/SpinningWheel';
import { Polygon } from '@/components/map/polygon';
import { formatDuration } from '@/lib/common/formulas';
import { RideData, saveRide } from '@/lib/firebase-crud/rides';
import { parseGpx } from '@/lib/utils/parseGpx';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import Mapbox from '@rnmapbox/maps';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Button, FAB, Icon, MD3Theme, Modal, Portal, Switch, Text, TextInput, useTheme } from 'react-native-paper';

Mapbox.setAccessToken('pk.eyJ1IjoibnZyenNhIiwiYSI6ImNtcDl3OGpneDB0amkydXByNTR3bG5uNzEifQ.hgL01z3Qc9KzOrQCKjzbsg');

export default function GpxPreview() {
    const theme = useTheme();
    const colorScheme = useColorScheme();
    const mapboxStyle =
        colorScheme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';

    const { gpx } = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState('map');
    const styles = getStyles(theme);

    const [zoomLevel, setZoomLevel] = useState(12);
    const recenterMap = () => {
        if (zoomLevel >= 12) {
            setZoomLevel(zoomLevel - 1);
        } else {
            setZoomLevel(zoomLevel + 1);
        }
    };

    const [ride, setRide] = useState<RideData | null>(null);
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [newRideName, setNewRideName] = useState('');
    const [saving, setSaving] = useState(false);
    const [isPublic, setIsPublic] = useState(false); // New state for public/private toggle
    const [isSnackbarVisible, setIsSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState<SnackbarType>('info');

    useEffect(() => {
        const fetchGpx = async () => {
            const parsedGpx: RideData = await parseGpx(gpx as string);

            setRide(parsedGpx);
        };
        fetchGpx();
    }, [gpx]);

    if (!ride) {
        return (
            <View style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
                <SpinningWheel />
            </View>
        );
    }

    const handleOpenRenameModal = () => {
        setNewRideName(ride.rideName);
        setRenameModalVisible(true);
    };

    const handleSaveRideName = async () => {
        setSaving(true);
        try {
            const updatedRide = { ...ride, rideName: newRideName, isGPXUpload: true, fromWeb: false };
            setRide(updatedRide);
            setRenameModalVisible(false);
        } catch (e) {
            // Optionally show error
        } finally {
            setSaving(false);
        }
    };

    const handleSaveRide = async () => {
        setSaving(true);
        try {
            const updatedRide = { ...ride, isPublic };

            await saveRide(updatedRide);
            setSnackbarMessage('Trip saved successfully');
            setSnackbarType('success');
            setIsSnackbarVisible(true);
            router.back();
        } catch (e) {
            setSnackbarMessage('Failed to save ride');
            setSnackbarType('error');
            setIsSnackbarVisible(true);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'map' && styles.activeTab]}
                        onPress={() => setActiveTab('map')}
                    >
                        <Icon source="map" size={sizes.medium} />
                        <Text style={[styles.tabText, activeTab === 'map' && styles.activeTabText]}>Map</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'details' && styles.activeTab]}
                        onPress={() => setActiveTab('details')}
                    >
                        <Icon source="bike" size={sizes.medium} />
                        <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>Details</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Map View */}
            <View style={[styles.tabContent, activeTab !== 'map' && styles.hidden]}>
                <View style={styles.mapContainer}>
                    <Mapbox.MapView style={{ flex: 1 }} styleURL={mapboxStyle} zoomEnabled rotateEnabled compassEnabled>
                        <Mapbox.Camera
                            animationDuration={1000}
                            animationMode="none"
                            zoomLevel={zoomLevel}
                            centerCoordinate={[ride.points[0].coordinate.longitude, ride.points[0].coordinate.latitude]}
                        />
                        {ride?.points.length > 0 && (
                            <Polygon
                                points={ride.points}
                                style={{
                                    lineColor: theme.colors.primary,
                                    lineWidth: 4,
                                    lineOpacity: 1,
                                }}
                            />
                        )}
                        {/* Start Point Marker */}
                        <Mapbox.PointAnnotation
                            id="startPoint"
                            coordinate={[ride.points[0].coordinate.longitude, ride.points[0].coordinate.latitude]}
                            title="Start"
                        >
                            <View
                                style={{
                                    height: sizes.size48,
                                    width: sizes.size48,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: sizes.size160,
                                    borderWidth: StyleSheet.hairlineWidth,
                                    borderColor: theme.colors.primary,
                                }}
                            >
                                <Icon source="flag-outline" size={sizes.size32} color={theme.colors.primary} />
                            </View>
                        </Mapbox.PointAnnotation>

                        {/* End Point Marker */}
                        <Mapbox.PointAnnotation
                            id="endPoint"
                            coordinate={[
                                ride.points[ride.points.length - 1].coordinate.longitude,
                                ride.points[ride.points.length - 1].coordinate.latitude,
                            ]}
                            title="End"
                        >
                            <View
                                style={{
                                    height: sizes.size48,
                                    width: sizes.size48,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: sizes.size160,
                                    borderWidth: StyleSheet.hairlineWidth,
                                    borderColor: theme.colors.primary,
                                }}
                            >
                                <Icon source="flag-checkered" size={sizes.size32} color={theme.colors.primary} />
                            </View>
                        </Mapbox.PointAnnotation>
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
                        <FAB
                            icon={'plus'}
                            size="small"
                            style={styles.mapFAB}
                            onPress={() => setZoomLevel(zoomLevel + 1)}
                        />
                        <FAB
                            icon={'minus'}
                            size="small"
                            style={styles.mapFAB}
                            onPress={() => setZoomLevel(zoomLevel - 1)}
                        />
                        <FAB icon={'crosshairs-gps'} style={styles.mapFAB} size="small" onPress={recenterMap} />
                    </View>
                </View>
            </View>

            {/* Details View */}
            <ScrollView
                style={[
                    styles.tabContent,
                    activeTab !== 'details' && styles.hidden,
                    { paddingHorizontal: sizes.medium },
                ]}
            >
                <View style={styles.detailsContainer}>
                    <TouchableOpacity
                        onPress={handleOpenRenameModal}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: sizes.tiny }}
                    >
                        <Text
                            style={{
                                fontFamily: 'LGEIHeadline-Bold',
                                fontSize: fontSizes.small,
                                color: theme.colors.primary,
                            }}
                        >
                            {ride.rideName}
                        </Text>
                        <Icon source="pencil" size={sizes.large} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: sizes.tiny,
                            marginBottom: sizes.small,
                        }}
                    >
                        <Icon source="calendar-outline" size={sizes.medium} />
                        <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.tinyPlus }}>
                            {new Date(ride.startTime).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long',
                            })}
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'column' }}>
                            <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.tiny }}>
                                Start Time
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: sizes.tiny }}>
                                <Icon source="clock-start" size={sizes.medium} />
                                <Text style={{ fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.tinyPlus }}>
                                    {new Date(ride.startTime).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'column' }}>
                            <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.tiny }}>
                                End Time
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: sizes.tiny }}>
                                <Icon source="clock-end" size={sizes.medium} />
                                <Text style={{ fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.tinyPlus }}>
                                    {new Date(ride.endTime).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'column' }}>
                            <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.tiny }}>
                                Duration
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: sizes.tiny }}>
                                <Icon source="clock-fast" size={sizes.medium} />
                                <Text style={{ fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.tinyPlus }}>
                                    {formatDuration(ride.duration)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
                <View style={styles.detailsContainer}>
                    <Text
                        style={{
                            fontFamily: 'LGEIHeadline-Bold',
                            fontSize: fontSizes.regular,
                            color: theme.colors.onSurface,
                            marginBottom: sizes.large,
                        }}
                    >
                        Trip Statistics
                    </Text>

                    <View
                        style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            gap: sizes.medium,
                            marginBottom: sizes.large,
                        }}
                    >
                        <View style={{ flex: 1, flexDirection: 'column', alignItems: 'center' }}>
                            <Icon source="speedometer" size={sizes.size32} color={theme.colors.primary} />
                            <Text
                                style={{
                                    fontFamily: 'LGEIHeadline-Regular',
                                    fontSize: fontSizes.tiny,
                                    textAlign: 'center',
                                }}
                            >
                                Avg. Speed
                            </Text>
                            <Text style={{ fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.tinyPlus }}>
                                {ride.averageSpeed.toFixed(2)} km/h
                            </Text>
                        </View>
                        <View style={{ flex: 1, flexDirection: 'column', alignItems: 'center' }}>
                            <Icon source="fire" size={sizes.size32} color={theme.colors.primary} />
                            <Text
                                style={{
                                    fontFamily: 'LGEIHeadline-Regular',
                                    fontSize: fontSizes.tiny,
                                    textAlign: 'center',
                                }}
                            >
                                Max. Speed
                            </Text>
                            <Text style={{ fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.tinyPlus }}>
                                {ride.maxSpeed.toFixed(2)} km/h
                            </Text>
                        </View>
                    </View>
                    <View
                        style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            gap: sizes.medium,
                            marginBottom: sizes.large,
                        }}
                    >
                        <View style={{ flex: 1, flexDirection: 'column', alignItems: 'center' }}>
                            <Icon source="elevation-rise" size={sizes.size32} color={theme.colors.primary} />
                            <Text
                                style={{
                                    fontFamily: 'LGEIHeadline-Regular',
                                    fontSize: fontSizes.tiny,
                                    textAlign: 'center',
                                }}
                            >
                                Elevation Gain
                            </Text>
                            <Text style={{ fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.tinyPlus }}>
                                {ride.elevationGain.toFixed(2)} m
                            </Text>
                        </View>
                        <View style={{ flex: 1, flexDirection: 'column', alignItems: 'center' }}>
                            <Icon source="map-marker-distance" size={sizes.size32} color={theme.colors.primary} />
                            <Text
                                style={{
                                    fontFamily: 'LGEIHeadline-Regular',
                                    fontSize: fontSizes.tiny,
                                    textAlign: 'center',
                                }}
                            >
                                Distance
                            </Text>
                            <Text style={{ fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.tinyPlus }}>
                                {(ride.distance / 1000).toFixed(2)} km
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={styles.detailsContainer}>
                    <Text
                        style={{
                            fontFamily: 'LGEIHeadline-Bold',
                            fontSize: fontSizes.regular,
                            color: theme.colors.onSurface,
                            marginBottom: sizes.large,
                        }}
                    >
                        Trip Settings
                    </Text>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: sizes.large,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: sizes.small }}>
                            <Icon source={isPublic ? 'earth' : 'shield-lock'} size={sizes.medium} />
                            <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.small }}>
                                {isPublic ? 'Public' : 'Private'} Visibility
                            </Text>
                        </View>
                        <Switch value={isPublic} onValueChange={setIsPublic} />
                    </View>
                </View>
                <View style={{ ...styles.detailsContainer, marginBottom: sizes.medium }}>
                    <Button
                        icon="content-save"
                        mode="contained"
                        onPress={handleSaveRide}
                        loading={saving}
                        disabled={saving}
                    >
                        Save Ride
                    </Button>
                </View>
            </ScrollView>
            <Portal>
                <Modal
                    visible={renameModalVisible}
                    onDismiss={() => setRenameModalVisible(false)}
                    contentContainerStyle={{
                        backgroundColor: theme.colors.surface,
                        margin: sizes.medium,
                        padding: sizes.medium,
                        borderRadius: sizes.medium,
                    }}
                >
                    <Text
                        style={{
                            fontFamily: 'LGEIHeadline-Bold',
                            fontSize: fontSizes.regular,
                            marginBottom: sizes.medium,
                        }}
                    >
                        Rename Trip
                    </Text>
                    <TextInput
                        mode="outlined"
                        label="Trip Name"
                        value={newRideName}
                        onChangeText={setNewRideName}
                        style={{ marginBottom: sizes.medium }}
                        maxLength={35}
                        autoFocus
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: sizes.small }}>
                        <Button
                            mode="outlined"
                            onPress={() => setRenameModalVisible(false)}
                            disabled={saving}
                            style={{ minWidth: 100 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleSaveRideName}
                            loading={saving}
                            disabled={saving}
                            style={{ minWidth: 100 }}
                        >
                            Save
                        </Button>
                    </View>
                </Modal>
            </Portal>
            <Portal>
                <CustomSnackbar
                    visible={isSnackbarVisible}
                    message={snackbarMessage}
                    onDismiss={() => setIsSnackbarVisible(false)}
                    type={snackbarType}
                />
            </Portal>
        </View>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        headerContainer: {
            backgroundColor: theme.colors.surfaceVariant,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: theme.colors.surfaceVariant,
        },
        tabBar: {
            flexDirection: 'row',
        },
        tab: {
            flex: 1,
            flexDirection: 'row',
            gap: sizes.small,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: sizes.small,
        },
        activeTab: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.small,
        },
        tabText: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIHeadline-Regular',
            color: theme.colors.onSurface,
        },
        activeTabText: {
            color: theme.colors.onPrimaryContainer,
            fontFamily: 'LGEIHeadline-Bold',
        },
        tabContent: {
            flex: 1,
            display: 'flex',
        },
        hidden: {
            display: 'none',
        },
        detailsContainer: {
            padding: sizes.medium,
            borderRadius: sizes.medium,
            marginTop: sizes.medium,
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1,
            elevation: 1,
        },
        detailRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        label: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIHeadline-Regular',
            color: theme.colors.onSurface,
        },
        value: {
            fontSize: fontSizes.regular,
            fontFamily: 'LGEIHeadline-Bold',
            color: theme.colors.primary,
        },
        mapContainer: {
            flex: 1,
        },
        mapFAB: {
            backgroundColor: theme.colors.surface,
        },
    });
