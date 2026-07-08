import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, IconButton, MD3Theme, Text, TextInput, TouchableRipple, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';

const RECENT = ['Makati CBD', 'BGC', 'Ortigas', 'QC Circle'];

export default function Destination() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const [destination, setDestination] = useState('');

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
                    onChangeText={setDestination}
                    placeholder="Search destination"
                    right={<TextInput.Icon icon="magnify" />}
                    style={styles.input}
                    contentStyle={styles.inputText}
                    outlineStyle={{ borderRadius: sizes.small }}
                    activeOutlineColor={TEAL}
                />

                <Text style={[styles.fieldLabel, { marginTop: sizes.large }]}>Recent Destinations</Text>
                <View style={styles.recentCard}>
                    {RECENT.map((place, index) => (
                        <TouchableRipple
                            key={place}
                            onPress={() => setDestination(place)}
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
                    onPress={() => router.push({ pathname: '/main/(tabs)/record/route-preview', params: { destination } })}
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
        footer: { padding: sizes.large },
        button: { borderRadius: sizes.small },
        buttonContent: { height: sizes.size56 },
        buttonLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small },
    });
