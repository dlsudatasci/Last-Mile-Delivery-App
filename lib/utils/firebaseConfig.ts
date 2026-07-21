import firestoreModule, { getFirestore } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { getFunctions } from '@react-native-firebase/functions';

const auth = getAuth();
const firestore = getFirestore();
const functions = getFunctions();

// Enable offline persistence with an unlimited cache so that reads (getDoc/getDocs)
// can be served from the local cache when the device is offline or on a flaky
// network. This does NOT help server-only aggregation queries (getCountFromServer /
// getAggregateFromServer) — those always require a live server round-trip — so the
// query helpers in lib/firebase-crud fall back to counting cached documents instead.
// settings() must be called before any other Firestore method touches the network.
try {
    firestoreModule().settings({
        persistence: true,
        cacheSizeBytes: firestoreModule.CACHE_SIZE_UNLIMITED,
    });
} catch (error) {
    // settings() throws if called after Firestore is already in use; safe to ignore
    // because persistence is enabled by default on native platforms anyway.
    console.warn('Firestore settings() skipped:', error);
}

export { auth, firestore, functions };
