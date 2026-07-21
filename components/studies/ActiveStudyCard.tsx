import { JoinedStudy } from '@/lib/studies';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { StyleSheet, View } from 'react-native';
import { MD3Theme, ProgressBar, Text, TouchableRipple, useTheme } from 'react-native-paper';

// Shared card for an in-progress (joined) study. Used on both Home and Studies
// so the two screens always show the same design and layout.
export default function ActiveStudyCard({ study, onPress }: { study: JoinedStudy; onPress?: () => void }) {
    const theme = useTheme();
    const styles = getStyles(theme);

    return (
        <TouchableRipple style={styles.card} borderless onPress={onPress} disabled={!onPress}>
            <View>
                <View style={styles.topRow}>
                    <Text style={styles.name} numberOfLines={1}>
                        {study.name}
                    </Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Joined</Text>
                    </View>
                </View>
                <Text style={styles.progressLabel}>Progress</Text>
                <View style={styles.progressRow}>
                    <Text style={styles.progressValue}>
                        {study.creditedTrips} / {study.tripsRequired} credited trips
                    </Text>
                    <Text style={styles.progressPercent}>{Math.round(study.progress * 100)}%</Text>
                </View>
                <ProgressBar progress={study.progress} color={theme.colors.primary} style={styles.progressBar} />
                <View style={styles.statsRow}>
                    <Text style={styles.statText}>{study.tripsRecorded} recorded</Text>
                    <Text style={styles.statText}>{study.overLimitTrips} over limit</Text>
                </View>
            </View>
        </TouchableRipple>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        card: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            padding: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            marginBottom: sizes.small,
        },
        topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
        name: {
            flex: 1,
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.small,
            color: theme.colors.onSurface,
        },
        badge: {
            backgroundColor: '#DCFCE7',
            paddingHorizontal: sizes.regular,
            paddingVertical: sizes.tiny,
            borderRadius: sizes.size32,
            marginLeft: sizes.small,
        },
        badgeText: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny, color: '#16A34A' },
        progressLabel: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
            marginTop: sizes.regular,
        },
        progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: sizes.tiny },
        progressValue: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.regular, color: theme.colors.onSurface },
        progressPercent: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small, color: theme.colors.primary },
        progressBar: { marginTop: sizes.small, height: sizes.small, borderRadius: sizes.small },
        statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: sizes.small },
        statText: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant },
    });
