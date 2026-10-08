import HeaderBackButton from '@/components/common/HeaderBackButton';
import { events } from '@/lib/common/events';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Button, MD3Theme, Text, useTheme } from 'react-native-paper';

export default function EventDetails() {
    const theme = useTheme();
    const { id } = useLocalSearchParams();

    const [event, setEvent] = useState<any | null>(null);

    useFocusEffect(
        useCallback(() => {
            const event = events.find(event => event.id === id);
            setEvent(event);
        }, [id])
    );

    const styles = getStyles(theme);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerLeft: () => <HeaderBackButton onPress={() => router.back()} />,
                }}
            />
            <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <Text style={styles.sectionTitle}>Event Details</Text>

                <View style={styles.eventCard}>
                    <Image source={{ uri: event?.eventOrganizerImage }} style={styles.eventImage} />
                    <Text style={styles.eventTitle}>{event?.eventName}</Text>
                    <Text style={styles.eventDate}>
                        {event?.eventDate.start && event?.eventDate.end
                            ? formatDate(event?.eventDate.start) + ' - ' + formatDate(event?.eventDate.end)
                            : formatDate(event?.eventDate.start)}
                    </Text>
                    <Text style={styles.eventOrganizerName}>{event?.eventOrganizer}</Text>
                    <Text style={styles.eventLocation}>{event?.eventLocation}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.eventDescriptionContainer}>
                    <Text style={styles.sectionSubtitle}>Description</Text>

                    <Text style={styles.eventDescription}>{event?.eventDescription}</Text>

                    <View style={styles.divider} />

                    <Button
                        mode="contained"
                        onPress={() => router.push('/main/events/ride-and-earn')}
                        style={styles.eventRegistrationButton}
                        icon="clipboard-edit-outline"
                    >
                        Join inside Devia
                    </Button>
                </View>

                <View style={styles.divider} />

                <View style={styles.eventDescriptionContainer}>
                    <Text style={styles.sectionSubtitle}>Contact Information</Text>
                    <Text style={styles.contactInfo}>Organizer: {event?.eventOrganizer}</Text>
                    <Text style={styles.contactInfo}>Email: {event?.eventOrganizerEmail}</Text>
                    <Text style={styles.contactInfo}>
                        Phone:{' '}
                        {event?.eventOrganizerPhone && event?.eventOrganizerPhone !== ''
                            ? event?.eventOrganizerPhone
                            : 'N/A'}
                    </Text>
                </View>
            </ScrollView>
        </>
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
        eventOrganizerName: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-SemiBold',
            color: theme.colors.onSurfaceVariant,
            marginTop: sizes.tiny,
        },
        eventLocation: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-Regular',
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
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
        eventRegistrationButton: {
            marginTop: sizes.medium,
        },
    });
