import { STUDY_COMPENSATION_AMOUNT, STUDY_REQUIRED_SUBMISSIONS } from '@/lib/firebase-crud/study';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, IconButton, Modal, Portal, Text } from 'react-native-paper';

const TEAL = '#0E6E73';

const PERKS = [
    { icon: 'map-marker-path', label: 'Record\nTrips' },
    { icon: 'clipboard-text-outline', label: 'Answer\nQuestions' },
    { icon: 'account-group-outline', label: 'Help\nResearchers' },
    { icon: 'gift-outline', label: 'Earn\nRewards' },
];

type Props = {
    visible: boolean;
    onJoin: () => void;
    onClose: () => void;
    loading?: boolean;
};

export default function StudyOverviewModal({ visible, onJoin, onClose, loading }: Props) {
    return (
        <Portal>
            <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
                <IconButton icon="close" size={sizes.medium} onPress={onClose} style={styles.close} />

                <View style={styles.illustration}>
                    <Icon source="motorbike" size={sizes.size64} color={TEAL} />
                </View>

                <Text style={styles.title}>DEVIA ROUTE STUDY</Text>
                <Text style={styles.subtitle}>Help improve navigation and transportation research.</Text>

                <Text style={styles.earnLabel}>Record your trips through DEVIA and earn:</Text>
                <Text style={styles.amount}>₱{STUDY_COMPENSATION_AMOUNT}</Text>
                <Text style={styles.amountNote}>after {STUDY_REQUIRED_SUBMISSIONS} validated trips</Text>

                <View style={styles.perks}>
                    {PERKS.map(perk => (
                        <View key={perk.label} style={styles.perk}>
                            <Icon source={perk.icon} size={sizes.size32} color={TEAL} />
                            <Text style={styles.perkLabel}>{perk.label}</Text>
                        </View>
                    ))}
                </View>

                <Button
                    mode="contained"
                    buttonColor={TEAL}
                    textColor="#ffffff"
                    style={styles.joinButton}
                    contentStyle={styles.joinContent}
                    labelStyle={styles.joinLabel}
                    onPress={onJoin}
                    loading={loading}
                    disabled={loading}
                >
                    Join Study
                </Button>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    modal: {
        backgroundColor: '#ffffff',
        marginHorizontal: sizes.large,
        borderRadius: sizes.medium,
        padding: sizes.large,
        alignItems: 'center',
    },
    close: { position: 'absolute', top: sizes.tiny, right: sizes.tiny, margin: 0, zIndex: 1 },
    illustration: {
        width: sizes.size112,
        height: sizes.size112,
        borderRadius: sizes.size112 / 2,
        backgroundColor: '#E6F2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: sizes.small,
        marginBottom: sizes.medium,
    },
    title: {
        fontFamily: 'LGEIHeadline-Bold',
        fontSize: fontSizes.regular,
        color: '#0F172A',
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.tinyPlus,
        color: '#64748B',
        textAlign: 'center',
        marginTop: sizes.tiny,
    },
    earnLabel: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.tiny,
        color: '#64748B',
        textAlign: 'center',
        marginTop: sizes.medium,
    },
    amount: {
        fontFamily: 'LGEIHeadline-Bold',
        fontSize: fontSizes.title,
        color: TEAL,
        textAlign: 'center',
    },
    amountNote: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.tiny,
        color: '#64748B',
        textAlign: 'center',
    },
    perks: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: sizes.large,
        marginBottom: sizes.large,
    },
    perk: { alignItems: 'center', flex: 1 },
    perkLabel: {
        fontFamily: 'LGEIText-SemiBold',
        fontSize: fontSizes.tiny,
        color: '#475569',
        textAlign: 'center',
        marginTop: sizes.tiny,
    },
    joinButton: { width: '100%', borderRadius: sizes.small },
    joinContent: { height: sizes.size56 },
    joinLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small },
});
