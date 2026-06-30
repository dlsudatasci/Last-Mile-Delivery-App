import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useEvent } from 'expo';
import * as MediaLibrary from 'expo-media-library';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';
import { Button, MD3Theme, Text, useTheme } from 'react-native-paper';

export default function MediaView({ selectedMedia }: { selectedMedia: MediaLibrary.Asset }) {
    const theme = useTheme();
    const styles = getStyles(theme);
    const player = useVideoPlayer(selectedMedia.uri, player => {
        player.loop = true;
        player.play();
    });

    const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

    console.log(selectedMedia);
    return (
        <View style={styles.contentContainer}>
            <VideoView style={styles.video} player={player} allowsFullscreen allowsPictureInPicture />
            <View style={styles.controlsContainer}>
                <Button
                    mode="contained"
                    labelStyle={styles.buttonText}
                    onPress={() => {
                        if (isPlaying) {
                            player.pause();
                        } else {
                            player.play();
                        }
                    }}
                >
                    {isPlaying ? 'Pause' : 'Play'}
                </Button>
            </View>
            <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Creation Time:</Text>
                    <Text style={styles.infoValue}>{new Date(selectedMedia.creationTime).toISOString()}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Type:</Text>
                    <Text style={styles.infoValue}>{selectedMedia.mediaType}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Duration:</Text>
                    <Text style={styles.infoValue}>{selectedMedia.duration?.toFixed(1)}s</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Created:</Text>
                    <Text style={styles.infoValue}>
                        {new Date(selectedMedia.creationTime * 1000).toLocaleDateString()}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            padding: sizes.large,
            justifyContent: 'center',
        },
        messageContainer: {
            padding: sizes.large,
            borderRadius: sizes.medium,
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1,
            elevation: 1,
        },
        title: {
            fontSize: fontSizes.subtitle,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.large,
            textAlign: 'center',
        },
        mediaList: {
            width: '100%',
            maxHeight: 200,
            marginBottom: sizes.medium,
        },
        mediaItem: {
            padding: sizes.medium,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outlineVariant,
        },
        selectedMediaItem: {
            backgroundColor: theme.colors.primaryContainer,
        },
        mediaItemText: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIText-Regular',
        },
        button: {
            backgroundColor: theme.colors.primary,
            padding: sizes.medium,
            borderRadius: sizes.medium,
            marginBottom: sizes.medium,
        },
        buttonText: {
            color: theme.colors.onPrimary,
            fontFamily: 'LGEIText-SemiBold',
        },
        contentContainer: {
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: sizes.medium,
        },
        video: {
            width: '100%',
            aspectRatio: 16 / 9,
            marginBottom: sizes.medium,
        },
        controlsContainer: {
            padding: sizes.small,
        },
        infoContainer: {
            width: '100%',
            padding: sizes.medium,
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
        },
        infoRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: sizes.small,
        },
        infoLabel: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIText-Regular',
        },
        infoValue: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIText-Regular',
        },
    });
