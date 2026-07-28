import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface UserProfile {
    id: string;
    avatarUrl: string | null;
    email: string | null;
    username: string | null;
    createdAt: Date | null;
    // Onboarding profile fields
    phone?: string | null;
    fullName?: string | null;
    gender?: string | null;
    ageRange?: string | null;
    city?: string | null;
    yearsExperience?: string | null;
    isEnrolled?: boolean | null;
}

interface UserState {
    user: UserProfile | null;
    setUser: (user: UserProfile | null) => void;
    clearUser: () => void;
}

export const useUser = create<UserState>()(
    persist(
        set => ({
            user: null,
            setUser: user => set({ user }),
            clearUser: () => set({ user: null }),
        }),
        {
            name: 'user-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
