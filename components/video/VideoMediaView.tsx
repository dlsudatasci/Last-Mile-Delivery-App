import { useVideoPlayer, VideoView } from 'expo-video';
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

interface VideoMediaViewProps {
    source: string;
    style?: StyleProp<ViewStyle>;
}

const VideoMediaView: React.FC<VideoMediaViewProps> = ({ source, style }) => {
    const player = useVideoPlayer(source, player => {
        player.loop = true;
        // player.play();
    });

    return <VideoView style={style} player={player} allowsFullscreen allowsPictureInPicture />;
};

export default VideoMediaView;
