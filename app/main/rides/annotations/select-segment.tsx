import { AddAnnotationSchema } from '@/components/annotations/schemas';
import { CustomMediaPicker } from '@/components/common/CustomMediaPicker';
import SpinningWheel from '@/components/common/SpinningWheel';
import { PolygonSegment, PolygonWhileAnnotating } from '@/components/map/polygon';
import { PredefinedAnnotation, predefinedAnnotations } from '@/lib/common/annotations';
import { saveAnnotation } from '@/lib/firebase-crud/annotations';
import { FetchRideData } from '@/lib/firebase-crud/rides';
import { useRidesStore } from '@/lib/store/useRidesStore';
import { auth } from '@/lib/utils/firebaseConfig';
import { fontSizes, height, sizes } from '@/lib/utils/responsive-sizing';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { zodResolver } from '@hookform/resolvers/zod';
import Mapbox from '@rnmapbox/maps';
import { Position } from '@rnmapbox/maps/lib/typescript/src/types/Position';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { router, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Animated, Keyboard, ScrollView, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Button, Dialog, Divider, FAB, Icon, MD3Theme, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { z } from 'zod';

Mapbox.setAccessToken('pk.eyJ1IjoiYW5kcmVzd2UiLCJhIjoiY203N3Z2ZXZkMTdnajJqcTg0ZGwweDV1YSJ9.8-Muri-txLBOiaKSsCZjWA');

type FeaturePayload = GeoJSON.Feature<
    GeoJSON.Point,
    {
        screenPointX: number;
        screenPointY: number;
    }
>;

export default function SelectSegment() {
    const theme = useTheme();
    const navigation = useNavigation();
    const { rideId, mediaId, annotationId } = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const mapboxStyle =
        colorScheme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';
    const [loading, setLoading] = useState(true);
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);

    const [media, setMedia] = useState<MediaLibrary.AssetInfo | null>(null);
    const [segmentCenter, setSegmentCenter] = useState<[number, number] | null>(null);

    const [startPoint, setStartPoint] = useState<Position | null>(null);
    const [endPoint, setEndPoint] = useState<Position | null>(null);
    const [segmentPoints, setSegmentPoints] = useState<FetchRideData['points']>([]);
    const [selectedAnnotation, setSelectedAnnotation] = useState<PredefinedAnnotation | null>(
        predefinedAnnotations.find(annotation => annotation.id === annotationId) || null
    );

    const [cancelDialogVisible, setCancelDialogVisible] = useState(false);

    const [isSaving, setIsSaving] = useState(false);

    const mediaPickerModalRef = useRef<BottomSheetModal>(null);

    const handleOpenMediaPickerModal = () => {
        mediaPickerModalRef.current?.present();
        setTimeout(() => {
            mediaPickerModalRef.current?.expand();
        }, 400);
    };

    const annotationForm = useForm<z.infer<typeof AddAnnotationSchema>>({
        resolver: zodResolver(AddAnnotationSchema),
        defaultValues: {
            type: 'segment',
            sentiment: '',
        },
    });

    const styles = getStyles(theme);

    const [zoomLevel, setZoomLevel] = useState(13);
    const recenterMap = () => {
        if (segmentCenter) {
            setZoomLevel(prev => (prev >= 13 ? prev - 1 : prev + 1));
        }
    };

    const { addAnnotation, selectRide, updateRideName } = useRidesStore();

    const [ride, setRide] = useState<FetchRideData | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userId = auth.currentUser?.uid;
                if (!userId) {
                    throw new Error('User not authenticated');
                }

                const ride = await selectRide(rideId as string);
                if (!ride) {
                    throw new Error('Ride not found');
                }
                setRide(ride);
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
        if (startPoint && endPoint) {
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
    }, [startPoint, endPoint]);

    if (!ride || loading) {
        return (
            <View style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
                <SpinningWheel />
            </View>
        );
    }

    const handleSelectPoint = (e: GeoJSON.Feature) => {
        if (startPoint && endPoint) {
            return;
        }

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

        if (!startPoint) {
            setStartPoint(coordinates);
        } else {
            setEndPoint(coordinates);
            const segmentPoints = getSegmentPoints(startPoint, coordinates);
            setSegmentPoints(segmentPoints);
        }
    };

    const handleDragEnd = (e: FeaturePayload) => {
        // Find closest point from ride points to dragged coordinates
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

        // Use the closest point's coordinates
        const closestPointCoordinates = [closestPoint.coordinate.longitude, closestPoint.coordinate.latitude];

        if (e.id === 'start-point') {
            setStartPoint(closestPointCoordinates);
        } else if (e.id === 'end-point') {
            setEndPoint(closestPointCoordinates);
        }

        if (e.id === 'start-point') {
            const segmentPoints = getSegmentPoints(closestPointCoordinates, endPoint);
            setSegmentPoints(segmentPoints);
        } else if (e.id === 'end-point') {
            const segmentPoints = getSegmentPoints(startPoint, closestPointCoordinates);
            setSegmentPoints(segmentPoints);
        }
    };

    const handleCancelAnnotation = () => {
        setCancelDialogVisible(true);
    };

    const getSegmentPoints = (start: Position | null = startPoint, end: Position | null = endPoint) => {
        if (!start || !end) return [];
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
        // Get all points between start and end (inclusive)
        return sortedPoints.slice(sliceStart, sliceEnd + 1);
    };

    const handleSaveAnnotation = async (data: z.infer<typeof AddAnnotationSchema>) => {
        if (isSaving || !segmentPoints || segmentPoints.length < 2) return;
        setIsSaving(true);
        try {
            const annotation = await saveAnnotation({
                rideId: ride.id,
                mediaUri: media?.uri,
                mediaType: media?.mediaType,
                points: segmentPoints,
                annotationId: selectedAnnotation?.id || '',
                sentiment: data.sentiment,
                type: 'segment',
            });
            await addAnnotation(annotation);
            bottomSheetModalRef.current?.close();
            router.dismissTo({ pathname: `/main/rides/ride/[id]`, params: { id: ride.id } });
        } catch (error) {
            console.error('Error saving annotation:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerLeft: () => (
                        <TouchableOpacity onPress={handleCancelAnnotation}>
                            <Icon source={'chevron-left'} size={sizes.size28} color={theme.colors.onSurface} />
                        </TouchableOpacity>
                    ),
                }}
            />
            <View style={styles.container}>
                {(!startPoint || !endPoint) && (
                    <View
                        style={{
                            backgroundColor: theme.colors.tertiaryContainer,
                            padding: sizes.tiny,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Text
                            style={{
                                color: theme.colors.onTertiaryContainer,
                                fontFamily: 'LGEIHeadline-Bold',
                                fontSize: fontSizes.small,
                            }}
                        >
                            {!startPoint ? 'Select a Start Point' : 'Select a End Point'}
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
                            handleSelectPoint(e);
                        }}
                    >
                        <Mapbox.Camera
                            animationDuration={1000}
                            animationMode="none"
                            zoomLevel={zoomLevel}
                            centerCoordinate={
                                segmentCenter || [
                                    ride.points[0].coordinate.longitude,
                                    ride.points[0].coordinate.latitude,
                                ]
                            }
                        />
                        {ride?.points.length > 0 && (
                            <PolygonWhileAnnotating
                                points={ride.points}
                                style={{
                                    lineColor: theme.colors.primary,
                                    lineWidth: 3,
                                    lineOpacity: 0.8,
                                }}
                            />
                        )}

                        {segmentPoints.length > 0 && (
                            <PolygonSegment
                                shapeId="segment-source"
                                lineId="segment-line"
                                points={segmentPoints}
                                style={{
                                    lineColor: theme.colors.tertiary,
                                    lineWidth: 4,
                                    lineOpacity: 1,
                                }}
                            />
                        )}
                        {startPoint && (
                            <Mapbox.PointAnnotation
                                id="start-point"
                                coordinate={startPoint}
                                draggable
                                onDragEnd={e => {
                                    handleDragEnd(e);
                                }}
                                anchor={{ x: 0.5, y: 1 }}
                                style={{
                                    zIndex: 1000,
                                }}
                            >
                                <Icon source={'map-marker'} size={sizes.size48} color={theme.colors.tertiary} />
                            </Mapbox.PointAnnotation>
                        )}
                        {endPoint && (
                            <Mapbox.PointAnnotation
                                id="end-point"
                                coordinate={endPoint}
                                draggable
                                onDragEnd={e => {
                                    handleDragEnd(e);
                                }}
                                anchor={{ x: 0.5, y: 1 }}
                                style={{
                                    zIndex: 1000,
                                }}
                            >
                                <Icon source={'map-marker'} size={sizes.size48} color={theme.colors.tertiary} />
                            </Mapbox.PointAnnotation>
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
                            display: startPoint && endPoint ? 'flex' : 'none',
                        },
                    ]}
                >
                    <ScrollView style={styles.modalSection}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalTitleContainer}>
                                <Text style={styles.modalTitle}>{selectedAnnotation?.name}</Text>
                                <Button mode="text" onPress={handleCancelAnnotation} icon="close">
                                    Cancel
                                </Button>
                            </View>
                            <Text style={styles.modalSubtitle}>{selectedAnnotation?.description}</Text>
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
                                        marginTop: sizes.small,
                                        marginBottom: sizes.medium,
                                    }}
                                />
                            )}
                        />
                        {media && (
                            <View style={styles.mediaPreviewContainer}>
                                <Image source={{ uri: media.uri }} style={styles.mediaPreview} contentFit="cover" />
                                <View style={styles.mediaPreviewOverlay}>
                                    <Icon
                                        source={media.mediaType === 'video' ? 'video' : 'image'}
                                        size={24}
                                        color={theme.colors.onSurface}
                                    />
                                </View>
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
                            <Button mode="text" onPress={() => mediaPickerModalRef.current?.dismiss()} icon="close">
                                Cancel
                            </Button>
                        </View>
                        <Divider style={{ marginVertical: sizes.small, marginHorizontal: sizes.small }} />
                        <CustomMediaPicker
                            onSelect={asset => {
                                setMedia(asset);
                                mediaPickerModalRef.current?.dismiss();
                            }}
                            maxItems={30}
                            columns={3}
                        />
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
            flex: 3,
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
        contentContainer: {
            flex: 1,
        },
        modalTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.regular,
        },
        modalSubtitle: {
            fontFamily: 'LGEIHeadline-Regular',
            fontSize: fontSizes.tinyPlus,
            marginBottom: sizes.small,
        },
        modalButton: {
            marginBottom: sizes.medium,
        },
        mediaAnnotationContainer: {
            width: 60,
            height: 60,
            borderRadius: 30,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: theme.colors.primary,
        },
        mediaThumbnail: {
            width: '100%',
            height: '100%',
        },
        mediaIconContainer: {
            position: 'absolute',
            bottom: 4,
            right: 4,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: 4,
            borderRadius: 4,
        },
        segmentControls: {
            position: 'absolute',
            bottom: sizes.large,
            left: sizes.medium,
            right: sizes.medium,
            backgroundColor: theme.colors.surface,
            padding: sizes.medium,
            borderRadius: sizes.medium,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        segmentTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.small,
            marginBottom: sizes.small,
            textAlign: 'center',
        },
        segmentSlider: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: sizes.small,
        },
        segmentFineControls: {
            flexDirection: 'row',
            justifyContent: 'center',
            gap: sizes.medium,
        },
        segmentButton: {
            flex: 1,
            marginHorizontal: sizes.tiny,
        },
        segmentTimeContainer: {
            flex: 2,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: sizes.small,
        },
        segmentTime: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.regular,
            color: theme.colors.primary,
            marginVertical: sizes.tiny,
        },
        segmentTimeLabel: {
            fontFamily: 'LGEIHeadline-Regular',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
        },
        segmentHandle: {
            width: sizes.regular,
            height: sizes.regular,
            borderRadius: sizes.regular,
            backgroundColor: theme.colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        handleIndicator: {
            width: sizes.small,
            height: sizes.small,
            borderRadius: sizes.small,
        },
        modalContent: {
            maxHeight: height(40),
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        modalSection: {
            padding: sizes.medium,
            marginBottom: sizes.small,
        },
        sectionTitle: {
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.regular,
            marginBottom: sizes.medium,
        },
        typeButtons: {
            flexDirection: 'row',
            gap: sizes.medium,
        },
        input: {
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
        mediaPreviewContainer: {
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
    });
