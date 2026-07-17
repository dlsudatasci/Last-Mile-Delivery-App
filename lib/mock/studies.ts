// -----------------------------------------------------------------------------
// Shared MOCK study data so Home and the Studies tab stay in sync.
// TODO: replace with the user's real joined/available studies from the backend.
// -----------------------------------------------------------------------------

export interface ActiveStudy {
    id: string;
    name: string;
    tripsDone: number;
    tripsRequired: number;
}

export interface AvailableStudy {
    id: string;
    name: string;
    reward: number;
    dates: string;
    description: string;
    tripsRequired: number;
    slotsLeft: number;
    org: string;
}

// Study enrollment is mandatory during onboarding, so a completed account is
// treated as joined in the local mock data until this is backed by persistence.
export const MOCK_ACTIVE_STUDIES: ActiveStudy[] = [
    {
        id: 'devia-route',
        name: 'Devia Route Study',
        tripsDone: 0,
        tripsRequired: 10,
    },
];

export const MOCK_AVAILABLE_STUDIES: AvailableStudy[] = [
    {
        id: 'devia-route',
        name: 'Devia Route Study',
        reward: 200,
        dates: 'May 1 – Aug 31, 2025',
        description: 'Record your delivery and personal trips so we can map the routes riders actually take and improve route suggestions for everyone.',
        tripsRequired: 10,
        slotsLeft: 24,
        org: 'DLSU Research Team',
    },
];
