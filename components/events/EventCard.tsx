import { FetchEventData } from '@/lib/firebase-crud/events';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { Image, StyleSheet, View } from 'react-native';
import { Icon, MD3Theme, Text, useTheme } from 'react-native-paper';

export default function EventCard({ event }: { event: FetchEventData }) {
    const theme = useTheme();

    const styles = getStyles(theme);

    return (
        <View style={styles.eventCard}>
            {event.eventMedia && event.eventMedia.length > 0 && (
                <Image source={{ uri: event.eventMedia[0] }} style={styles.eventImage} resizeMode="cover" />
            )}
            <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>{event.eventName}</Text>
                    <Text style={styles.eventDate}>
                        {new Date(event.eventDate).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                        })}
                    </Text>
                </View>

                <Text style={styles.eventDescription} numberOfLines={2}>
                    {event.eventDescription}
                </Text>

                <View style={styles.eventDetails}>
                    <View style={styles.eventDetailItem}>
                        <Icon source="map-marker" size={16} />
                        <Text style={styles.eventDetailText}>{event.eventLocation}</Text>
                    </View>
                    <View style={styles.eventDetailItem}>
                        <Icon source="account" size={16} />
                        <Text style={styles.eventDetailText}>{event.eventOrganizer}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        eventCard: {
            borderRadius: sizes.small,
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1,
            elevation: 1,
            overflow: 'hidden',
        },
        eventImage: {
            width: '100%',
            height: 200,
        },
        eventContent: {
            padding: sizes.medium,
        },
        eventHeader: {
            flexDirection: 'column',
            marginBottom: sizes.small,
        },
        eventTitle: {
            fontSize: fontSizes.regular,
            fontFamily: 'LGEIText-SemiBold',
        },
        eventDate: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-Regular',
            color: theme.colors.onSurfaceVariant,
        },
        eventDescription: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIText-Regular',
            marginBottom: sizes.medium,
            color: theme.colors.onSurfaceVariant,
        },
        eventDetails: {
            gap: sizes.tiny,
        },
        eventDetailItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: sizes.tiny,
        },
        eventDetailText: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-Regular',
            color: theme.colors.onSurfaceVariant,
        },
    });
