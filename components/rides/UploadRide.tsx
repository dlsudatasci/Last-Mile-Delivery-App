import { sizes } from '@/lib/utils/responsive-sizing';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, MD3Theme, Text, useTheme } from 'react-native-paper';

export default function UploadRide() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = () => {
        bottomSheetModalRef.current?.present();
    };

    const onModalChange = (index: number) => {
        setIsModalOpen(index === 0);
    };

    const handleUploadGPX = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/octet-stream',
                copyToCacheDirectory: true,
                multiple: false,
            });

            console.log(result.assets?.[0]?.name);

            if (result.canceled === false) {
                console.log(result.assets[0].mimeType);
                // Handle successful file selection
                console.log('Selected file:', result.assets[0].uri);
                router.push({
                    pathname: '/main/rides/upload-gpx',
                    params: { gpx: result.assets[0].uri },
                });
                bottomSheetModalRef.current?.dismiss();
            }
        } catch (err) {
            console.error('Error picking file:', err);
        }
    };

    return (
        <>
            <Button
                mode="outlined"
                icon="plus"
                style={styles.button}
                textColor={theme.colors.onSurface}
                onPress={handleOpenModal}
            >
                Upload Ride
            </Button>
            <BottomSheetModal
                ref={bottomSheetModalRef}
                snapPoints={['40%']}
                onChange={onModalChange}
                backdropComponent={props => (
                    <BottomSheetBackdrop
                        {...props}
                        opacity={0.5}
                        enableTouchThrough={false}
                        appearsOnIndex={0}
                        disappearsOnIndex={-1}
                        style={[{ backgroundColor: 'rgba(0, 0, 0, 1)' }, StyleSheet.absoluteFillObject]}
                    />
                )}
                backgroundStyle={{ backgroundColor: theme.colors.surface }}
                enablePanDownToClose
                enableDismissOnClose
            >
                <BottomSheetView style={styles.contentContainer}>
                    <Text style={styles.modalTitle}>Upload Ride</Text>
                    <Text style={styles.modalSubtitle}>Choose how you'd like to upload your ride</Text>

                    <Button mode="contained" onPress={handleUploadGPX} icon="file" style={styles.modalButton}>
                        Upload GPX
                    </Button>
                </BottomSheetView>
            </BottomSheetModal>
        </>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        button: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.size128,
            borderColor: theme.colors.onSurface,
        },
        contentContainer: {
            padding: sizes.medium,
        },
        modalTitle: {
            fontSize: sizes.large,
            fontWeight: 'bold',
        },
        modalSubtitle: {
            fontSize: sizes.regular,
            color: theme.colors.onSurface,
        },
        buttonContainer: {
            marginTop: sizes.medium,
        },
        modalButton: {
            marginTop: sizes.medium,
            backgroundColor: theme.colors.primary,
            borderRadius: sizes.size128,
            borderColor: theme.colors.primary,
        },
    });
