import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Divider, Text, useTheme } from 'react-native-paper';

const TermsOfServicePage = () => {
    const theme = useTheme();
    const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <Card.Content style={styles.sectionContent}>{children}</Card.Content>
        </View>
    );

    return (
        <>
            <ScrollView style={{ ...styles.container, backgroundColor: theme.colors.surface }}>
                <Text
                    style={{
                        fontSize: fontSizes.small,
                        fontFamily: 'LGEIHeadline-Semibold',
                        marginHorizontal: sizes.large,
                        marginTop: sizes.large,
                    }}
                >
                    Effective Date: 16 June 2025
                </Text>
                <Section title="Terms of Service">
                    <Text>
                        These Terms of Service ("Terms") govern your use of the platform and services provided by
                        Devia ("we," "us," or "our"). By accessing or using our platform, you agree to comply with
                        and be bound by these Terms. If you do not agree to these Terms, please do not use our platform.
                    </Text>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />
                <Section title="Purpose of Data Collection">
                    <Text>
                        The purpose of this research is to understand last-mile delivery experiences and infrastructure needs
                        by collecting data from riders in real-world conditions. This includes analyzing delivery corridors,
                        road conditions, and interactions with other road users to help improve delivery route planning.
                    </Text>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />

                <Section title="Eligibility">
                    <Text>
                        You must be at least 18 years old or have the consent of a parent or guardian to use this app.
                        By using the app, you represent and warrant that you meet these requirements.
                    </Text>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />

                <Section title="User Responsibilities">
                    <Text>You agree to:</Text>
                    <View style={styles.dataUseList}>
                        <Text style={styles.dataUseItem}>• Provide accurate and honest data and feedback.</Text>
                        <Text style={styles.dataUseItem}>
                            • Use the platform in compliance with all local laws and regulations.
                        </Text>
                        <Text style={styles.dataUseItem}>
                            • Avoid submitting harmful, offensive, or illegal content.
                        </Text>
                    </View>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />

                <Section title="Study Participation and Compensation">
                    <Text>
                        Devia Route Study participants may claim a ₱250 compensation after completing 10 recorded
                        delivery-trip submissions. A submission is not automatically approved when recorded. The
                        research team will review each account for completeness, duplicate trips, route consistency,
                        and questionnaire completion before validating compensation eligibility.
                    </Text>
                    <Text style={styles.marginTop}>
                        When your account reaches the 10-submission quota, the app may create a system notification for
                        the research team. You may submit payment details for GCash, Maya, or GoTyme. Payment details
                        are used only for compensation processing. A reference number will be generated for your claim,
                        and payment or invoice instructions may be sent by text message after validation.
                    </Text>
                    <Text style={styles.marginTop}>
                        Devia reserves the right to reject incomplete, fraudulent, duplicate, unverifiable, or unsafe
                        submissions. Compensation is processed only after manual validation by the research team.
                    </Text>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />

                <Section title="License and Intellectual Property">
                    <Text>
                        All content on the platform, including software, visuals, and text, is owned or licensed by the
                        research team. You are granted a limited, non-exclusive, non-transferable license to use the
                        platform for personal and research participation purposes only.
                    </Text>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />
                <Section title="Termination">
                    <Text>
                        We reserve the right to suspend or terminate access to the platform at any time for violations
                        of these terms or misuse of the app.
                    </Text>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />
                <Section title="Limitation of Liability">
                    <Text>You have the following rights concerning your data:</Text>
                    <View style={styles.rightsList}>
                        <Text style={styles.rightItem}>
                            This platform is provided "as is" without warranties of any kind. We are not liable for any
                            indirect, incidental, or consequential damages arising from your use of the app.
                        </Text>
                    </View>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />
                <Section title="Changes to Terms">
                    <Text>
                        These terms may be updated from time to time. We will notify you of any significant changes and
                        your continued use of the platform will constitute acceptance of those changes.
                    </Text>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />
                <Section title="Contact Us">
                    <Text>
                        If you have any questions or concerns about these Terms, please contact us at
                        [bien_aaron_miranda@dlsu.edu.ph].
                    </Text>
                </Section>
            </ScrollView>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    pageTitle: {
        fontSize: fontSizes.regular,
        fontFamily: 'LGEIText-SemiBold',
    },
    sectionContainer: {
        marginHorizontal: sizes.large,
        marginVertical: sizes.large,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: sizes.small,
    },
    sectionTitle: {
        fontSize: fontSizes.regular,
        fontFamily: 'LGEIText-SemiBold',
    },
    sectionContent: {
        paddingHorizontal: sizes.large,
        paddingBottom: sizes.large,
    },
    dataTypes: {
        marginLeft: sizes.large,
    },
    dataType: {
        marginBottom: sizes.small,
    },
    dataUseList: {
        marginLeft: sizes.large,
    },
    dataUseItem: {
        marginBottom: sizes.small,
    },
    rightsList: {
        marginLeft: sizes.large,
    },
    rightItem: {
        marginBottom: sizes.small,
    },
    bold: {
        fontFamily: 'LGEIText-SemiBold',
    },
    marginTop: {
        marginTop: sizes.small,
    },
});

export default TermsOfServicePage;
