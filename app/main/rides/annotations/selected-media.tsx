import { AddAnnotationSchema } from '@/components/annotations/schemas';
import { CustomMediaPicker } from '@/components/common/CustomMediaPicker';
import SpinningWheel from '@/components/common/SpinningWheel';
import { PolygonSegment, PolygonWhileAnnotating } from '@/components/map/polygon';
import { PredefinedAnnotation, predefinedAnnotations } from '@/lib/common/annotations';
import { saveAnnotation } from '@/lib/firebase-crud/annotations';
import { FetchRideData } from '@/lib/firebase-crud/rides';
import { useRidesStore } from '@/lib/store/useRidesStore';
import { fontSizes, height, sizes } from '@/lib/utils/responsive-sizing';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { zodResolver } from '@hookform/resolvers/zod';
import { getAuth } from '@react-native-firebase/auth';
import Mapbox from '@rnmapbox/maps';
import { Position } from '@rnmapbox/maps/lib/typescript/src/types/Position';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Animated, Keyboard, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import {
    Button,
    Chip,
    Dialog,
    Divider,
    FAB,
    Icon,
    IconButton,
    MD3Theme,
    Modal,
    Portal,
    Text,
    TextInput,
    useTheme,
} from 'react-native-paper';
import { z } from 'zod';

Mapbox.setAccessToken('pk.eyJ1IjoibnZyenNhIiwiYSI6ImNtcDl3OGpneDB0amkydXByNTR3bG5uNzEifQ.hgL01z3Qc9KzOrQCKjzbsg');

type FeaturePayload = GeoJSON.Feature<
    GeoJSON.Point,
    {
        screenPointX: number;
        screenPointY: number;
    }
>;

type SelectionMode = 'point' | 'segment';

export default function SelectedMedia() {
    const theme = useTheme();
    const { rideId, mediaId } = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const mapboxStyle =
        colorScheme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';
    const [loading, setLoading] = useState(true);

    const { addAnnotation } = useRidesStore();
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const mediaPickerModalRef = useRef<BottomSheetModal>(null);
    const [modalIndex, setModalIndex] = useState(0);
    const [media, setMedia] = useState<MediaLibrary.AssetInfo | null>(null);
    const [selectedPoints, setSelectedPoints] = useState<FetchRideData['points']>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('point');
    const [startPoint, setStartPoint] = useState<Position | null>(null);
    const [endPoint, setEndPoint] = useState<Position | null>(null);
    const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [mediaPickerModalVisible, setMediaPickerModalVisible] = useState(false);
    const [needsManualAlignment, setNeedsManualAlignment] = useState(false);
    const [selectedAnnotations, setSelectedAnnotations] = useState<PredefinedAnnotation[]>([]);
    const [addTagsModalVisible, setAddTagsModalVisible] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    const handleOpenMediaPickerModal = () => {
        setMediaPickerModalVisible(true);
    };

    const handleCloseMediaPickerModal = () => {
        setMediaPickerModalVisible(false);
    };

    const handleMediaSelected = async (selectedMedia: MediaLibrary.Asset) => {
        setMedia(selectedMedia);
        setMediaPickerModalVisible(false);

        if (!ride) return;

        // Try to automatically align media with route
        const mediaCreationTime = new Date(selectedMedia.creationTime).getTime();
        const rideStartTime = new Date(ride.startTime).getTime();
        const rideEndTime = new Date(ride.endTime).getTime();

        // Check if media was created during the ride
        if (mediaCreationTime >= rideStartTime && mediaCreationTime <= rideEndTime) {
            // Find the closest point in time
            const closestPoint = ride.points.reduce((closest, point) => {
                const pointTime = new Date(point.timestamp).getTime();
                const currentDiff = Math.abs(pointTime - mediaCreationTime);
                const closestDiff = Math.abs(new Date(closest.timestamp).getTime() - mediaCreationTime);
                return currentDiff < closestDiff ? point : closest;
            }, ride.points[0]);

            if (selectedMedia.mediaType === 'video' && selectedMedia.duration) {
                // For videos, find points that span the duration
                const videoEndTime = mediaCreationTime + selectedMedia.duration * 1000;
                const startIndex = ride.points.findIndex(
                    point => new Date(point.timestamp).getTime() >= mediaCreationTime
                );
                const endIndex = ride.points.findIndex(point => new Date(point.timestamp).getTime() >= videoEndTime);

                if (startIndex !== -1 && endIndex !== -1) {
                    // We found a valid segment
                    const segmentPoints = ride.points.slice(startIndex, endIndex + 1);
                    setSelectedPoints(segmentPoints);
                    setStartPoint([segmentPoints[0].coordinate.longitude, segmentPoints[0].coordinate.latitude]);
                    setEndPoint([
                        segmentPoints[segmentPoints.length - 1].coordinate.longitude,
                        segmentPoints[segmentPoints.length - 1].coordinate.latitude,
                    ]);
                    setSelectionMode('segment');
                    setNeedsManualAlignment(false);
                } else {
                    setNeedsManualAlignment(true);
                }
            } else {
                // For images, just use the closest point
                setSelectedPoints([closestPoint]);
                setNeedsManualAlignment(false);
            }
        } else {
            setNeedsManualAlignment(true);
        }
    };

    const annotationForm = useForm<z.infer<typeof AddAnnotationSchema>>({
        resolver: zodResolver(AddAnnotationSchema),
        defaultValues: {
            type: 'point',
            sentiment: '',
        },
    });

    const styles = useMemo(() => getStyles(theme), [theme]);

    const [zoomLevel, setZoomLevel] = useState(13);
    const recenterMap = useCallback(() => {
        if (selectedPoints.length > 0) {
            setZoomLevel(prev => (prev >= 13 ? prev - 1 : prev + 1));
        }
    }, [selectedPoints]);

    const { selectedRide, selectRide } = useRidesStore();
    const [ride, setRide] = useState<FetchRideData | null>(null);

    const handleSelectPoint = (e: GeoJSON.Feature) => {
        if (!ride) return;

        const geometry = e.geometry as GeoJSON.Point;
        let coordinates = geometry.coordinates as Position;

        // Find closest point from ride points to selected coordinates
        const closestPoint = ride.points.reduce((closest, point) => {
            const pointCoords: Position = [point.coordinate.longitude, point.coordinate.latitude];
            const currentDist = Math.sqrt(
                Math.pow(coordinates[0] - pointCoords[0], 2) + Math.pow(coordinates[1] - pointCoords[1], 2)
            );
            const closestDist = Math.sqrt(
                Math.pow(coordinates[0] - closest.coordinate.longitude, 2) +
                    Math.pow(coordinates[1] - closest.coordinate.latitude, 2)
            );

            return currentDist < closestDist ? point : closest;
        }, ride.points[0]);

        // Calculate distance to closest point
        const distanceToClosest = Math.sqrt(
            Math.pow(coordinates[0] - closestPoint.coordinate.longitude, 2) +
                Math.pow(coordinates[1] - closestPoint.coordinate.latitude, 2)
        );

        // Ignore if too far (0.001 is roughly 100m)
        if (distanceToClosest > 0.002) {
            return;
        }

        // Use the closest point's coordinates
        coordinates = [closestPoint.coordinate.longitude, closestPoint.coordinate.latitude];

        if (selectionMode === 'point') {
            setSelectedPoints([closestPoint]);
            setStartPoint(null);
            setEndPoint(null);
        } else {
            if (!startPoint) {
                setStartPoint(coordinates);
                setSelectedPoints([closestPoint]);
            } else {
                setEndPoint(coordinates);
                const segmentPoints = getSegmentPoints(startPoint, coordinates);
                setSelectedPoints(segmentPoints);
            }
        }
    };

    const handleDragEnd = (e: FeaturePayload) => {
        if (!ride) return;

        const coordinates = e.geometry.coordinates;
        const closestPoint = ride.points.reduce((closest, point) => {
            const pointCoords: Position = [point.coordinate.longitude, point.coordinate.latitude];
            const currentDist = Math.sqrt(
                Math.pow(coordinates[0] - pointCoords[0], 2) + Math.pow(coordinates[1] - pointCoords[1], 2)
            );
            const closestDist = Math.sqrt(
                Math.pow(coordinates[0] - closest.coordinate.longitude, 2) +
                    Math.pow(coordinates[1] - closest.coordinate.latitude, 2)
            );

            return currentDist < closestDist ? point : closest;
        }, ride.points[0]);

        const closestPointCoordinates = [closestPoint.coordinate.longitude, closestPoint.coordinate.latitude];

        if (selectionMode === 'point') {
            setSelectedPoints([closestPoint]);
        } else {
            if (e.id === 'start-point') {
                setStartPoint(closestPointCoordinates);
                const segmentPoints = getSegmentPoints(closestPointCoordinates, endPoint);
                setSelectedPoints(segmentPoints);
            } else if (e.id === 'end-point') {
                setEndPoint(closestPointCoordinates);
                const segmentPoints = getSegmentPoints(startPoint, closestPointCoordinates);
                setSelectedPoints(segmentPoints);
            }
        }
    };

    const getSegmentPoints = (start: Position | null = startPoint, end: Position | null = endPoint) => {
        if (!ride || !start || !end) return [];
        // Sort points by timestamp
        const sortedPoints = ride.points.sort((a, b) => a.timestamp - b.timestamp);

        // Find indices of start and end points
        const startIndex = sortedPoints.findIndex(
            point => point.coordinate.longitude === start[0] && point.coordinate.latitude === start[1]
        );
        const endIndex = sortedPoints.findIndex(
            point => point.coordinate.longitude === end[0] && point.coordinate.latitude === end[1]
        );

        const sliceStart = Math.min(startIndex, endIndex);
        const sliceEnd = Math.max(startIndex, endIndex);
        return sortedPoints.slice(sliceStart, sliceEnd + 1);
    };

    const handleSaveAnnotation = async (data: z.infer<typeof AddAnnotationSchema>) => {
        if (isSaving || selectedPoints.length === 0 || !ride) return;
        setIsSaving(true);
        try {
            const annotation = await saveAnnotation({
                rideId: ride.id,
                mediaUri: media?.uri,
                mediaType: media?.mediaType,
                points: selectedPoints,
                annotationId: 'media-annotation',
                sentiment: data.sentiment || '',
                type: selectionMode === 'point' ? 'point' : 'segment',
                additionalTags: selectedAnnotations.map(annotation => annotation.id),
            });

            await addAnnotation(annotation);
            router.dismissTo({ pathname: `/main/rides/ride/[id]`, params: { id: ride.id } });
        } catch (error) {
            console.error('Error saving annotation:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelAnnotation = () => {
        setCancelDialogVisible(true);
    };

    const handleAddTags = () => {
        setAddTagsModalVisible(true);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userId = getAuth().currentUser?.uid;
                if (!userId) {
                    throw new Error('User not authenticated');
                }

                const ride = await selectRide(rideId as string);
                if (!ride) {
                    throw new Error('Ride not found');
                }
                setRide(ride);

                if (mediaId) {
                    const fetchedMedia = await MediaLibrary.getAssetInfoAsync(mediaId as string);
                    if (!fetchedMedia) {
                        throw new Error('Media not found');
                    }

                    setMedia(fetchedMedia);

                    const sortedPoints = [...ride.points].sort((a, b) => a.timestamp - b.timestamp);

                    if (fetchedMedia.mediaType === 'photo') {
                        const mediaTime = new Date(fetchedMedia.creationTime).getTime();
                        const closestPoint = sortedPoints.reduce((closest, point) => {
                            const pointTime = new Date(point.timestamp).getTime() + 8 * 60 * 60 * 1000;
                            const currentDiff = Math.abs(pointTime - mediaTime);
                            const closestDiff = Math.abs(new Date(closest.timestamp).getTime() - mediaTime);
                            return currentDiff < closestDiff ? point : closest;
                        }, sortedPoints[0]);

                        const timeDiff = Math.abs(
                            new Date(closestPoint.timestamp).getTime() + 8 * 60 * 60 * 1000 - mediaTime
                        );
                        const needsManualAlignment = timeDiff > 60 * 1000; // 60 seconds in milliseconds

                        if (needsManualAlignment) {
                            setNeedsManualAlignment(true);
                        } else {
                            setSelectedPoints([closestPoint]);
                            setSelectionMode('point');
                            setZoomLevel(16);
                        }
                    } else if (fetchedMedia.mediaType === 'video' && fetchedMedia.duration) {
                        const mediaStartTime = new Date(fetchedMedia.creationTime).getTime();
                        const durationMS = fetchedMedia.duration * 1000;
                        const mediaEndTime = mediaStartTime + durationMS;

                        const videoSegmentPoints = sortedPoints.filter(point => {
                            const time = new Date(point.timestamp).getTime() + 8 * 60 * 60 * 1000;
                            return time >= mediaStartTime && time <= mediaEndTime;
                        });

                        if (videoSegmentPoints.length >= 2) {
                            setSelectedPoints(videoSegmentPoints);

                            setSelectionMode('segment');
                            setStartPoint([
                                videoSegmentPoints[0].coordinate.longitude,
                                videoSegmentPoints[0].coordinate.latitude,
                            ]);
                            setEndPoint([
                                videoSegmentPoints[videoSegmentPoints.length - 1].coordinate.longitude,
                                videoSegmentPoints[videoSegmentPoints.length - 1].coordinate.latitude,
                            ]);
                            setNeedsManualAlignment(false);
                            setZoomLevel(16);
                        } else {
                            setNeedsManualAlignment(true);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                bottomSheetModalRef.current?.present();
                setLoading(false);
            }
        };

        fetchData();
    }, [rideId, mediaId]);

    useEffect(() => {
        if (selectedPoints.length > 0) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            slideAnim.setValue(50);
        }
    }, [selectedPoints]);

    if (!ride || !media || loading) {
        return (
            <View style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
                <SpinningWheel />
            </View>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{ headerLeft: () => <IconButton icon="chevron-left" onPress={handleCancelAnnotation} /> }}
            />
            <View style={styles.container}>
                <View style={styles.selectionModeContainer}>
                    <Button
                        mode={selectionMode === 'point' ? 'contained' : 'outlined'}
                        onPress={() => {
                            setSelectionMode('point');
                            setStartPoint(null);
                            setEndPoint(null);
                            setSelectedPoints([]);
                        }}
                        icon="map-marker"
                    >
                        Point
                    </Button>
                    <Button
                        mode={selectionMode === 'segment' ? 'contained' : 'outlined'}
                        onPress={() => {
                            setSelectionMode('segment');
                            setSelectedPoints([]);
                        }}
                        icon="vector-polyline"
                    >
                        Segment
                    </Button>
                </View>

                {selectionMode === 'segment' && (!startPoint || !endPoint) && (
                    <View style={styles.selectionPrompt}>
                        <Text style={styles.selectionPromptText}>
                            {!startPoint ? 'Select Start Point' : 'Select End Point'}
                        </Text>
                    </View>
                )}

                <View style={styles.mapContainer}>
                    <Mapbox.MapView
                        style={{ flex: 1 }}
                        styleURL={mapboxStyle}
                        zoomEnabled
                        rotateEnabled
                        compassEnabled
                        onPress={e => {
                            Keyboard.dismiss();
                            if (needsManualAlignment) {
                                handleSelectPoint(e);
                            }
                        }}
                    >
                        <Mapbox.Camera
                            animationDuration={1000}
                            animationMode="none"
                            zoomLevel={zoomLevel}
                            centerCoordinate={
                                selectedPoints.length > 0
                                    ? [selectedPoints[0].coordinate.longitude, selectedPoints[0].coordinate.latitude]
                                    : [ride.points[0].coordinate.longitude, ride.points[0].coordinate.latitude]
                            }
                        />
                        {ride?.points.length > 0 && (
                            <PolygonWhileAnnotating
                                points={ride.points}
                                style={{
                                    lineColor: theme.colors.primary,
                                    lineWidth: 4,
                                    lineOpacity: 0.8,
                                }}
                            />
                        )}

                        {selectedPoints.length > 0 && (
                            <>
                                {selectionMode === 'segment' && (
                                    <PolygonSegment
                                        shapeId="segment-source"
                                        lineId="segment-line"
                                        points={selectedPoints}
                                        style={{
                                            lineColor: theme.colors.tertiary,
                                            lineWidth: 8,
                                            lineOpacity: 1,
                                        }}
                                    />
                                )}
                                {selectionMode === 'segment' && startPoint && (
                                    <Mapbox.PointAnnotation
                                        id="start-point"
                                        coordinate={startPoint}
                                        draggable
                                        onDragEnd={handleDragEnd}
                                        anchor={{ x: 0.5, y: 1 }}
                                    >
                                        <Icon source={'map-marker'} size={sizes.size48} color={theme.colors.tertiary} />
                                    </Mapbox.PointAnnotation>
                                )}
                                {selectionMode === 'segment' && endPoint && (
                                    <Mapbox.PointAnnotation
                                        id="end-point"
                                        coordinate={endPoint}
                                        draggable
                                        onDragEnd={handleDragEnd}
                                        anchor={{ x: 0.5, y: 1 }}
                                    >
                                        <Icon source={'map-marker'} size={sizes.size48} color={theme.colors.tertiary} />
                                    </Mapbox.PointAnnotation>
                                )}
                                {selectionMode === 'point' && (
                                    <Mapbox.PointAnnotation
                                        id="selected-point"
                                        coordinate={[
                                            selectedPoints[0].coordinate.longitude,
                                            selectedPoints[0].coordinate.latitude,
                                        ]}
                                        draggable
                                        onDragEnd={handleDragEnd}
                                        anchor={{ x: 0.5, y: 1 }}
                                    >
                                        <Icon source={'map-marker'} size={sizes.size48} color={theme.colors.tertiary} />
                                    </Mapbox.PointAnnotation>
                                )}
                            </>
                        )}
                    </Mapbox.MapView>
                    <View style={styles.mapControls}>
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

                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                            display:
                                (selectionMode === 'point' && selectedPoints.length > 0) ||
                                (selectionMode === 'segment' && startPoint && endPoint)
                                    ? 'flex'
                                    : 'none',
                        },
                    ]}
                >
                    <ScrollView style={styles.modalSection}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalTitleContainer}>
                                <Text style={styles.modalTitle}>
                                    {media.mediaType === 'video' ? 'Video Annotation' : 'Image Annotation'}
                                </Text>
                                <Button mode="text" onPress={handleAddTags} icon="tag">
                                    Add Tags
                                </Button>
                            </View>
                            <View style={styles.modalAnnotations}>
                                {selectedAnnotations.map((annotation, index) => (
                                    <Chip key={'selected-' + index} mode="flat">
                                        {annotation.name}
                                    </Chip>
                                ))}
                            </View>
                            <Text style={styles.modalSubtitle}>Upload images or videos as annotation.</Text>
                        </View>
                        <Text
                            style={{
                                fontFamily: 'LGEIHeadline-Bold',
                                fontSize: fontSizes.tinyPlus,
                                marginTop: sizes.small,
                            }}
                        >
                            Share Your Thoughts
                        </Text>
                        <Controller
                            control={annotationForm.control}
                            name="sentiment"
                            render={({ field }) => (
                                <TextInput
                                    mode="outlined"
                                    label="How did you feel?"
                                    value={field.value}
                                    onChangeText={field.onChange}
                                    multiline
                                    numberOfLines={3}
                                    style={{
                                        marginBottom: sizes.medium,
                                    }}
                                />
                            )}
                        />
                        {media && (
                            <View style={styles.mediaContainer}>
                                <Image source={{ uri: media.uri }} style={styles.mediaPreview} contentFit="cover" />

                                {media.mediaType === 'video' && (
                                    <View style={styles.mediaPreviewOverlay}>
                                        <Icon
                                            source={media.mediaType === 'video' ? 'video' : 'image'}
                                            size={24}
                                            color={theme.colors.onSurface}
                                        />
                                    </View>
                                )}
                                <Button
                                    mode="outlined"
                                    onPress={handleOpenMediaPickerModal}
                                    icon={media ? 'pencil' : 'file-image-marker'}
                                    style={{ ...styles.modalButton }}
                                    disabled={isSaving}
                                >
                                    {media ? 'Change Media' : 'Add an Image or a Video'}
                                </Button>
                            </View>
                        )}
                        <Button
                            mode="contained-tonal"
                            onPress={handleOpenMediaPickerModal}
                            icon={media ? 'pencil' : 'file-image-marker'}
                            style={{ ...styles.modalButton }}
                            disabled={isSaving}
                        >
                            {media ? 'Change Media' : 'Add an Image or a Video'}
                        </Button>
                        <Button
                            icon="check"
                            mode="contained"
                            onPress={annotationForm.handleSubmit(handleSaveAnnotation)}
                            style={styles.modalButton}
                            disabled={isSaving}
                            loading={isSaving}
                        >
                            Save Annotation
                        </Button>
                    </ScrollView>
                </Animated.View>

                {/* Add Tags Modal */}
                <Portal>
                    <Modal
                        visible={addTagsModalVisible}
                        onDismiss={() => setAddTagsModalVisible(false)}
                        contentContainerStyle={{
                            backgroundColor: theme.colors.surface,
                            margin: sizes.medium,
                            padding: sizes.size28,
                            borderRadius: sizes.medium,
                        }}
                    >
                        <Text style={{ fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.regular }}>
                            Add Annotation
                        </Text>
                        <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.tinyPlus }}>
                            Choose from our predefined annotations or try uploading an image or video.
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
                            {predefinedAnnotations.map((annotation: PredefinedAnnotation, index: number) => (
                                <Chip
                                    key={'predefined-' + index}
                                    mode={selectedAnnotations.includes(annotation) ? 'flat' : 'outlined'}
                                    onPress={() => {
                                        setSelectedAnnotations(prev => {
                                            if (prev.includes(annotation)) {
                                                return prev.filter(a => a.id !== annotation.id);
                                            }
                                            return [...prev, annotation];
                                        });
                                    }}
                                    icon={annotation.icon}
                                >
                                    <Text
                                        style={{
                                            fontFamily: 'LGEIHeadline-Regular',
                                            fontSize: fontSizes.tiny,
                                        }}
                                    >
                                        {annotation.name}
                                    </Text>
                                </Chip>
                            ))}
                        </View>
                    </Modal>
                </Portal>

                {/* Media Picker Modal */}
                <BottomSheetModal
                    ref={mediaPickerModalRef}
                    index={0}
                    snapPoints={['40%', '60%']}
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
                    <BottomSheetView style={styles.mediaPickerContainer}>
                        <View style={styles.mediaPickerHeader}>
                            <Text style={styles.modalTitle}>Select Media</Text>
                            <Button mode="text" onPress={handleCloseMediaPickerModal} icon="close">
                                Cancel
                            </Button>
                        </View>
                        <Divider style={{ marginVertical: sizes.small, marginHorizontal: sizes.small }} />
                        <CustomMediaPicker onSelect={handleMediaSelected} maxItems={30} columns={3} />
                    </BottomSheetView>
                </BottomSheetModal>

                {/* Cancel Dialog */}
                <Portal>
                    <Dialog
                        visible={cancelDialogVisible}
                        onDismiss={() => setCancelDialogVisible(false)}
                        dismissable={false}
                    >
                        <Dialog.Title>Cancel Annotation</Dialog.Title>
                        <Dialog.Content>
                            <Text style={{ fontFamily: 'LGEIHeadline-Regular', fontSize: fontSizes.tiny }}>
                                Are you sure you want to cancel the annotation?
                            </Text>
                            <Text
                                style={{
                                    fontFamily: 'LGEIHeadline-Regular',
                                    fontSize: fontSizes.tiny,
                                    marginTop: sizes.small,
                                }}
                            >
                                Your current annotation will not be saved.
                            </Text>
                        </Dialog.Content>
                        <Dialog.Actions>
                            <Button onPress={() => setCancelDialogVisible(false)}>No</Button>
                            <Button onPress={() => router.dismissTo(`/main/rides/ride/${ride.id}`)}>Yes</Button>
                        </Dialog.Actions>
                    </Dialog>
                </Portal>
            </View>
        </>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        selectionModeContainer: {
            flexDirection: 'row',
            justifyContent: 'center',
            gap: sizes.medium,
            padding: sizes.medium,
            backgroundColor: theme.colors.surface,
        },
        selectionPrompt: {
            backgroundColor: theme.colors.tertiaryContainer,
            padding: sizes.tiny,
            alignItems: 'center',
            justifyContent: 'center',
        },
        selectionPromptText: {
            color: theme.colors.onTertiaryContainer,
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.small,
        },
        mapContainer: {
            flex: 1,
        },
        mapControls: {
            position: 'absolute',
            right: sizes.medium,
            bottom: sizes.medium,
            flexDirection: 'column',
            gap: sizes.small,
        },
        mapFAB: {
            backgroundColor: theme.colors.surface,
        },
        modalContent: {
            maxHeight: height(50),
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        modalSection: {
            padding: sizes.medium,
            marginBottom: sizes.medium,
        },
        modalHeader: {
            width: '100%',
            flexDirection: 'column',
            alignItems: 'flex-start',
            marginBottom: sizes.small,
        },
        modalTitleContainer: {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: sizes.small,
        },
        modalTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.small,
        },
        modalAnnotations: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: sizes.tiny,
            marginBottom: sizes.small,
        },
        modalSubtitle: {
            fontFamily: 'LGEIHeadline-Regular',
            fontSize: fontSizes.tinyPlus,
            marginBottom: sizes.small,
        },
        modalButton: {
            marginBottom: sizes.medium,
        },
        mediaContainer: {
            width: '100%',
            height: 200,
            borderRadius: sizes.medium,
            overflow: 'hidden',
            marginBottom: sizes.medium,
            backgroundColor: theme.colors.surfaceVariant,
        },
        mediaPreview: {
            width: '100%',
            height: '100%',
        },
        mediaPreviewOverlay: {
            position: 'absolute',
            top: sizes.small,
            right: sizes.small,
            backgroundColor: theme.colors.surface,
            padding: sizes.tiny,
            borderRadius: sizes.small,
        },
        mediaPickerHeader: {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: sizes.medium,
        },
        mediaPickerContainer: {
            flex: 1,
        },
        alignmentContainer: {
            marginVertical: sizes.medium,
            padding: sizes.medium,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: sizes.small,
        },
        alignmentText: {
            fontFamily: 'LGEIHeadline-Regular',
            fontSize: fontSizes.small,
            color: theme.colors.onSurfaceVariant,
            marginBottom: sizes.small,
        },
        selectionButtons: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            gap: sizes.small,
        },
    });
