import { AnnotationDetailsDialog } from '@/components/annotations/AnnotationDetailsDialog';
import { CustomMediaPicker } from '@/components/common/CustomMediaPicker';
import CustomSnackbar, { SnackbarType } from '@/components/common/Snackbar';
import SpinningWheel from '@/components/common/SpinningWheel';
import { Polygon } from '@/components/map/polygon';
import VideoMediaView from '@/components/video/VideoMediaView';
import { getPredefinedAnnotation, PredefinedAnnotation, predefinedAnnotations } from '@/lib/common/annotations';
import { formatDuration } from '@/lib/common/formulas';
import { Annotation } from '@/lib/firebase-crud/annotations';
import {
    FetchRideData,
    updateRideName as updateRideNameInDb,
    updateVisibilitySettings,
} from '@/lib/firebase-crud/rides';
import { useRidesStore } from '@/lib/store/useRidesStore';
import { auth, firestore } from '@/lib/utils/firebaseConfig';
import { fontSizes, height, sizes } from '@/lib/utils/responsive-sizing';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { getAuth } from '@react-native-firebase/auth';
import { doc, updateDoc } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import Mapbox from '@rnmapbox/maps';
import Checkbox from 'expo-checkbox';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
    Button,
    Chip,
    Divider,
    FAB,
    Icon,
    MD3Theme,
    Modal,
    Portal,
    Switch,
    Text,
    TextInput,
    useTheme,
} from 'react-native-paper';

Mapbox.setAccessToken('pk.eyJ1IjoiYW5kcmVzd2UiLCJhIjoiY203N3Z2ZXZkMTdnajJqcTg0ZGwweDV1YSJ9.8-Muri-txLBOiaKSsCZjWA');

export default function RideDetails() {
    const theme = useTheme();
    const colorScheme = useColorScheme();
    const mapboxStyle =
        colorScheme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';

    const [isOwner, setIsOwner] = useState(false);

    const cameraRef = useRef<Mapbox.Camera>(null);

    const { id } = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState('map');
    const annotationModalRef = useRef<BottomSheetModal>(null);
    const mediaPickerModalRef = useRef<BottomSheetModal>(null);
    const [annotationModalVisible, setAnnotationModalVisible] = useState(false);
    const [modalIndex, setModalIndex] = useState(0);
    const [mediaPickerIndex, setMediaPickerIndex] = useState(0);

    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [uploadingVideoProgress, setUploadingVideoProgress] = useState(0);

    const predefinedFilterAnnotations = [
        ...predefinedAnnotations,
        {
            id: 'media-annotation',
            name: 'Media Annotations',
            icon: 'image-outline',
            color: theme.colors.secondary,
            shortDescription: 'Marked with image or video.',
        },
    ];
    const [filterAnnotationsModalVisible, setFilterAnnotationsModalVisible] = useState(false);
    const [filterAnnotations, setFilterAnnotations] = useState<Annotation['id'][]>(
        predefinedFilterAnnotations.map(a => a.id)
    );

    const { selectedRide, selectRide, updateRideName, removeAnnotation, removeRide } = useRidesStore();

    const [ride, setRide] = useState<FetchRideData | null>(null);
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [newRideName, setNewRideName] = useState('');
    const [saving, setSaving] = useState(false);
    const [isPublic, setIsPublic] = useState(false); // New state for public/private toggle

    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<SnackbarType>('info');

    const [centerCoordinate, setCenterCoordinate] = useState<[number, number] | null>(null);
    const initialCenterSet = useRef(false);

    React.useEffect(() => {
        if (ride && ride.points.length > 0 && !initialCenterSet.current) {
            setCenterCoordinate([ride.points[0].coordinate.longitude, ride.points[0].coordinate.latitude]);
            initialCenterSet.current = true;
        }
    }, [ride]);

    const recenterMap = () => {
        if (ride && ride.points.length > 0) {
            setCenterCoordinate([ride.points[0].coordinate.longitude, ride.points[0].coordinate.latitude]);
        }
    };

    const resetToast = () => {
        setToastMessage('');
        setToastVisible(false);
        setToastType('info');
    };

    const [selectedAnnotations, setSelectedAnnotations] = useState<Annotation[]>([]);

    const onModalChange = (index: number) => {
        setModalIndex(index);
    };
    const onMediaPickerModalChange = (index: number) => {
        setMediaPickerIndex(index);
    };

    const styles = getStyles(theme);

    const [zoomLevel, setZoomLevel] = useState(14);

    useFocusEffect(
        React.useCallback(() => {
            let debounceTimeout: NodeJS.Timeout;

            const fetchSelectedRide = async () => {
                const userId = getAuth().currentUser?.uid;
                if (!userId) {
                    console.error('User not authenticated');
                    return;
                }

                const ride = await selectRide(id as string);
                if (!ride) {
                    console.error('Ride not found');
                    return;
                }

                setRide(ride);
                setZoomLevel(ride.points.length && ride.points.length < 50 ? 16 : 14);
                setIsPublic(ride.isPublic);
                setIsOwner(ride.userId === userId);

                if (cameraRef.current) {
                    cameraRef.current.setCamera({
                        centerCoordinate: [ride.points[0].coordinate.longitude, ride.points[0].coordinate.latitude],
                        zoomLevel: ride.points.length && ride.points.length < 50 ? 16 : 14,
                    });
                }

                // Check for unseen auto-generated annotations
                const hasUnseenAutoAnnotations =
                    ride.autoGeneratedAnnotations &&
                    ride.autoGeneratedAnnotations.length > 0 &&
                    ride.autoAnnotationSeen === false;

                if (hasUnseenAutoAnnotations) {
                    Alert.alert(
                        'Auto-Generated Annotations Available',
                        "We've automatically generated annotations for your uploaded video. Would you like to view them now?",
                        [
                            {
                                text: 'View Later',
                                style: 'cancel',
                            },
                            {
                                text: 'View Now',
                                onPress: () => {
                                    updateDoc(doc(firestore, 'rides', ride.id), {
                                        autoAnnotationSeen: true,
                                    });
                                    setActiveTab('details');
                                },
                            },
                        ]
                    );
                }
            };

            // Debounce: wait 300ms before running fetch
            debounceTimeout = setTimeout(() => {
                fetchSelectedRide();
            }, 300);

            // Cleanup on unmount or re-focus
            return () => {
                clearTimeout(debounceTimeout);
            };
        }, [id])
    );

    if (!ride) {
        return (
            <View style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
                <SpinningWheel />
            </View>
        );
    }

    const handleOpenRenameModal = () => {
        if (!isOwner) {
            return;
        }
        setNewRideName(ride.rideName);
        setRenameModalVisible(true);
    };

    const handleSaveRideName = async () => {
        if (!isOwner) {
            return;
        }
        setSaving(true);
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) throw new Error('User not authenticated');
            await updateRideNameInDb(userId, ride.id, newRideName);
            updateRideName(ride.id, newRideName);
            const updatedRide = await selectRide(ride.id as string);
            if (!updatedRide) {
                throw new Error('Ride not found');
            }
            setRide(updatedRide);
            setRenameModalVisible(false);
        } catch (e) {
            // Optionally show error
        } finally {
            setSaving(false);
        }
    };

    const saveSettings = async () => {
        try {
            await updateVisibilitySettings(ride.id, isPublic);
            setToastVisible(true);
            setToastMessage('Saved ride visibility!');
            setToastType('success');
        } catch (error) {
            setToastVisible(true);
            setToastMessage('Error saving ride visibility.');
            setToastType('error');
        }
    };

    const handleOpenAddAnnotationModal = () => {
        if (!isOwner) {
            return;
        }
        setActiveTab('map');
        setAnnotationModalVisible(true);
    };

    const handleOpenMediaPickerModal = async () => {
        if (!isOwner) {
            return;
        }
        setAnnotationModalVisible(false);
        mediaPickerModalRef.current?.present();
        setTimeout(() => {
            mediaPickerModalRef.current?.expand();
        }, 1000);
    };

    const handleDeleteRide = async () => {
        if (!isOwner) {
            return;
        }
        try {
            await removeRide(ride);
            router.push('/main/(tabs)/home');
        } catch (error) {
            console.error('Error deleting ride:', error);
        }
    };

    const handleOpenFilterModal = () => {
        setActiveTab('map');
        setFilterAnnotationsModalVisible(true);
    };

    const handleUploadVideoToRide = async () => {
        if (!isOwner) {
            return;
        }

        setUploadingVideo(true);

        const result = await launchImageLibraryAsync({
            mediaTypes: ['videos'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 1,
            selectionLimit: 1,
        });

        if (result.assets) {
            const video = result.assets[0];
            const videoUri = video.uri;

            const mediaRef = storage().ref(`rides/${ride.id}/videos/${video.fileName}`);

            const task = mediaRef.putFile(videoUri);

            task.on('state_changed', snapshot => {
                setUploadingVideoProgress(snapshot.bytesTransferred / snapshot.totalBytes);
            });

            await task;
            const downloadUrl = await mediaRef.getDownloadURL();

            updateDoc(doc(firestore, 'rides', ride.id), {
                rideVideo: downloadUrl,
            });

            setRide(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    rideVideo: downloadUrl,
                    autoGeneratedAnnotations: [],
                    autoAnnotationSeen: false,
                };
            });

            setUploadingVideo(false);
            setUploadingVideoProgress(0);
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
                            ref={cameraRef}
                            animationDuration={600}
                            animationMode="easeTo"
                            zoomLevel={zoomLevel}
                            centerCoordinate={centerCoordinate ?? [120.9936, 14.5646]}
                        />
                        <Polygon
                            points={ride.points}
                            annotations={ride.annotations}
                            style={{
                                lineColor: theme.colors.primary,
                                lineWidth: 4,
                                lineOpacity: 0.8,
                            }}
                            onAnnotationPress={annotations => setSelectedAnnotations(annotations)}
                        />
                    </Mapbox.MapView>
                    <View
                        className="absolute flex flex-col items-center justify-center"
                        style={{
                            position: 'absolute',
                            margin: 8,
                            right: sizes.tiny,
                            top: sizes.size48,
                            gap: sizes.tiny,
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
                        <FAB icon={'filter'} size="small" style={styles.mapFAB} onPress={handleOpenFilterModal} />
                    </View>
                    {isOwner && (
                        <View
                            className="absolute flex flex-col items-center justify-center"
                            style={{
                                position: 'absolute',
                                margin: 8,
                                right: sizes.small,
                                bottom: sizes.large,
                                gap: sizes.tiny,
                            }}
                        >
                            <FAB
                                icon={'map-marker-plus'}
                                customSize={sizes.size48}
                                style={{
                                    ...styles.mapFAB,
                                    backgroundColor: theme.colors.primary,
                                }}
                                color={theme.colors.onPrimary}
                                onPress={handleOpenAddAnnotationModal}
                            />
                        </View>
                    )}
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
                    {isOwner ? (
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
                    ) : (
                        <Text
                            style={{
                                fontFamily: 'LGEIHeadline-Bold',
                                fontSize: fontSizes.small,
                                color: theme.colors.onSurface,
                            }}
                        >
                            {ride.rideName}
                        </Text>
                    )}
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
                            {new Date(ride.createdAt).toLocaleDateString('en-US', {
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
                {isOwner && (
                    <View style={styles.detailsContainer}>
                        <Text
                            style={{
                                fontFamily: 'LGEIHeadline-Bold',
                                fontSize: fontSizes.regular,
                                color: theme.colors.onSurface,
                                marginBottom: sizes.small,
                            }}
                        >
                            Trip Settings
                        </Text>
                        <Text
                            style={{
                                fontFamily: 'LGEIHeadline-Regular',
                                fontSize: fontSizes.tinyPlus,
                                marginBottom: sizes.large,
                            }}
                        >
                            When your ride is public, it will be visible to everyone. It will also be seen in the public
                            map.
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
                        <Button mode="contained" onPress={() => saveSettings()} disabled={isPublic === ride.isPublic}>
                            Save Settings
                        </Button>
                    </View>
                )}
                {isOwner && (
                    <View style={styles.detailsContainer}>
                        <Text
                            style={{
                                fontFamily: 'LGEIHeadline-Bold',
                                fontSize: fontSizes.small,
                                color: theme.colors.onSurface,
                                marginBottom: sizes.small,
                            }}
                        >
                            Upload a Video of your Ride
                        </Text>
                        {ride.rideVideo && <VideoMediaView source={ride.rideVideo} style={styles.media} />}

                        {ride.rideVideo &&
                        (!ride.autoGeneratedAnnotations || ride.autoGeneratedAnnotations.length === 0) ? (
                            <Text
                                style={{
                                    fontFamily: 'LGEIHeadline-Regular',
                                    fontSize: fontSizes.tinyPlus,
                                    marginBottom: sizes.large,
                                }}
                            >
                                Upload a video to get auto-generated annotations. These will be added to the ride if you
                                like them.
                            </Text>
                        ) : (
                            <Text
                                style={{
                                    fontFamily: 'LGEIHeadline-Regular',
                                    fontSize: fontSizes.tinyPlus,
                                    marginBottom: sizes.large,
                                }}
                            >
                                Auto-generated annotations will be added to the ride based on your video.
                            </Text>
                        )}
                        <Button mode="contained" onPress={() => handleUploadVideoToRide()} loading={uploadingVideo}>
                            {ride.rideVideo ? 'Upload New Video' : 'Upload Video'}
                            {uploadingVideo && (
                                <Text
                                    style={{
                                        fontFamily: 'LGEIHeadline-Regular',
                                        fontSize: fontSizes.tinyPlus,
                                        marginLeft: sizes.medium,
                                        color: theme.colors.onSurface,
                                    }}
                                >
                                    {uploadingVideoProgress.toFixed(2)}%
                                </Text>
                            )}
                        </Button>
                        <Divider style={{ marginVertical: sizes.large, height: 2 }} />
                        <Text style={{ fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.small }}>
                            Auto-Generated Annotations
                        </Text>
                        <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.tinyPlus }}>
                            {!ride.rideVideo
                                ? 'Upload a video to get auto-generated annotations.'
                                : ride.annotations.filter(a => a.source === 'auto-generated-from-video').length > 0
                                ? `${
                                      ride.annotations.filter(a => a.source === 'auto-generated-from-video').length
                                  } annotations were generated for this video.`
                                : 'No annotations were generated for this video yet.'}
                        </Text>
                        <ScrollView
                            style={{
                                width: '100%',
                                flexDirection: 'column',
                                marginTop: sizes.small,
                                marginBottom: sizes.large,
                                maxHeight: 200,
                            }}
                        >
                            {ride.annotations.filter(a => a.source === 'auto-generated-from-video').length > 0 &&
                                ride.annotations
                                    .filter(a => a.source === 'auto-generated-from-video')
                                    .sort((a, b) => a.points[0].timestamp - b.points[0].timestamp)
                                    .map(annotation => {
                                        const predefinedAnnotation = getPredefinedAnnotation(annotation.annotationId)!;
                                        return (
                                            <TouchableOpacity
                                                key={annotation.id}
                                                style={{
                                                    width: '100%',
                                                    padding: sizes.small,
                                                    backgroundColor: theme.colors.surfaceVariant,
                                                    borderRadius: sizes.small,
                                                    marginBottom: sizes.medium,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                }}
                                                onPress={() => {
                                                    setActiveTab('map');
                                                }}
                                            >
                                                <View style={{ flex: 1, flexDirection: 'column' }}>
                                                    <View
                                                        style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: sizes.small,
                                                            marginBottom: sizes.tiny,
                                                        }}
                                                    >
                                                        <Icon
                                                            source={
                                                                annotation.type === 'point'
                                                                    ? 'map-marker'
                                                                    : 'vector-polyline'
                                                            }
                                                            size={sizes.large}
                                                            color={theme.colors.primary}
                                                        />
                                                        <View style={{ flex: 1, flexDirection: 'column' }}>
                                                            <Text
                                                                style={{
                                                                    fontFamily: 'LGEIHeadline-Regular',
                                                                    fontSize: fontSizes.small,
                                                                }}
                                                            >
                                                                {predefinedAnnotation?.name}
                                                            </Text>

                                                            <Text
                                                                style={{
                                                                    fontFamily: 'LGEIHeadline-Regular',
                                                                    fontSize: fontSizes.tiny,
                                                                }}
                                                            >
                                                                {annotation.start_timestamp && annotation.end_timestamp
                                                                    ? `${Math.floor(
                                                                          annotation.start_timestamp / 60
                                                                      )}:${(annotation.start_timestamp % 60)
                                                                          .toString()
                                                                          .padStart(2, '0')} - ${Math.floor(
                                                                          annotation.end_timestamp / 60
                                                                      )}:${(annotation.end_timestamp % 60)
                                                                          .toString()
                                                                          .padStart(2, '0')}`
                                                                    : `${Math.floor(annotation.timestamp! / 60)}:${(
                                                                          annotation.timestamp! % 60
                                                                      )
                                                                          .toString()
                                                                          .padStart(2, '0')}`}
                                                            </Text>
                                                            <Text
                                                                style={{
                                                                    fontFamily: 'LGEIHeadline-Regular',
                                                                    fontSize: fontSizes.tiny,
                                                                }}
                                                            >
                                                                {
                                                                    getPredefinedAnnotation(annotation.annotationId)
                                                                        ?.description
                                                                }
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                {isOwner && (
                                                    <TouchableOpacity
                                                        style={{
                                                            flex: 0,
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                        onPress={() => {
                                                            Alert.alert(
                                                                'Remove Annotation',
                                                                'Are you sure you want to remove this annotation?',
                                                                [
                                                                    {
                                                                        text: 'Cancel',
                                                                        style: 'cancel',
                                                                    },
                                                                    {
                                                                        text: 'Remove',
                                                                        style: 'destructive',
                                                                        onPress: async () => {
                                                                            // await removeAutoGeneratedAnnotation(annotation);

                                                                            setRide(prev => {
                                                                                if (!prev) return null;
                                                                                return {
                                                                                    ...prev,
                                                                                    autoGeneratedAnnotations:
                                                                                        prev.autoGeneratedAnnotations?.filter(
                                                                                            a => a.id !== annotation.id
                                                                                        ),
                                                                                };
                                                                            });
                                                                        },
                                                                    },
                                                                ]
                                                            );
                                                        }}
                                                    >
                                                        <Icon
                                                            source="delete"
                                                            size={sizes.large}
                                                            color={theme.colors.error}
                                                        />
                                                    </TouchableOpacity>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                        </ScrollView>
                    </View>
                )}
                <View style={{ ...styles.detailsContainer, marginBottom: sizes.medium }}>
                    <Text
                        style={{
                            fontFamily: 'LGEIHeadline-Bold',
                            fontSize: fontSizes.regular,
                            color: theme.colors.onSurface,
                            marginBottom: sizes.small,
                        }}
                    >
                        Annotations
                    </Text>
                    <Text
                        style={{
                            fontFamily: 'LGEIHeadline-Regular',
                            fontSize: fontSizes.tinyPlus,
                            marginBottom: sizes.large,
                        }}
                    >
                        Annotations are a way to add additional information to your ride. They can also be seen by other
                        users if your ride is public.
                    </Text>
                    <View
                        style={{
                            width: '100%',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: sizes.large,
                        }}
                    >
                        {ride.annotations.length > 0 ? (
                            ride.annotations.map(annotation => {
                                const predefinedAnnotation = getPredefinedAnnotation(annotation.annotationId);
                                return (
                                    <TouchableOpacity
                                        key={annotation.id}
                                        style={{
                                            width: '100%',
                                            padding: sizes.medium,
                                            backgroundColor: theme.colors.surfaceVariant,
                                            borderRadius: sizes.small,
                                            marginBottom: sizes.medium,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                        }}
                                        onPress={() => {
                                            setActiveTab('map');
                                        }}
                                    >
                                        <View style={{ flex: 1, flexDirection: 'column' }}>
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: sizes.small,
                                                    marginBottom: sizes.tiny,
                                                }}
                                            >
                                                <Icon
                                                    source={
                                                        annotation.type === 'point' ? 'map-marker' : 'vector-polyline'
                                                    }
                                                    size={sizes.large}
                                                    color={theme.colors.primary}
                                                />
                                                <Text
                                                    style={{
                                                        fontFamily: 'LGEIHeadline-Regular',
                                                        fontSize: fontSizes.small,
                                                    }}
                                                >
                                                    {predefinedAnnotation?.name}
                                                </Text>
                                            </View>
                                            {annotation.additionalTags && (
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        flexWrap: 'wrap',
                                                        alignItems: 'center',
                                                        gap: sizes.tiny,
                                                        marginLeft: sizes.large,
                                                    }}
                                                >
                                                    {annotation.additionalTags.map(tag => (
                                                        <Chip compact key={tag}>
                                                            {getPredefinedAnnotation(tag)?.name}
                                                        </Chip>
                                                    ))}
                                                </View>
                                            )}
                                            <View
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'flex-start',
                                                    gap: sizes.small,
                                                    marginBottom: sizes.tiny,
                                                    width: '100%',
                                                }}
                                            >
                                                <Icon
                                                    source={annotation.mediaUri ? 'image' : 'image-off'}
                                                    size={sizes.large}
                                                    color={theme.colors.primary}
                                                />
                                                {predefinedAnnotation?.description && (
                                                    <View style={{ flex: 1 }}>
                                                        <Text
                                                            style={{
                                                                fontFamily: 'LGEIText-Regular',
                                                                fontSize: fontSizes.tiny,
                                                                color: theme.colors.onSurfaceVariant,
                                                            }}
                                                            numberOfLines={3}
                                                        >
                                                            {predefinedAnnotation?.description}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            {annotation.sentiment && (
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'flex-start',
                                                        gap: sizes.small,
                                                        marginBottom: sizes.tiny,
                                                        width: '100%',
                                                    }}
                                                >
                                                    <Icon
                                                        source={'text'}
                                                        size={sizes.large}
                                                        color={theme.colors.primary}
                                                    />

                                                    <Text
                                                        style={{
                                                            flex: 1,
                                                            fontFamily: 'LGEIText-Regular',
                                                            fontSize: fontSizes.tiny,
                                                            color: theme.colors.onSurfaceVariant,
                                                            padding: sizes.small,
                                                            backgroundColor: theme.colors.elevation.level2,
                                                            borderRadius: sizes.small,
                                                        }}
                                                        numberOfLines={3}
                                                    >
                                                        {annotation.sentiment}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        {isOwner && (
                                            <TouchableOpacity
                                                style={{
                                                    flex: 0,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                                onPress={() => {
                                                    Alert.alert(
                                                        'Remove Annotation',
                                                        'Are you sure you want to remove this annotation?',
                                                        [
                                                            {
                                                                text: 'Cancel',
                                                                style: 'cancel',
                                                            },
                                                            {
                                                                text: 'Remove',
                                                                style: 'destructive',
                                                                onPress: async () => {
                                                                    await removeAnnotation(annotation);

                                                                    setRide(prev => {
                                                                        if (!prev) return null;
                                                                        return {
                                                                            ...prev,
                                                                            annotations: prev.annotations.filter(
                                                                                a => a.id !== annotation.id
                                                                            ),
                                                                        };
                                                                    });
                                                                },
                                                            },
                                                        ]
                                                    );
                                                }}
                                            >
                                                <Icon source="delete" size={sizes.large} color={theme.colors.error} />
                                            </TouchableOpacity>
                                        )}
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.small }}>
                                No annotations found.
                            </Text>
                        )}
                        {isOwner && (
                            <Button
                                mode="contained"
                                onPress={handleOpenAddAnnotationModal}
                                icon="plus-circle"
                                style={{ width: '100%', marginTop: sizes.large }}
                            >
                                Add Annotation
                            </Button>
                        )}
                    </View>
                </View>
                {isOwner && (
                    <Button
                        mode="contained"
                        style={{ marginVertical: sizes.medium, backgroundColor: theme.colors.error }}
                        onPress={() => {
                            Alert.alert('Delete Trip', 'Are you sure you want to delete this trip?', [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Delete',
                                    onPress: handleDeleteRide,
                                },
                            ]);
                        }}
                    >
                        Delete Trip
                    </Button>
                )}
            </ScrollView>

            {/* Rename Trip Modal */}
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

            {/* Add Annotation Modal */}
            <Portal>
                <Modal
                    visible={annotationModalVisible}
                    onDismiss={() => setAnnotationModalVisible(false)}
                    contentContainerStyle={{
                        backgroundColor: theme.colors.surface,
                        margin: sizes.medium,
                        padding: sizes.size28,
                        borderRadius: sizes.medium,
                    }}
                >
                    <Text style={{ fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.regular }}>
                        Add an Annotation
                    </Text>
                    <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.tinyPlus }}>
                        Choose from our predefined markers or try uploading an image or video.
                    </Text>
                    <View
                        style={{
                            marginTop: sizes.medium,
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            gap: sizes.tiny,
                        }}
                    >
                        {predefinedAnnotations.map((annotation: PredefinedAnnotation) => (
                            <TouchableOpacity
                                key={annotation.id}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: sizes.small,
                                    borderRadius: sizes.small,
                                    borderWidth: 1,
                                    borderColor: theme.colors.onSurface,
                                    padding: sizes.small,
                                }}
                                onPress={() => {
                                    setAnnotationModalVisible(false);
                                    router.push({
                                        pathname:
                                            annotation.type === 'point'
                                                ? '/main/rides/annotations/select-point'
                                                : '/main/rides/annotations/select-segment',
                                        params: { rideId: id, annotationId: annotation.id },
                                    });
                                }}
                            >
                                <Icon source={annotation.icon} size={sizes.medium} color={theme.colors.onSurface} />
                                <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.tiny }}>
                                    {annotation.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: sizes.small,
                            marginVertical: sizes.small,
                        }}
                    >
                        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.onSurface, opacity: 0.4 }} />
                        <Text style={{ fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.tiny }}>or</Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.onSurface, opacity: 0.4 }} />
                    </View>
                    <Button
                        mode="contained"
                        onPress={handleOpenMediaPickerModal}
                        icon="file-image-marker"
                        style={{ ...styles.modalButton, backgroundColor: theme.colors.tertiary }}
                    >
                        Select Image or Video
                    </Button>
                </Modal>
            </Portal>

            {/* Filter Annotations Modal */}
            <Portal>
                <Modal
                    visible={filterAnnotationsModalVisible}
                    onDismiss={() => setFilterAnnotationsModalVisible(false)}
                    dismissableBackButton
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        backgroundColor: theme.colors.surface,
                        margin: sizes.medium,
                        padding: sizes.size28,
                        borderRadius: sizes.medium,
                        maxHeight: height(80),
                        flexDirection: 'column',
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.small }}>
                            Filter Annotations
                        </Text>
                        <Button mode="text" onPress={() => setFilterAnnotationsModalVisible(false)} icon="close">
                            Close
                        </Button>
                    </View>

                    <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.tinyPlus }}>
                        Select which annotations you want to display on the map
                    </Text>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: sizes.small,
                            justifyContent: 'space-between',
                            marginTop: sizes.small,
                        }}
                    >
                        <Text
                            style={{
                                fontFamily: 'LGEIHeadline-Regular',
                                fontSize: fontSizes.tiny,
                                color: theme.colors.secondary,
                            }}
                        >
                            {filterAnnotations.length || 0} of {predefinedFilterAnnotations.length} selected
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: sizes.small }}>
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: sizes.small,
                                    borderWidth: 1,
                                    borderColor: theme.colors.onSurface,
                                    padding: sizes.tiny,
                                    paddingHorizontal: sizes.small,
                                    borderRadius: sizes.small,
                                }}
                                onPress={() => setFilterAnnotations(predefinedFilterAnnotations.map(a => a.id))}
                            >
                                <Icon source="check-all" size={sizes.medium} color={theme.colors.onSurface} />
                                <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.tiny }}>
                                    All
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setFilterAnnotations([])}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 1,
                                    borderColor: theme.colors.onSurface,
                                    padding: sizes.tiny,
                                    paddingHorizontal: sizes.small,
                                    borderRadius: sizes.small,
                                }}
                            >
                                <Icon source="close" size={sizes.medium} color={theme.colors.onSurface} />
                                <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.tiny }}>
                                    Clear
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Divider style={{ marginTop: sizes.small }} />
                    <FlatList
                        data={predefinedFilterAnnotations}
                        style={{}}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: sizes.small,
                                    padding: sizes.small,
                                    borderRadius: sizes.small,
                                    borderWidth: 1,
                                    borderColor: theme.colors.secondary,
                                    backgroundColor: filterAnnotations.includes(item.id)
                                        ? theme.colors.surfaceVariant
                                        : theme.colors.surface,
                                }}
                                onPress={() => {
                                    if (filterAnnotations.includes(item.id)) {
                                        setFilterAnnotations(filterAnnotations.filter(id => id !== item.id));
                                    } else {
                                        setFilterAnnotations([...filterAnnotations, item.id]);
                                    }
                                }}
                            >
                                <View
                                    style={{
                                        backgroundColor: filterAnnotations.includes(item.id)
                                            ? theme.colors.surface
                                            : theme.colors.surfaceVariant,
                                        padding: sizes.small,
                                        borderRadius: sizes.large,
                                    }}
                                >
                                    <Icon source={item.icon} size={sizes.medium} color={item.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.tinyPlus }}>
                                        {item.name}
                                    </Text>
                                    <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.tiny }}>
                                        {item.shortDescription}
                                    </Text>
                                </View>
                                <View
                                    style={{
                                        width: sizes.medium,
                                        height: sizes.medium,
                                        backgroundColor: item.color,
                                        borderWidth: 1,
                                        borderColor: theme.colors.onSurface,
                                        borderRadius: sizes.large,
                                    }}
                                ></View>
                                <Checkbox
                                    onValueChange={() => {
                                        if (filterAnnotations.includes(item.id)) {
                                            setFilterAnnotations(filterAnnotations.filter(id => id !== item.id));
                                        } else {
                                            setFilterAnnotations([...filterAnnotations, item.id]);
                                        }
                                    }}
                                    value={filterAnnotations.includes(item.id)}
                                    style={{ marginLeft: 'auto' }}
                                    color={theme.colors.primary}
                                />
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={{
                            gap: sizes.small,
                            marginTop: sizes.small,
                            paddingHorizontal: sizes.small,
                        }}
                    />
                </Modal>
            </Portal>

            {/* Media Picker Modal */}
            <BottomSheetModal
                ref={mediaPickerModalRef}
                snapPoints={[height(50)]}
                onChange={onMediaPickerModalChange}
                backdropComponent={props => (
                    <BottomSheetBackdrop
                        {...props}
                        opacity={0.5}
                        enableTouchThrough={false}
                        appearsOnIndex={0}
                        disappearsOnIndex={-1}
                        style={[{ backgroundColor: 'rgba(0, 0, 0, 1)' }, StyleSheet.absoluteFillObject]}
                    />
                )}
                backgroundStyle={{ backgroundColor: theme.colors.surface }}
                enablePanDownToClose
                enableDismissOnClose
            >
                <BottomSheetView style={styles.contentContainer}>
                    <View style={styles.mediaPickerHeader}>
                        <Text style={styles.modalTitle}>Select Media</Text>
                        <Button mode="text" onPress={() => mediaPickerModalRef.current?.close()} icon="close">
                            Cancel
                        </Button>
                    </View>
                    <CustomMediaPicker
                        onSelect={asset => {
                            mediaPickerModalRef.current?.close();
                            router.push({
                                pathname: '/main/rides/annotations/selected-media',
                                params: { rideId: ride.id, mediaId: asset.id },
                            });
                        }}
                        maxItems={30}
                        columns={3}
                    />
                </BottomSheetView>
            </BottomSheetModal>

            <AnnotationDetailsDialog
                visible={selectedAnnotations.length > 0}
                onDismiss={() => setSelectedAnnotations([])}
                annotations={selectedAnnotations}
            />

            <CustomSnackbar
                message={toastMessage}
                onDismiss={() => resetToast()}
                visible={toastVisible}
                type={toastType}
            />
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
            marginHorizontal: sizes.tiny,
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
            fontSize: fontSizes.regular,
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
        contentContainer: {
            flex: 1,
            padding: sizes.medium,
            marginBottom: sizes.medium,
        },
        modalTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.small,
        },
        modalSubtitle: {
            fontFamily: 'LGEIHeadline-Regular',
            fontSize: fontSizes.tinyPlus,
            marginBottom: sizes.medium,
        },
        modalButton: {
            marginTop: sizes.medium,
        },
        mediaPickerHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: sizes.medium,
            paddingVertical: sizes.small,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outline,
        },
        media: {
            width: '100%',
            height: 200,
        },
    });
