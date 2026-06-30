import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MD3Theme, Text, useTheme } from 'react-native-paper';

interface MediaItem {
    id: string;
    uri: string;
    type: 'image' | 'video';
    duration?: number;
    width: number;
    height: number;
}

interface CustomMediaPickerProps {
    onSelect: (media: MediaLibrary.AssetInfo) => void;
    maxItems?: number;
    columns?: number;
}

const { width } = Dimensions.get('window');

export const CustomMediaPicker: React.FC<CustomMediaPickerProps> = ({ onSelect, maxItems = 30, columns = 3 }) => {
    const theme = useTheme();

    const styles = getStyles(theme);

    const [media, setMedia] = useState<MediaLibrary.Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

    useEffect(() => {
        fetchMedia();
    }, []);

    const fetchMedia = async () => {
        try {
            if (permissionResponse?.status !== 'granted') {
                await requestPermission();
            }

            if (permissionResponse?.status === 'denied') {
                setError('Permission to access media library was denied');
                return;
            }

            const { assets } = await MediaLibrary.getAssetsAsync({
                mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
                first: maxItems,
                sortBy: ['creationTime'],
            });

            setMedia(assets);
        } catch (err) {
            setError(`Failed to fetch media: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const getAssetInfo = async (asset: MediaLibrary.Asset) => {
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
        return assetInfo;
    };

    const renderItem = ({ item }: { item: MediaLibrary.Asset }) => {
        const itemWidth = (width - (columns + 1) * 8) / columns;

        return (
            <TouchableOpacity
                style={[styles.mediaItem, { flex: 1, aspectRatio: 1 / 1, maxWidth: itemWidth }]}
                onPress={async () => onSelect(await getAssetInfo(item))}
            >
                <Image source={{ uri: item.uri }} style={styles.thumbnail} contentFit="cover" transition={200} />
                {item.mediaType === 'video' && (
                    <View style={styles.videoIndicator}>
                        <Ionicons name="videocam" size={16} color="white" />
                        {item.duration && <Text style={styles.duration}>{Math.floor(item.duration)}s</Text>}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text>{error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={media}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                numColumns={columns}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
            />
        </View>
    );
};

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.surface,
        },
        list: {
            padding: 4,
        },
        mediaItem: {
            margin: 4,
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: theme.colors.surface,
        },
        thumbnail: {
            width: '100%',
            height: '100%',
        },
        videoIndicator: {
            position: 'absolute',
            bottom: 4,
            right: 4,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: 4,
            borderRadius: 4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        duration: {
            color: 'white',
            fontSize: 12,
        },
        errorContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
        },
    });
