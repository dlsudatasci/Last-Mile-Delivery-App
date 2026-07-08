import { firestore } from '@/lib/utils/firebaseConfig';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter } from '@react-native-firebase/firestore';

export interface EventData {
    eventName: string;
    eventDescription: string;
    eventDate: number;
    eventMedia?: string[];
    eventLocation: string;
    eventOrganizer: string;
    eventOrganizerEmail: string;
    eventOrganizerPhone: string;
}

export interface FetchEventData extends EventData {
    id: string;
    createdAt: number;
}

interface PaginationOptions {
    limit: number;
    startAfter?: string | null;
}

interface PaginatedResponse<T> {
    items: T[];
    lastDocId: string | null;
    hasMore: boolean;
}

export const getEvents = async (options: PaginationOptions): Promise<PaginatedResponse<FetchEventData>> => {
    try {
        const eventsCollectionRef = collection(firestore, 'events');

        let q = query(eventsCollectionRef, orderBy('createdAt', 'desc'), limit(options.limit));

        if (options.startAfter) {
            const lastDoc = await getDoc(doc(eventsCollectionRef, options.startAfter));
            if (lastDoc.exists()) {
                q = query(q, startAfter(lastDoc));
            }
        }

        const snapshot = await getDocs(q);
        const events: FetchEventData[] = [];

        for (const doc of snapshot.docs) {
            const data = doc.data();
            events.push({
                id: doc.id,
                ...data,
            } as FetchEventData);
        }

        return {
            items: events,
            lastDocId: snapshot.docs[snapshot.docs.length - 1]?.id || null,
            hasMore: snapshot.docs.length === options.limit,
        };
    } catch (error) {
        console.error('Error fetching events:', error);
        throw error;
    }
};
