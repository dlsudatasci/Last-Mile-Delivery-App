import { IncompleteFeedback } from '@/lib/review-questions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DeviationQuestionnaireAnswers } from '../deviation-questionnaire';

// Tracks the response state per trip (in-memory for the session).
//   • Trips WITH deviations -> per-deviation answers (keyed by deviation id).
//   • Trips WITHOUT deviations -> a single "route confirmation" feedback.
// Skipping marks a trip 'pending' so the rider can continue later; finishing
// marks it 'reviewed'. Answers are kept so a resumed review keeps prior input.

export interface DeviationAnswers {
    whyRoute: string;
    affect: string;
    confidence: string;
    questionnaire?: DeviationQuestionnaireAnswers;
    metadata?: DeviationMetadata;
    language?: 'en' | 'tl';
}

export interface DeviationMetadata {
    originalRoute?: string | null;
    dateTime?: string | null;
    isFaster?: boolean | null;
    timestamp?: number | null;
    hour?: number | null;
    dayOfWeek?: string | null;
    dayType?: 'Weekday' | 'Weekend' | null;
    gpsLocation?: { latitude: number; longitude: number } | null;
    originalRouteEdge?: string | null;
    deviatedEdge?: string | null;
    streetName?: string | null;
    generatedInstruction?: string | null;
    deviationInstruction?: string | null;
    imageUri?: string | null;
}

export interface PostTripAnswers {
    arrival: string;
    etaRating: number;
    stressRating: number;
    language?: 'en' | 'tl';
}

// Asked when a trip had NO deviations (the rider followed the optimal route).
export interface RouteFeedback {
    optimalRoute: string; // was the suggested/optimal route suitable?
    whyNoDeviation: string; // why no deviations were made
    experience: string; // overall experience with the optimal route
}

export type ReviewStatus = 'pending' | 'reviewed';

export interface TripReview {
    status: ReviewStatus;
    answers: Record<string, DeviationAnswers>; // keyed by deviation id
    postTrip?: PostTripAnswers;
    routeFeedback?: RouteFeedback; // for no-deviation trips
    incompleteFeedback?: IncompleteFeedback; // for trips that didn't reach the destination
}

interface TripReviewsState {
    reviews: Record<string, TripReview>;
    saveDeviation: (tripId: string, deviationId: string, answers: DeviationAnswers) => void;
    savePostTrip: (tripId: string, answers: PostTripAnswers) => void;
    saveRouteFeedback: (tripId: string, feedback: RouteFeedback) => void;
    saveIncompleteFeedback: (tripId: string, feedback: IncompleteFeedback) => void;
    markReviewed: (tripId: string) => void;
    markPending: (tripId: string) => void;
}

const INITIAL_REVIEWS: Record<string, TripReview> = {};

export const useTripReviews = create<TripReviewsState>()(
    persist(
        set => ({
            reviews: INITIAL_REVIEWS,
            saveDeviation: (tripId, deviationId, answers) =>
                set(state => {
                    const existing = state.reviews[tripId] ?? { status: 'pending' as ReviewStatus, answers: {} };
                    return {
                        reviews: {
                            ...state.reviews,
                            [tripId]: { ...existing, answers: { ...existing.answers, [deviationId]: answers } },
                        },
                    };
                }),
            savePostTrip: (tripId, answers) =>
                set(state => {
                    const existing = state.reviews[tripId] ?? { status: 'pending' as ReviewStatus, answers: {} };
                    return {
                        reviews: {
                            ...state.reviews,
                            [tripId]: { ...existing, postTrip: answers },
                        },
                    };
                }),
            saveRouteFeedback: (tripId, feedback) =>
                set(state => {
                    const existing = state.reviews[tripId] ?? { status: 'pending' as ReviewStatus, answers: {} };
                    return {
                        reviews: {
                            ...state.reviews,
                            [tripId]: { ...existing, routeFeedback: feedback },
                        },
                    };
                }),
            saveIncompleteFeedback: (tripId, feedback) =>
                set(state => {
                    const existing = state.reviews[tripId] ?? { status: 'pending' as ReviewStatus, answers: {} };
                    return {
                        reviews: {
                            ...state.reviews,
                            [tripId]: { ...existing, incompleteFeedback: feedback },
                        },
                    };
                }),
            markReviewed: tripId =>
                set(state => ({
                    reviews: {
                        ...state.reviews,
                        [tripId]: {
                            status: 'reviewed',
                            answers: state.reviews[tripId]?.answers ?? {},
                            postTrip: state.reviews[tripId]?.postTrip,
                            routeFeedback: state.reviews[tripId]?.routeFeedback,
                            incompleteFeedback: state.reviews[tripId]?.incompleteFeedback,
                        },
                    },
                })),
            markPending: tripId =>
                set(state => ({
                    reviews: {
                        ...state.reviews,
                        [tripId]: {
                            status: 'pending',
                            answers: state.reviews[tripId]?.answers ?? {},
                            postTrip: state.reviews[tripId]?.postTrip,
                            routeFeedback: state.reviews[tripId]?.routeFeedback,
                            incompleteFeedback: state.reviews[tripId]?.incompleteFeedback,
                        },
                    },
                })),
        }),
        {
            name: 'devia-trip-reviews',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: state => ({ reviews: state.reviews }),
        }
    )
);
