import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDb, initLocalDb } from './sqlite';

// -----------------------------------------------------------------------------
// TEMPORARY local "database" for testing the onboarding / login flow without
// depending on a live backend. Registered accounts are stored on-device in
// AsyncStorage, keyed by phone number. This lets us check whether a number is
// already registered and restore its profile. Replace with the real backend
// when OTP / server auth is added.
// -----------------------------------------------------------------------------

const STORAGE_KEY = 'devia-local-accounts';
const MIGRATION_KEY = 'devia-local-accounts-sqlite-migrated';

export interface LocalAccount {
    riderCode?: string;
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

async function readLegacyAll(): Promise<AccountMap> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as AccountMap) : {};
    } catch {
        return {};
    }
}

async function migrateLegacyAccounts(): Promise<void> {
    const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
    if (migrated === 'true') return;

    await initLocalDb();
    const db = await getLocalDb();
    const accounts = await readLegacyAll();
    for (const account of Object.values(accounts)) {
        await db.runAsync(
            `INSERT OR IGNORE INTO local_accounts
                (phone, rider_code, full_name, gender, age_range, city, years_experience, accepted_policies, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                account.phone,
                account.riderCode ?? null,
                account.fullName,
                account.gender,
                account.ageRange,
                account.city,
                account.yearsExperience,
                account.acceptedPolicies ? 1 : 0,
                account.createdAt,
            ]
        );
    }
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
}

export async function saveLocalAccount(account: LocalAccount): Promise<void> {
    await migrateLegacyAccounts();
    const db = await getLocalDb();
    await db.runAsync(
        `INSERT OR REPLACE INTO local_accounts
            (phone, rider_code, full_name, gender, age_range, city, years_experience, accepted_policies, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            account.phone,
            account.riderCode ?? null,
            account.fullName,
            account.gender,
            account.ageRange,
            account.city,
            account.yearsExperience,
            account.acceptedPolicies ? 1 : 0,
            account.createdAt,
        ]
    );
}

export async function getLocalAccount(phone: string): Promise<LocalAccount | null> {
    await migrateLegacyAccounts();
    const db = await getLocalDb();
    const row = await db.getFirstAsync<{
        phone: string;
        rider_code: string | null;
        full_name: string;
        gender: string;
        age_range: string;
        city: string;
        years_experience: string;
        accepted_policies: number;
        created_at: string;
    }>('SELECT * FROM local_accounts WHERE phone = ?', [phone]);

    if (!row) return null;
    return {
        phone: row.phone,
        riderCode: row.rider_code ?? undefined,
        fullName: row.full_name,
        gender: row.gender,
        ageRange: row.age_range,
        city: row.city,
        yearsExperience: row.years_experience,
        acceptedPolicies: row.accepted_policies === 1,
        createdAt: row.created_at,
    };
}

export async function localAccountExists(phone: string): Promise<boolean> {
    return Boolean(await getLocalAccount(phone));
}

export async function deleteLocalAccount(phone: string): Promise<void> {
    await migrateLegacyAccounts();
    const db = await getLocalDb();
    await db.runAsync('DELETE FROM local_accounts WHERE phone = ?', [phone]);
}

// Handy for testing/resetting the local store.
export async function clearLocalAccounts(): Promise<void> {
    await initLocalDb();
    const db = await getLocalDb();
    await db.runAsync('DELETE FROM local_accounts');
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(MIGRATION_KEY);
}
