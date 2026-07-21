import { getLocalAccount } from '@/lib/local-db/accounts';
import { firestore } from '@/lib/utils/firebaseConfig';
import { UserProfile, useUser } from '@/stores/useUser';
import {
    createUserWithEmailAndPassword,
    FirebaseAuthTypes,
    getAuth,
    signInWithEmailAndPassword,
} from '@react-native-firebase/auth';
import { doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// --- Phone-based "silent account" (no OTP / no visible password) ---------
// NOTE: OTP verification is intentionally NOT implemented yet (it requires a
// paid Firebase Phone Auth plan). For now an account is derived directly from
// the phone number so the onboarding flow is fully functional. When OTP is
// added later, replace `signUpOrSignInWithPhone` with a verified-phone flow.

const normalizePhone = (phone: string) => phone.replace(/\s|-/g, '');

export const isValidPhilippineMobileNumber = (phone: string) => /^09\d{9}$/.test(normalizePhone(phone));

// Derive the Firebase email from a local Philippine phone number.
export const phoneToEmail = (phone: string) => `${normalizePhone(phone)}@devia.app`;

// Deterministic password derived from the phone number so a returning user can
// be signed in silently without ever seeing a password field.
const phoneToPassword = (phone: string) => `Devia-${normalizePhone(phone)}-sample`;

/**
 * Creates an account from the phone number, or signs the user back in if it
 * already exists. No OTP, no user-facing password.
 */
export async function signUpOrSignInWithPhone(phone: string) {
    const auth = getAuth();
    const email = phoneToEmail(phone);
    const password = phoneToPassword(phone);

    try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        return { user: credential.user, isNewUser: true };
    } catch (error: any) {
        if (error?.code === 'auth/email-already-in-use') {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            return { user: credential.user, isNewUser: false };
        }
        throw error;
    }
}

/**
 * Signs in an existing phone account. Throws 'account-not-found' if the number
 * was never registered.
 */
export async function signInWithPhone(phone: string) {
    const auth = getAuth();
    try {
        const credential = await signInWithEmailAndPassword(auth, phoneToEmail(phone), phoneToPassword(phone));
        return credential.user;
    } catch (error: any) {
        if (
            error?.code === 'auth/user-not-found' ||
            error?.code === 'auth/invalid-credential' ||
            error?.code === 'auth/wrong-password'
        ) {
            throw new Error('account-not-found');
        }
        throw error;
    }
}

export interface OnboardingProfileData {
    fullName: string;
    preferredName: string;
    gender: string;
    ageRange: string;
    city: string;
    yearsExperience: string;
    deliveryPlatform: string;
    phone: string;
    riderCode: string;
    acceptedPolicies: boolean;
}

/**
 * Saves the "Tell us about yourself" basic-profile fields for the current user.
 */
export async function saveOnboardingProfile(uid: string, data: OnboardingProfileData) {
    const userRef = doc(firestore, 'users', uid);
    await setDoc(
        userRef,
        {
            // keep `username` populated so existing home/profile screens work
            username: data.fullName,
            fullName: data.fullName,
            preferredName: data.preferredName,
            riderCode: data.riderCode,
            gender: data.gender,
            ageRange: data.ageRange,
            city: data.city,
            yearsExperience: data.yearsExperience,
            deliveryPlatform: data.deliveryPlatform,
            phone: data.phone,
            acceptedPolicies: data.acceptedPolicies,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        },
        { merge: true }
    );

    return {
        success: true,
        data: { id: uid, ...data, username: data.fullName },
    };
}

export async function createUserProfile(uid: string, email: string, username: string, imageUri: string | null) {
    try {
        let avatarUrl = null;

        // Upload image if provided
        if (imageUri) {
            // Create storage reference with user's UID
            const storageRef = storage().ref(`profile-images/${uid}`);

            // Fetch image and convert to blob
            // const response = await fetch(imageUri);
            // const blob = await response.blob();

            // Upload blob to Firebase Storage
            // await uploadBytes(storageRef, blob);

            // Get download URL
            // avatarUrl = await getDownloadURL(storageRef);
            const task = storageRef.putFile(imageUri);

            task.on('state_changed', snapshot => {
                console.log('Upload is ' + snapshot.bytesTransferred);
            });

            await task;
            avatarUrl = await storageRef.getDownloadURL();
        }

        // Create/update user document
        const userRef = doc(firestore, 'users', uid);
        await setDoc(
            userRef,
            {
                username,
                avatarUrl,
                email,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            { merge: true }
        );

        return {
            success: true,
            data: {
                id: uid,
                username,
                avatarUrl,
                email,
            },
        };
    } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
    }
}

export async function getUserProfile(uid: string) {
    try {
        const userRef = doc(firestore, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            return {
                success: true,
                data: { ...(userDoc.data() as UserProfile), id: uid },
            };
        } else {
            return {
                success: false,
                error: 'User profile not found',
            };
        }
    } catch (error) {
        console.error('Error getting user profile:', error);
        throw error;
    }
}

/** Reverse of `phoneToEmail` — only works for phone-derived silent accounts. */
export function emailToPhone(email: string | null | undefined): string | null {
    if (!email?.endsWith('@devia.app')) return null;
    const phone = email.slice(0, -'@devia.app'.length);
    return isValidPhilippineMobileNumber(phone) ? phone : null;
}

function profileFromLocalAccount(user: FirebaseAuthTypes.User, local: Awaited<ReturnType<typeof getLocalAccount>>) {
    if (!local) return null;

    return {
        id: user.uid,
        username: local.fullName,
        fullName: local.fullName,
        avatarUrl: null,
        email: user.email,
        phone: local.phone,
        gender: local.gender,
        ageRange: local.ageRange,
        city: local.city,
        yearsExperience: local.yearsExperience,
        createdAt: new Date(local.createdAt),
    } satisfies UserProfile;
}

/**
 * Decide where an authenticated user should land. Falls back to the on-device
 * profile when Firestore rules block reads (common in fresh Firebase projects).
 */
export async function resolveAuthenticatedSession(user: FirebaseAuthTypes.User): Promise<{
    destination: '/main/(tabs)/home' | '/create-profile';
    profile: UserProfile | null;
}> {
    try {
        const userDoc = await getUserProfile(user.uid);
        if (userDoc.data?.username || userDoc.data?.fullName) {
            return { destination: '/main/(tabs)/home', profile: userDoc.data ?? null };
        }
    } catch (error) {
        console.warn('Firestore profile lookup failed; trying local fallback.', error);
    }

    const persisted = useUser.getState().user;
    if (persisted?.id === user.uid && (persisted.username || persisted.fullName)) {
        return { destination: '/main/(tabs)/home', profile: persisted };
    }

    const phone = emailToPhone(user.email);
    if (phone) {
        const local = await getLocalAccount(phone);
        const profile = profileFromLocalAccount(user, local);
        if (profile) {
            useUser.getState().setUser(profile);
            return { destination: '/main/(tabs)/home', profile };
        }
    }

    return { destination: '/create-profile', profile: null };
}

export async function updateUserProfile(uid: string, username: string, imageUri: string | null) {
    try {
        let avatarUrl = null;

        // Upload image if provided
        if (imageUri) {
            // Create storage reference with user's UID
            const storageRef = storage().ref(`profile-images/${uid}`);
            // const storageRef = ref(storage, `profile-images/${uid}`);

            // // Fetch image and convert to blob
            // const response = await fetch(imageUri);
            // const blob = await response.blob();

            // // Upload blob to Firebase Storage
            // await uploadBytes(storageRef, blob);
            const task = storageRef.putFile(imageUri);

            task.on('state_changed', snapshot => {
                console.log('Upload is ' + snapshot.bytesTransferred);
            });

            await task;
            // Get download URL
            avatarUrl = await storageRef.getDownloadURL();
        }

        // Update user document
        const userRef = doc(firestore, 'users', uid);
        await setDoc(
            userRef,
            {
                username,
                ...(imageUri ? { avatarUrl } : {}),
                updatedAt: new Date().toISOString(),
            },
            { merge: true }
        );

        return {
            success: true,
            data: {
                username,
                avatarUrl,
            },
        };
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
}
