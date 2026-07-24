import CustomSnackbar, { SnackbarType } from '@/components/common/Snackbar';
import { createSupportRequest } from '@/lib/firebase-crud/support';
import { useCommunityRidesStore } from '@/lib/store/useCommunityRidesStore';
import { useEventsStore } from '@/lib/store/useEventsStore';
import { useRidesStore } from '@/lib/store/useRidesStore';
import { auth } from '@/lib/utils/firebaseConfig';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useUser } from '@/stores/useUser';
import { signOut } from '@react-native-firebase/auth';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Icon, List, MD3Theme, Modal, Portal, Text, TextInput, useTheme } from 'react-native-paper';

const SUPPORT_SUBJECTS = [
    { value: 'account', label: 'Account Issues', icon: 'account' },
    { value: 'app', label: 'App Problems', icon: 'rocket-launch' },
    { value: 'deliveries', label: 'Delivery Tracking', icon: 'motorbike' },
    { value: 'other', label: 'Other', icon: 'help-circle' },
];

export default function Profile() {
    const theme = useTheme();
    const { user, clearUser } = useUser();
    const { clearRides } = useRidesStore();
    const { clearEvents } = useEventsStore();
    const { clearRides: clearCommunityRides } = useCommunityRidesStore();
    const [supportModalVisible, setSupportModalVisible] = useState(false);
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [sending, setSending] = useState(false);

    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<SnackbarType>('info');

    const resetToast = () => {
        setToastMessage('');
        setToastVisible(false);
        setToastType('info');
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            clearUser();
            clearRides();
            clearEvents();
            clearCommunityRides();
            router.replace('/get-started');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleSendSupport = async () => {
        setSending(true);
        try {
            // Here you would send the support request

            await createSupportRequest(subject, description);
            setToastVisible(true);
            setToastMessage('Support request sent!');
            setToastType('success');
            setSupportModalVisible(false);
            setSubject('');
            setDescription('');
        } catch (error) {
            console.error('Error sending support request:', error);
        } finally {
            setSending(false);
        }
    };

    const styles = getStyles(theme);

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.profileHeader}>
                <View style={styles.profileInfo}>
                    <Text style={styles.username} numberOfLines={1} adjustsFontSizeToFit>
                        {user?.username}
                    </Text>
                    <Text style={styles.email}>{user?.phone ?? user?.email?.replace('@devia.app', '')}</Text>
                </View>
            </View>

            <View style={styles.menuContainer}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Account & Settings</Text>
                <List.Section>
                    <List.Item
                        title="Edit Profile"
                        description="Update your personal details"
                        left={props => <List.Icon {...props} icon="account-edit" />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => router.push('/main/account/profile/edit-profile')}
                        style={{ borderRadius: sizes.medium }}
                        titleStyle={{ color: theme.colors.onBackground }}
                        descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                    />

                    <List.Item
                        title="Help & Support"
                        description="Get help and contact support"
                        left={props => <List.Icon {...props} icon="help-circle" />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => setSupportModalVisible(true)}
                        style={{ borderRadius: sizes.medium }}
                        titleStyle={{ color: theme.colors.onBackground }}
                        descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                    />
                    <List.Item
                        title="Logout"
                        description="Logout of your account"
                        left={props => <List.Icon {...props} icon="logout" />}
                        right={props => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => {
                            Alert.alert('Logout', 'Are you sure you want to logout?', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Logout', onPress: handleLogout },
                            ]);
                        }}
                        style={{ borderRadius: sizes.medium }}
                        titleStyle={{ color: theme.colors.onBackground }}
                        descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                    />
                </List.Section>
            </View>

            <Portal>
                <Modal
                    visible={supportModalVisible}
                    onDismiss={() => setSupportModalVisible(false)}
                    contentContainerStyle={{
                        backgroundColor: theme.colors.surface,
                        margin: sizes.medium,
                        padding: sizes.medium,
                        borderRadius: sizes.medium,
                    }}
                >
                    <Text
                        style={{
                            fontFamily: 'LGEIHeadline-Bold',
                            fontSize: fontSizes.regular,
                            marginBottom: sizes.medium,
                        }}
                    >
                        Contact Support
                    </Text>

                    <View
                        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: sizes.small, marginBottom: sizes.medium }}
                    >
                        {SUPPORT_SUBJECTS.map(btn => (
                            <TouchableOpacity
                                key={btn.value}
                                onPress={() => setSubject(btn.value)}
                                style={{
                                    backgroundColor:
                                        subject === btn.value
                                            ? theme.colors.primaryContainer
                                            : theme.colors.surfaceVariant,
                                    paddingHorizontal: sizes.medium,
                                    paddingVertical: sizes.small,
                                    borderRadius: sizes.small,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: sizes.tiny,
                                }}
                            >
                                <Icon
                                    source={btn.icon}
                                    size={sizes.medium}
                                    color={
                                        subject === btn.value
                                            ? theme.colors.onPrimaryContainer
                                            : theme.colors.onSurfaceVariant
                                    }
                                />
                                <Text
                                    style={{
                                        color:
                                            subject === btn.value
                                                ? theme.colors.onPrimaryContainer
                                                : theme.colors.onSurfaceVariant,
                                        fontFamily:
                                            subject === btn.value ? 'LGEIHeadline-Bold' : 'LGEIHeadline-Regular',
                                    }}
                                >
                                    {btn.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        mode="outlined"
                        label="Description"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        style={{ marginBottom: sizes.medium }}
                    />

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: sizes.small }}>
                        <Button
                            mode="outlined"
                            onPress={() => setSupportModalVisible(false)}
                            disabled={sending}
                            style={{ minWidth: 100 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleSendSupport}
                            loading={sending}
                            disabled={!subject || !description || sending}
                            style={{ minWidth: 100 }}
                        >
                            Send
                        </Button>
                    </View>
                </Modal>
            </Portal>
            <CustomSnackbar
                message={toastMessage}
                onDismiss={() => resetToast()}
                visible={toastVisible}
                type={toastType}
            />
        </ScrollView>
    );
}

const getStyles = (theme: MD3Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            padding: sizes.large,
        },
        profileHeader: {
            padding: sizes.large,
            borderRadius: sizes.medium,
            marginBottom: sizes.large,
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1,
            elevation: 1,
        },
        profileInfo: {
            alignItems: 'center',
            marginTop: sizes.medium,
        },
        username: {
            fontSize: fontSizes.regular,
            fontFamily: 'LGEIHeadline-Bold',
            marginBottom: sizes.tiny,
            textAlign: 'center',
        },
        email: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIText-Regular',
            opacity: 0.7,
        },
        menuContainer: {
            padding: sizes.large,
            borderRadius: sizes.medium,
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1,
            elevation: 1,
        },
        menuButton: {
            marginBottom: sizes.medium,
            borderRadius: sizes.small,
        },
        buttonContent: {
            height: sizes.size56,
            justifyContent: 'flex-start',
            paddingLeft: sizes.medium,
        },
        logoutButton: {
            marginTop: sizes.large,
        },
        sectionTitle: {
            fontSize: fontSizes.small,
            fontFamily: 'LGEIHeadline-Semibold',
        },
    });
