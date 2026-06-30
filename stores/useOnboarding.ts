import { create } from 'zustand';

// In-memory (not persisted) draft state for the onboarding flow:
// phone is collected first, consent next, then the account is created on the
// "Tell us about yourself" step. `pendingStudyOffer` tells Home to show the
// Join Study pop-up once, right after the account is created.
interface OnboardingState {
    phone: string;
    acceptedPolicies: boolean;
    pendingStudyOffer: boolean;
    setPhone: (phone: string) => void;
    setAcceptedPolicies: (value: boolean) => void;
    setPendingStudyOffer: (value: boolean) => void;
    reset: () => void;
}

export const useOnboarding = create<OnboardingState>(set => ({
    phone: '',
    acceptedPolicies: false,
    pendingStudyOffer: false,
    setPhone: phone => set({ phone }),
    setAcceptedPolicies: acceptedPolicies => set({ acceptedPolicies }),
    setPendingStudyOffer: pendingStudyOffer => set({ pendingStudyOffer }),
    reset: () => set({ phone: '', acceptedPolicies: false, pendingStudyOffer: false }),
}));
