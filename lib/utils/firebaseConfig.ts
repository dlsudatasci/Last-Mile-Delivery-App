import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getFunctions } from '@react-native-firebase/functions';

const auth = getAuth();
const firestore = getFirestore();
const functions = getFunctions();

export { auth, firestore, functions };
