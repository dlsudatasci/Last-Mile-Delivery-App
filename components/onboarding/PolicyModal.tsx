import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, IconButton, Modal, Portal, Text } from 'react-native-paper';

const TEAL = '#0E6E73';

export type PolicyKey = 'privacy' | 'terms' | 'data' | 'participation';

type Block =
    | { type: 'paragraph'; text: string }
    | { type: 'heading'; text: string }
    | { type: 'bullets'; items: string[] };

type Policy = {
    icon: string;
    title: string;
    lastUpdated?: string;
    blocks: Block[];
};

const POLICIES: Record<PolicyKey, Policy> = {
    privacy: {
        icon: 'lock',
        title: 'Privacy Policy',
        lastUpdated: 'May 20, 2024',
        blocks: [
            {
                type: 'paragraph',
                text: 'DEVIA respects your privacy. This Privacy Policy explains what information we collect when you create an account and use the app, and how we handle it.',
            },
            { type: 'heading', text: '1. Information We Collect' },
            { type: 'paragraph', text: 'To create and operate your account, DEVIA collects:' },
            {
                type: 'bullets',
                items: [
                    'Full name, gender, and birth date',
                    'City or municipality',
                    'Years of experience as a driver',
                    'Your mobile number (used as your account ID)',
                ],
            },
            { type: 'heading', text: '2. How We Use Your Information' },
            {
                type: 'paragraph',
                text: 'This information is used only to create your account, personalize your experience, and operate the app. We do not sell your personal information.',
            },
            { type: 'heading', text: '3. Research Data' },
            {
                type: 'paragraph',
                text: 'Your information is NOT used for research, and your trips are NOT shared with researchers, unless you separately choose to join a study. Joining a study is optional and requires its own, more specific consent that explains exactly what data is collected and how it will be used.',
            },
        ],
    },
    terms: {
        icon: 'file-document-outline',
        title: 'Terms of Service',
        blocks: [
            { type: 'paragraph', text: 'By creating an account and using DEVIA, you agree to these terms.' },
            { type: 'heading', text: '1. Your Account' },
            {
                type: 'paragraph',
                text: 'You are responsible for the accuracy of the information you provide and for activity under your account.',
            },
            { type: 'heading', text: '2. Acceptable Use' },
            {
                type: 'paragraph',
                text: 'Use DEVIA only for its intended purpose. Do not misuse the app, attempt to disrupt its services, or use it for unlawful activities.',
            },
            { type: 'heading', text: '3. Optional Studies' },
            {
                type: 'paragraph',
                text: 'DEVIA may offer optional research studies. Participation is entirely voluntary and is governed by each study’s own separate consent agreement.',
            },
            { type: 'heading', text: '4. Changes to These Terms' },
            {
                type: 'paragraph',
                text: 'These terms may be updated over time. Continued use of the app means you accept the latest version.',
            },
        ],
    },
    data: {
        icon: 'cog',
        title: 'Data Usage',
        blocks: [
            {
                type: 'paragraph',
                text: 'The information collected through DEVIA is used to support transportation, mobility, navigation, and route deviation research.',
            },
            { type: 'heading', text: 'Route recordings may include:' },
            {
                type: 'bullets',
                items: [
                    'GPS coordinates',
                    'Distance traveled',
                    'Route geometry',
                    'Route deviations',
                    'Trip duration',
                    'Survey responses',
                ],
            },
            { type: 'heading', text: 'Research teams may analyze collected data to identify:' },
            {
                type: 'bullets',
                items: [
                    'Common route choices',
                    'Traffic avoidance strategies',
                    'Deviation patterns',
                    'Transportation efficiency trends',
                    'Navigation behavior',
                ],
            },
            {
                type: 'paragraph',
                text: 'All analyses are conducted for research, academic, planning, and policy-development purposes.',
            },
            {
                type: 'paragraph',
                text: 'Whenever possible, reports and publications generated from DEVIA data will present findings in aggregated form. Individual participants will not be personally identified in research outputs.',
            },
            {
                type: 'paragraph',
                text: 'Data may be exported by authorized researchers only for approved research activities and institutional reporting requirements.',
            },
            {
                type: 'paragraph',
                text: 'DEVIA does not use collected information for advertising, profiling, or commercial marketing activities.',
            },
        ],
    },
    participation: {
        icon: 'account-group',
        title: 'Participation Terms',
        blocks: [
            {
                type: 'paragraph',
                text: 'Participation in studies conducted through DEVIA is voluntary. By enrolling in a study, participants acknowledge and agree to the following:',
            },
            { type: 'heading', text: '1. Voluntary Participation' },
            {
                type: 'paragraph',
                text: 'Participation is entirely voluntary. Participants may choose whether or not to join any study available within this application.',
            },
            { type: 'heading', text: '2. Accurate Information' },
            {
                type: 'paragraph',
                text: 'Participants agree to provide truthful and accurate information when completing study enrollment forms, trip records, and questionnaires.',
            },
            { type: 'heading', text: '3. Route Recording' },
            {
                type: 'paragraph',
                text: 'Some studies may require GPS route recording and trip tracking for research purposes. Route information collected during active recording sessions may be analyzed by researchers.',
            },
            { type: 'heading', text: '4. Compensation' },
            {
                type: 'paragraph',
                text: 'Certain studies may offer compensation or incentives upon completion of specific study requirements. Eligibility is based on study-specific requirements and validation procedures.',
            },
        ],
    },
};

type Props = {
    policy: PolicyKey | null;
    onClose: () => void;
};

export default function PolicyModal({ policy, onClose }: Props) {
    const content = policy ? POLICIES[policy] : null;

    return (
        <Portal>
            <Modal visible={!!content} onDismiss={onClose} contentContainerStyle={styles.modal}>
                {content && (
                    <>
                        <View style={styles.header}>
                            <View style={styles.headerLeft}>
                                <Icon source={content.icon} size={sizes.medium} color={TEAL} />
                                <Text style={styles.title}>{content.title}</Text>
                            </View>
                            <IconButton icon="close" size={sizes.medium} onPress={onClose} style={styles.close} />
                        </View>

                        <ScrollView style={styles.body} showsVerticalScrollIndicator>
                            {content.lastUpdated && (
                                <Text style={styles.lastUpdated}>Last Updated: {content.lastUpdated}</Text>
                            )}
                            {content.blocks.map((block, index) => {
                                if (block.type === 'heading') {
                                    return (
                                        <Text key={index} style={styles.heading}>
                                            {block.text}
                                        </Text>
                                    );
                                }
                                if (block.type === 'bullets') {
                                    return (
                                        <View key={index} style={styles.bulletGroup}>
                                            {block.items.map(item => (
                                                <View key={item} style={styles.bulletRow}>
                                                    <Text style={styles.bulletDot}>•</Text>
                                                    <Text style={styles.bulletText}>{item}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    );
                                }
                                return (
                                    <Text key={index} style={styles.paragraph}>
                                        {block.text}
                                    </Text>
                                );
                            })}
                        </ScrollView>

                        <Button
                            mode="contained"
                            buttonColor={TEAL}
                            textColor="#ffffff"
                            style={styles.understand}
                            contentStyle={styles.understandContent}
                            labelStyle={styles.understandLabel}
                            onPress={onClose}
                        >
                            I Understand
                        </Button>
                    </>
                )}
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    modal: {
        backgroundColor: '#ffffff',
        marginHorizontal: sizes.medium,
        marginVertical: sizes.size48,
        borderRadius: sizes.medium,
        padding: sizes.large,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: sizes.small,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: sizes.small, flex: 1 },
    title: {
        fontFamily: 'LGEIHeadline-Bold',
        fontSize: fontSizes.regular,
        color: '#0F172A',
    },
    close: { margin: 0 },
    body: { marginBottom: sizes.medium },
    lastUpdated: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.tiny,
        color: '#94A3B8',
        marginBottom: sizes.small,
    },
    heading: {
        fontFamily: 'LGEIText-SemiBold',
        fontSize: fontSizes.small,
        color: '#0F172A',
        marginTop: sizes.medium,
        marginBottom: sizes.tiny,
    },
    paragraph: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.tinyPlus,
        color: '#475569',
        lineHeight: fontSizes.tinyPlus * 1.5,
        marginTop: sizes.tiny,
    },
    bulletGroup: { marginTop: sizes.tiny },
    bulletRow: { flexDirection: 'row', marginBottom: sizes.tiny },
    bulletDot: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.tinyPlus,
        color: TEAL,
        marginRight: sizes.small,
    },
    bulletText: {
        flex: 1,
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.tinyPlus,
        color: '#475569',
        lineHeight: fontSizes.tinyPlus * 1.5,
    },
    understand: { borderRadius: sizes.small },
    understandContent: { height: sizes.size56 },
    understandLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small },
});
