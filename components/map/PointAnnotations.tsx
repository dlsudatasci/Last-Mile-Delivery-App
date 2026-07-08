import { RideReport } from '@/lib/store/useRideStore';
import { sizes } from '@/lib/utils/responsive-sizing';
import Mapbox, { PointAnnotation } from '@rnmapbox/maps';
import React, { useRef, useState } from 'react';
import { StyleSheet, TextStyle, TouchableOpacity, View } from 'react-native';
import { Icon, MD3Theme, Modal, Portal, Text, useTheme } from 'react-native-paper';

const ANNOTATION_SIZE = sizes.size48;

const getStyles = (theme: MD3Theme) => {
    return StyleSheet.create({
        annotationContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: sizes.size160,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.primary,
            height: ANNOTATION_SIZE,
            width: ANNOTATION_SIZE,
        },
        annotation: {
            backgroundColor: theme.colors.tertiaryContainer,
            borderRadius: sizes.size160,
        },
        modalContainer: {
            margin: sizes.medium,
            padding: sizes.medium,
            borderRadius: sizes.medium,
            backgroundColor: theme.colors.surface,
        },
        modalTitle: {
            fontSize: sizes.medium,
            fontWeight: '700',
            marginBottom: sizes.small,
        } as TextStyle,
        modalContent: {
            marginBottom: sizes.medium,
        },
        modalText: {
            marginBottom: sizes.small,
        },
        modalMedia: {
            marginTop: sizes.small,
            alignItems: 'center',
        },
    });
};

interface AnnotationWithRemoteImageProps extends RideReport {
    title: string;
}

const AnnotationContent = ({ title }: { title: string }) => {
    const theme = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.annotationContainer}>
            <TouchableOpacity style={styles.annotation}>
                <Icon source={'map-marker'} size={sizes.size32} color={theme.colors.tertiary} />
            </TouchableOpacity>
        </View>
    );
};

const AnnotationWithRemoteImage = ({
    id,
    title,
    location,
    type,
    description,
    timestamp,
    media,
}: AnnotationWithRemoteImageProps) => {
    const theme = useTheme();
    const styles = getStyles(theme);
    const pointAnnotation = useRef<PointAnnotation>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const handlePress = () => {
        setModalVisible(true);
    };

    return (
        <>
            <Mapbox.PointAnnotation
                id={id}
                coordinate={[location.longitude, location.latitude]}
                title={title}
                onSelected={handlePress}
                ref={pointAnnotation}
                // anchor={{ x: 0.5, y: 0.5 }}
            >
                <AnnotationContent title={title} />
            </Mapbox.PointAnnotation>

            <Portal>
                <Modal
                    visible={modalVisible}
                    onDismiss={() => setModalVisible(false)}
                    contentContainerStyle={styles.modalContainer}
                >
                    <Text style={styles.modalTitle}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalText}>{description}</Text>
                        <Text style={styles.modalText}>Reported on: {new Date(timestamp).toLocaleString()}</Text>
                        {media && (
                            <View style={styles.modalMedia}>
                                <Icon
                                    source={media.type === 'image' ? 'image' : 'video'}
                                    size={sizes.large}
                                    color={theme.colors.primary}
                                />
                                <Text style={styles.modalText}>
                                    {media.type === 'image' ? 'Image' : 'Video'} attached
                                </Text>
                            </View>
                        )}
                    </View>
                </Modal>
            </Portal>
        </>
    );
};

export const ShowPointAnnotation = ({ reports }: { reports: RideReport[] }) => {
    const renderAnnotations = () => {
        const items = [];

        for (let i = 0; i < reports.length; i++) {
            const coordinate = reports[i].location;

            const title = `Lon: ${coordinate.longitude} Lat: ${coordinate.latitude}`;
            const id = `pointAnnotation${i}`;

            items.push(
                null,
                <AnnotationWithRemoteImage
                    key={id}
                    id={id}
                    title={title}
                    location={coordinate}
                    type={reports[i].type}
                    description={reports[i].description}
                    timestamp={reports[i].timestamp}
                    media={reports[i].media}
                />
            );
        }

        return items;
    };

    return <>{renderAnnotations()}</>;
};
