import VideoMediaView from '@/components/video/VideoMediaView';
import { getPredefinedAnnotation } from '@/lib/common/annotations';
import { Annotation } from '@/lib/firebase-crud/annotations';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, IconButton, Modal, Portal, Text, useTheme } from 'react-native-paper';

interface AnnotationDetailsDialogProps {
    visible: boolean;
    onDismiss: () => void;
    annotations: Annotation[];
}

export const AnnotationDetailsDialog = ({ visible, onDismiss, annotations }: AnnotationDetailsDialogProps) => {
    const theme = useTheme();

    const [currentIndex, setCurrentIndex] = useState(0);

    if (!annotations || annotations.length === 0) return null;

    const currentAnnotation = annotations[currentIndex];
    const predefinedAnnotation = getPredefinedAnnotation(currentAnnotation.annotationId);

    const handlePrevious = () => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : annotations.length - 1));
    };

    const handleNext = () => {
        setCurrentIndex(prev => (prev < annotations.length - 1 ? prev + 1 : 0));
    };

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}
            >
                {annotations.length > 1 && (
                    <View style={styles.navigationButtons}>
                        <IconButton icon="chevron-left" size={sizes.medium} onPress={handlePrevious} />
                        <Text style={[styles.pageIndicator, { color: theme.colors.onSurface }]}>
                            {currentIndex + 1} / {annotations.length}
                        </Text>
                        <IconButton icon="chevron-right" size={sizes.medium} onPress={handleNext} />
                    </View>
                )}
                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        <Icon
                            source={predefinedAnnotation?.icon || 'map-marker'}
                            size={sizes.large}
                            color={predefinedAnnotation?.color || theme.colors.primary}
                        />
                        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                            {predefinedAnnotation?.name || 'Annotation'}
                        </Text>
                    </View>
                    <View style={styles.headerActions}>
                        <IconButton icon="close" size={sizes.medium} onPress={onDismiss} />
                    </View>
                </View>

                <View style={styles.content}>
                    {currentAnnotation.mediaUri && (
                        <View style={styles.mediaContainer}>
                            {currentAnnotation.mediaType === 'video' ? (
                                <VideoMediaView source={currentAnnotation.mediaUri} style={styles.media} />
                            ) : (
                                <Image
                                    source={{ uri: currentAnnotation.mediaUri }}
                                    style={styles.media}
                                    resizeMode="cover"
                                />
                            )}
                        </View>
                    )}

                    <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                            <Icon source="information" size={sizes.medium} color={theme.colors.primary} />
                            <Text style={[styles.description, { color: theme.colors.onSurface }]}>
                                {predefinedAnnotation?.description}
                            </Text>
                        </View>

                        {currentAnnotation.sentiment && (
                            <View style={styles.detailRow}>
                                <Icon source="text" size={sizes.medium} color={theme.colors.primary} />
                                <View style={styles.sentimentContainer}>
                                    <Text
                                        style={[
                                            {
                                                fontFamily: 'LGEIHeadline-Bold',
                                                fontSize: fontSizes.tiny,
                                                color: theme.colors.onSurface,
                                            },
                                        ]}
                                    >
                                        Cyclist's thoughts
                                    </Text>
                                    <Text style={[styles.sentiment, { color: theme.colors.onSurface }]}>
                                        {currentAnnotation.sentiment}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {currentAnnotation.autoGeneratedAnnotations &&
                            currentAnnotation.autoGeneratedAnnotations.length > 0 && (
                                <View style={styles.detailRow}>
                                    <Icon source="robot" size={sizes.medium} color={theme.colors.primary} />
                                    <View style={styles.autoAnnotationsContainer}>
                                        <Text style={[styles.autoAnnotationsTitle, { color: theme.colors.onSurface }]}>
                                            Auto-Generated Annotations
                                        </Text>
                                        <ScrollView
                                            style={styles.autoAnnotationsList}
                                            showsVerticalScrollIndicator={false}
                                        >
                                            {currentAnnotation.autoGeneratedAnnotations
                                                .filter(annotation => annotation.accepted)
                                                .map((annotation, index) => (
                                                    <View
                                                        key={annotation.id}
                                                        style={[
                                                            styles.autoAnnotationItem,
                                                            {
                                                                backgroundColor: theme.colors.surfaceVariant,
                                                                padding: sizes.small,
                                                                borderRadius: sizes.small,
                                                            },
                                                        ]}
                                                    >
                                                        <View style={styles.autoAnnotationContent}>
                                                            <Text
                                                                style={[
                                                                    styles.autoAnnotationText,
                                                                    { color: theme.colors.onSurface },
                                                                ]}
                                                            >
                                                                {
                                                                    getPredefinedAnnotation(
                                                                        annotation.inferredAnnotation
                                                                    )?.name
                                                                }
                                                            </Text>
                                                            <Text
                                                                style={[
                                                                    styles.autoAnnotationTime,
                                                                    { color: theme.colors.onSurfaceVariant },
                                                                ]}
                                                            >
                                                                {annotation.startTime} - {annotation.endTime}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            )}

                        <View style={styles.detailRow}>
                            <Icon
                                source={currentAnnotation.type === 'point' ? 'map-marker' : 'vector-polyline'}
                                size={sizes.medium}
                                color={theme.colors.primary}
                            />
                            <Text style={[styles.type, { color: theme.colors.onSurface }]}>
                                {currentAnnotation.type === 'point' ? 'Point Annotation' : 'Segment Annotation'}
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    container: {
        margin: sizes.medium,
        borderRadius: sizes.medium,
        padding: sizes.medium,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: sizes.medium,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: sizes.small,
    },
    navigationButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pageIndicator: {
        fontFamily: 'LGEIHeadline-Regular',
        fontSize: fontSizes.tiny,
        marginHorizontal: sizes.tiny,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: sizes.small,
    },
    title: {
        fontFamily: 'LGEIHeadline-Bold',
        fontSize: fontSizes.medium,
    },
    content: {
        gap: sizes.medium,
    },
    mediaContainer: {
        width: '100%',
        height: 200,
        borderRadius: sizes.small,
        overflow: 'hidden',
    },
    media: {
        width: '100%',
        height: '100%',
    },
    detailsContainer: {
        gap: sizes.small,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: sizes.small,
    },
    description: {
        flex: 1,
        fontFamily: 'LGEIHeadline-Regular',
        fontSize: fontSizes.tinyPlus,
    },
    sentiment: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.tinyPlus,
        borderWidth: 1,
        borderRadius: sizes.small,
        padding: sizes.small,
        fontStyle: 'italic',
    },
    type: {
        fontFamily: 'LGEIHeadline-Regular',
        fontSize: fontSizes.tinyPlus,
    },
    sentimentContainer: {
        flexDirection: 'column',
        gap: sizes.small,
    },
    autoAnnotationsContainer: {
        flexDirection: 'column',
        gap: sizes.small,
    },
    autoAnnotationsTitle: {
        fontFamily: 'LGEIHeadline-Bold',
        fontSize: fontSizes.tiny,
    },
    autoAnnotationsList: {
        maxHeight: 100,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: sizes.small,
    },
    autoAnnotationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: sizes.small,
        marginBottom: sizes.small,
    },
    autoAnnotationText: {
        fontFamily: 'LGEIHeadline-Regular',
        fontSize: fontSizes.tiny,
    },
    autoAnnotationTime: {
        fontFamily: 'LGEIHeadline-Regular',
        fontSize: fontSizes.tiny,
    },
    autoAnnotationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: sizes.small,
    },
});
