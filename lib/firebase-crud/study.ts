import { firestore } from '@/lib/utils/firebaseConfig';
import { getAuth } from '@react-native-firebase/auth';
import { collection, doc, getDoc, serverTimestamp, setDoc } from '@react-native-firebase/firestore';
import { getTotalRideCount } from './rides';

export const STUDY_COMPENSATION_AMOUNT = 250;
export const STUDY_REQUIRED_SUBMISSIONS = 10;

export type PaymentMethod = 'gcash' | 'maya' | 'gotyme';

export interface StudySignupData {
    riderName: string;
    phoneNumber: string;
    deliveryPlatform: string;
    vehicleType: string;
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
}

export interface StudyParticipation extends StudySignupData {
    userId: string;
    email: string | null;
    status: 'joined' | 'removed';
    joinedAt: number;
    updatedAt: number;
}

export interface CompensationClaimData {
    paymentMethod: PaymentMethod;
    accountName: string;
    accountNumber: string;
    phoneNumber: string;
}

export interface CompensationClaim extends CompensationClaimData {
    userId: string;
    email: string | null;
    status: 'pending_validation' | 'ready_to_claim' | 'paid' | 'rejected';
    referenceNumber: string;
    recordedSubmissions: number;
    amount: number;
    createdAt: number;
    updatedAt: number;
}

const normalizePhone = (phoneNumber: string) => phoneNumber.replace(/\s|-/g, '');

export const isValidPhilippineMobileNumber = (phoneNumber: string) => /^09\d{9}$/.test(normalizePhone(phoneNumber));

const getCurrentUser = () => {
    const user = getAuth().currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }
    return user;
};

export const getStudyParticipation = async (userId?: string): Promise<StudyParticipation | null> => {
    const uid = userId || getCurrentUser().uid;
    const participantDoc = await getDoc(doc(firestore, 'studyParticipants', uid));
    if (!participantDoc.exists()) {
        return null;
    }
    return participantDoc.data() as StudyParticipation;
};

export const joinStudy = async (data: StudySignupData) => {
    const user = getCurrentUser();
    const phoneNumber = normalizePhone(data.phoneNumber);

    if (!data.riderName.trim()) {
        throw new Error('Rider name is required.');
    }
    if (!isValidPhilippineMobileNumber(phoneNumber)) {
        throw new Error('Use a valid Philippine mobile number starting with 09.');
    }
    if (!data.deliveryPlatform.trim()) {
        throw new Error('Delivery platform is required.');
    }
    if (!data.vehicleType.trim()) {
        throw new Error('Vehicle type is required.');
    }
    if (!data.acceptedTerms || !data.acceptedPrivacy) {
        throw new Error('Please accept the terms and privacy policy to join.');
    }

    const participant: StudyParticipation = {
        ...data,
        riderName: data.riderName.trim(),
        phoneNumber,
        deliveryPlatform: data.deliveryPlatform.trim(),
        vehicleType: data.vehicleType.trim(),
        userId: user.uid,
        email: user.email,
        status: 'joined',
        joinedAt: Date.now(),
        updatedAt: Date.now(),
    };

    await setDoc(doc(firestore, 'studyParticipants', user.uid), participant, { merge: true });
    return participant;
};

export interface StudyConsentData {
    acceptedPrivacyPolicy: boolean;
    acceptedDataUsage: boolean;
    acceptedParticipationTerms: boolean;
}

/**
 * Onboarding study enrollment. Records the three consent agreements and pulls
 * the rider's name + phone from their saved profile (no survey fields here).
 */
export const enrollInStudy = async (consent: StudyConsentData) => {
    const user = getCurrentUser();

    if (!consent.acceptedPrivacyPolicy || !consent.acceptedDataUsage || !consent.acceptedParticipationTerms) {
        throw new Error('Please agree to all terms and conditions to enroll.');
    }

    const profileSnap = await getDoc(doc(firestore, 'users', user.uid));
    const profile = profileSnap.exists() ? (profileSnap.data() as { fullName?: string; username?: string; phone?: string }) : {};

    const participant: StudyParticipation & { acceptedDataUsage: boolean } = {
        riderName: profile.fullName || profile.username || '',
        phoneNumber: profile.phone || '',
        deliveryPlatform: '',
        vehicleType: '',
        acceptedTerms: consent.acceptedParticipationTerms,
        acceptedPrivacy: consent.acceptedPrivacyPolicy,
        acceptedDataUsage: consent.acceptedDataUsage,
        userId: user.uid,
        email: user.email,
        status: 'joined',
        joinedAt: Date.now(),
        updatedAt: Date.now(),
    };

    await setDoc(doc(firestore, 'studyParticipants', user.uid), participant, { merge: true });
    return participant;
};

export const getCompensationClaim = async (userId?: string): Promise<CompensationClaim | null> => {
    const uid = userId || getCurrentUser().uid;
    const claimDoc = await getDoc(doc(firestore, 'compensationClaims', uid));
    if (!claimDoc.exists()) {
        return null;
    }
    return claimDoc.data() as CompensationClaim;
};

export const notifyQuotaReachedForValidation = async (userId?: string) => {
    const user = userId ? { uid: userId, email: getAuth().currentUser?.email || null } : getCurrentUser();
    const recordedSubmissions = await getTotalRideCount(user.uid);
    if (recordedSubmissions < STUDY_REQUIRED_SUBMISSIONS) {
        return false;
    }

    const notificationId = `quota-${user.uid}`;
    const notificationRef = doc(firestore, 'adminNotifications', notificationId);
    const existingNotification = await getDoc(notificationRef);
    if (existingNotification.exists()) {
        return true;
    }

    await setDoc(notificationRef, {
        type: 'quota_reached_ready_for_cross_check',
        userId: user.uid,
        email: user.email,
        recordedSubmissions,
        requiredSubmissions: STUDY_REQUIRED_SUBMISSIONS,
        status: 'unread',
        createdAt: serverTimestamp(),
    });

    return true;
};

const createReferenceNumber = (userId: string) =>
    `DEVIA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${userId.slice(0, 6).toUpperCase()}`;

export const submitCompensationClaim = async (claimData: CompensationClaimData) => {
    const user = getCurrentUser();
    const participation = await getStudyParticipation(user.uid);

    if (!participation || participation.status !== 'joined') {
        throw new Error('Join the Devia Route Study before submitting a compensation claim.');
    }

    const recordedSubmissions = await getTotalRideCount(user.uid);
    if (recordedSubmissions < STUDY_REQUIRED_SUBMISSIONS) {
        throw new Error(`You need ${STUDY_REQUIRED_SUBMISSIONS} validated submissions before claiming compensation.`);
    }

    const phoneNumber = normalizePhone(claimData.phoneNumber);
    if (!isValidPhilippineMobileNumber(phoneNumber)) {
        throw new Error('Use a valid Philippine mobile number starting with 09.');
    }
    if (!claimData.accountName.trim()) {
        throw new Error('Account name is required.');
    }
    if (!claimData.accountNumber.trim()) {
        throw new Error('Account number is required.');
    }

    const referenceNumber = createReferenceNumber(user.uid);
    const claim: CompensationClaim = {
        paymentMethod: claimData.paymentMethod,
        accountName: claimData.accountName.trim(),
        accountNumber: claimData.accountNumber.trim(),
        phoneNumber,
        userId: user.uid,
        email: user.email,
        status: 'pending_validation',
        referenceNumber,
        recordedSubmissions,
        amount: STUDY_COMPENSATION_AMOUNT,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    await setDoc(doc(firestore, 'compensationClaims', user.uid), claim, { merge: true });

    const notificationRef = doc(collection(firestore, 'adminNotifications'));
    await setDoc(notificationRef, {
        type: 'compensation_claim_ready_for_validation',
        userId: user.uid,
        email: user.email,
        referenceNumber,
        recordedSubmissions,
        amount: STUDY_COMPENSATION_AMOUNT,
        status: 'unread',
        createdAt: serverTimestamp(),
    });

    return claim;
};
