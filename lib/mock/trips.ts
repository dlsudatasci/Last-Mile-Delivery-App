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

export const MOCK_TRIPS: Trip[] = [
    // 1) Study, today, HAS deviations, not answered yet -> "No response yet" + due today
    {
        id: 'trip-1',
        timestamp: daysAgo(0),
        date: fmtDate(daysAgo(0)),
        time: '8:45 AM',
        from: 'Makati',
        to: 'BGC',
        status: 'Pending',
        type: 'Study',
        studyName: STUDY_NAME,
        studyExpiresAt: STUDY_EXPIRES,
        distanceKm: 12.4,
        estTimeMin: 28,
        estFuelL: 0.6,
        actualDistanceKm: 13.1,
        actualTimeMin: 31,
        actualFuelL: 0.7,
        deviations: [
            { id: 'd1', title: 'Turned left at 5th Ave', time: '8:52 AM', distanceIntoKm: 5.6, type: 'Turned left', location: '5th Ave, Taguig City', from: 'Go straight', to: 'Turned left' },
            { id: 'd2', title: 'Took C5 Service Road', time: '9:05 AM', distanceIntoKm: 7.8, type: 'Took alternative road', location: 'C5 Service Road, Taguig', from: 'Stay on route', to: 'Took alternative road' },
            { id: 'd3', title: 'Skipped suggested road in BGC', time: '9:18 AM', distanceIntoKm: 10.3, type: 'Skipped suggested road', location: 'BGC, Taguig City', from: 'Turn right', to: 'Skipped suggested road' },
        ],
    },
    // 2) Study, today, NO deviations, not answered yet -> still needs route-confirmation response
    {
        id: 'trip-2',
        timestamp: daysAgo(0),
        date: fmtDate(daysAgo(0)),
        time: '7:10 AM',
        from: 'Mandaluyong',
        to: 'Ortigas',
        status: 'Pending',
        type: 'Study',
        studyName: STUDY_NAME,
        studyExpiresAt: STUDY_EXPIRES,
        distanceKm: 6.5,
        estTimeMin: 18,
        estFuelL: 0.4,
        actualDistanceKm: 6.5,
        actualTimeMin: 19,
        actualFuelL: 0.4,
        deviations: [],
    },
    // 3) Study, 2 days ago, HAS deviations, ANSWERED + APPROVED  (responses recorded)
    {
        id: 'trip-3',
        timestamp: daysAgo(2),
        date: fmtDate(daysAgo(2)),
        time: '2:30 PM',
        from: 'Manila',
        to: 'Makati',
        status: 'Approved',
        type: 'Study',
        studyName: STUDY_NAME,
        studyExpiresAt: STUDY_EXPIRES,
        distanceKm: 9.8,
        estTimeMin: 24,
        estFuelL: 0.5,
        actualDistanceKm: 10.6,
        actualTimeMin: 27,
        actualFuelL: 0.6,
        deviations: [
            { id: 'd1', title: 'Took alternative road on Osmeña Hwy', time: '2:41 PM', distanceIntoKm: 3.2, type: 'Took alternative road', location: 'Osmeña Hwy, Manila', from: 'Stay on route', to: 'Took alternative road' },
            { id: 'd2', title: 'Turned right at Ayala Ave', time: '2:55 PM', distanceIntoKm: 6.7, type: 'Turned right', location: 'Ayala Ave, Makati', from: 'Go straight', to: 'Turned right' },
        ],
    },
    // 4) Study, 4 days ago, NO deviations, ANSWERED route questions + APPROVED
    {
        id: 'trip-4',
        timestamp: daysAgo(4),
        date: fmtDate(daysAgo(4)),
        time: '6:20 AM',
        from: 'Pasay',
        to: 'Makati',
        status: 'Approved',
        type: 'Study',
        studyName: STUDY_NAME,
        studyExpiresAt: STUDY_EXPIRES,
        distanceKm: 7.9,
        estTimeMin: 20,
        estFuelL: 0.4,
        actualDistanceKm: 7.9,
        actualTimeMin: 21,
        actualFuelL: 0.4,
        deviations: [],
    },
    // 5) Study, 18 days ago, HAS deviation, never answered -> Expired (past the day)
    {
        id: 'trip-5',
        timestamp: daysAgo(18),
        date: fmtDate(daysAgo(18)),
        time: '11:10 AM',
        from: 'Pasig',
        to: 'Ortigas',
        status: 'Pending',
        type: 'Study',
        studyName: STUDY_NAME,
        studyExpiresAt: STUDY_EXPIRES,
        distanceKm: 5.2,
        estTimeMin: 16,
        estFuelL: 0.3,
        actualDistanceKm: 5.6,
        actualTimeMin: 18,
        actualFuelL: 0.3,
        deviations: [
            { id: 'd1', title: 'U-turned at Ortigas Ave', time: '11:18 AM', distanceIntoKm: 2.1, type: 'Made a U-turn', location: 'Ortigas Ave, Pasig', from: 'Continue', to: 'Made a U-turn' },
        ],
    },
    // 7) Study trip that ENDED WITHOUT reaching the destination — answered (approved)
    {
        id: 'trip-7',
        timestamp: daysAgo(1),
        date: fmtDate(daysAgo(1)),
        time: '4:05 PM',
        from: 'Makati',
        to: 'BGC',
        status: 'Approved',
        type: 'Study',
        outcome: 'incomplete',
        studyName: STUDY_NAME,
        studyExpiresAt: STUDY_EXPIRES,
        distanceKm: 12.4,
        estTimeMin: 28,
        estFuelL: 0.6,
        actualDistanceKm: 7.8,
        actualTimeMin: 19,
        actualFuelL: 0.4,
        deviations: [],
    },
    // 8) Study trip that ended early TODAY — not answered yet (answer incomplete questions)
    {
        id: 'trip-8',
        timestamp: daysAgo(0),
        date: fmtDate(daysAgo(0)),
        time: '9:30 AM',
        from: 'Taft Avenue',
        to: 'Cubao',
        status: 'Pending',
        type: 'Study',
        outcome: 'incomplete',
        studyName: STUDY_NAME,
        studyExpiresAt: STUDY_EXPIRES,
        distanceKm: 10.1,
        estTimeMin: 26,
        estFuelL: 0.5,
        actualDistanceKm: 4.2,
        actualTimeMin: 12,
        actualFuelL: 0.2,
        deviations: [],
    },
    // 6) Personal trip — not part of research, no response needed
    {
        id: 'trip-6',
        timestamp: daysAgo(1),
        date: fmtDate(daysAgo(1)),
        time: '5:40 PM',
        from: 'Makati',
        to: 'Quezon City',
        status: 'Approved',
        type: 'Personal',
        distanceKm: 14.7,
        estTimeMin: 35,
        estFuelL: 0.8,
        actualDistanceKm: 15.1,
        actualTimeMin: 38,
        actualFuelL: 0.8,
        deviations: [],
    },
];

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
