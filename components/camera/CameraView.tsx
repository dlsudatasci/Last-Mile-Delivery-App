import { sizes } from '@/lib/utils/responsive-sizing';
import { Camera, CameraMode, CameraType, CameraView } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, useTheme } from 'react-native-paper';

interface CameraViewProps {
    onCapture: (uri: string, type: 'image' | 'video') => void;
    onClose: () => void;
}

export default function OpenCameraView({ onCapture, onClose }: CameraViewProps) {
    const theme = useTheme();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [mode, setMode] = useState<CameraMode>('picture');
    const [type, setType] = useState<CameraType>('back');
    const [isRecording, setIsRecording] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const handleTakePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    skipProcessing: false,
                });

                if (photo) {
                    onCapture(photo.uri, 'image');
                }
            } catch (error) {
                console.error('Error taking picture:', error);
            }
        }
    };

    const handleStartRecording = async () => {
        if (cameraRef.current) {
            try {
                setIsRecording(true);
                const video = await cameraRef.current.recordAsync({
                    maxDuration: 30,
                });

                if (video) {
                    onCapture(video.uri, 'video');
                }
            } catch (error) {
                console.error('Error recording video:', error);
            } finally {
                setIsRecording(false);
            }
        }
    };

    const handleStopRecording = async () => {
        if (cameraRef.current && isRecording) {
            try {
                await cameraRef.current.stopRecording();
            } catch (error) {
                console.error('Error stopping recording:', error);
            }
        }
    };

    const toggleCameraType = () => {
        setType(current => (current === 'back' ? 'front' : 'back'));
    };

    const toggleCameraMode = () => {
        setMode(current => (current === 'picture' ? 'video' : 'picture'));
    };

    if (hasPermission === null) {
        return <View style={styles.container} />;
    }

    if (hasPermission === false) {
        return <View style={styles.container} />;
    }

    return (
        <View style={styles.container}>
            <CameraView
                ref={cameraRef}
                responsiveOrientationWhenOrientationLocked
                style={styles.camera}
                videoQuality={'720p'}
                facing={type}
                mode={mode}
                ratio="16:9"
            >
                <View style={styles.buttonContainer}>
                    <IconButton
                        icon="close"
                        size={24}
                        iconColor={theme.colors.onPrimary}
                        style={styles.closeButton}
                        onPress={onClose}
                    />
                    <IconButton
                        icon="camera-flip"
                        size={24}
                        iconColor={theme.colors.onPrimary}
                        style={styles.flipButton}
                        onPress={toggleCameraType}
                    />
                </View>

                <View style={styles.bottomControls}>
                    <View style={styles.modeToggle}>
                        <IconButton
                            icon="image"
                            size={24}
                            iconColor={mode === 'picture' ? theme.colors.primary : theme.colors.onPrimary}
                            style={[styles.modeButton, mode === 'picture' && styles.activeModeButton]}
                            onPress={() => setMode('picture')}
                        />
                        <IconButton
                            icon="video"
                            size={24}
                            iconColor={mode === 'video' ? theme.colors.primary : theme.colors.onPrimary}
                            style={[styles.modeButton, mode === 'video' && styles.activeModeButton]}
                            onPress={() => setMode('video')}
                        />
                    </View>

                    <View style={styles.captureContainer}>
                        {isRecording ? (
                            <IconButton
                                icon="stop"
                                size={32}
                                iconColor={theme.colors.error}
                                style={[styles.captureButton, styles.recordingButton]}
                                onPress={handleStopRecording}
                            />
                        ) : (
                            <IconButton
                                icon={mode === 'picture' ? 'camera' : 'video'}
                                size={32}
                                iconColor={theme.colors.onPrimary}
                                style={[styles.captureButton, mode === 'video' && styles.videoButton]}
                                onPress={mode === 'picture' ? handleTakePicture : handleStartRecording}
                            />
                        )}
                    </View>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    camera: {
        flex: 1,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: sizes.medium,
    },
    closeButton: {
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    flipButton: {
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    bottomControls: {
        position: 'absolute',
        bottom: sizes.large,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: sizes.large,
    },
    modeToggle: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: sizes.medium,
        padding: sizes.tiny,
    },
    modeButton: {
        margin: 0,
    },
    activeModeButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    captureContainer: {
        alignItems: 'center',
    },
    captureButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 4,
        borderColor: 'white',
        width: 72,
        height: 72,
        borderRadius: 36,
    },
    videoButton: {
        backgroundColor: 'rgba(255,0,0,0.2)',
        borderColor: 'red',
    },
    recordingButton: {
        backgroundColor: 'rgba(255,0,0,0.5)',
        borderColor: 'red',
    },
});
