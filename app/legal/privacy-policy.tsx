import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Divider, Text, useTheme } from 'react-native-paper';

const PrivacyPolicyPage = () => {
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
                <Section title="Introduction">
                    <Text>
                        Your privacy is important to us. This Privacy Policy outlines how we collect, use, and protect
                        your personal data when you use our platform.
                    </Text>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />

                <Section title="Data we Collect">
                    <Text>When using the platform, the following types of data will be collected:</Text>
                    <View style={styles.dataTypes}>
                        <Text style={styles.dataType}>
                            • Image or Video Data: Optional images video recordings of your delivery route, capturing
                            visuals of the road and surrounding environment.
                        </Text>
                        <Text style={styles.dataType}>
                            • Geospatial Data: GPS tracking data (e.g., location coordinates, timestamps) to map your
                            route in relation to urban infrastructure.
                        </Text>
                        <Text style={styles.dataType}>
                            • User-Provided Feedback: Optional input about your experiences, such as reflections on
                            navigating certain routes, challenges encountered, feelings of safety or comfort, and
                            observations about road conditions or infrastructure quality.
                        </Text>
                        <Text style={styles.dataType}>
                            • Study and Payment Claim Data: Rider name, mobile number, delivery platform, vehicle type,
                            selected payment channel, account name, account number, claim reference number, and claim
                            status when you join the study or request compensation.
                        </Text>
                    </View>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />

                <Section title="Use of Data">
                    <Text>
                        The data collected will be used strictly for research and analytical purposes, specifically to:
                    </Text>
                    <View style={styles.dataUseList}>
                        <Text style={styles.dataUseItem}>
                            • Generate insights into last-mile delivery safety and infrastructure needs.
                        </Text>
                        <Text style={styles.dataUseItem}>
                            • Build a dataset of last-mile delivery conditions for use by researchers and policymakers.
                        </Text>
                        <Text style={styles.dataUseItem}>
                            • Inform urban planning decisions to support safe and accessible delivery routes.
                        </Text>
                        <Text style={styles.dataUseItem}>
                            • Validate the 10-submission quota, notify the research team for manual review, and process
                            approved compensation claims.
                        </Text>
                    </View>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />

                <Section title="Data Sharing and Publication">
                    <Text>
                        <Text style={styles.bold}>• Aggregated and Anonymized Data: </Text>
                        Your data will be anonymized and aggregated with data from other users before any analysis or
                        publication. Individual users will not be identifiable in any published findings or reports.
                    </Text>
                    <Text style={styles.marginTop}>
                        <Text style={styles.bold}>• Research Collaborators: </Text>
                        Anonymized data may be shared with research collaborators or public planning agencies for the
                        purpose of enhancing urban delivery route planning.
                    </Text>
                    <Text style={styles.marginTop}>
                        <Text style={styles.bold}>• Compensation Processing: </Text>
                        Payment claim details are shared only with authorized Devia research or finance personnel who
                        validate submissions and process approved payments.
                    </Text>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />
                <Section title="Data Security and Storage">
                    <Text>
                        <Text style={styles.bold}>• Data Encryption: </Text>
                        All data collected from the platform will be encrypted during transmission and stored on secure
                        servers.
                    </Text>
                    <Text style={styles.marginTop}>
                        <Text style={styles.bold}>• Data Retention: </Text>
                        Data will be retained only for as long as necessary to fulfill the research objectives and meet
                        any legal or regulatory requirements. Following the conclusion of this research, identifiable
                        data will be deleted or anonymized in full.
                    </Text>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />
                <Section title="Your Rights">
                    <Text>You have the following rights concerning your data:</Text>
                    <View style={styles.rightsList}>
                        <Text style={styles.rightItem}>
                            • Access: You may request to view the data we have collected from you.
                        </Text>
                        <Text style={styles.rightItem}>
                            • Correction: You may request correction of any personal data you believe is inaccurate.
                        </Text>
                        <Text style={styles.rightItem}>
                            • Withdrawal of Consent: You may withdraw your consent at any time by contacting us. Upon
                            withdrawal, your data will no longer be used, and we will delete any personally identifiable
                            information associated with your data.
                        </Text>
                    </View>
                </Section>
                <Divider style={{ marginHorizontal: sizes.large }} />
                <Section title="Conclusion">
                    <Text>
                        By using the platform, you acknowledge that you have read, understood, and agree to this Privacy
                        Policy. Thank you for helping improve urban delivery route planning through your participation.
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

export default PrivacyPolicyPage;
