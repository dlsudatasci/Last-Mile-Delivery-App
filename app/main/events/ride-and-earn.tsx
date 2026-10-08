import {
    getStudyParticipation,
    isValidPhilippineMobileNumber,
    joinStudy,
    StudyParticipation,
} from '@/lib/firebase-crud/study';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useUser } from '@/stores/useUser';
import { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Button, Checkbox, Icon, MD3Theme, Text, TextInput, useTheme } from 'react-native-paper';

export default function EventDetails() {
    const theme = useTheme();
    const { user } = useUser();
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
    const [participation, setParticipation] = useState<StudyParticipation | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const events = {
        eventName: 'Devia Route Study',
        eventDescription: `Join the Devia Route Study for last-mile delivery riders. Participants can claim ₱250 after completing 10 recorded delivery-trip submissions that pass research-team validation. The app will notify the team when the quota is reached, and riders can submit GCash, Maya, or GoTyme claim details inside Devia.`,
        eventDate: {
            start: '2025-06-13',
            end: '2025-06-30',
        },
        eventMedia: 'Devia Logo 1x1',
        eventLocation: 'Philippines',
        eventOrganizer: 'DeviaPH Team',
        eventOrganizerEmail: 'bien_aaron_miranda@dlsu.edu.ph',
        eventOrganizerPhone: '09369745878',
        eventOrganizerImage: '',
    };

    const styles = getStyles(theme);

    useEffect(() => {
        const loadParticipation = async () => {
            try {
                const existingParticipation = await getStudyParticipation();
                setParticipation(existingParticipation);
                if (existingParticipation) {
                    setAcceptedTerms(existingParticipation.acceptedTerms);
                    setAcceptedPrivacy(existingParticipation.acceptedPrivacy);
                }
            } catch (error) {
                console.error('Failed to load study participation:', error);
            }
        };

        loadParticipation();
    }, []);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });

    const handleJoinStudy = async () => {
        if (!acceptedTerms || !acceptedPrivacy) {
            Alert.alert('Consent required', 'Please accept the terms and privacy policy to join the study.');
            return;
        }

        try {
            setIsSubmitting(true);
            const savedParticipation = await joinStudy({
                acceptedTerms,
                acceptedPrivacy,
            });
            setParticipation(savedParticipation);
            Alert.alert('Joined Devia Route Study', 'You can now record delivery trips for the study.');
        } catch (error) {
            Alert.alert('Signup failed', error instanceof Error ? error.message : 'Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Text style={styles.sectionTitle}>Event Details</Text>

            <View style={styles.eventCard}>
                <Image source={require('@/assets/images/devia2.png')} style={styles.eventImage} />
                <Text style={styles.eventTitle}>{events.eventName}</Text>
                <Text style={styles.eventDate}>
                    {formatDate(events.eventDate.start)} – {formatDate(events.eventDate.end)}
                </Text>
                <Text style={styles.eventLocation}>
                    {events.eventOrganizer} | {events.eventLocation || 'TBA'}
                </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.eventDescriptionContainer}>
                <Text style={styles.sectionSubtitle}>Description</Text>

                {/* <Text style={styles.eventDescription}>{events.eventDescription}</Text> */}

                <Text style={styles.eventParagraph}>
                    Join us for the Devia Route Study, a two-week campaign calling on riders across
                    Metro Manila to help build a richer, safer delivery route dataset for everyone. From June 13 to June 30, 2025,
                    every qualified trip you submit earns you rewards—and makes our community&apos;s routes better
                    informed and more reliable.
                </Text>

                <View style={styles.divider} />

                <Text style={styles.eventParagraphHeader}>What You&apos;ll Get:</Text>
                <View style={styles.eventListItemContainer}>
                    <Icon source="check-bold" size={sizes.medium} />
                    <Text style={styles.eventParagraph}>
                        ₱250 compensation after 10 recorded delivery trips are submitted and validated by the research
                        team.
                    </Text>
                </View>
                <View style={styles.eventListItemContainer}>
                    <Icon source="check-bold" size={sizes.medium} />
                    <Text style={styles.eventParagraph}>
                        Devia will notify the research team when your account reaches 10 submissions for cross-checking.
                    </Text>
                </View>
                <View style={styles.eventListItemContainer}>
                    <Icon source="check-bold" size={sizes.medium} />
                    <Text style={styles.eventParagraph}>
                        Once validated, you can claim through GCash, Maya, or GoTyme and receive a reference number for
                        the payment invoice.
                    </Text>
                </View>

                <View style={styles.divider} />

                <Text style={styles.eventParagraphHeader}>How to Qualify:</Text>
                <View style={styles.eventListItemContainer}>
                    <Icon source="numeric-1-circle-outline" size={sizes.medium} />
                    <Text style={styles.eventParagraph}>
                        Submit 10 delivery trips recorded through Devia.
                    </Text>
                </View>
                <View style={styles.eventListItemContainer}>
                    <Icon source="numeric-2-circle-outline" size={sizes.medium} />
                    <Text style={styles.eventParagraph}>
                        Each trip must include GPS recording and the post-trip route change questionnaire when applicable.
                    </Text>
                </View>
                <View style={styles.eventListItemContainer}>
                    <Icon source="numeric-3-circle-outline" size={sizes.medium} />
                    <Text style={styles.eventParagraph}>
                        Duplicate, incomplete, or unverifiable trips may be rejected during validation.
                    </Text>
                </View>

                <View style={styles.divider} />

                <Text style={styles.eventParagraphHeader}>Join inside Devia</Text>
                {participation ? (
                    <View style={styles.statusBox}>
                        <Icon source="check-circle" size={sizes.medium} color={theme.colors.primary} />
                        <Text style={styles.eventParagraph}>
                            You are registered for the Devia Route Study. Continue recording delivery trips until you
                            complete 10 submissions.
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.checkboxRow}>
                            <Checkbox
                                status={acceptedTerms ? 'checked' : 'unchecked'}
                                onPress={() => setAcceptedTerms(value => !value)}
                            />
                            <Text style={styles.checkboxLabel}>
                                I agree to the Devia Route Study terms and compensation conditions.
                            </Text>
                        </View>
                        <View style={styles.checkboxRow}>
                            <Checkbox
                                status={acceptedPrivacy ? 'checked' : 'unchecked'}
                                onPress={() => setAcceptedPrivacy(value => !value)}
                            />
                            <Text style={styles.checkboxLabel}>
                                I consent to collection and validation of my trip, route, and payment-claim data.
                            </Text>
                        </View>
                        <Button
                            contentStyle={{ flexDirection: 'row-reverse' }}
                            icon="chevron-right"
                            style={{ marginTop: sizes.medium }}
                            mode="contained"
                            loading={isSubmitting}
                            disabled={isSubmitting}
                            onPress={handleJoinStudy}
                        >
                            Join Study
                        </Button>
                    </>
                )}

                <View style={styles.divider} />

                <Text style={styles.eventParagraphHeader}>All submissions will be reviewed.</Text>
                <Text style={styles.eventParagraph}>
                    Duplicate trips won&apos;t be rewarded, and we prefer trips on delivery corridors or national roads. If your
                    trip is flagged in error, reach out to our team for a review.
                </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.eventDescriptionContainer}>
                <Text style={styles.sectionSubtitle}>Contact Information</Text>
                <Text style={styles.contactInfo}>Organizer: {events.eventOrganizer}</Text>
                <Text style={styles.contactInfo}>Email: {events.eventOrganizerEmail}</Text>
                <Text style={styles.contactInfo}>Phone: {events.eventOrganizerPhone}</Text>
            </View>
        </ScrollView>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            padding: sizes.medium,
        },
        sectionTitle: {
            fontSize: fontSizes.regular,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.medium,
        },
        eventCard: {
            backgroundColor: theme.colors.surface,
            padding: sizes.medium,
            borderRadius: sizes.medium,
            alignItems: 'center',
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
        },
        eventImage: {
            width: sizes.size72,
            height: sizes.size72,
            borderRadius: sizes.medium,
            marginBottom: sizes.small,
        },
        eventTitle: {
            fontSize: fontSizes.medium,
            fontFamily: 'LGEIHeadline-Bold',
            textAlign: 'center',
        },
        eventDate: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-SemiBold',
            color: theme.colors.onSurfaceVariant,
            marginTop: sizes.tiny,
        },
        eventLocation: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-Regular',
            color: theme.colors.onSurfaceVariant,
            marginTop: sizes.tiny,
        },
        divider: {
            height: 1,
            backgroundColor: theme.colors.outline,
            marginVertical: sizes.medium,
        },
        sectionSubtitle: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.small,
        },
        eventDescriptionContainer: {
            marginBottom: sizes.medium,
            backgroundColor: theme.colors.surface,
            padding: sizes.medium,
            borderRadius: sizes.medium,
            flex: 1,
        },
        eventDescription: {
            fontSize: fontSizes.tinyPlus,
            fontFamily: 'LGEIText-Regular',
            marginBottom: sizes.small,
        },
        contactInfo: {
            fontSize: fontSizes.tinyPlus,
            fontFamily: 'LGEIText-Regular',
            marginBottom: sizes.tiny,
        },
        eventParagraphHeader: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.tiny,
        },
        eventParagraph: {
            flex: 1,
            fontSize: fontSizes.tinyPlus,
            fontFamily: 'LGEIText-Regular',
            marginBottom: sizes.tiny,
        },
        eventListItemContainer: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginHorizontal: sizes.small,
            gap: sizes.small,
        },
        input: {
            marginTop: sizes.small,
        },
        checkboxRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginTop: sizes.small,
            gap: sizes.tiny,
        },
        checkboxLabel: {
            flex: 1,
            fontSize: fontSizes.tinyPlus,
            fontFamily: 'LGEIText-Regular',
            color: theme.colors.onSurface,
        },
        statusBox: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: sizes.small,
            padding: sizes.medium,
            borderRadius: sizes.small,
            backgroundColor: theme.colors.primaryContainer,
        },
    });
