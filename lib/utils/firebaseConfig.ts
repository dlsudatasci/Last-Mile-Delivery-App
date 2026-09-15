import { getAuth } from '@react-native-firebase/auth';
import firestoreModule, { getFirestore } from '@react-native-firebase/firestore';
import { getFunctions } from '@react-native-firebase/functions';

// Enable offline persistence with an unlimited cache so that reads (getDoc/getDocs)
// can be served from the local cache when the device is offline or on a flaky
// network. This does NOT help server-only aggregation queries (getCountFromServer /
// getAggregateFromServer) — those always require a live server round-trip — so the
// query helpers in lib/firebase-crud fall back to counting cached documents instead.
//
// settings() must run before any other Firestore method touches the network, so we
// call it before getFirestore() below. Persistence is already enabled by default on
// native platforms, so if this call is skipped (e.g. it throws because Firestore was
// already started) the cache fallback still works.
try {
    firestoreModule().settings({
        persistence: true,
        cacheSizeBytes: firestoreModule.CACHE_SIZE_UNLIMITED,
    });
} catch (error) {
    console.warn('Firestore settings() skipped:', error);
}

const auth = getAuth();
const firestore = getFirestore();
const functions = getFunctions();

export { auth, firestore, functions };
