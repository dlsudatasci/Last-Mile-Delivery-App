import { useRef } from 'react';
import { Alert } from 'react-native';
import { useRideStore } from '@/lib/store/useRideStore';

// Read at press time, including paused trips. Merely opening/dismissing the
// confirmation must not touch recording, route, or background-location state.
export function useTripNavigationGuard() {
    const busy = useRef(false);
    return (navigate: () => void) => {
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
    };
}
