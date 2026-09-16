interface PointLike {
    latitude: number;
    longitude: number;
}

const CITY_BOUNDS = [
    { city: 'Manila', minLat: 14.55, maxLat: 14.64, minLng: 120.94, maxLng: 121.03 },
    { city: 'Quezon City', minLat: 14.60, maxLat: 14.78, minLng: 120.97, maxLng: 121.13 },
    { city: 'Makati', minLat: 14.52, maxLat: 14.58, minLng: 120.99, maxLng: 121.05 },
    { city: 'Taguig', minLat: 14.48, maxLat: 14.57, minLng: 121.03, maxLng: 121.10 },
    { city: 'Pasay', minLat: 14.50, maxLat: 14.56, minLng: 120.97, maxLng: 121.02 },
    { city: 'Mandaluyong', minLat: 14.56, maxLat: 14.60, minLng: 121.02, maxLng: 121.06 },
    { city: 'San Juan', minLat: 14.58, maxLat: 14.62, minLng: 121.02, maxLng: 121.05 },
    { city: 'Pasig', minLat: 14.54, maxLat: 14.61, minLng: 121.05, maxLng: 121.12 },
    { city: 'Paranaque', minLat: 14.45, maxLat: 14.53, minLng: 120.97, maxLng: 121.04 },
    { city: 'Muntinlupa', minLat: 14.35, maxLat: 14.46, minLng: 120.98, maxLng: 121.08 },
];

const LANDMARK_CITY_HINTS: [RegExp, string][] = [
    [/2\s*torre\s*lorenzo|torre\s*lorenzo|taft/i, 'Manila'],
    [/zinnia\s*towers?|zinnia/i, 'Quezon City'],
    [/\bbgc\b|bonifacio\s+global\s+city/i, 'Taguig'],
    [/alabang/i, 'Muntinlupa'],
    [/makati/i, 'Makati'],
    [/ortigas/i, 'Pasig'],
    [/quezon\s+city|\bqc\b/i, 'Quezon City'],
    [/manila/i, 'Manila'],
];

export function inferMetroManilaCityFromPoint(point?: PointLike | null) {
    if (!point) return null;
    const match = CITY_BOUNDS.find(
        bounds =>
            point.latitude >= bounds.minLat &&
            point.latitude <= bounds.maxLat &&
            point.longitude >= bounds.minLng &&
            point.longitude <= bounds.maxLng
    );
    return match?.city ?? null;
}

export function inferMetroManilaCityFromText(text?: string | null) {
    if (!text?.trim()) return null;
    return LANDMARK_CITY_HINTS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

export function buildTripRouteTitle(options: {
    origin?: PointLike | null;
    destination?: PointLike | null;
    destinationLabel?: string | null;
}) {
    const originCity = inferMetroManilaCityFromPoint(options.origin);
    const destinationCity =
        inferMetroManilaCityFromText(options.destinationLabel) ??
        inferMetroManilaCityFromPoint(options.destination);

    if (originCity && destinationCity) return `${originCity} → ${destinationCity}`;
    if (destinationCity) return `Metro Manila → ${destinationCity}`;
    if (options.destinationLabel?.trim()) return `Metro Manila → ${options.destinationLabel.trim()}`;
    return 'Metro Manila Trip';
}
