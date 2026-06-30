// Questions asked when a rider ENDED a trip WITHOUT reaching the destination.
// Shared by the recorder end-of-trip screen and the Trips "continue later" review.

export interface IncompleteFeedback {
    reason: string; // why the trip ended early
    distanceReached: string; // how far they got
    willRetry: string; // will they attempt again
}

export const INCOMPLETE_QUESTIONS: { key: keyof IncompleteFeedback; title: string; options: string[] }[] = [
    {
        key: 'reason',
        title: 'Bakit natapos ang biyahe bago marating ang destinasyon?',
        options: [
            'Naubusan ng oras',
            'Nakansela ang order / booking',
            'May problema sa sasakyan',
            'Saradong / hindi madaanang kalsada',
            'Naligaw',
            'Hindi ligtas na kondisyon',
            'Personal na dahilan',
            'Iba pa',
        ],
    },
    {
        key: 'distanceReached',
        title: 'Gaano ka kalayo nakarating bago huminto?',
        options: ['Malapit na sa destinasyon', 'Lampas kalahati', 'Mga kalahati', 'Wala pang kalahati', 'Kakasimula pa lang'],
    },
    {
        key: 'willRetry',
        title: 'Susubukan mo bang ulitin ang biyaheng ito?',
        options: ['Oo', 'Siguro', 'Hindi'],
    },
];
