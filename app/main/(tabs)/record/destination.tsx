import HeaderBackButton from '@/components/common/HeaderBackButton';
import { formatSearchDistance, LngLat, SearchResult, searchPlaces } from '@/lib/utils/directions';
import { getRecentDestinations, RecentDestination, saveRecentDestination } from '@/lib/local-db/recentDestinations';
import { auth } from '@/lib/utils/firebaseConfig';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, MD3Theme, Text, TextInput, TouchableRipple, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Destination() {
    const theme = useTheme();
    const styles = getStyles(theme);

    const [destination, setDestination] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [recentDestinations, setRecentDestinations] = useState<RecentDestination[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [userLocation, setUserLocation] = useState<LngLat | null>(null);

    // Debounce timer ref
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Grab the rider's current location on mount for proximity bias
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                setUserLocation([pos.coords.longitude, pos.coords.latitude]);
            } catch (e) {
                console.warn('Could not get user location for search bias:', e);
            }
        })();
    }, []);

    const loadRecentDestinations = useCallback(async () => {
        const userId = auth.currentUser?.uid;
        const recents = await getRecentDestinations(userId);
        setRecentDestinations(recents);
    }, []);

    useEffect(() => {
        void loadRecentDestinations();
    }, [loadRecentDestinations]);

    const runSearch = useCallback(
        async (query: string) => {
            if (!query.trim()) {
                setResults([]);
                setHasSearched(false);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            try {
                const places = await searchPlaces(query, userLocation ?? undefined);
                setResults(places);
            } catch {
                setResults([]);
            } finally {
                setIsSearching(false);
                setHasSearched(true);
            }
        },
        [userLocation]
    );

    const triggerSearch = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        Keyboard.dismiss();
        setTimeout(() => {
            void runSearch(destination);
        }, 80);
    }, [destination, runSearch]);

    // Debounced search — fires 300ms after the user stops typing
    const handleTextChange = useCallback(
        (text: string) => {
            setDestination(text);

            if (debounceRef.current) clearTimeout(debounceRef.current);

            if (!text.trim()) {
                setResults([]);
                setHasSearched(false);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            debounceRef.current = setTimeout(async () => {
                await runSearch(text);
            }, 300);
        },
        [runSearch]
    );

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const navigateToRoutePreview = useCallback((name: string, coordinates: LngLat) => {
        router.push({
            pathname: '/main/(tabs)/record/route-preview',
            params: {
                destination: name,
                destLng: String(coordinates[0]),
                destLat: String(coordinates[1]),
            },
        });
    }, []);

    const selectResult = async (result: SearchResult) => {
        Keyboard.dismiss();
        setDestination(result.name);
        setResults([]);
        setHasSearched(false);
        const recents = await saveRecentDestination(result, auth.currentUser?.uid);
        setRecentDestinations(recents);
        navigateToRoutePreview(result.name, result.coordinates);
    };

    const selectRecent = (recent: RecentDestination) => {
        Keyboard.dismiss();
        setDestination(recent.name);
        setResults([]);
        setHasSearched(false);
        navigateToRoutePreview(recent.name, recent.coordinates);
    };

    const hasRecentDestinations = recentDestinations.length > 0;

    const getRecentAddress = (recent: RecentDestination) => recent.fullAddress || `${recent.coordinates[1].toFixed(5)}, ${recent.coordinates[0].toFixed(5)}`;

    // Show search results when actively searching, otherwise show recents
    const showResults = destination.trim().length > 0 && (results.length > 0 || isSearching || hasSearched);

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <HeaderBackButton onPress={() => router.back()} />
                <Text style={styles.headerTitle}>New Trip</Text>
                <View style={{ width: sizes.size48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.fieldLabel}>Current Location</Text>
                <TextInput
                    mode="outlined"
                    value="Using current location"
                    editable={false}
                    left={<TextInput.Icon icon="crosshairs-gps" />}
                    style={styles.input}
                    contentStyle={styles.inputText}
                    outlineStyle={{ borderRadius: sizes.small }}
                />

                <Text style={[styles.fieldLabel, { marginTop: sizes.medium }]}>Destination</Text>
                <TextInput
                    mode="outlined"
                    value={destination}
                    onChangeText={handleTextChange}
                    placeholder="Search places in Metro Manila"
                    right={<TextInput.Icon icon="magnify" color={theme.colors.primary} onPress={triggerSearch} forceTextInputFocus={false} />}
                    style={styles.input}
                    contentStyle={styles.inputText}
                    outlineStyle={{ borderRadius: sizes.small }}
                    activeOutlineColor={theme.colors.primary}
                />

                {/* Search results */}
                {showResults && (
                    <>
                        <Text style={[styles.fieldLabel, { marginTop: sizes.medium }]}>
                            {isSearching ? 'Searching…' : 'Search Results'}
                        </Text>

                        {isSearching && (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            </View>
                        )}

                        {!isSearching && results.length > 0 && (
                            <View style={styles.recentCard}>
                                {results.map((result, index) => (
                                    <TouchableRipple
                                        key={`${result.coordinates[0]}-${result.coordinates[1]}-${index}`}
                                        onPress={() => selectResult(result)}
                                        style={[styles.recentRow, index < results.length - 1 && styles.recentRowBorder]}
                                        borderless
                                    >
                                        <View style={styles.resultInner}>
                                            <Icon source="map-marker" size={sizes.medium} color={theme.colors.primary} />
                                            <View style={styles.resultTextWrap}>
                                                <Text style={styles.resultName} numberOfLines={1}>
                                                    {result.name}
                                                </Text>
                                                <Text style={styles.resultAddress} numberOfLines={1}>
                                                    {result.fullAddress}
                                                </Text>
                                            </View>
                                            {result.distanceM !== undefined && (
                                                <Text style={styles.resultDistance}>{formatSearchDistance(result.distanceM)}</Text>
                                            )}
                                        </View>
                                    </TouchableRipple>
                                ))}
                            </View>
                        )}

                        {!isSearching && hasSearched && results.length === 0 && (
                            <View style={styles.emptyWrap}>
                                <Icon source="map-search-outline" size={sizes.size32} color={theme.colors.onSurfaceVariant} />
                                <Text style={styles.emptyText}>No places found in Metro Manila</Text>
                            </View>
                        )}
                    </>
                )}

                {/* Recent destinations — shown when NOT actively searching */}
                {!showResults && hasRecentDestinations && (
                    <>
                        <Text style={[styles.fieldLabel, { marginTop: sizes.large }]}>Recent Destinations</Text>
                        <View style={styles.recentCard}>
                            {recentDestinations.map((recent, index) => (
                                <TouchableRipple
                                    key={`${recent.name}-${recent.coordinates[0]}-${recent.coordinates[1]}`}
                                    onPress={() => selectRecent(recent)}
                                    style={[styles.recentRow, index < recentDestinations.length - 1 && styles.recentRowBorder]}
                                    borderless
                                >
                                    <View style={styles.recentInner}>
                                        <Icon source="map-marker-outline" size={sizes.medium} color={theme.colors.onSurfaceVariant} />
                                        <View style={styles.resultTextWrap}>
                                            <Text style={styles.recentText} numberOfLines={1}>
                                                {recent.name}
                                            </Text>
                                            <Text style={styles.resultAddress} numberOfLines={1}>
                                                {getRecentAddress(recent)}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableRipple>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.colors.background },
        header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sizes.small, backgroundColor: theme.colors.background },
        headerTitle: {
            flex: 1,
            textAlign: 'center',
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.regular,
            color: theme.colors.onBackground,
        },
        content: { padding: sizes.large, paddingTop: sizes.small },
        fieldLabel: {
            fontFamily: 'LGEIText-SemiBold',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurface,
            marginBottom: sizes.tiny,
        },
        input: { backgroundColor: theme.colors.surface },
        inputText: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus },
        recentCard: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
        },
        recentRow: { paddingHorizontal: sizes.medium },
        recentRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant ?? '#E2E8F0' },
        recentInner: { flexDirection: 'row', alignItems: 'center', gap: sizes.regular, paddingVertical: sizes.regular },
        recentText: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurface },
        resultInner: { flexDirection: 'row', alignItems: 'center', gap: sizes.regular, paddingVertical: sizes.small },
        resultTextWrap: { flex: 1 },
        resultName: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurface },
        resultAddress: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant, marginTop: 2 },
        resultDistance: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant },
        loadingRow: { alignItems: 'center', paddingVertical: sizes.large },
        emptyWrap: { alignItems: 'center', gap: sizes.small, paddingVertical: sizes.large },
        emptyText: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant },
    });
