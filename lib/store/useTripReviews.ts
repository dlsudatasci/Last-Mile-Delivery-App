import { IncompleteFeedback } from '@/lib/review-questions';
import { create } from 'zustand';

// Tracks the response state per trip (in-memory for the session).
//   • Trips WITH deviations -> per-deviation answers (keyed by deviation id).
//   • Trips WITHOUT deviations -> a single "route confirmation" feedback.
// Skipping marks a trip 'pending' so the rider can continue later; finishing
// marks it 'reviewed'. Answers are kept so a resumed review keeps prior input.

export interface DeviationAnswers {
    whyRoute: string;
    affect: string;
    confidence: string;
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
    routeFeedback?: RouteFeedback; // for no-deviation trips
    incompleteFeedback?: IncompleteFeedback; // for trips that didn't reach the destination
}

interface TripReviewsState {
    reviews: Record<string, TripReview>;
    saveDeviation: (tripId: string, deviationId: string, answers: DeviationAnswers) => void;
    saveRouteFeedback: (tripId: string, feedback: RouteFeedback) => void;
    saveIncompleteFeedback: (tripId: string, feedback: IncompleteFeedback) => void;
    markReviewed: (tripId: string) => void;
    markPending: (tripId: string) => void;
}

// Seeded mock responses so a couple of trips show as already answered + approved.
const INITIAL_REVIEWS: Record<string, TripReview> = {
    // trip-3: approved study trip WITH deviations and recorded responses
    'trip-3': {
        status: 'reviewed',
        answers: {
            d1: { whyRoute: 'Matinding trapiko', affect: 'Nakatipid sa oras', confidence: 'Sigurado' },
            d2: { whyRoute: 'Mas maikling ruta', affect: 'Nakaikli ng distansya', confidence: 'Sobrang sigurado' },
        },
    },
    // trip-4: approved study trip with NO deviations — route-confirmation feedback
    'trip-4': {
        status: 'reviewed',
        answers: {},
        routeFeedback: {
            optimalRoute: 'Oo, ito ang pinakamagandang ruta',
            whyNoDeviation: 'Pinakamabilis na ang iminungkahing ruta',
            experience: 'Maganda',
        },
    },
    // trip-7: trip that ENDED WITHOUT reaching the destination — incomplete feedback
    'trip-7': {
        status: 'reviewed',
        answers: {},
        incompleteFeedback: {
            reason: 'Nakansela ang order / booking',
            distanceReached: 'Lampas kalahati',
            willRetry: 'Hindi',
        },
    },
};

export const useTripReviews = create<TripReviewsState>(set => ({
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
                    routeFeedback: state.reviews[tripId]?.routeFeedback,
                    incompleteFeedback: state.reviews[tripId]?.incompleteFeedback,
                },
            },
        })),
}));
