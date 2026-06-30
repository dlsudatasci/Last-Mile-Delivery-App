import { create } from 'zustand';

// Shared period filter for the Trips tab so the dropdown can live in the header
// (app/main/(tabs)/_layout.tsx) while the list (map/index.tsx) reads the value.
export type Period = 'Daily' | 'Weekly' | 'Monthly';
export const PERIODS: Period[] = ['Daily', 'Weekly', 'Monthly'];
export const PERIOD_DAYS: Record<Period, number> = { Daily: 1, Weekly: 7, Monthly: 30 };

interface TripsFilterState {
    period: Period;
    setPeriod: (period: Period) => void;
}

export const useTripsFilter = create<TripsFilterState>(set => ({
    period: 'Monthly',
    setPeriod: period => set({ period }),
}));
