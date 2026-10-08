import HeaderBackButton from '@/components/common/HeaderBackButton';
import { SelectField } from '@/components/onboarding/FormFields';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, MD3Theme, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';

const PLATFORMS = ['Grab', 'Lalamove', 'Foodpanda', 'Angkas', 'Borzo', 'Other'];
const VEHICLES = ['Motorcycle', 'Bicycle', 'Car', 'Van', 'Other'];
const EXPERIENCE = ['Less than 1 year', '1 – 3 Years', '3 – 5 Years', 'More than 5 years'];
const AREAS = ['Metro Manila', 'Quezon City', 'Makati', 'Pasig', 'Taguig', 'Mandaluyong', 'Other'];

export default function StudyInformation() {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { study } = useLocalSearchParams<{ study?: string }>();

    const [platform, setPlatform] = useState('');
    const [vehicle, setVehicle] = useState('');
    const [experience, setExperience] = useState('');
    const [area, setArea] = useState('');

    const canContinue = platform && vehicle && experience && area;

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <HeaderBackButton onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Study Information</Text>
                <View style={{ width: sizes.size48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.studyName}>{study || 'DEVIA Route Study'}</Text>
                <Text style={styles.subtitle}>Please answer a few questions before you start.</Text>

                <SelectField label="Delivery / Service Platform" value={platform} placeholder="Select platform" options={PLATFORMS} onSelect={setPlatform} />
                <SelectField label="Vehicle Type" value={vehicle} placeholder="Select vehicle" options={VEHICLES} onSelect={setVehicle} />
                <SelectField label="Years of Experience" value={experience} placeholder="Select experience" options={EXPERIENCE} onSelect={setExperience} />
                <SelectField label="Usual Service Area" value={area} placeholder="Select area" options={AREAS} onSelect={setArea} />

                <Button
                    mode="contained"
                    buttonColor={TEAL}
                    textColor="#ffffff"
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                    disabled={!canContinue}
                    onPress={() => router.push('/main/(tabs)/record/destination')}
                >
                    Continue
                </Button>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.colors.background },
        header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sizes.small },
        headerTitle: {
            flex: 1,
            textAlign: 'center',
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.regular,
            color: theme.colors.onBackground,
        },
        content: { padding: sizes.large, paddingTop: sizes.small },
        studyName: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.small, color: TEAL, textAlign: 'center' },
        subtitle: {
            fontFamily: 'LGEIText-Regular',
            fontSize: fontSizes.tinyPlus,
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: sizes.tiny,
            marginBottom: sizes.large,
        },
        button: { marginTop: sizes.medium, borderRadius: sizes.small },
        buttonContent: { height: sizes.size56 },
        buttonLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small },
    });
