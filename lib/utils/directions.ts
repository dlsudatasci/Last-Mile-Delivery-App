// -----------------------------------------------------------------------------
// Mapbox Geocoding + Directions helpers — used to turn a destination into
// coordinates, then fetch the fastest traffic-aware driving route + ETA from the rider's
// current location. Coordinates are [longitude, latitude] (Mapbox order).
// -----------------------------------------------------------------------------

const MAPBOX_TOKEN =
    'pk.eyJ1IjoibnZyenNhIiwiYSI6ImNtcDl3OGpneDB0amkydXByNTR3bG5uNzEifQ.hgL01z3Qc9KzOrQCKjzbsg';

export type LngLat = [number, number];

export interface RouteResult {
    coordinates: LngLat[]; // route line geometry
    durationSec: number; // ETA in seconds
    mapboxDurationSec: number; // raw traffic-aware ETA returned by Mapbox
    typicalDurationSec?: number; // non-traffic typical duration, when Mapbox returns it
    distanceM: number; // distance in meters
    congestionSegments: RouteCongestionSegment[];
    score: number;
    trafficDelaySec: number;
    restrictedRoadExposure: number;
    congestionSummary: RouteCongestionSummary;
    steps: RouteStep[];
}

export interface RouteStep {
    instruction: string;
    maneuverType: string;
    maneuverModifier?: string;
    location: LngLat;
    distanceM: number;
}

export type RouteCongestionLevel = 'unknown' | 'low' | 'moderate' | 'heavy' | 'severe';

export interface RouteCongestionSegment {
    coordinates: LngLat[];
    congestion: RouteCongestionLevel;
    distanceM: number;
}

export type RouteCongestionSummary = Record<RouteCongestionLevel, { distanceM: number; count: number }>;

export interface RouteScoreBreakdown {
    score: number;
    distanceKm: number;
    trafficDelaySec: number;
    trafficAwareDurationSec: number;
    restrictedRoadExposure: number;
    congestionSummary: RouteCongestionSummary;
}

/** Turn a place name (e.g. "BGC") into coordinates, biased to the rider's area. */
export async function geocode(query: string, proximity?: LngLat): Promise<LngLat | null> {
    if (!query.trim()) return null;
    const prox = proximity ? `&proximity=${proximity[0]},${proximity[1]}` : '';
    const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
        `?country=PH&limit=1${prox}&access_token=${MAPBOX_TOKEN}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const center = data?.features?.[0]?.center;
        return Array.isArray(center) && center.length === 2 ? [center[0], center[1]] : null;
    } catch (error) {
        console.warn('geocode failed:', error);
        return null;
    }
}

// -- Metro Manila autocomplete search ----------------------------------------

/** Bounding box covering all of Metro Manila / NCR. */
const METRO_MANILA_BBOX = '120.8457,14.2700,121.1350,14.7800';

export interface SearchResult {
    /** Short place name (e.g. "SM Megamall") */
    name: string;
    /** Full formatted address returned by Mapbox */
    fullAddress: string;
    /** [longitude, latitude] */
    coordinates: LngLat;
    /** Mapbox feature type, when available */
    featureType?: string;
    /** Source API used for the result. Search Box has better POI/building coverage. */
    source?: 'searchbox' | 'geocoding';
    /** Approximate straight-line distance from the search origin, when available */
    distanceM?: number;
}

export function normalizeSearchText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function getQueryWords(query: string): string[] {
    return Array.from(new Set(normalizeSearchText(query).split(' ').filter(Boolean)));
}

const ROAD_WORDS = new Set([
    'street',
    'st',
    'avenue',
    'ave',
    'road',
    'rd',
    'drive',
    'dr',
    'boulevard',
    'blvd',
    'highway',
    'hwy',
    'lane',
    'ln',
    'extension',
    'ext',
]);

const PLACE_WORDS = new Set([
    'building',
    'tower',
    'towers',
    'residence',
    'residences',
    'condo',
    'condominium',
    'mall',
    'center',
    'centre',
    'restaurant',
    'cafe',
    'hotel',
    'school',
    'hospital',
    'office',
    'campus',
    'establishment',
    'landmark',
    'plaza',
    'condotel',
    'apartments',
    'suites',
]);

const GENERIC_ROAD_PHRASES = /\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|highway|hwy|lane|ln|extension|ext)\b/;

function isRoadLikeResult(result: SearchResult): boolean {
    const name = normalizeSearchText(result.name);
    const words = name.split(' ').filter(Boolean);
    const type = normalizeSearchText(result.featureType ?? '');
    return type === 'address' || type === 'street' || type === 'postcode' || words.some(word => ROAD_WORDS.has(word));
}

function queryLooksPlaceSpecific(query: string): boolean {
    const words = getQueryWords(query);
    return words.some(word => PLACE_WORDS.has(word)) || words.some(word => /^\d+$/.test(word)) || words.length >= 3;
}

function queryLooksRoadSpecific(query: string): boolean {
    return GENERIC_ROAD_PHRASES.test(normalizeSearchText(query));
}

function isNamedPlaceResult(result: SearchResult): boolean {
    const type = normalizeSearchText(result.featureType ?? '');
    const name = normalizeSearchText(result.name);
    return (
        result.source === 'searchbox' ||
        type === 'poi' ||
        type === 'place' ||
        type === 'locality' ||
        getQueryWords(name).some(word => PLACE_WORDS.has(word))
    );
}

function getSearchScore(query: string, result: SearchResult): number {
    const normalizedQuery = normalizeSearchText(query);
    const words = getQueryWords(query);
    const normalizedName = normalizeSearchText(result.name);
    const normalizedAddress = normalizeSearchText(result.fullAddress);
    const combined = `${normalizedName} ${normalizedAddress}`.trim();

    if (!normalizedQuery || words.length === 0) return 0;

    const nameHasAllWords = words.every(word => normalizedName.includes(word));
    const combinedHasAllWords = words.every(word => combined.includes(word));
    const nameHasPhrase = normalizedName.includes(normalizedQuery);
    const addressHasPhrase = normalizedAddress.includes(normalizedQuery);

    let score = 0;
    if (nameHasPhrase) score += 1200;
    if (addressHasPhrase) score += 450;
    if (nameHasAllWords) score += 900;
    else if (combinedHasAllWords) score += 500;

    for (const word of words) {
        if (normalizedName.includes(word)) score += 90;
        else if (normalizedAddress.includes(word)) score += 25;
    }

    if (normalizedName.startsWith(normalizedQuery)) score += 250;
    if (normalizedAddress.startsWith(normalizedQuery)) score += 75;
    if (isNamedPlaceResult(result)) score += 750;
    if (result.source === 'searchbox') score += 350;
    if (result.featureType === 'poi') score += 650;
    if (result.featureType === 'address') score -= 250;
    if (queryLooksPlaceSpecific(query) && isRoadLikeResult(result) && !queryLooksRoadSpecific(query)) score -= 1100;
    if (isRoadLikeResult(result) && !nameHasAllWords && !nameHasPhrase) score -= 500;
    if (result.distanceM !== undefined) score -= Math.min(result.distanceM / 1000, 50);

    return score;
}

export function rankSearchResults(query: string, results: SearchResult[]): SearchResult[] {
    const strict: { result: SearchResult; score: number; index: number }[] = [];
    const fallback: { result: SearchResult; score: number; index: number }[] = [];
    const words = getQueryWords(query);

    results.forEach((result, index) => {
        const normalizedName = normalizeSearchText(result.name);
        const normalizedAddress = normalizeSearchText(result.fullAddress);
        const combined = `${normalizedName} ${normalizedAddress}`.trim();
        const containsAllWords = words.length > 0 && words.every(word => combined.includes(word));
        const item = { result, score: getSearchScore(query, result), index };
        if (containsAllWords) strict.push(item);
        else fallback.push(item);
    });

    const sortByScore = (a: { score: number; index: number }, b: { score: number; index: number }) => b.score - a.score || a.index - b.index;
    const preferred = strict.sort(sortByScore);
    const usefulFallbacks = fallback.sort(sortByScore);

    return (preferred.length > 0 ? [...preferred, ...usefulFallbacks] : usefulFallbacks).map(item => item.result);
}

export function getApproxDistanceM(from: LngLat, to: LngLat): number {
    const earthRadiusM = 6371000;
    const toRad = (degrees: number) => (degrees * Math.PI) / 180;
    const dLat = toRad(to[1] - from[1]);
    const dLng = toRad(to[0] - from[0]);
    const lat1 = toRad(from[1]);
    const lat2 = toRad(to[1]);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * earthRadiusM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toMercatorMeters(point: LngLat): { x: number; y: number } {
    const earthRadiusM = 6371000;
    const latRad = (point[1] * Math.PI) / 180;
    return {
        x: ((point[0] * Math.PI) / 180) * earthRadiusM * Math.cos(latRad),
        y: ((point[1] * Math.PI) / 180) * earthRadiusM,
    };
}

function distanceToSegmentM(point: LngLat, start: LngLat, end: LngLat): number {
    const p = toMercatorMeters(point);
    const a = toMercatorMeters(start);
    const b = toMercatorMeters(end);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) return getApproxDistanceM(point, start);

    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    const projection: LngLat = [
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
    ];
    return getApproxDistanceM(point, projection);
}

export function getDistanceToRouteM(point: LngLat, routeCoordinates: LngLat[]): number {
    if (routeCoordinates.length === 0) return Number.POSITIVE_INFINITY;
    if (routeCoordinates.length === 1) return getApproxDistanceM(point, routeCoordinates[0]);

    let nearest = Number.POSITIVE_INFINITY;
    for (let index = 0; index < routeCoordinates.length - 1; index += 1) {
        nearest = Math.min(nearest, distanceToSegmentM(point, routeCoordinates[index], routeCoordinates[index + 1]));
    }
    return nearest;
}

function getSearchQueryVariants(query: string): string[] {
    const normalized = normalizeSearchText(query);
    const words = normalized.split(' ').filter(Boolean);
    const roadWordIndex = words.findIndex(word => ROAD_WORDS.has(word));
    const variants = [query.trim()];

    if (roadWordIndex > 0) {
        variants.push(words.slice(0, roadWordIndex).join(' '));
    }
    if (words.length > 2) {
        variants.push(words.filter(word => !ROAD_WORDS.has(word)).join(' '));
    }

    return Array.from(new Set(variants.filter(Boolean)));
}

function mapFeatureToSearchResult(feature: any, query: string, proximity?: LngLat): SearchResult | null {
    if (!Array.isArray(feature?.center) || feature.center.length !== 2) return null;
    const coordinates = [feature.center[0], feature.center[1]] as LngLat;
    const placeTypes = Array.isArray(feature.place_type) ? feature.place_type : [];
    return {
        name: feature.text ?? feature.place_name ?? query,
        fullAddress: feature.place_name ?? '',
        coordinates,
        featureType: placeTypes[0],
        source: 'geocoding',
        distanceM: proximity ? getApproxDistanceM(proximity, coordinates) : undefined,
    };
}

function getSearchBoxSessionToken(query: string): string {
    return `lmd-${normalizeSearchText(query).replace(/\s+/g, '-') || 'query'}`;
}

function mapSearchBoxFeatureToSearchResult(feature: any, query: string, proximity?: LngLat): SearchResult | null {
    const coordinates = feature?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
    const props = feature?.properties ?? {};
    const resultCoords = [coordinates[0], coordinates[1]] as LngLat;
    const contextAddress = [props.address, props.place_formatted].filter(Boolean).join(', ');
    return {
        name: props.name ?? props.full_address ?? query,
        fullAddress: props.full_address ?? contextAddress,
        coordinates: resultCoords,
        featureType: props.feature_type ?? props.poi_category?.[0],
        source: 'searchbox',
        distanceM: proximity ? getApproxDistanceM(proximity, resultCoords) : undefined,
    };
}

async function searchBoxPlaces(query: string, proximity?: LngLat): Promise<SearchResult[]> {
    const sessionToken = getSearchBoxSessionToken(query);
    const prox = proximity ? `&proximity=${proximity[0]},${proximity[1]}` : '';
    const url =
        `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(query)}` +
        `&language=en&country=PH&bbox=${METRO_MANILA_BBOX}&types=poi,address,place,locality,neighborhood` +
        `&limit=10${prox}&session_token=${encodeURIComponent(sessionToken)}&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    const suggestions: any[] = data?.suggestions ?? [];
    const retrieved = await Promise.all(
        suggestions
            .filter(suggestion => suggestion?.mapbox_id)
            .map(async suggestion => {
                const retrieveUrl =
                    `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(suggestion.mapbox_id)}` +
                    `?session_token=${encodeURIComponent(sessionToken)}&access_token=${MAPBOX_TOKEN}`;
                const retrieveRes = await fetch(retrieveUrl);
                const retrieveData = await retrieveRes.json();
                const feature = retrieveData?.features?.[0];
                return mapSearchBoxFeatureToSearchResult(feature, query, proximity);
            })
    );

    return retrieved.filter((result): result is SearchResult => result !== null);
}

function dedupeSearchResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
        const key = `${normalizeSearchText(result.name)}|${result.coordinates.map(value => value.toFixed(5)).join(',')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Live autocomplete search for places within Metro Manila.
 * Designed to be called on every keystroke (debounced by the caller).
 */
export async function searchPlaces(query: string, proximity?: LngLat): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    const prox = proximity ? `&proximity=${proximity[0]},${proximity[1]}` : '';
    const typeFilter = 'poi,address,place,locality,neighborhood';
    try {
        const searchBoxResults = await searchBoxPlaces(query, proximity).catch(() => []);
        const featureBatches = await Promise.all(
            getSearchQueryVariants(query).map(async queryVariant => {
                const url =
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(queryVariant)}.json` +
                    `?autocomplete=true&country=PH&bbox=${METRO_MANILA_BBOX}&types=${typeFilter}&limit=10${prox}&access_token=${MAPBOX_TOKEN}`;
                const res = await fetch(url);
                const data = await res.json();
                return (data?.features ?? []).map((feature: any) => mapFeatureToSearchResult(feature, queryVariant, proximity));
            })
        );
        const results = dedupeSearchResults([
            ...searchBoxResults,
            ...featureBatches.flat().filter((result): result is SearchResult => result !== null),
        ]);
        return rankSearchResults(query, results).slice(0, 8);
    } catch (error) {
        console.warn('searchPlaces failed:', error);
        return [];
    }
}

function normalizeCongestion(value: unknown, numericValue?: unknown): RouteCongestionLevel {
    if (value === 'low' || value === 'moderate' || value === 'heavy' || value === 'severe') return value;
    if (typeof numericValue === 'number' && Number.isFinite(numericValue)) {
        if (numericValue >= 80) return 'severe';
        if (numericValue >= 60) return 'heavy';
        if (numericValue >= 30) return 'moderate';
        if (numericValue >= 0) return 'low';
    }
    return 'unknown';
}

export function buildCongestionSegments(route: any): RouteCongestionSegment[] {
    const coordinates = route?.geometry?.coordinates as LngLat[] | undefined;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return [];

    const congestionValues: RouteCongestionLevel[] = [];
    const distanceValues: number[] = [];
    for (const leg of route?.legs ?? []) {
        const legCongestion = leg?.annotation?.congestion ?? [];
        const legCongestionNumeric = leg?.annotation?.congestion_numeric ?? [];
        if (Array.isArray(legCongestion) && legCongestion.length > 0) {
            congestionValues.push(...legCongestion.map((value, index) => normalizeCongestion(value, legCongestionNumeric[index])));
        } else if (Array.isArray(legCongestionNumeric)) {
            congestionValues.push(...legCongestionNumeric.map((value: unknown) => normalizeCongestion(undefined, value)));
        }
        const legDistances = leg?.annotation?.distance ?? [];
        if (Array.isArray(legDistances)) {
            distanceValues.push(...legDistances.map((distance: unknown) => (typeof distance === 'number' && Number.isFinite(distance) ? distance : 0)));
        }
    }

    if (congestionValues.length === 0) return [];

    return coordinates.slice(0, -1).map((coordinate, index) => ({
        coordinates: [coordinate, coordinates[index + 1]],
        congestion: congestionValues[index] ?? 'unknown',
        distanceM: distanceValues[index] || getApproxDistanceM(coordinate, coordinates[index + 1]),
    }));
}

function getTrafficAwareDuration(route: any): number {
    return route?.duration ?? route?.duration_typical ?? Number.POSITIVE_INFINITY;
}

const RESTRICTED_RIDER_ROAD_PATTERN =
    /\b(skyway|slex|south luzon expressway|expressway|tollway|toll road|motorway)\b/i;

function getRouteStepNames(route: any): string[] {
    const names: string[] = [];
    for (const leg of route?.legs ?? []) {
        for (const step of leg?.steps ?? []) {
            const candidates = [
                step?.name,
                step?.ref,
                step?.rotary_name,
                step?.pronunciation,
                step?.bannerInstructions?.map((instruction: any) => instruction?.primary?.text).join(' '),
                step?.voiceInstructions?.map((instruction: any) => instruction?.announcement).join(' '),
            ];
            for (const candidate of candidates) {
                if (typeof candidate === 'string' && candidate.trim()) {
                    names.push(candidate);
                }
            }
        }
    }
    return names;
}

function mapRouteStep(step: any): RouteStep | null {
    const location = step?.maneuver?.location;
    if (!Array.isArray(location) || location.length !== 2) return null;

    const maneuverType = typeof step?.maneuver?.type === 'string' ? step.maneuver.type : 'continue';
    const maneuverModifier = typeof step?.maneuver?.modifier === 'string' ? step.maneuver.modifier : undefined;
    const instruction =
        typeof step?.maneuver?.instruction === 'string' && step.maneuver.instruction.trim()
            ? step.maneuver.instruction
            : typeof step?.name === 'string' && step.name.trim()
              ? `Continue on ${step.name}`
              : 'Continue straight';

    return {
        instruction,
        maneuverType,
        maneuverModifier,
        location: [location[0], location[1]],
        distanceM: typeof step?.distance === 'number' && Number.isFinite(step.distance) ? step.distance : 0,
    };
}

export function buildRouteSteps(route: any): RouteStep[] {
    const steps: RouteStep[] = [];
    for (const leg of route?.legs ?? []) {
        for (const step of leg?.steps ?? []) {
            const routeStep = mapRouteStep(step);
            if (routeStep) steps.push(routeStep);
        }
    }
    return steps;
}

export function getRestrictedRoadExposure(route: any): number {
    let exposure = 0;
    for (const name of getRouteStepNames(route)) {
        if (RESTRICTED_RIDER_ROAD_PATTERN.test(name)) {
            exposure += 1;
        }
    }
    return exposure;
}

function getEmptyCongestionSummary(): RouteCongestionSummary {
    return {
        unknown: { distanceM: 0, count: 0 },
        low: { distanceM: 0, count: 0 },
        moderate: { distanceM: 0, count: 0 },
        heavy: { distanceM: 0, count: 0 },
        severe: { distanceM: 0, count: 0 },
    };
}

export function summarizeRouteCongestion(route: any): RouteCongestionSummary {
    const summary = getEmptyCongestionSummary();
    for (const segment of buildCongestionSegments(route)) {
        summary[segment.congestion].distanceM += segment.distanceM;
        summary[segment.congestion].count += 1;
    }
    return summary;
}

export function getRouteTrafficDelaySec(route: any): number {
    const duration = route?.duration;
    const typicalDuration = route?.duration_typical;
    if (typeof duration === 'number' && typeof typicalDuration === 'number') {
        return Math.max(0, duration - typicalDuration);
    }
    return 0;
}

function getCongestedDistanceM(summary: RouteCongestionSummary): number {
    return summary.moderate.distanceM + summary.heavy.distanceM + summary.severe.distanceM;
}

export function estimateMetroManilaEtaSec(route: any): number {
    const mapboxDurationSec = Math.max(0, getTrafficAwareDuration(route));
    const distanceM = Math.max(0, route?.distance ?? 0);
    if (distanceM === 0 || !Number.isFinite(mapboxDurationSec)) return mapboxDurationSec || 0;

    const summary = summarizeRouteCongestion(route);
    const distanceKm = distanceM / 1000;
    const congestedRatio = Math.min(1, getCongestedDistanceM(summary) / distanceM);
    const severeHeavyRatio = Math.min(1, (summary.heavy.distanceM + summary.severe.distanceM) / distanceM);
    const hour = new Date().getHours();
    const isPeak = (hour >= 6 && hour <= 10) || (hour >= 16 && hour <= 21);
    const hasTrafficAnnotations = Object.values(summary).some(item => item.count > 0);

    let assumedKph = isPeak ? 11 : 15;
    if (congestedRatio >= 0.5) assumedKph -= 2;
    if (severeHeavyRatio >= 0.25) assumedKph -= 2;
    if (!hasTrafficAnnotations && isPeak) assumedKph = 10;

    const urbanFloorSec = (distanceKm / Math.max(8, assumedKph)) * 3600;
    const calibratedSec = Math.max(mapboxDurationSec, urbanFloorSec);

    return Math.round(calibratedSec / 60) * 60;
}

export function scoreRiderRoute(route: any): RouteScoreBreakdown {
    const congestionSummary = summarizeRouteCongestion(route);
    const distanceKm = Math.max(0, (route?.distance ?? 0) / 1000);
    const trafficDelaySec = getRouteTrafficDelaySec(route);
    const trafficAwareDurationSec = getTrafficAwareDuration(route);
    const trafficAwareDurationMinutes = trafficAwareDurationSec / 60;
    const trafficDelayMinutes = trafficDelaySec / 60;
    const restrictedRoadExposure = getRestrictedRoadExposure(route);
    const moderateTrafficKm = congestionSummary.moderate.distanceM / 1000;
    const heavyTrafficKm = congestionSummary.heavy.distanceM / 1000;
    const severeTrafficKm = congestionSummary.severe.distanceM / 1000;

    const score =
        distanceKm * 1.0 +
        trafficAwareDurationMinutes * 0.45 +
        trafficDelayMinutes * 0.35 +
        moderateTrafficKm * 0.35 +
        heavyTrafficKm * 1.4 +
        severeTrafficKm * 2.8 +
        restrictedRoadExposure * 10000;

    return {
        score,
        distanceKm,
        trafficDelaySec,
        trafficAwareDurationSec,
        restrictedRoadExposure,
        congestionSummary,
    };
}

function buildDirectionsUrl(from: LngLat, to: LngLat, includeDepartAt: boolean): string {
    return (
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${from[0]},${from[1]};${to[0]},${to[1]}` +
        `?geometries=geojson&overview=full&alternatives=true&steps=true&annotations=congestion,congestion_numeric,duration,distance&exclude=motorway,toll` +
        `${includeDepartAt ? '&depart_at=now' : ''}&access_token=${MAPBOX_TOKEN}`
    );
}

function shouldRetryWithoutDepartAt(data: any): boolean {
    const message = `${data?.message ?? data?.error ?? data?.code ?? ''}`.toLowerCase();
    return message.includes('depart_at') || message.includes('depart at');
}

export function chooseRiderFriendlyRoute(routes: any[]): any | null {
    return routes
        .filter((candidate: any) => candidate?.geometry?.coordinates)
        .sort((a: any, b: any) => {
            const scoreDelta = scoreRiderRoute(a).score - scoreRiderRoute(b).score;
            if (Math.abs(scoreDelta) > 0.25) return scoreDelta;
            return getTrafficAwareDuration(a) - getTrafficAwareDuration(b);
        })[0] ?? null;
}

/** Fetch the recommended rider route (geometry + ETA + distance) between two points. */
export async function getRoute(from: LngLat, to: LngLat): Promise<RouteResult | null> {
    try {
        const res = await fetch(buildDirectionsUrl(from, to, true));
        let data = await res.json();
        if ((data?.routes ?? []).length === 0 && shouldRetryWithoutDepartAt(data)) {
            const retryRes = await fetch(buildDirectionsUrl(from, to, false));
            data = await retryRes.json();
        }
        const routes: any[] = data?.routes ?? [];
        const route = chooseRiderFriendlyRoute(routes);
        if (!route?.geometry?.coordinates) return null;
        const score = scoreRiderRoute(route);
        const mapboxDurationSec = route.duration ?? route.duration_typical ?? 0;
        return {
            coordinates: route.geometry.coordinates as LngLat[],
            durationSec: estimateMetroManilaEtaSec(route),
            mapboxDurationSec,
            typicalDurationSec: route.duration_typical,
            distanceM: route.distance ?? 0,
            congestionSegments: buildCongestionSegments(route),
            score: score.score,
            trafficDelaySec: score.trafficDelaySec,
            restrictedRoadExposure: score.restrictedRoadExposure,
            congestionSummary: score.congestionSummary,
            steps: buildRouteSteps(route),
        };
    } catch (error) {
        console.warn('getRoute failed:', error);
        return null;
    }
}

/** "28 min" / "1 h 5 min" from a duration in seconds. */
export function formatEta(durationSec: number): string {
    const totalMin = Math.max(1, Math.round(durationSec / 60));
    if (totalMin < 60) return `${totalMin} min`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

/** "12.4 km" from a distance in meters. */
export function formatDistance(distanceM: number): string {
    return `${(distanceM / 1000).toFixed(1)} km`;
}

/** "850 m" / "4.2 km" from a distance in meters for search results. */
export function formatSearchDistance(distanceM?: number): string {
    if (distanceM === undefined || !Number.isFinite(distanceM)) return '';
    if (distanceM < 1000) return `${Math.round(distanceM)} m`;
    return `${(distanceM / 1000).toFixed(1)} km`;
}
