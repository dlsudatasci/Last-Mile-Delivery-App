import { LngLat, SearchResult, searchPlaces } from '@/lib/utils/directions';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, IconButton, MD3Theme, Text, TextInput, TouchableRipple, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';

const RECENT = ['Makati CBD', 'BGC', 'Ortigas', 'QC Circle'];

export default function Destination() {
    const theme = useTheme();
    const styles = getStyles(theme);

    const [destination, setDestination] = useState('');
    const [selectedCoords, setSelectedCoords] = useState<LngLat | null>(null);
    const [results, setResults] = useState<SearchResult[]>([]);
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

    // Debounced search — fires 300ms after the user stops typing
    const handleTextChange = useCallback(
        (text: string) => {
            setDestination(text);
            // Clear previously selected coordinates when the user edits the text
            setSelectedCoords(null);

            if (debounceRef.current) clearTimeout(debounceRef.current);

            if (!text.trim()) {
                setResults([]);
                setHasSearched(false);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            debounceRef.current = setTimeout(async () => {
                try {
                    const places = await searchPlaces(text, userLocation ?? undefined);
                    setResults(places);
                } catch {
                    setResults([]);
                } finally {
                    setIsSearching(false);
                    setHasSearched(true);
                }
            }, 300);
        },
        [userLocation]
    );

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const selectResult = (result: SearchResult) => {
        setDestination(result.name);
        setSelectedCoords(result.coordinates);
        setResults([]);
        setHasSearched(false);
    };

    const selectRecent = (place: string) => {
        setDestination(place);
        setSelectedCoords(null); // Will geocode in route-preview
        setResults([]);
        setHasSearched(false);
    };

    const handleGenerateRoute = () => {
        const params: Record<string, string> = { destination };
        if (selectedCoords) {
            params.destLng = String(selectedCoords[0]);
            params.destLat = String(selectedCoords[1]);
        }
        router.push({ pathname: '/main/(tabs)/record/route-preview', params });
    };

    // Show search results when actively searching, otherwise show recents
    const showResults = destination.trim().length > 0 && (results.length > 0 || isSearching || hasSearched);

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <IconButton icon="chevron-left" size={sizes.size32} onPress={() => router.back()} />
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
                    right={
                        destination.trim() ? (
                            <TextInput.Icon
                                icon="close"
                                onPress={() => {
                                    setDestination('');
                                    setSelectedCoords(null);
                                    setResults([]);
                                    setHasSearched(false);
                                }}
                            />
                        ) : (
                            <TextInput.Icon icon="magnify" />
                        )
                    }
                    style={styles.input}
                    contentStyle={styles.inputText}
                    outlineStyle={{ borderRadius: sizes.small }}
                    activeOutlineColor={TEAL}
                />

                {/* Search results */}
                {showResults && (
                    <>
                        <Text style={[styles.fieldLabel, { marginTop: sizes.medium }]}>
                            {isSearching ? 'Searching…' : 'Search Results'}
                        </Text>

                        {isSearching && (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color={TEAL} />
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
                                            <Icon source="map-marker" size={sizes.medium} color={TEAL} />
                                            <View style={styles.resultTextWrap}>
                                                <Text style={styles.resultName} numberOfLines={1}>
                                                    {result.name}
                                                </Text>
                                                <Text style={styles.resultAddress} numberOfLines={1}>
                                                    {result.fullAddress}
                                                </Text>
                                            </View>
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
                {!showResults && (
                    <>
                        <Text style={[styles.fieldLabel, { marginTop: sizes.large }]}>Recent Destinations</Text>
                        <View style={styles.recentCard}>
                            {RECENT.map((place, index) => (
                                <TouchableRipple
                                    key={place}
                                    onPress={() => selectRecent(place)}
                                    style={[styles.recentRow, index < RECENT.length - 1 && styles.recentRowBorder]}
                                    borderless
                                >
                                    <View style={styles.recentInner}>
                                        <Icon source="map-marker-outline" size={sizes.medium} color={theme.colors.onSurfaceVariant} />
                                        <Text style={styles.recentText}>{place}</Text>
                                    </View>
                                </TouchableRipple>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    mode="contained"
                    buttonColor={TEAL}
                    textColor="#ffffff"
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                    disabled={!destination.trim()}
                    onPress={handleGenerateRoute}
                >
                    Generate Route
                </Button>
            </View>
        </SafeAreaView>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.colors.background },
        header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sizes.small },
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
        loadingRow: { alignItems: 'center', paddingVertical: sizes.large },
        emptyWrap: { alignItems: 'center', gap: sizes.small, paddingVertical: sizes.large },
        emptyText: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant },
        footer: { padding: sizes.large },
        button: { borderRadius: sizes.small },
        buttonContent: { height: sizes.size56 },
        buttonLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small },
    });
