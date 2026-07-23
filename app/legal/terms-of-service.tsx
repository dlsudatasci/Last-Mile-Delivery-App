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
                <Section title="Purpose of the Study">
                    <Text>
                        The purpose of this study is to understand the practical decision-making strategies of delivery
                        drivers, often referred to as "street smarts." While delivery platforms provide suggested routes,
                        these may not always reflect real-world conditions. This study aims to learn from participants'
                        on-the-ground experience and routing decisions in order to improve how delivery routes are generated.
                    </Text>
                    <Text style={styles.marginTop}>
                        The goal is to incorporate these real-world insights into routing systems so that they better
                        reflect actual driving conditions rather than relying solely on map-based optimization. This study
                        does not evaluate or monitor participants' job performance for their employers. Instead, it seeks
                        to use participants' professional experience to develop tools that better support delivery drivers
                        in their day-to-day operations.
                    </Text>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />

                <Section title="Study Procedures">
                    <Text style={styles.bold}>
                        Note: Participants may withdraw from the study at any time. Compensation is based on the number
                        of valid submissions completed, with full incentives provided only upon meeting the required quota.
                    </Text>
                    <Text style={styles.marginTop}>
                        By participating in this study, you acknowledge and agree to the following procedures:
                    </Text>
                    <View style={styles.dataUseList}>
                        <Text style={styles.dataUseItem}>
                            • You will be informed of the application's purpose, data collection process, and terms and
                            conditions. Consent will be established once you agree to these terms.
                        </Text>
                        <Text style={styles.dataUseItem}>
                            • You will select or be assigned a target number of delivery submissions to complete within
                            a specified period.
                        </Text>
                        <Text style={styles.dataUseItem}>
                            • You will use the mobile crowdsourcing application during your normal delivery operations to
                            record relevant delivery data.
                        </Text>
                        <Text style={styles.dataUseItem}>
                            • Before starting each delivery, you will manually initiate data collection through the
                            application.
                        </Text>
                        <Text style={styles.dataUseItem}>
                            • The application will record the platform-suggested route, including the estimated time of
                            arrival (ETA), as provided by the delivery service.
                        </Text>
                        <Text style={styles.dataUseItem}>
                            • Real-time delivery data will be collected, including GPS data, timestamps, and geospatial
                            information.
                        </Text>
                        <Text style={styles.dataUseItem}>
                            • The application will detect and log any deviations from the suggested route. After
                            completing each delivery, you may be asked brief questions regarding your routing decisions.
                        </Text>
                        <Text style={styles.dataUseItem}>
                            • The application will include a checklist that allows you to determine whether your
                            submission meets the required criteria or if additional information is needed. Final
                            validation of all submissions will be conducted by the researchers, and only verified entries
                            will be counted toward quota fulfillment.
                        </Text>
                        <Text style={styles.dataUseItem}>
                            • You will manually end data collection after each delivery.
                        </Text>
                        <Text style={styles.dataUseItem}>
                            • Additional follow-up questions may be administered to gather further insights into your
                            decision-making processes.
                        </Text>
                    </View>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />

                <Section title="Eligibility">
                    <Text>
                        You must be at least 18 years old or have the consent of a parent or guardian to use this app.
                        By using the app, you represent and warrant that you meet these requirements.
                    </Text>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />

                <Section title="Duration">
                    <Text>
                        Your participation in this study will take place over a specified period, during which you will
                        record delivery data as part of your normal delivery activities. Each submission will require
                        only minimal additional time, as data collection will occur alongside your regular deliveries.
                        You may also be asked to answer brief follow-up questions after each delivery.
                    </Text>
                    <Text style={styles.marginTop}>
                        The total duration of your participation will depend on how quickly you complete your assigned
                        quota of valid delivery submissions.
                    </Text>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />

                <Section title="Voluntary Participation">
                    <Text>
                        Your participation in this study is voluntary. It is entirely your choice whether or not you
                        decide to take part. If you choose to participate, you will be asked to provide your consent.
                    </Text>
                    <Text style={styles.marginTop}>
                        Even after giving consent, you are free to withdraw from the study at any time and without
                        providing a reason. You may do so by discontinuing use of the application or by informing the
                        research team.
                    </Text>
                    <Text style={styles.marginTop}>
                        If you withdraw from the study, you may still receive partial compensation based on the number
                        of valid submissions you have completed. However, full incentives will only be provided to
                        participants who complete the required quota.
                    </Text>
                    <Text style={styles.marginTop}>
                        Withdrawing from this study will not affect your relationship with the researchers in any way.
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

                <Section title="Benefits">
                    <Text>
                        You may receive compensation based on the number of valid delivery submissions you complete,
                        with additional incentives provided upon completion of the required quota.
                    </Text>
                    <Text style={styles.marginTop}>
                        There may be no direct personal benefit beyond this. However, the findings of this study may
                        contribute to improving delivery routing systems by incorporating real-world driver experience.
                        This may help create more practical and effective tools for delivery operations.
                    </Text>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />

                <Section title="Withdrawal and Data Redaction">
                    <Text>
                        You may choose to stop participating in this study at any time via the "Request Compensation"
                        button in the app.
                    </Text>
                    <Text style={styles.marginTop}>
                        <Text style={styles.bold}>Partial Compensation: </Text>
                        If you opt out before completing the full quota, you will be compensated only for the valid
                        routes submitted up to that point.
                    </Text>
                    <Text style={styles.marginTop}>
                        <Text style={styles.bold}>Data Redaction: </Text>
                        You may request to have your personal data redacted or deleted. However, please note:
                    </Text>
                    <View style={styles.dataUseList}>
                        <Text style={styles.dataUseItem}>
                            <Text style={styles.bold}>• Verification Requirement: </Text>
                            Compensation is contingent upon the research team's ability to verify your data. If you
                            request redaction before payment is processed, we will be unable to verify your submissions,
                            and any pending compensation will be forfeited.
                        </Text>
                        <Text style={styles.dataUseItem}>
                            <Text style={styles.bold}>• Anonymization Cut-off: </Text>
                            To protect the integrity of the research, once your data has been anonymized and aggregated
                            into the study's final dataset (i.e., it can no longer be linked back to your identity), it
                            can no longer be redacted or removed.
                        </Text>
                        <Text style={styles.dataUseItem}>
                            <Text style={styles.bold}>• Administrative Records: </Text>
                            Even if your research data is redacted, the research group may be legally required to retain
                            a record of your name and payment for auditing and financial purposes.
                        </Text>
                    </View>
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
                    <Text>
                        This platform is provided "as is" without warranties of any kind. We are not liable for any
                        indirect, incidental, or consequential damages arising from your use of the app.
                    </Text>
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
                        If you have any questions at any time about this study, or if you experience any non-normative
                        sensations because of participation, or to exercise your data privacy rights, you may contact
                        the researcher at [bien_aaron_miranda@dlsu.edu.ph].
                    </Text>
                    <Text style={styles.marginTop}>
                        If you have any questions regarding your rights as a research participant, or if problems arise
                        which you do not feel you can discuss with the Principal Investigator, please contact the Chair
                        of the DLSU Research Ethics Review Committee at chairrerc@dlsu.edu.ph (632) 524-4611 local 513.
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
