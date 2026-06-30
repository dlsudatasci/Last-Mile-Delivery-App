import { getTripById } from '@/lib/mock/trips';
import { INCOMPLETE_QUESTIONS } from '@/lib/review-questions';
import { useTripReviews } from '@/lib/store/useTripReviews';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, IconButton, MD3Theme, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';
const RED = '#DC2626';

// Questions for trips that DID deviate.
const Q1 = {
    title: 'Bakit ka pumili ng ibang ruta?',
    options: ['Matinding trapiko', 'Saradong kalsada', 'May aksidente', 'Pamilyar na ruta', 'Mas maikling ruta', 'Iba pa'],
};
const Q2 = {
    title: 'Paano nakaapekto ang pagbabago ng ruta sa iyong biyahe?',
    options: ['Nakatipid sa oras', 'Nakaikli ng distansya', 'Mas maluwag na trapiko', 'Walang malaking pagkakaiba', 'Mas humaba ang biyahe', 'Iba pa'],
};
const Q3 = {
    title: 'Gaano ka kasigurado sa desisyong ito?',
    options: ['Sobrang sigurado', 'Sigurado', 'Neutral', 'Hindi sigurado', 'Talagang hindi sigurado'],
};

// Questions for trips that did NOT deviate (followed the optimal route).
const RQ1 = {
    title: 'Naging angkop ba ang iminungkahing ruta para sa biyaheng ito?',
    options: ['Oo, ito ang pinakamagandang ruta', 'Halos angkop', 'Okay naman', 'Hindi ideal, pero sinunod ko', 'Iba pa'],
};
const RQ2 = {
    title: 'Bakit hindi ka pumili ng ibang ruta?',
    options: [
        'Pinakamabilis na ang iminungkahing ruta',
        'Pamilyar ako sa rutang ito',
        'Maluwag ang trapiko / walang balakid',
        'Walang mas magandang alternatibo',
        'Gusto kong sundin ang ruta ng pag-aaral',
        'Iba pa',
    ],
};
const RQ3 = {
    title: 'Kumusta ang kabuuang karanasan mo sa ruta?',
    options: ['Napakahusay', 'Maganda', 'Neutral', 'Mahina', 'Napakahina'],
};

type Step = 'overview' | 'screenshot' | 'q1' | 'q2' | 'q3' | 'rq1' | 'rq2' | 'rq3' | 'iq' | 'done';

export default function ReviewDeviations() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { id } = useLocalSearchParams<{ id?: string }>();
    const trip = getTripById(id ?? '');
    const { saveDeviation, saveRouteFeedback, saveIncompleteFeedback, markReviewed, markPending } = useTripReviews();

    const [step, setStep] = useState<Step>('overview');
    const [devIndex, setDevIndex] = useState(0);
    // deviation answers
    const [why, setWhy] = useState('');
    const [affect, setAffect] = useState('');
    const [confidence, setConfidence] = useState('');
    // route-confirmation answers
    const [optimalRoute, setOptimalRoute] = useState('');
    const [whyNoDeviation, setWhyNoDeviation] = useState('');
    const [experience, setExperience] = useState('');
    // incomplete-trip answers (ended without reaching destination)
    const [iqIndex, setIqIndex] = useState(0);
    const [incompleteAnswers, setIncompleteAnswers] = useState<string[]>(['', '', '']);

    if (!trip) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <Text style={styles.empty}>Trip not found.</Text>
            </SafeAreaView>
        );
    }

    const isIncomplete = trip.outcome === 'incomplete';
    const hasDeviations = trip.deviations.length > 0;
    const total = trip.deviations.length;
    const dev = trip.deviations[devIndex];

    let headerTitle = '';
    if (step === 'overview') headerTitle = isIncomplete ? 'Trip Ended Early' : hasDeviations ? 'Deviations' : 'Route Feedback';
    else if (step === 'iq') headerTitle = `Question ${iqIndex + 1} of ${INCOMPLETE_QUESTIONS.length}`;
    else if (step === 'rq1') headerTitle = 'Question 1 of 3';
    else if (step === 'rq2') headerTitle = 'Question 2 of 3';
    else if (step === 'rq3') headerTitle = 'Question 3 of 3';
    else if (step !== 'done') headerTitle = `Deviation ${devIndex + 1} of ${total}`;

    const skip = () => {
        markPending(trip.id);
        router.back();
    };

    const startDeviation = (index: number) => {
        setDevIndex(index);
        setWhy('');
        setAffect('');
        setConfidence('');
        setStep('screenshot');
    };

    const saveAndContinue = () => {
        saveDeviation(trip.id, dev.id, { whyRoute: why, affect, confidence });
        if (devIndex + 1 < total) {
            startDeviation(devIndex + 1);
        } else {
            markReviewed(trip.id);
            setStep('done');
        }
    };

    const finishRouteFeedback = () => {
        saveRouteFeedback(trip.id, { optimalRoute, whyNoDeviation, experience });
        markReviewed(trip.id);
        setStep('done');
    };

    const selectIncomplete = (value: string) => {
        const next = [...incompleteAnswers];
        next[iqIndex] = value;
        setIncompleteAnswers(next);
    };

    const nextIncomplete = () => {
        if (iqIndex + 1 < INCOMPLETE_QUESTIONS.length) {
            setIqIndex(iqIndex + 1);
        } else {
            saveIncompleteFeedback(trip.id, {
                reason: incompleteAnswers[0],
                distanceReached: incompleteAnswers[1],
                willRetry: incompleteAnswers[2],
            });
            markReviewed(trip.id);
            setStep('done');
        }
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            {step !== 'done' && (
                <View style={styles.header}>
                    <IconButton icon="chevron-left" size={sizes.size32} onPress={() => router.back()} />
                    <Text style={styles.headerTitle}>{headerTitle}</Text>
                    {step === 'overview' ? (
                        <Button mode="text" compact textColor={theme.colors.onSurfaceVariant} onPress={skip}>
                            Skip
                        </Button>
                    ) : (
                        <View style={{ width: sizes.size48 }} />
                    )}
                </View>
            )}

            {/* OVERVIEW — trip ended without reaching destination */}
            {step === 'overview' && isIncomplete && (
                <>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionLabel}>INCOMPLETE TRIP</Text>
                        <View style={[styles.routeBanner, { backgroundColor: '#FEE2E2' }]}>
                            <Icon source="map-marker-off" size={sizes.size48} color={RED} />
                            <Text style={styles.routeBannerTitle}>This trip ended early</Text>
                            <Text style={styles.routeBannerSub}>
                                The destination wasn’t reached. Please answer a few questions about why the trip ended.
                            </Text>
                        </View>
                        <View style={styles.detailsCard}>
                            <Text style={styles.detailsTitle}>Trip Route</Text>
                            <DetailRow icon="map-marker-outline" label="From" value={trip.from} theme={theme} />
                            <DetailRow icon="map-marker-off-outline" label="Intended to" value={trip.to} theme={theme} />
                            <DetailRow icon="map-marker-distance" label="Distance covered" value={`${trip.actualDistanceKm} km`} theme={theme} last />
                        </View>
                    </ScrollView>
                    <View style={styles.footer}>
                        <PrimaryButton label="Answer Questions" onPress={() => { setIqIndex(0); setStep('iq'); }} theme={theme} />
                    </View>
                </>
            )}

            {/* OVERVIEW — deviations present */}
            {step === 'overview' && !isIncomplete && hasDeviations && (
                <>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionLabel}>DETECTED DEVIATIONS</Text>
                        <Text style={styles.bigCount}>{total}</Text>
                        <Text style={styles.countNote}>
                            We detected {total} deviation{total === 1 ? '' : 's'} from the suggested route. Please review
                            each one.
                        </Text>
                        {trip.deviations.map(d => (
                            <View key={d.id} style={styles.card}>
                                <View style={styles.flex}>
                                    <Text style={styles.devTitle}>{d.title}</Text>
                                    <Text style={styles.devMeta}>
                                        {d.time} · {d.distanceIntoKm} km
                                    </Text>
                                    <Text style={styles.devType}>{d.type}</Text>
                                </View>
                                <View style={styles.thumb}>
                                    <Icon source="map-marker-path" size={sizes.size32} color={TEAL} />
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                    <View style={styles.footer}>
                        <PrimaryButton label="Review Deviations" onPress={() => startDeviation(0)} theme={theme} />
                    </View>
                </>
            )}

            {/* OVERVIEW — no deviations (route confirmation) */}
            {step === 'overview' && !isIncomplete && !hasDeviations && (
                <>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionLabel}>NO DEVIATIONS</Text>
                        <View style={styles.routeBanner}>
                            <Icon source="check-decagram" size={sizes.size48} color={TEAL} />
                            <Text style={styles.routeBannerTitle}>You followed the suggested route</Text>
                            <Text style={styles.routeBannerSub}>
                                No deviations were detected on this trip. Please answer a few quick questions about the
                                optimal route you were given.
                            </Text>
                        </View>
                        <View style={styles.detailsCard}>
                            <Text style={styles.detailsTitle}>Trip Route</Text>
                            <DetailRow icon="map-marker-outline" label="From" value={trip.from} theme={theme} />
                            <DetailRow icon="map-marker-check-outline" label="To" value={trip.to} theme={theme} />
                            <DetailRow icon="map-marker-distance" label="Distance" value={`${trip.distanceKm} km`} theme={theme} last />
                        </View>
                    </ScrollView>
                    <View style={styles.footer}>
                        <PrimaryButton label="Answer Questions" onPress={() => setStep('rq1')} theme={theme} />
                    </View>
                </>
            )}

            {/* DEVIATION SCREENSHOT */}
            {step === 'screenshot' && dev && (
                <>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.mapPlaceholder}>
                            <View style={styles.legend}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.dot, { backgroundColor: TEAL }]} />
                                    <Text style={styles.legendText}>Suggested Route</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.dot, { backgroundColor: RED }]} />
                                    <Text style={styles.legendText}>Actual Route</Text>
                                </View>
                            </View>
                            <Icon source="map-marker-path" size={sizes.size64} color={theme.colors.onSurfaceVariant} />
                        </View>

                        <View style={styles.detailsCard}>
                            <Text style={styles.detailsTitle}>Deviation Details</Text>
                            <DetailRow icon="clock-outline" label="Time" value={dev.time} theme={theme} />
                            <DetailRow icon="map-marker-distance" label="Distance into trip" value={`${dev.distanceIntoKm} km`} theme={theme} />
                            <DetailRow icon="directions" label="Deviation Type" value={dev.type} theme={theme} last />
                        </View>
                    </ScrollView>
                    <View style={styles.footer}>
                        <PrimaryButton label="Next" onPress={() => setStep('q1')} theme={theme} />
                    </View>
                </>
            )}

            {/* DEVIATION QUESTIONS */}
            {step === 'q1' && (
                <Question q={Q1} value={why} onSelect={setWhy} onNext={() => setStep('q2')} nextLabel="Next" theme={theme} />
            )}
            {step === 'q2' && (
                <Question q={Q2} value={affect} onSelect={setAffect} onNext={() => setStep('q3')} nextLabel="Next" theme={theme} />
            )}
            {step === 'q3' && (
                <Question
                    q={Q3}
                    value={confidence}
                    onSelect={setConfidence}
                    onNext={saveAndContinue}
                    nextLabel={devIndex + 1 < total ? 'Save & Next Deviation' : 'Save & Finish'}
                    theme={theme}
                />
            )}

            {/* ROUTE-CONFIRMATION QUESTIONS */}
            {step === 'rq1' && (
                <Question q={RQ1} value={optimalRoute} onSelect={setOptimalRoute} onNext={() => setStep('rq2')} nextLabel="Next" theme={theme} />
            )}
            {step === 'rq2' && (
                <Question q={RQ2} value={whyNoDeviation} onSelect={setWhyNoDeviation} onNext={() => setStep('rq3')} nextLabel="Next" theme={theme} />
            )}
            {step === 'rq3' && (
                <Question q={RQ3} value={experience} onSelect={setExperience} onNext={finishRouteFeedback} nextLabel="Save & Finish" theme={theme} />
            )}

            {/* INCOMPLETE-TRIP QUESTIONS */}
            {step === 'iq' && (
                <Question
                    q={INCOMPLETE_QUESTIONS[iqIndex]}
                    value={incompleteAnswers[iqIndex]}
                    onSelect={selectIncomplete}
                    onNext={nextIncomplete}
                    nextLabel={iqIndex + 1 < INCOMPLETE_QUESTIONS.length ? 'Next' : 'Save & Finish'}
                    theme={theme}
                />
            )}

            {/* DONE */}
            {step === 'done' && (
                <View style={styles.doneWrap}>
                    <View style={styles.doneCircle}>
                        <Icon source="check" size={sizes.size64} color={TEAL} />
                    </View>
                    <Text style={styles.doneTitle}>{hasDeviations ? 'All deviations reviewed!' : 'Response submitted!'}</Text>
                    <Text style={styles.doneSub}>Thank you for your responses. Your trip data helps improve route understanding.</Text>
                    <View style={styles.reviewedCard}>
                        <Text style={styles.reviewedLabel}>
                            {isIncomplete ? 'Incomplete-Trip Response' : hasDeviations ? 'Reviewed Deviations' : 'Route Feedback'}
                        </Text>
                        <Text style={styles.reviewedValue}>{hasDeviations ? `${total} / ${total}` : 'Submitted'}</Text>
                    </View>
                    <PrimaryButton label="Back to Trip Summary" onPress={() => router.back()} theme={theme} />
                </View>
            )}
        </SafeAreaView>
    );
}

function Question({
    q,
    value,
    onSelect,
    onNext,
    nextLabel,
    theme,
}: {
    q: { title: string; options: string[] };
    value: string;
    onSelect: (v: string) => void;
    onNext: () => void;
    nextLabel: string;
    theme: MD3Theme;
}) {
    const styles = getStyles(theme);
    return (
        <>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.questionTitle}>{q.title}</Text>
                <Text style={styles.questionHint}>(Pumili ng isa)</Text>
                {q.options.map(opt => {
                    const active = value === opt;
                    return (
                        <TouchableRipple key={opt} onPress={() => onSelect(opt)} style={[styles.option, active && styles.optionActive]} borderless>
                            <View style={styles.optionRow}>
                                <Icon source={active ? 'radiobox-marked' : 'radiobox-blank'} size={sizes.medium} color={active ? TEAL : '#94A3B8'} />
                                <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt}</Text>
                            </View>
                        </TouchableRipple>
                    );
                })}
            </ScrollView>
            <View style={styles.footer}>
                <PrimaryButton label={nextLabel} onPress={onNext} disabled={!value} theme={theme} />
            </View>
        </>
    );
}

function DetailRow({ icon, label, value, theme, last }: { icon: string; label: string; value: string; theme: MD3Theme; last?: boolean }) {
    const styles = getStyles(theme);
    return (
        <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
            <View style={styles.detailLabelWrap}>
                <Icon source={icon} size={sizes.medium} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.detailLabel}>{label}</Text>
            </View>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
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
        content: { padding: sizes.large, paddingTop: sizes.small },
        sectionLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant, letterSpacing: 1 },
        bigCount: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.heading, color: theme.colors.onSurface },
        countNote: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant, marginBottom: sizes.medium },
        routeBanner: {
            alignItems: 'center',
            backgroundColor: theme.colors.primaryContainer,
            borderRadius: sizes.medium,
            padding: sizes.large,
            marginTop: sizes.small,
            marginBottom: sizes.medium,
        },
        routeBannerTitle: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.regular, color: theme.colors.onSurface, textAlign: 'center', marginTop: sizes.small },
        routeBannerSub: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: sizes.small },
        card: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            padding: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            marginBottom: sizes.small,
            gap: sizes.medium,
        },
        devTitle: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.small, color: theme.colors.onSurface },
        devMeta: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant, marginTop: 2 },
        devType: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurface, marginTop: sizes.tiny },
        thumb: { width: sizes.size56, height: sizes.size56, borderRadius: sizes.small, backgroundColor: theme.colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' },
        mapPlaceholder: {
            height: sizes.size192,
            borderRadius: sizes.medium,
            backgroundColor: theme.colors.surfaceVariant,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            marginBottom: sizes.medium,
        },
        legend: { position: 'absolute', top: sizes.regular, left: sizes.regular, backgroundColor: theme.colors.surface, borderRadius: sizes.small, padding: sizes.small, gap: sizes.tiny },
        legendItem: { flexDirection: 'row', alignItems: 'center', gap: sizes.small },
        legendText: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurface },
        dot: { width: sizes.regular, height: sizes.regular, borderRadius: sizes.regular / 2 },
        detailsCard: { backgroundColor: theme.colors.surface, borderRadius: sizes.medium, padding: sizes.medium, borderWidth: 1, borderColor: theme.colors.outlineVariant ?? '#E2E8F0' },
        detailsTitle: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurface, marginBottom: sizes.small },
        detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: sizes.regular },
        detailRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant ?? '#E2E8F0' },
        detailLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: sizes.small },
        detailLabel: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant },
        detailValue: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurface },
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
        doneCircle: { width: sizes.size112, height: sizes.size112, borderRadius: sizes.size112 / 2, borderWidth: 2, borderColor: TEAL, alignItems: 'center', justifyContent: 'center', marginBottom: sizes.large },
        doneTitle: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.regular, color: theme.colors.onSurface, textAlign: 'center' },
        doneSub: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: sizes.small },
        reviewedCard: { alignSelf: 'stretch', backgroundColor: theme.colors.surface, borderRadius: sizes.medium, borderWidth: 1, borderColor: theme.colors.outlineVariant ?? '#E2E8F0', padding: sizes.medium, marginVertical: sizes.large },
        reviewedLabel: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant },
        reviewedValue: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.large, color: theme.colors.onSurface, marginTop: 2 },
        footer: { padding: sizes.large },
        button: { borderRadius: sizes.small },
        buttonContent: { height: sizes.size56 },
        buttonLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small },
        empty: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tinyPlus, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: sizes.large },
    });
