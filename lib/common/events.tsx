export interface Event {
    id: string;
    eventName: string;
    eventDescription: string;
    eventDate: { start: string; end?: string };
    eventMedia: string;
    eventLocation: string;
    eventOrganizer: string;
    eventOrganizerEmail: string;
    eventOrganizerPhone: string;
    eventOrganizerImage: string;
}

export const events = [
    {
        id: 'ride-and-earn',
        eventName: 'Devia Route Study',
        eventDescription: `Join the Devia Route Study for last-mile delivery riders. Participants can claim ₱250 after completing 10 recorded delivery-trip submissions that pass research-team validation. The app will notify the team when the quota is reached, and riders can submit GCash, Maya, or GoTyme claim details inside Devia.`,
        eventDate: {
            start: '2025-06-13',
            end: '2025-06-30',
        },
        eventMedia: 'Devia Logo 1x1',
        eventLocation: 'Philippines',
        eventOrganizer: 'DeviaPH Team',
        eventOrganizerEmail: 'bien_aaron_miranda@dlsu.edu.ph',
        eventOrganizerPhone: '09369745878',
        eventOrganizerImage:
            'https://firebasestorage.googleapis.com/v0/b/devia-cba0e.firebasestorage.app/o/icon.png?alt=media&token=5c2eef85-499c-4780-8074-a88060f7462f',
    },
    {
        id: 'freedom-bike-ride',
        eventName: 'Freedom Route Study',
        eventDescription:
            "A Devia community research activity focused on how delivery riders make route choices in real-world traffic, access, and safety conditions. Participation and signup are handled inside Devia.",
        eventDate: { start: '2025-06-12' },
        eventMedia: 'kunin mo nalang sa FB',
        eventLocation: 'Devia Research Team, 93 East Capitol Drive, Kapitolyo, Pasig City',
        eventOrganizer: 'Devia Research Team',
        eventOrganizerEmail: 'tambikesph@gmail.com',
        eventOrganizerPhone: '',
        eventOrganizerImage:
            '',
    },
];
