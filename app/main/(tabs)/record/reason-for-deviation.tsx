import React, { useState } from 'react';
import { Image, ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Button, Checkbox, MD3Theme, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';

const reasons = [
    'Heavy traffic',
    'Accident',
    'Road construction',
    'Flooded road',
    'Narrow/ one-way',
    'Easier parking',
    'Better pick-up / drop-off access',
    'Familiar shortcut',
    'Avoid known bottleneck',
    'Wrong turn',
    'GPS/navigation issue',
    'Personal stop (bathroom, fuel, etc)',
    'Safety concern',
    'Others (please specify)',
];

export default function ReasonForDeviation() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { rideId, deviationIndex, deviationCount } = useLocalSearchParams<{
        rideId?: string;
        deviationIndex?: string;
        deviationCount?: string;
    }>();
    const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
    const [otherText, setOtherText] = useState('');
    const currentDeviationIndex = Number(deviationIndex || 0);
    const totalDeviationCount = Math.max(1, Number(deviationCount || 1));

    const toggleReason = (reason: string) => {
        setSelectedReasons(prev =>
            prev.includes(reason) ? prev.filter(item => item !== reason) : [...prev, reason]
        );
    };

    const otherSelected = selectedReasons.includes('Others (please specify)');
    const normalizedReasons = selectedReasons.map(reason =>
        reason === 'Others (please specify)' ? `Other: ${otherText.trim()}` : reason
    );
    const canContinue = !!rideId && selectedReasons.length > 0 && (!otherSelected || !!otherText.trim());

    const handleNext = () => {
        if (!rideId || !canContinue) return;

        router.push(
            `/main/(tabs)/record/smart-follow-up-questions?rideId=${encodeURIComponent(
                rideId
            )}&deviationIndex=${currentDeviationIndex}&deviationCount=${totalDeviationCount}&reasons=${encodeURIComponent(
                JSON.stringify(normalizedReasons)
            )}`
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
            <Stack.Screen
                options={{
                    title: 'Reason for Deviation',
                    headerLeft: () => <Button onPress={() => router.back()}>Back</Button>,
                }}
            />
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}> 
                <Text style={styles.title}>Reason for Deviation</Text>
                <Text style={styles.counter}>
                    Deviation {currentDeviationIndex + 1} of {totalDeviationCount}
                </Text>
                <Image source={require('@/assets/images/devia.png')} style={styles.deviationImage} />
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                    {reasons.map(reason => (
                        <TouchableOpacity key={reason} style={styles.optionRow} onPress={() => toggleReason(reason)}>
                            <Checkbox
                                status={selectedReasons.includes(reason) ? 'checked' : 'unchecked'}
                                onPress={() => toggleReason(reason)}
                            />
                            <Text style={styles.optionText}>{reason}</Text>
                        </TouchableOpacity>
                    ))}
                    {otherSelected && (
                        <TextInput
                            label="Please describe"
                            value={otherText}
                            onChangeText={setOtherText}
                            mode="outlined"
                            style={styles.otherInput}
                        />
                    )}
                </ScrollView>
                <View style={styles.actionsRow}>
                    <Button mode="outlined" onPress={() => router.back()} style={styles.navButton}>
                        Back
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleNext}
                        style={styles.navButton}
                        disabled={!canContinue}
                    >
                        Next
                    </Button>
                </View>
            </Surface>
        </View>
    );
}

const getStyles = (theme?: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        card: {
            margin: sizes.large,
            padding: sizes.large,
            borderRadius: sizes.large,
            flex: 1,
        },
        title: {
            fontSize: fontSizes.regular,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.tiny,
        },
        counter: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-SemiBold',
            marginBottom: sizes.small,
        },
        deviationImage: {
            width: '100%',
            height: 150,
            borderRadius: sizes.small,
            marginBottom: sizes.medium,
            resizeMode: 'cover',
        },
        scroll: {
            flex: 1,
        },
        scrollContent: {
            gap: sizes.small,
        },
        optionRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: sizes.small,
            marginBottom: sizes.small,
        },
        optionText: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIText-Regular',
        },
        otherInput: {
            marginTop: sizes.small,
        },
        actionsRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: sizes.large,
        },
        navButton: {
            minWidth: 120,
        },
    });
