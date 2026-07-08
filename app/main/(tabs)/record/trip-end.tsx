import { INCOMPLETE_QUESTIONS } from '@/lib/review-questions';
import { useRideStore } from '@/lib/store/useRideStore';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, IconButton, MD3Theme, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';
const RED = '#DC2626';
const GREEN = '#16A34A';

type Step = 'ask' | 'questions' | 'arrived-done' | 'incomplete-done';

export default function TripEnd() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const resetRide = useRideStore(s => s.resetRide);

    const [step, setStep] = useState<Step>('ask');
    const [qIndex, setQIndex] = useState(0);
    const [answers, setAnswers] = useState<string[]>(['', '', '']);

    const goToTrips = () => {
        resetRide();
        router.replace('/main/(tabs)/map');
    };

    const select = (value: string) => {
        const next = [...answers];
        next[qIndex] = value;
        setAnswers(next);
    };

    const nextQuestion = () => {
        if (qIndex + 1 < INCOMPLETE_QUESTIONS.length) {
            setQIndex(qIndex + 1);
        } else {
            setStep('incomplete-done');
        }
    };

    const q = INCOMPLETE_QUESTIONS[qIndex];

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            {(step === 'ask' || step === 'questions') && (
                <View style={styles.header}>
                    {step === 'questions' && qIndex > 0 ? (
                        <IconButton icon="chevron-left" size={sizes.size32} onPress={() => setQIndex(qIndex - 1)} />
                    ) : (
                        <View style={{ width: sizes.size48 }} />
                    )}
                    <Text style={styles.headerTitle}>
                        {step === 'ask' ? 'End Trip' : `Question ${qIndex + 1} of ${INCOMPLETE_QUESTIONS.length}`}
                    </Text>
                    <View style={{ width: sizes.size48 }} />
                </View>
            )}

            {/* ASK: did you reach the destination? */}
            {step === 'ask' && (
                <View style={styles.content}>
                    <Text style={styles.askTitle}>Did you reach your destination?</Text>
                    <Text style={styles.askSub}>This confirms whether the trip was completed.</Text>

                    <TouchableRipple style={[styles.choice, styles.choiceArrived]} borderless onPress={() => setStep('arrived-done')}>
                        <View style={styles.choiceRow}>
                            <View style={[styles.choiceIcon, { backgroundColor: '#DCFCE7' }]}>
                                <Icon source="map-marker-check" size={sizes.size32} color={GREEN} />
                            </View>
                            <View style={styles.flex}>
                                <Text style={styles.choiceTitle}>Yes, I arrived</Text>
                                <Text style={styles.choiceDesc}>The trip is valid and will be pending for response.</Text>
                            </View>
                            <Icon source="chevron-right" size={sizes.size28} color="#94A3B8" />
                        </View>
                    </TouchableRipple>

                    <TouchableRipple style={[styles.choice, styles.choiceEnded]} borderless onPress={() => { setQIndex(0); setStep('questions'); }}>
                        <View style={styles.choiceRow}>
                            <View style={[styles.choiceIcon, { backgroundColor: '#FEE2E2' }]}>
                                <Icon source="map-marker-off" size={sizes.size32} color={RED} />
                            </View>
                            <View style={styles.flex}>
                                <Text style={styles.choiceTitle}>No, I ended early</Text>
                                <Text style={styles.choiceDesc}>Trip will be invalid — answer a few questions about why.</Text>
                            </View>
                            <Icon source="chevron-right" size={sizes.size28} color="#94A3B8" />
                        </View>
                    </TouchableRipple>
                </View>
            )}

            {/* INCOMPLETE QUESTIONS */}
            {step === 'questions' && (
                <>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <Text style={styles.questionTitle}>{q.title}</Text>
                        <Text style={styles.questionHint}>(Select one)</Text>
                        {q.options.map(opt => {
                            const active = answers[qIndex] === opt;
                            return (
                                <TouchableRipple key={opt} onPress={() => select(opt)} style={[styles.option, active && styles.optionActive]} borderless>
                                    <View style={styles.optionRow}>
                                        <Icon source={active ? 'radiobox-marked' : 'radiobox-blank'} size={sizes.medium} color={active ? TEAL : '#94A3B8'} />
                                        <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt}</Text>
                                    </View>
                                </TouchableRipple>
                            );
                        })}
                    </ScrollView>
                    <View style={styles.footer}>
                        <PrimaryButton
                            label={qIndex + 1 < INCOMPLETE_QUESTIONS.length ? 'Next' : 'Submit Response'}
                            onPress={nextQuestion}
                            disabled={!answers[qIndex]}
                            theme={theme}
                        />
                    </View>
                </>
            )}

            {/* ARRIVED — success */}
            {step === 'arrived-done' && (
                <View style={styles.doneWrap}>
                    <View style={[styles.doneCircle, { borderColor: GREEN }]}>
                        <Icon source="check" size={sizes.size64} color={GREEN} />
                    </View>
                    <Text style={styles.doneTitle}>Trip complete!</Text>
                    <Text style={styles.doneSub}>
                        You reached your destination, so this trip is valid. It’s now saved and pending for response in Trips.
                    </Text>
                    <PrimaryButton label="View in Trips" onPress={goToTrips} theme={theme} />
                </View>
            )}

            {/* INCOMPLETE — success */}
            {step === 'incomplete-done' && (
                <View style={styles.doneWrap}>
                    <View style={[styles.doneCircle, { borderColor: RED }]}>
                        <Icon source="clipboard-check-outline" size={sizes.size64} color={RED} />
                    </View>
                    <Text style={styles.doneTitle}>Trip marked invalid</Text>
                    <Text style={styles.doneSub}>
                        Because the destination wasn’t reached, this trip is automatically invalid and won’t count for the
                        study. Your answers were saved for the research record.
                    </Text>
                    <PrimaryButton label="View in Trips" onPress={goToTrips} theme={theme} />
                </View>
            )}
        </SafeAreaView>
    );
}

function PrimaryButton({ label, onPress, disabled, theme }: { label: string; onPress: () => void; disabled?: boolean; theme: MD3Theme }) {
    const styles = getStyles(theme);
    return (
        <Button
            mode="contained"
            buttonColor={TEAL}
            textColor="#ffffff"
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            disabled={disabled}
            onPress={onPress}
        >
            {label}
        </Button>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.colors.background },
        flex: { flex: 1 },
        header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sizes.small },
        headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.regular, color: theme.colors.onBackground },
        content: { padding: sizes.large, paddingTop: sizes.medium, flexGrow: 1 },
        askTitle: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.subtitle, color: theme.colors.onSurface, marginTop: sizes.medium },
        askSub: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant, marginTop: sizes.small, marginBottom: sizes.large },
        choice: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            borderWidth: 1.5,
            padding: sizes.medium,
            marginBottom: sizes.medium,
        },
        choiceArrived: { borderColor: '#86EFAC' },
        choiceEnded: { borderColor: '#FCA5A5' },
        choiceRow: { flexDirection: 'row', alignItems: 'center', gap: sizes.medium },
        choiceIcon: { width: sizes.size56, height: sizes.size56, borderRadius: sizes.size56 / 2, alignItems: 'center', justifyContent: 'center' },
        choiceTitle: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.small, color: theme.colors.onSurface },
        choiceDesc: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant, marginTop: 2 },
        questionTitle: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.regular, color: theme.colors.onSurface, textAlign: 'center', marginTop: sizes.small },
        questionHint: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: sizes.medium },
        option: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            marginBottom: sizes.small,
        },
        optionActive: { borderColor: TEAL, backgroundColor: theme.colors.primaryContainer },
        optionRow: { flexDirection: 'row', alignItems: 'center', gap: sizes.regular, padding: sizes.medium },
        optionText: { flex: 1, fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurface },
        optionTextActive: { fontFamily: 'LGEIText-SemiBold' },
        doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: sizes.large },
        doneCircle: { width: sizes.size112, height: sizes.size112, borderRadius: sizes.size112 / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: sizes.large },
        doneTitle: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.subtitle, color: theme.colors.onSurface, textAlign: 'center' },
        doneSub: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: sizes.small, marginBottom: sizes.large },
        footer: { padding: sizes.large },
        button: { borderRadius: sizes.small, alignSelf: 'stretch' },
        buttonContent: { height: sizes.size56 },
        buttonLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small },
    });
