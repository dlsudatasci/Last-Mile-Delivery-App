import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useFocusEffect, useNavigation, usePreventRemove } from '@react-navigation/native';
import type { NavigationAction } from '@react-navigation/native';
import { router } from 'expo-router';
import { useRideStore } from '@/lib/store/useRideStore';

// Read at press time, including paused trips. Merely opening/dismissing the
// confirmation must not touch recording, route, or background-location state.
export function useTripNavigationGuard() {
    const busy = useRef(false);
    return useCallback((navigate: () => void) => {
        if (busy.current) return;
        if (!useRideStore.getState().isRecording) {
            navigate();
            return;
        }
        busy.current = true;
        let confirmed = false;
        Alert.alert(
            'Trip in Progress',
            'You must cancel the current trip before navigating away. All recorded data will be lost.',
            [
                { text: 'Continue Trip', style: 'cancel', onPress: () => { busy.current = false; } },
                {
                    text: 'Cancel Trip', style: 'destructive',
                    onPress: async () => {
                        if (confirmed) return;
                        confirmed = true;
                        try {
                            await useRideStore.getState().resetRide();
                            navigate();
                        } catch {
                            Alert.alert('Error', 'Unable to cancel the trip. Please try again.');
                        } finally {
                            busy.current = false;
                        }
                    },
                },
            ],
            { cancelable: true, onDismiss: () => { busy.current = false; } }
        );
    }, []);
}

export function useRecordingBackGuard() {
    const isRecording = useRideStore(state => state.isRecording);
    const navigation = useNavigation();
    const confirmCancellation = useTripNavigationGuard();
    const [pendingAction, setPendingAction] = useState<NavigationAction | null>(null);
    const requestBack = () => confirmCancellation(() => setPendingAction({ type: 'GO_BACK' }));
    usePreventRemove(isRecording, ({ data }) => {
        confirmCancellation(() => setPendingAction(data.action));
    });
    // Dispatch only after the removal guard has observed the completed reset.
    useEffect(() => {
        if (!isRecording && pendingAction) {
            setPendingAction(null);
            if (pendingAction.type === 'GO_BACK' && !navigation.canGoBack()) router.replace('/main/(tabs)/home');
            else navigation.dispatch(pendingAction);
        }
    }, [isRecording, navigation, pendingAction]);
    useFocusEffect(useCallback(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            if (!useRideStore.getState().isRecording) return false;
            confirmCancellation(() => setPendingAction({ type: 'GO_BACK' }));
            return true;
        });
        return () => subscription.remove();
    }, [confirmCancellation]));
    return requestBack;
}
