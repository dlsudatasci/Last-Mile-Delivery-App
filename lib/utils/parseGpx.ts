import * as FileSystem from 'expo-file-system';
import { XMLParser } from 'fast-xml-parser';
import { RideData } from '../firebase-crud/rides';
import { RidePoint } from '../store/useRideStore';

export interface ParsedGpx {
    rideName: string;
    startTime: string;
    endTime: string;
    ridePoints: RidePoint[];
}

interface CoordinateTime {
    latitude: number;
    longitude: number;
    elevation?: number;
    timestamp: Date;
}

const haversineDistance = (
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number }
): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (start.latitude * Math.PI) / 180;
    const φ2 = (end.latitude * Math.PI) / 180;
    const Δφ = ((end.latitude - start.latitude) * Math.PI) / 180;
    const Δλ = ((end.longitude - start.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
};

const calculateDistance = (coordinates: CoordinateTime[]) => {
    if (coordinates.length < 2) return 0;
    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
        const start = {
            latitude: coordinates[i - 1].latitude,
            longitude: coordinates[i - 1].longitude,
        };
        const end = {
            latitude: coordinates[i].latitude,
            longitude: coordinates[i].longitude,
        };
        totalDistance += haversineDistance(start, end);
    }
    return totalDistance;
};

export const parseGpx = async (gpxUrl: string): Promise<RideData> => {
    try {
        const gpxContent = await FileSystem.readAsStringAsync(gpxUrl);
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
        });

        const result = parser.parse(gpxContent);
        const trackSegment = result.gpx.trk.trkseg.trkpt;

        if (!trackSegment) {
            throw new Error('No track points found.');
        }

        // Extract coordinates with timestamps
        const extractedCoordinates: CoordinateTime[] = trackSegment.map((pt: any) => ({
            latitude: parseFloat(pt['@_lat']),
            longitude: parseFloat(pt['@_lon']),
            elevation: pt.ele ? parseFloat(pt.ele) : undefined,
            timestamp: new Date(pt.time),
        }));

        // Get metadata
        const rideName = result.gpx.trk.name || 'Unnamed Track';
        const startTime = extractedCoordinates[0]?.timestamp.toISOString() || new Date().toISOString();
        const endTime = extractedCoordinates[extractedCoordinates.length - 1]?.timestamp.toISOString() || startTime;

        // Calculate duration with gap threshold
        const gapThreshold = 10 * 60 * 1000; // 10 minutes in milliseconds
        let duration = 0;
        for (let i = 1; i < extractedCoordinates.length; i++) {
            const timeDiff =
                extractedCoordinates[i].timestamp.getTime() - extractedCoordinates[i - 1].timestamp.getTime();
            if (timeDiff <= gapThreshold) {
                duration += timeDiff;
            }
        }
        duration = duration / 1000; // Convert to seconds

        // Calculate distance and speed
        let distance = 0;
        let maxSpeed = 0;
        const MAX_REASONABLE_SPEED = 70; // Maximum reasonable speed in km/h for a cyclist
        const MIN_TIME_DIFF = 1; // Minimum time difference in seconds to consider for speed calculation

        for (let i = 1; i < extractedCoordinates.length; i++) {
            const segmentDistance = haversineDistance(
                { latitude: extractedCoordinates[i - 1].latitude, longitude: extractedCoordinates[i - 1].longitude },
                { latitude: extractedCoordinates[i].latitude, longitude: extractedCoordinates[i].longitude }
            );

            const timeDiff =
                (extractedCoordinates[i].timestamp.getTime() - extractedCoordinates[i - 1].timestamp.getTime()) / 1000; // in seconds

            // Only add to distance if points are reasonably close in time (less than 10 minutes)
            if (timeDiff <= 600) {
                distance += segmentDistance;

                const speed = segmentDistance / 1000 / (timeDiff / 3600); // km/h
                // Only update maxSpeed if it's within reasonable limits
                if (speed <= MAX_REASONABLE_SPEED) {
                    maxSpeed = Math.max(maxSpeed, speed);
                }
            }
        }

        // Calculate elevation gain
        let elevationGain = 0;
        let previousElevation = extractedCoordinates[0]?.elevation;
        for (const point of extractedCoordinates) {
            if (
                previousElevation !== undefined &&
                point.elevation !== undefined &&
                point.elevation > previousElevation
            ) {
                elevationGain += point.elevation - previousElevation;
            }
            previousElevation = point.elevation;
        }

        // Calculate average speed
        const averageSpeed = distance > 0 ? distance / 1000 / (duration / 3600) : 0; // km/h

        // Convert coordinates to RidePoint format
        const ridePoints: RidePoint[] = extractedCoordinates.map(point => ({
            coordinate: {
                latitude: point.latitude,
                longitude: point.longitude,
            },
            timestamp: point.timestamp.getTime(),
            elevation: point.elevation,
        }));

        return {
            rideName,
            startTime: new Date(startTime).getTime(),
            endTime: new Date(endTime).getTime(),
            duration,
            points: ridePoints,
            distance,
            averageSpeed,
            maxSpeed,
            elevationGain,
            isPublic: false,
            annotations: [],
        };
    } catch (error) {
        console.error('Error parsing GPX:', error);
        throw new Error('Failed to parse GPX file');
    }
};
