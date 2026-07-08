import AsyncStorage from '@react-native-async-storage/async-storage';

// -----------------------------------------------------------------------------
// TEMPORARY local "database" for testing the onboarding / login flow without
// depending on a live backend. Registered accounts are stored on-device in
// AsyncStorage, keyed by phone number. This lets us check whether a number is
// already registered and restore its profile. Replace with the real backend
// when OTP / server auth is added.
// -----------------------------------------------------------------------------

const STORAGE_KEY = 'devia-local-accounts';

export interface LocalAccount {
    phone: string;
    fullName: string;
    gender: string;
    ageRange: string;
    city: string;
    yearsExperience: string;
    acceptedPolicies: boolean;
    createdAt: string;
}

type AccountMap = Record<string, LocalAccount>;

async function readAll(): Promise<AccountMap> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as AccountMap) : {};
    } catch {
        return {};
    }
}

export async function saveLocalAccount(account: LocalAccount): Promise<void> {
    const accounts = await readAll();
    accounts[account.phone] = account;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export async function getLocalAccount(phone: string): Promise<LocalAccount | null> {
    const accounts = await readAll();
    return accounts[phone] ?? null;
}

export async function localAccountExists(phone: string): Promise<boolean> {
    const accounts = await readAll();
    return Boolean(accounts[phone]);
}

export async function deleteLocalAccount(phone: string): Promise<void> {
    const accounts = await readAll();
    if (accounts[phone]) {
        delete accounts[phone];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    }
}

// Handy for testing/resetting the local store.
export async function clearLocalAccounts(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
}
