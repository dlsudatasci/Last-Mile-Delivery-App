export interface StudyProgress {
    tripsRecorded: number;
    creditedTrips: number;
    overLimitTrips: number;
    progress: number;
}

export interface JoinedStudy extends StudyProgress {
    id: string;
    name: string;
    reward: number;
    dates: string;
    description: string;
    tripsRequired: number;
    org: string;
    joined: boolean;
}

export const DEVIA_ROUTE_STUDY = {
    id: 'devia-route',
    name: 'Devia Route Study',
    reward: 250,
    dates: 'July 23 - July 24, 2025',
    description:
        'Record up to 5 delivery trips for the DEVIA route study. Each credited trip helps researchers understand real rider route choices.',
    tripsRequired: 5,
    org: 'DLSU Research Team',
} as const;

export const STUDY_TRIP_LIMIT: number = DEVIA_ROUTE_STUDY.tripsRequired;

export const getStudyProgress = (tripsRecorded: number, tripsRequired: number = STUDY_TRIP_LIMIT): StudyProgress => {
    const safeTripsRecorded = Math.max(0, Math.floor(Number.isFinite(tripsRecorded) ? tripsRecorded : 0));
    const safeTripsRequired = Math.max(1, Math.floor(Number.isFinite(tripsRequired) ? tripsRequired : STUDY_TRIP_LIMIT));
    const creditedTrips = Math.min(safeTripsRecorded, safeTripsRequired);

    return {
        tripsRecorded: safeTripsRecorded,
        creditedTrips,
        overLimitTrips: Math.max(0, safeTripsRecorded - creditedTrips),
        progress: creditedTrips / safeTripsRequired,
    };
};

export const getJoinedDeviaRouteStudy = (tripsRecorded: number, joined: boolean = false): JoinedStudy => ({
    ...DEVIA_ROUTE_STUDY,
    joined,
    ...getStudyProgress(tripsRecorded, DEVIA_ROUTE_STUDY.tripsRequired),
});

export const JOINED_STUDIES = [DEVIA_ROUTE_STUDY];
