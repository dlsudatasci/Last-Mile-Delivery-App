import { MOCK_ACTIVE_STUDIES, MOCK_AVAILABLE_STUDIES } from '@/lib/mock/studies';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, IconButton, MD3Theme, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const TEAL = '#0E6E73';

export default function SelectStudy() {
    const theme = useTheme();
    const styles = getStyles(theme);

    const chooseStudy = (name: string) => {
        router.push({ pathname: '/main/(tabs)/record/study-information', params: { study: name } });
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <IconButton icon="chevron-left" size={sizes.size32} onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Select Study</Text>
                <View style={{ width: sizes.size48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionLabel}>JOINED STUDIES</Text>
                {MOCK_ACTIVE_STUDIES.map(study => (
                    <TouchableRipple key={study.id} style={styles.card} borderless onPress={() => chooseStudy(study.name)}>
                        <View style={styles.row}>
                            <View style={styles.flex}>
                                <Text style={styles.studyName}>{study.name}</Text>
                                <Text style={styles.studyMeta}>
                                    {study.tripsDone} / {study.tripsRequired} Trips
                                </Text>
                            </View>
                            <Icon source="chevron-right" size={sizes.size28} color="#94A3B8" />
                        </View>
                    </TouchableRipple>
                ))}

                <Text style={styles.sectionLabel}>AVAILABLE STUDIES</Text>
                {MOCK_AVAILABLE_STUDIES.map(study => (
                    <TouchableRipple key={study.id} style={styles.card} borderless onPress={() => chooseStudy(study.name)}>
                        <View style={styles.row}>
                            <View style={styles.flex}>
                                <Text style={styles.studyName}>{study.name}</Text>
                                <Text style={styles.notJoined}>Not Joined</Text>
                            </View>
                            <Icon source="chevron-right" size={sizes.size28} color="#94A3B8" />
                        </View>
                    </TouchableRipple>
                ))}

                <TouchableRipple borderless onPress={() => router.push('/main/(tabs)/community')} style={styles.viewAll}>
                    <Text style={styles.viewAllText}>View All Studies</Text>
                </TouchableRipple>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        safe: { flex: 1, backgroundColor: theme.colors.background },
        flex: { flex: 1 },
        header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sizes.small },
        headerTitle: {
            flex: 1,
            textAlign: 'center',
            fontFamily: 'LGEIHeadline-Bold',
            fontSize: fontSizes.regular,
            color: theme.colors.onBackground,
        },
        content: { padding: sizes.large, paddingTop: sizes.small },
        sectionLabel: {
            fontFamily: 'LGEIText-SemiBold',
            fontSize: fontSizes.tiny,
            color: theme.colors.onSurfaceVariant,
            letterSpacing: 1,
            marginTop: sizes.medium,
            marginBottom: sizes.small,
        },
        card: {
            backgroundColor: theme.colors.surface,
            borderRadius: sizes.medium,
            padding: sizes.medium,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant ?? '#E2E8F0',
            marginBottom: sizes.small,
        },
        row: { flexDirection: 'row', alignItems: 'center' },
        studyName: { fontFamily: 'LGEIHeadline-Bold', fontSize: fontSizes.small, color: theme.colors.onSurface },
        studyMeta: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: theme.colors.onSurfaceVariant, marginTop: 2 },
        notJoined: { fontFamily: 'LGEIText-Regular', fontSize: fontSizes.tiny, color: '#94A3B8', marginTop: 2 },
        viewAll: { alignSelf: 'center', marginTop: sizes.medium, padding: sizes.small },
        viewAllText: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small, color: TEAL },
    });
