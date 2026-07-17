// -----------------------------------------------------------------------------
// Shared MOCK trip data for the Trips tab (list, details, deviations, review).
// TODO: replace with real recorded-trip data from the backend.
//
// Status model (single, straightforward badge):
//   Study trips ALWAYS need a response — whether or not they deviated.
//     • has deviations  -> answer per-deviation questions
//     • no deviations   -> answer "route confirmation" questions
//   Responses are due the SAME DAY the trip happened (by 11:59 PM).
//     not answered, same day  -> "No response yet" (red) + due time
//     not answered, past day  -> "Expired" (gray)
//     answered                -> "Pending review" -> "Approved" / "Rejected"
//   Personal trips are not part of the research, so they just show "Personal".
// -----------------------------------------------------------------------------

export type TripStatus = 'Approved' | 'Pending' | 'Rejected';
export type TripType = 'Study' | 'Personal';

export interface Deviation {
    id: string;
    title: string; // action + place, e.g. "Turned left at 5th Ave"
    time: string;
    distanceIntoKm: number; // how far into the trip the deviation happened
    type: string; // e.g. "Turned left", "Took alternative road"
    location: string;
    from: string; // suggested action
    to: string; // actual action
}

export interface Trip {
    id: string;
    timestamp: number; // for daily/weekly/monthly filtering
    date: string;
    time: string;
    from: string;
    to: string;
    status: TripStatus;
    type: TripType;
    outcome?: 'arrived' | 'incomplete'; // did the rider reach the destination? (default arrived)
    studyName?: string;
    studyExpiresAt?: number; // when the study itself closes (study trips only)
    // suggested route
    distanceKm: number;
    estTimeMin: number;
    estFuelL: number;
    // actual route
    actualDistanceKm: number;
    actualTimeMin: number;
    actualFuelL: number;
    deviations: Deviation[];
}

export const statusColors: Record<TripStatus, { bg: string; text: string }> = {
    Approved: { bg: '#DCFCE7', text: '#16A34A' },
    Pending: { bg: '#FEF9C3', text: '#CA8A04' },
    Rejected: { bg: '#FEE2E2', text: '#DC2626' },
};

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => Date.now() - n * DAY;
const daysFromNow = (n: number) => Date.now() + n * DAY;
const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const STUDY_NAME = 'DEVIA Route Study';
const STUDY_EXPIRES = daysFromNow(16); // study closes in ~2 weeks

export const MOCK_TRIPS: Trip[] = [];

export const getTripById = (id: string) => MOCK_TRIPS.find(trip => trip.id === id);

// -----------------------------------------------------------------------------
// Display / status helpers
// -----------------------------------------------------------------------------

const COLOR = {
    red: { bg: '#FEE2E2', text: '#DC2626' },
    amber: { bg: '#FEF9C3', text: '#CA8A04' },
    green: { bg: '#DCFCE7', text: '#16A34A' },
    gray: { bg: '#E2E8F0', text: '#64748B' },
};

const isSameDay = (a: number, b: number) => {
    const x = new Date(a);
    const y = new Date(b);
    return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
};

// A trip's response is due by 11:59 PM on the day it happened.
export function formatDue(tripTimestamp: number, now: number = Date.now()): string {
    if (isSameDay(tripTimestamp, now)) return 'Due today · 11:59 PM';
    const d = new Date(tripTimestamp);
    return `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · 11:59 PM`;
}

export function formatStudyExpiry(ts: number): string {
    return new Date(ts).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Study trips need a research response; personal trips do not.
export const tripNeedsResponse = (trip: Trip) => trip.type === 'Study';

export interface TripDisplay {
    label: string;
    bg: string;
    text: string;
    canReview: boolean; // study trip, not answered yet, still within the deadline
    expired: boolean; // study trip, not answered, deadline passed
    isStudy: boolean;
    incomplete: boolean; // trip ended without reaching the destination
    dueLabel?: string; // e.g. "Due today · 11:59 PM" — only when canReview
}

export function getTripDisplay(trip: Trip, reviewed: boolean, now: number = Date.now()): TripDisplay {
    const isStudy = tripNeedsResponse(trip);
    const incomplete = trip.outcome === 'incomplete';

    // A trip that didn't reach the destination is automatically INVALID — it can't
    // be approved for the study. The rider can still answer the "why" questions, but
    // that's only for the research record; it never changes the invalid status.
    if (incomplete) {
        return { label: 'Invalid', ...COLOR.gray, canReview: false, expired: false, isStudy, incomplete: true };
    }

    // Personal trips are not reviewed for research.
    if (!isStudy) {
        return { label: 'Personal', ...COLOR.gray, canReview: false, expired: false, isStudy: false, incomplete };
    }

    // Study trip not yet answered — within the day it can be reviewed, otherwise expired.
    if (!reviewed) {
        if (isSameDay(trip.timestamp, now)) {
            return { label: 'No response yet', ...COLOR.red, canReview: true, expired: false, isStudy: true, incomplete, dueLabel: formatDue(trip.timestamp, now) };
        }
        return { label: 'Expired', ...COLOR.gray, canReview: false, expired: true, isStudy: true, incomplete };
    }

    // Answered → approval status.
    if (trip.status === 'Approved') return { label: 'Approved', ...COLOR.green, canReview: false, expired: false, isStudy: true, incomplete };
    if (trip.status === 'Rejected') return { label: 'Rejected', ...COLOR.red, canReview: false, expired: false, isStudy: true, incomplete };
    return { label: 'Pending review', ...COLOR.amber, canReview: false, expired: false, isStudy: true, incomplete };
}
