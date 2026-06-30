import CustomSnackbar, { SnackbarType } from '@/components/common/Snackbar';
import PolicyModal, { PolicyKey } from '@/components/onboarding/PolicyModal';
import { enrollInStudy } from '@/lib/firebase-crud/study';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Checkbox, Icon, Text, TouchableRipple } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';

const RESEARCH_POLICY_CARDS: { key: PolicyKey; icon: string; title: string }[] = [
    { key: 'data', icon: 'cog', title: 'Data Usage' },
    { key: 'participation', icon: 'account-group', title: 'Participation Terms' },
];

export default function StudyConsent() {
    const [activePolicy, setActivePolicy] = useState<PolicyKey | null>(null);
    const [agreed, setAgreed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState<SnackbarType>('error');

    const showError = (message: string) => {
        setSnackbarMessage(message);
        setSnackbarType('error');
        setSnackbarVisible(true);
    };

    const handleJoinStudy = async () => {
        if (isLoading) return;
        if (!agreed) {
            showError('Please agree to the research data consent to join the study.');
            return;
        }
        setIsLoading(true);
        try {
            await enrollInStudy({
                acceptedPrivacyPolicy: true,
                acceptedDataUsage: true,
                acceptedParticipationTerms: true,
            });
            router.replace('/enrollment-complete');
        } catch (error) {
            showError(error instanceof Error ? error.message : 'Could not join the study. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Research Data Consent</Text>
                <Text style={styles.subtitle}>
                    Joining this study means your recorded trip data will be collected and used for research. Please review
                    and agree before joining.
                </Text>

                {RESEARCH_POLICY_CARDS.map(card => (
                    <TouchableRipple key={card.key} onPress={() => setActivePolicy(card.key)} style={styles.card} borderless>
                        <View style={styles.cardRow}>
                            <View style={styles.cardIcon}>
                                <Icon source={card.icon} size={sizes.medium} color={TEAL} />
                            </View>
                            <View style={styles.cardTextWrap}>
                                <Text style={styles.cardTitle}>{card.title}</Text>
                                <Text style={styles.cardLink}>View details</Text>
                            </View>
                            <Icon source="chevron-right" size={sizes.size28} color="#94A3B8" />
                        </View>
                    </TouchableRipple>
                ))}

                <TouchableRipple onPress={() => setAgreed(prev => !prev)} style={styles.agreeRow} borderless>
                    <View style={styles.agreeInner}>
                        <Checkbox status={agreed ? 'checked' : 'unchecked'} color={TEAL} />
                        <Text style={styles.agreeText}>
                            I consent to the collection and research use of my trip data for this study.
                        </Text>
                    </View>
                </TouchableRipple>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    mode="contained"
                    buttonColor={TEAL}
                    textColor="#ffffff"
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                    onPress={handleJoinStudy}
                    loading={isLoading}
                    disabled={isLoading || !agreed}
                >
                    Join Study
                </Button>
            </View>

            <PolicyModal policy={activePolicy} onClose={() => setActivePolicy(null)} />

            <CustomSnackbar
                visible={snackbarVisible}
                message={snackbarMessage}
                onDismiss={() => setSnackbarVisible(false)}
                type={snackbarType}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#ffffff' },
    flex: { flex: 1 },
    content: { paddingHorizontal: sizes.large, paddingTop: sizes.large, paddingBottom: sizes.large },
    title: {
        fontFamily: 'LGEIHeadline-Bold',
        fontSize: fontSizes.large,
        color: '#0F172A',
    },
    subtitle: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.small,
        color: '#64748B',
        marginTop: sizes.tiny,
        marginBottom: sizes.large,
    },
    card: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: sizes.medium,
        paddingVertical: sizes.regular,
        paddingHorizontal: sizes.regular,
        marginBottom: sizes.small,
        backgroundColor: '#ffffff',
    },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    cardIcon: {
        width: sizes.size48,
        height: sizes.size48,
        borderRadius: sizes.small,
        backgroundColor: '#E6F2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: sizes.regular,
    },
    cardTextWrap: { flex: 1 },
    cardTitle: {
        fontFamily: 'LGEIText-SemiBold',
        fontSize: fontSizes.small,
        color: '#0F172A',
    },
    cardLink: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.tiny,
        color: '#94A3B8',
        marginTop: 2,
    },
    agreeRow: { marginTop: sizes.medium, borderRadius: sizes.small },
    agreeInner: { flexDirection: 'row', alignItems: 'center' },
    agreeText: {
        flex: 1,
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.tinyPlus,
        color: '#334155',
        marginLeft: sizes.tiny,
    },
    footer: { paddingHorizontal: sizes.large, paddingBottom: sizes.large },
    button: { borderRadius: sizes.small },
    buttonContent: { height: sizes.size56 },
    buttonLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small },
});
