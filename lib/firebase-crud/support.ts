import { auth, firestore } from '@/lib/utils/firebaseConfig';
import { collection, doc, setDoc } from '@react-native-firebase/firestore';

export const createSupportRequest = async (subject: string, description: string) => {
    try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            throw new Error('User not authenticated');
        }
        const ticketCollectionRef = collection(firestore, 'tickets');
        const ticketDocRef = doc(ticketCollectionRef);
        await setDoc(ticketDocRef, { subject, description, createdAt: Date.now(), userId, status: 'pending' });
    } catch (error) {
        console.error('Error creating ticket:', error);
        throw error;
    }
};
