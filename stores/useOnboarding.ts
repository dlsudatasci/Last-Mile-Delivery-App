import { create } from 'zustand';

// In-memory (not persisted) draft state for the onboarding flow:
// rider code is collected first, then combined consent, phone, and profile
// details. The account is finalized on the Register step.
interface OnboardingState {
    riderCode: string;
    phone: string;
    acceptedPolicies: boolean;
    setRiderCode: (code: string) => void;
    setPhone: (phone: string) => void;
    setAcceptedPolicies: (value: boolean) => void;
    reset: () => void;
}

export const useOnboarding = create<OnboardingState>(set => ({
    riderCode: '',
    phone: '',
    acceptedPolicies: false,
    setRiderCode: riderCode => set({ riderCode }),
    setPhone: phone => set({ phone }),
    setAcceptedPolicies: acceptedPolicies => set({ acceptedPolicies }),
    reset: () => set({ riderCode: '', phone: '', acceptedPolicies: false }),
}));
