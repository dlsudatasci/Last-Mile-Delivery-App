import { formatDuration } from '@/lib/common/formulas';
import { FetchRideData } from '@/lib/firebase-crud/rides';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { StyleSheet, View } from 'react-native';
import { Icon, MD3Theme, Text, useTheme } from 'react-native-paper';

export default function RideCard({ ride }: { ride: FetchRideData }) {
    const theme = useTheme();

    const styles = getStyles(theme);

    return (
        <View style={styles.rideCard}>
            <View style={styles.rideHeader}>
                <Text style={styles.rideTitle}>{ride.rideName}</Text>
                <Text style={styles.rideDate}>
                    {new Date(ride.createdAt).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                    })}
                </Text>
            </View>
            <View style={styles.rideStats}>
                <View>
                    <View style={styles.rideDetailLabel}>
                        <Icon source="map-marker-distance" size={16} />
                        <Text style={styles.rideDetailLabelText}>Distance</Text>
                    </View>
                    <Text style={styles.rideDetail}>{(ride.distance / 1000).toFixed(2)} km</Text>
                </View>
                <View>
                    <View style={styles.rideDetailLabel}>
                        <Icon source="clock-outline" size={16} />
                        <Text style={styles.rideDetailLabelText}>Duration</Text>
                    </View>
                    <Text style={styles.rideDetail}>{formatDuration(ride.duration)}</Text>
                </View>
                <View>
                    <View style={styles.rideDetailLabel}>
                        <Icon source="terrain" size={16} />
                        <Text style={styles.rideDetailLabelText}>Elevation</Text>
                    </View>
                    <Text style={styles.rideDetail}>{ride.elevationGain.toFixed(2)} m</Text>
                </View>
            </View>
        </View>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        ridesContainer: {
            padding: sizes.large,
            borderRadius: sizes.medium,
            flex: 1,
        },
        rideCard: {
            padding: sizes.medium,
            borderRadius: sizes.small,
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1,
            elevation: 1,
        },
        rideHeader: {
            flexDirection: 'column',
            marginBottom: sizes.small,
        },
        rideTitle: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIText-SemiBold',
        },
        rideDate: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-Regular',
        },
        rideStats: {
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        rideDetail: {
            fontSize: fontSizes.tinyPlus,
            fontFamily: 'LGEIText-Bold',
        },
        rideDetailLabel: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: sizes.tiny,
        },
        rideDetailLabelText: {
            fontSize: fontSizes.tiny,
            fontFamily: 'LGEIText-Regular',
        },
    });
