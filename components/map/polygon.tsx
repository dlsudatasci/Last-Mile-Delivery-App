import { getPredefinedAnnotation } from '@/lib/common/annotations';
import { Annotation } from '@/lib/firebase-crud/annotations';
import { RidePoint } from '@/lib/store/useRideStore';
import { CircleLayer, LineLayer, LineLayerStyle, ShapeSource } from '@rnmapbox/maps';
import React, { useMemo } from 'react';
import { useTheme } from 'react-native-paper';

type Feature<T extends GeoJSON.Geometry = GeoJSON.Geometry> = GeoJSON.Feature<T>;
type FeatureCollection = GeoJSON.FeatureCollection;
type LineString = GeoJSON.LineString;
type Point = GeoJSON.Point;

interface PolygonProps {
    shapeId?: string;
    lineId?: string;
    startPointId?: string;
    endPointId?: string;
    annotations?: Annotation[];
    points: RidePoint[];
    style: LineLayerStyle;
    onPress?: (event: any) => void;
    filterAnnotationIds?: string[];
    onAnnotationPress?: (annotations: Annotation[]) => void;
    showEndpointMarkers?: boolean;
}

export const Polygon = ({
    shapeId = 'route-source',
    lineId = 'route-line',
    startPointId = 'start-point',
    endPointId = 'end-point',
    annotations,
    points,
    style,
    onPress,
    filterAnnotationIds,
    onAnnotationPress,
    showEndpointMarkers = true,
}: PolygonProps) => {
    const lineLayerStyle = style;
    const theme = useTheme();
    const features = useMemo<FeatureCollection | null>(() => {
        if (!points || points.length < 2) {
            return null;
        }

        // Sort points by timestamp and ensure valid coordinates
        const validPoints = points
            .sort((a, b) => a.timestamp - b.timestamp)
            .filter(
                point =>
                    point.coordinate.latitude != null &&
                    point.coordinate.longitude != null &&
                    !isNaN(point.coordinate.latitude) &&
                    !isNaN(point.coordinate.longitude)
            );

        if (validPoints.length < 2) {
            return null;
        }

        const coordinates = validPoints.map(point => [
            parseFloat(point.coordinate.longitude.toFixed(6)),
            parseFloat(point.coordinate.latitude.toFixed(6)),
        ]);

        const lineFeature: Feature<LineString> = {
            type: 'Feature',
            id: lineId,
            geometry: {
                type: 'LineString',
                coordinates,
            },
            properties: {},
        };

        const startPoint: Feature<Point> = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coordinates[0],
            },
            properties: { type: 'start' },
        };

        const endPoint: Feature<Point> = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coordinates[coordinates.length - 1],
            },
            properties: { type: 'end' },
        };

        const annotationFeatures = annotations
            ?.filter(annotation => !filterAnnotationIds || filterAnnotationIds.includes(annotation.annotationId))
            .map(annotation => {
                const validPoints = annotation.points.filter(
                    point =>
                        point.coordinate.latitude != null &&
                        point.coordinate.longitude != null &&
                        !isNaN(point.coordinate.latitude) &&
                        !isNaN(point.coordinate.longitude)
                );

                const coordinates = validPoints.map(point => [
                    parseFloat(point.coordinate.longitude.toFixed(6)),
                    parseFloat(point.coordinate.latitude.toFixed(6)),
                ]);

                const predefinedAnnotation = getPredefinedAnnotation(annotation.annotationId);
                const color = predefinedAnnotation?.color || theme.colors.primary;

                if (annotation.type === 'point') {
                    return {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: coordinates[0],
                        },
                        properties: {
                            type: 'point-annotation',
                            id: annotation.id,
                            color: color,
                            icon: predefinedAnnotation?.icon || 'map-marker',
                            annotation: annotation,
                        },
                    } as Feature<Point>;
                } else {
                    // For segment annotations, create three features: the line and its start/end points
                    const features: (Feature<LineString> | Feature<Point>)[] = [
                        {
                            type: 'Feature',
                            geometry: {
                                type: 'LineString',
                                coordinates,
                            },
                            properties: {
                                type: 'segment-annotation',
                                id: annotation.id,
                                color: color,
                                annotation: annotation,
                            },
                        } as Feature<LineString>,
                        {
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: coordinates[0],
                            },
                            properties: {
                                type: 'segment-start',
                                id: `${annotation.id}-start`,
                                color: color,
                                annotation: annotation,
                            },
                        } as Feature<Point>,
                        {
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: coordinates[coordinates.length - 1],
                            },
                            properties: {
                                type: 'segment-end',
                                id: `${annotation.id}-end`,
                                color: color,
                                annotation: annotation,
                            },
                        } as Feature<Point>,
                    ];
                    return features;
                }
            })
            .flat();

        if (annotationFeatures) {
            return {
                type: 'FeatureCollection',
                features: [lineFeature, startPoint, endPoint].concat(
                    annotationFeatures as (Feature<LineString> | Feature<Point>)[]
                ),
            };
        }

        return {
            type: 'FeatureCollection',
            features: [lineFeature, startPoint, endPoint],
        };
    }, [points, annotations, filterAnnotationIds, theme.colors.primary]);

    if (!features) {
        return null;
    }

    const handlePress = (event: any) => {
        const features = event.features;

        if (!features || features.length === 0) {
            // Trigger fallback press if nothing was tapped
            console.log('no features');
            onPress?.(event);
            return;
        }

        if (features && features.length > 0) {
            // Create a Map to store unique annotations by ID
            const uniqueAnnotationsMap = new Map<string, Annotation>();

            features.forEach((feature: any) => {
                const annotation = feature.properties?.annotation;
                if (annotation && !uniqueAnnotationsMap.has(annotation.id)) {
                    uniqueAnnotationsMap.set(annotation.id, annotation);
                }
            });

            const uniqueAnnotations = Array.from(uniqueAnnotationsMap.values());
            if (uniqueAnnotations.length > 0) {
                onAnnotationPress?.(uniqueAnnotations);
            } else {
                console.log('no annotations');
                onPress?.(event);
            }
        }
    };

    return (
        <ShapeSource id={shapeId} shape={features} onPress={handlePress}>
            <LineLayer id={lineId} style={lineLayerStyle} />
            <CircleLayer
                id={startPointId}
                filter={['==', ['get', 'type'], 'start']}
                style={{
                    circleRadius: showEndpointMarkers ? 8 : 0,
                    circleOpacity: showEndpointMarkers ? 1 : 0,
                    circleColor: '#1CAF50',
                    circleStrokeWidth: showEndpointMarkers ? 2 : 0,
                    circleStrokeColor: '#ffffff',
                }}
            />
            <CircleLayer
                id={endPointId}
                filter={['==', ['get', 'type'], 'end']}
                style={{
                    circleRadius: showEndpointMarkers ? 8 : 0,
                    circleOpacity: showEndpointMarkers ? 1 : 0,
                    circleColor: '#cd5c5c',
                    circleStrokeWidth: showEndpointMarkers ? 2 : 0,
                    circleStrokeColor: '#ffffff',
                }}
            />
            <LineLayer
                id="segment-annotations"
                filter={['==', ['get', 'type'], 'segment-annotation']}
                style={{
                    lineColor: ['get', 'color'],
                    lineWidth: 5,
                    lineOpacity: 0.8,
                    lineJoin: 'round',
                    lineCap: 'round',
                }}
            />
            <CircleLayer
                id="segment-start-points"
                filter={['==', ['get', 'type'], 'segment-start']}
                style={{
                    circleRadius: 6,
                    circleColor: ['get', 'color'],
                    circleStrokeWidth: 2,
                    circleStrokeColor: '#ffffff',
                }}
            />
            <CircleLayer
                id="segment-end-points"
                filter={['==', ['get', 'type'], 'segment-end']}
                style={{
                    circleRadius: 6,
                    circleColor: ['get', 'color'],
                    circleStrokeWidth: 2,
                    circleStrokeColor: '#ffffff',
                }}
            />
            <CircleLayer
                id="point-annotations"
                filter={['==', ['get', 'type'], 'point-annotation']}
                style={{
                    circleRadius: 8,
                    circleColor: ['get', 'color'],
                    circleStrokeWidth: 2,
                    circleStrokeColor: '#ffffff',
                }}
            />
        </ShapeSource>
    );
};

export const PolygonWhileAnnotating = ({
    shapeId = 'route-source',
    lineId = 'route-line',
    startPointId = 'start-point',
    endPointId = 'end-point',
    points,
    style,
}: PolygonProps) => {
    const lineLayerStyle = style;
    const theme = useTheme();
    const features = useMemo<FeatureCollection | null>(() => {
        if (!points || points.length < 2) {
            return null;
        }

        // Sort points by timestamp and ensure valid coordinates
        const validPoints = points
            .sort((a, b) => a.timestamp - b.timestamp)
            .filter(
                point =>
                    point.coordinate.latitude != null &&
                    point.coordinate.longitude != null &&
                    !isNaN(point.coordinate.latitude) &&
                    !isNaN(point.coordinate.longitude)
            );

        if (validPoints.length < 2) {
            return null;
        }

        const coordinates = validPoints.map(point => [
            parseFloat(point.coordinate.longitude.toFixed(6)),
            parseFloat(point.coordinate.latitude.toFixed(6)),
        ]);

        const lineFeature: Feature<LineString> = {
            type: 'Feature',
            id: lineId,
            geometry: {
                type: 'LineString',
                coordinates,
            },
            properties: {},
        };

        const startPoint: Feature<Point> = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coordinates[0],
            },
            properties: { type: 'start' },
        };

        const endPoint: Feature<Point> = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coordinates[coordinates.length - 1],
            },
            properties: { type: 'end' },
        };

        return {
            type: 'FeatureCollection',
            features: [lineFeature, startPoint, endPoint],
        };
    }, [points, theme.colors.primary]);

    if (!features) {
        return null;
    }

    return (
        <ShapeSource id={shapeId} shape={features}>
            <LineLayer id={lineId} style={lineLayerStyle} />
            <CircleLayer
                id={startPointId}
                filter={['==', ['get', 'type'], 'start']}
                style={{
                    circleRadius: 8,
                    circleColor: '#1CAF50',
                    circleStrokeWidth: 2,
                    circleStrokeColor: '#ffffff',
                }}
            />
            <CircleLayer
                id={endPointId}
                filter={['==', ['get', 'type'], 'end']}
                style={{
                    circleRadius: 8,
                    circleColor: '#cd5c5c',
                    circleStrokeWidth: 2,
                    circleStrokeColor: '#ffffff',
                }}
            />
            {/* Segment Annotations */}
            <LineLayer
                id="segment-annotations"
                filter={['==', ['get', 'type'], 'segment-annotation']}
                style={{
                    lineColor: ['get', 'color'],
                    lineWidth: 5,
                    lineOpacity: 0.8,
                    lineJoin: 'round',
                    lineCap: 'round',
                }}
            />
            {/* Segment Start Points */}
            <CircleLayer
                id="segment-start-points"
                filter={['==', ['get', 'type'], 'segment-start']}
                style={{
                    circleRadius: 6,
                    circleColor: ['get', 'color'],
                    circleStrokeWidth: 2,
                    circleStrokeColor: '#ffffff',
                }}
            />
            {/* Segment End Points */}
            <CircleLayer
                id="segment-end-points"
                filter={['==', ['get', 'type'], 'segment-end']}
                style={{
                    circleRadius: 6,
                    circleColor: ['get', 'color'],
                    circleStrokeWidth: 2,
                    circleStrokeColor: '#ffffff',
                }}
            />
            {/* Point Annotations */}
            <CircleLayer
                id="point-annotations"
                filter={['==', ['get', 'type'], 'point-annotation']}
                style={{
                    circleRadius: 8,
                    circleColor: ['get', 'color'],
                    circleStrokeWidth: 2,
                    circleStrokeColor: '#ffffff',
                }}
            />
        </ShapeSource>
    );
};

export const PolygonRecording = ({
    shapeId = 'route-source',
    lineId = 'route-line',
    startPointId = 'start-point',
    endPointId = 'end-point',
    annotations,
    points,
    style,
    onPress,
}: {
    shapeId?: string;
    lineId?: string;
    startPointId?: string;
    endPointId?: string;
    annotations?: Annotation[];
    points: RidePoint[];
    style: LineLayerStyle;
    onPress?: () => void;
}) => {
    const lineLayerStyle = style;
    const theme = useTheme();
    const features = useMemo<FeatureCollection | null>(() => {
        if (!points || points.length < 2) {
            return null;
        }

        // Sort points by timestamp and ensure valid coordinates
        const validPoints = points
            .sort((a, b) => a.timestamp - b.timestamp)
            .filter(
                point =>
                    point.coordinate.latitude != null &&
                    point.coordinate.longitude != null &&
                    !isNaN(point.coordinate.latitude) &&
                    !isNaN(point.coordinate.longitude)
            );

        if (validPoints.length < 2) {
            return null;
        }

        const coordinates = validPoints.map(point => [
            parseFloat(point.coordinate.longitude.toFixed(6)),
            parseFloat(point.coordinate.latitude.toFixed(6)),
        ]);

        const lineFeature: Feature<LineString> = {
            type: 'Feature',
            id: lineId,
            geometry: {
                type: 'LineString',
                coordinates,
            },
            properties: {},
        };

        const startPoint: Feature<Point> = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coordinates[0],
            },
            properties: { type: 'start' },
        };

        const endPoint: Feature<Point> = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coordinates[coordinates.length - 1],
            },
            properties: { type: 'end' },
        };

        const annotationFeatures = annotations?.map(annotation => {
            const validPoints = annotation.points.filter(
                point =>
                    point.coordinate.latitude != null &&
                    point.coordinate.longitude != null &&
                    !isNaN(point.coordinate.latitude) &&
                    !isNaN(point.coordinate.longitude)
            );

            const coordinates = validPoints.map(point => [
                parseFloat(point.coordinate.longitude.toFixed(6)),
                parseFloat(point.coordinate.latitude.toFixed(6)),
            ]);
            if (annotation.type === 'point') {
                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: coordinates[0],
                    },
                    properties: { type: 'point-annotation', id: annotation.id },
                } as Feature<Point>;
            } else {
                return {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates,
                    },
                    properties: { type: 'segment-annotation', id: annotation.id },
                } as Feature<LineString>;
            }
        });

        if (annotationFeatures) {
            return {
                type: 'FeatureCollection',
                features: [lineFeature, startPoint, endPoint].concat(annotationFeatures),
            };
        }

        return {
            type: 'FeatureCollection',
            features: [lineFeature, startPoint, endPoint],
        };
    }, [points, annotations]);

    if (!features) {
        return null;
    }

    return (
        <ShapeSource id={shapeId} shape={features} onPress={onPress}>
            <LineLayer id={lineId} style={lineLayerStyle} />
            <CircleLayer
                id={startPointId}
                filter={['==', ['get', 'type'], 'start']}
                style={{
                    circleRadius: 8,
                    circleColor: theme.colors.primary,
                    circleStrokeWidth: 2,
                    circleStrokeColor: '#ffffff',
                }}
            />
            <CircleLayer
                id={endPointId}
                filter={['==', ['get', 'type'], 'end']}
                style={{
                    circleRadius: 8,
                    circleColor: theme.colors.primary,
                    circleStrokeWidth: 2,
                    circleStrokeColor: '#ffffff',
                }}
            />
        </ShapeSource>
    );
};

export const PolygonSegment = ({
    shapeId = 'route-source',
    lineId = 'route-line',
    points,
    style,
    onPress,
}: {
    shapeId?: string;
    lineId?: string;
    points: RidePoint[];
    style: LineLayerStyle;
    onPress?: () => void;
}) => {
    const lineLayerStyle = style;

    const features = useMemo<FeatureCollection | null>(() => {
        if (!points || points.length < 2) {
            return null;
        }

        // Sort points by timestamp and ensure valid coordinates
        const validPoints = points
            .sort((a, b) => a.timestamp - b.timestamp)
            .filter(
                point =>
                    point.coordinate.latitude != null &&
                    point.coordinate.longitude != null &&
                    !isNaN(point.coordinate.latitude) &&
                    !isNaN(point.coordinate.longitude)
            );

        if (validPoints.length < 2) {
            return null;
        }

        const coordinates = validPoints.map(point => [
            parseFloat(point.coordinate.longitude.toFixed(6)),
            parseFloat(point.coordinate.latitude.toFixed(6)),
        ]);

        const lineFeature: Feature<LineString> = {
            type: 'Feature',
            id: lineId,
            geometry: {
                type: 'LineString',
                coordinates,
            },
            properties: {},
        };

        const startPoint: Feature<Point> = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coordinates[0],
            },
            properties: { type: 'start' },
        };

        const endPoint: Feature<Point> = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coordinates[coordinates.length - 1],
            },
            properties: { type: 'end' },
        };

        return {
            type: 'FeatureCollection',
            features: [lineFeature, startPoint, endPoint],
        };
    }, [points]);

    if (!features) {
        return null;
    }

    return (
        <ShapeSource id={shapeId} shape={features} onPress={onPress}>
            <LineLayer id={lineId} style={lineLayerStyle} />
        </ShapeSource>
    );
};

export const PolygonSegmentWithPoints = ({
    shapeId = 'route-source',
    lineId = 'route-line',
    startPointId = 'start-point',
    endPointId = 'end-point',
    points,
    style,
    onPress,
}: {
    shapeId?: string;
    lineId?: string;
    startPointId?: string;
    endPointId?: string;
    points: RidePoint[];
    style: LineLayerStyle;
    onPress?: () => void;
}) => {
    const lineLayerStyle = style;

    const features = useMemo<FeatureCollection | null>(() => {
        if (!points || points.length < 2) {
            return null;
        }

        // Sort points by timestamp and ensure valid coordinates
        const validPoints = points
            .sort((a, b) => a.timestamp - b.timestamp)
            .filter(
                point =>
                    point.coordinate.latitude != null &&
                    point.coordinate.longitude != null &&
                    !isNaN(point.coordinate.latitude) &&
                    !isNaN(point.coordinate.longitude)
            );

        if (validPoints.length < 2) {
            return null;
        }

        const coordinates = validPoints.map(point => [
            parseFloat(point.coordinate.longitude.toFixed(6)),
            parseFloat(point.coordinate.latitude.toFixed(6)),
        ]);

        const lineFeature: Feature<LineString> = {
            type: 'Feature',
            id: lineId,
            geometry: {
                type: 'LineString',
                coordinates,
            },
            properties: {},
        };

        const startPoint: Feature<Point> = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coordinates[0],
            },
            properties: { type: 'start' },
        };

        const endPoint: Feature<Point> = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coordinates[coordinates.length - 1],
            },
            properties: { type: 'end' },
        };

        return {
            type: 'FeatureCollection',
            features: [lineFeature, startPoint, endPoint],
        };
    }, [points]);

    if (!features) {
        return null;
    }

    return (
        <ShapeSource id={shapeId} shape={features} onPress={onPress}>
            <LineLayer
                id={lineId}
                style={{
                    ...lineLayerStyle,
                    lineJoin: 'round',
                    lineCap: 'round',
                }}
            />
            <CircleLayer
                id={startPointId}
                filter={['==', ['get', 'type'], 'start']}
                style={{
                    circleRadius: 6,
                    circleColor: lineLayerStyle.lineColor,
                    circleStrokeWidth: 2,
                    circleStrokeColor: '#ffffff',
                }}
            />
            <CircleLayer
                id={endPointId}
                filter={['==', ['get', 'type'], 'end']}
                style={{
                    circleRadius: 6,
                    circleColor: lineLayerStyle.lineColor,
                    circleStrokeWidth: 2,
                    circleStrokeColor: '#ffffff',
                }}
            />
        </ShapeSource>
    );
};
