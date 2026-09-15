import HeaderBackButton from '@/components/common/HeaderBackButton';
import React, { useState } from 'react';
import { Alert, View, StyleSheet, Image, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
    Button,
    Checkbox,
    MD3Theme,
    Text,
    TextInput,
    useTheme,
    Surface,
} from 'react-native-paper';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';

export default function NewDelivery() {
    const theme = useTheme();
    const styles = getStyles(theme);

    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [platform, setPlatform] = useState('');
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [etaVisible, setEtaVisible] = useState(false);
    const [routeVisible, setRouteVisible] = useState(false);
    const [pointsVisible, setPointsVisible] = useState(false);

    const pickImage = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Permission needed', 'Please allow photo access to upload the optimized route screenshot.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });
            if (result.canceled) return;
            setScreenshot(result.assets[0].uri);
        } catch (err) {
            console.error(err);
        }
    };

    const takePhoto = async () => {
        try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Permission needed', 'Please allow camera access to capture the optimized route screenshot.');
                return;
            }
            const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
            if (result.canceled) return;
            setScreenshot(result.assets[0].uri);
        } catch (err) {
            console.error(err);
        }
    };

    const deliveryDetailsComplete = !!pickup.trim() && !!dropoff.trim() && !!platform.trim();
    const allChecks = deliveryDetailsComplete && !!screenshot && etaVisible && routeVisible && pointsVisible;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Stack.Screen
                options={{
                    title: 'New Delivery',
                    headerLeft: () => <HeaderBackButton onPress={() => router.back()} />,
                }}
            />

            <ScrollView contentContainerStyle={styles.content}>
            <Surface style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
                <Text style={styles.sectionTitle}>New Delivery</Text>

                <TextInput label="Pick-up location" value={pickup} onChangeText={setPickup} mode="outlined" style={styles.input} />
                <TextInput label="Drop-off location" value={dropoff} onChangeText={setDropoff} mode="outlined" style={styles.input} />
                <TextInput label="Delivery platform (e.g. Grab, Lalamove)" value={platform} onChangeText={setPlatform} mode="outlined" style={styles.input} />

                <View style={styles.uploadRow}>
                    <Button mode="outlined" onPress={pickImage} icon="image">
                        Upload Route Screenshot
                    </Button>
                    <Button mode="outlined" onPress={takePhoto} icon="camera">
                        Take Photo
                    </Button>
                </View>

                {screenshot ? (
                    <View style={styles.screenshotPreview}>
                        <Image source={{ uri: screenshot }} style={styles.screenshotImage} />
                    </View>
                ) : (
                    <Text style={{ marginTop: sizes.small, marginBottom: sizes.small, fontSize: fontSizes.tiny }}>
                        No screenshot uploaded yet.
                    </Text>
                )}

                {screenshot && (
                    <View style={styles.checklist}>
                        <View style={styles.checkItem}>
                            <Checkbox status={etaVisible ? 'checked' : 'unchecked'} onPress={() => setEtaVisible(v => !v)} />
                            <Text style={styles.checkLabel}>ETA Visible</Text>
                        </View>
                        <View style={styles.checkItem}>
                            <Checkbox status={routeVisible ? 'checked' : 'unchecked'} onPress={() => setRouteVisible(v => !v)} />
                            <Text style={styles.checkLabel}>Route visible</Text>
                        </View>
                        <View style={styles.checkItem}>
                            <Checkbox status={pointsVisible ? 'checked' : 'unchecked'} onPress={() => setPointsVisible(v => !v)} />
                            <Text style={styles.checkLabel}>Start and end point visible</Text>
                        </View>
                    </View>
                )}

                <View style={styles.buttonsRow}>
                    <Button mode="outlined" onPress={() => router.back()} style={styles.button}>
                        Back
                    </Button>
                    <Button
                        mode="contained"
                        onPress={() =>
                            router.push({
                                pathname: '/main/(tabs)/record',
                                params: {
                                    pickup: pickup.trim(),
                                    dropoff: dropoff.trim(),
                                    platform: platform.trim(),
                                    plannedRouteScreenshot: screenshot || '',
                                },
                            })
                        }
                        disabled={!allChecks}
                        style={styles.button}
                    >
                        Start Delivery
                    </Button>
                </View>
            </Surface>
            </ScrollView>
        </View>
    );
}

const getStyles = (theme?: MD3Theme) =>
    StyleSheet.create({
        container: { flex: 1 },
        content: {
            padding: sizes.medium,
        },
        formContainer: {
            padding: sizes.medium,
            borderRadius: sizes.medium,
        },
        sectionTitle: {
            fontSize: fontSizes.regular,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.small,
        },
        input: { marginBottom: sizes.small },
        uploadRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: sizes.small,
            justifyContent: 'space-between',
            marginTop: sizes.small,
        },
        screenshotPreview: { marginTop: sizes.small, alignItems: 'center' },
        screenshotImage: { width: '100%', height: 180, borderRadius: sizes.small, resizeMode: 'cover' },
        checklist: { marginTop: sizes.medium, gap: sizes.small },
        checkItem: { flexDirection: 'row', alignItems: 'center', gap: sizes.small },
        checkLabel: { fontSize: fontSizes.small, fontFamily: 'LGEIText-SemiBold' },
        buttonsRow: { marginTop: sizes.medium, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: sizes.small },
        button: { minWidth: 140, flexGrow: 1 },
    });
