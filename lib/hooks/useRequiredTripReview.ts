import { useCallback } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import { useTripReviews } from '@/lib/store/useTripReviews';

export function showRequiredReviewNotice() {
    Alert.alert('Complete Trip Review', 'Please complete and submit the post-trip questionnaire before leaving.');
}

export function useRequiredTripReview(rideId?: string) {
    const reviewed = useTripReviews(state => !!rideId && state.reviews[rideId]?.status === 'reviewed');
    // Remains mounted beneath the deviation pages: pushes/back within the review
    // are allowed, but removing its root (including via a parent) is not.
    usePreventRemove(!reviewed, showRequiredReviewNotice);
    useFocusEffect(useCallback(() => {
        if (reviewed) return;
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            showRequiredReviewNotice();
            return true;
        });
        return () => subscription.remove();
    }, [reviewed]));
    return reviewed;
}
