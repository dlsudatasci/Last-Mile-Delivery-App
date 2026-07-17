import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalAccount, LocalAccount } from './accounts';
import { getLocalDb, initLocalDb } from './sqlite';

const STORAGE_KEY = 'devia-rider-code-registrations';
const MIGRATION_KEY = 'devia-rider-code-registrations-sqlite-migrated';

export const RIDER_CODES = [
    '123456',
    '184275',
    '392618',
    '507431',
    '629804',
    '741269',
    '856130',
    '913572',
    '268945',
    '430786',
    '675321',
] as const;

export type RiderCode = (typeof RIDER_CODES)[number];

export interface RiderCodeRegistration {
    code: RiderCode;
    phone: string;
    registeredAt: string;
}

type RegistrationMap = Partial<Record<RiderCode, RiderCodeRegistration>>;

const normalizeCode = (code: string) => code.replace(/\D/g, '').slice(0, 6);

async function readRegistrations(): Promise<RegistrationMap> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as RegistrationMap) : {};
    } catch {
        return {};
    }
}

async function migrateLegacyRegistrations(): Promise<void> {
    const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
    if (migrated === 'true') return;

    await initLocalDb();
    const db = await getLocalDb();
    const registrations = await readRegistrations();
    for (const registration of Object.values(registrations)) {
        if (!registration) continue;
        await db.runAsync(
            `INSERT OR IGNORE INTO rider_code_registrations (code, phone, registered_at)
             VALUES (?, ?, ?)`,
            [registration.code, registration.phone, registration.registeredAt]
        );
    }
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
}

export function sanitizeRiderCode(code: string) {
    return normalizeCode(code);
}

export function isValidRiderCode(code: string): code is RiderCode {
    return RIDER_CODES.includes(normalizeCode(code) as RiderCode);
}

export async function getRiderCodeRegistration(code: string): Promise<RiderCodeRegistration | null> {
    const normalized = normalizeCode(code);
    if (!isValidRiderCode(normalized)) return null;

    await migrateLegacyRegistrations();
    const db = await getLocalDb();
    const row = await db.getFirstAsync<{ code: RiderCode; phone: string; registered_at: string }>(
        'SELECT code, phone, registered_at FROM rider_code_registrations WHERE code = ?',
        [normalized]
    );
    if (!row) return null;
    return { code: row.code, phone: row.phone, registeredAt: row.registered_at };
}

export async function getAccountForRiderCode(code: string): Promise<LocalAccount | null> {
    const registration = await getRiderCodeRegistration(code);
    if (!registration) return null;

    return getLocalAccount(registration.phone);
}

export async function registerRiderCode(code: string, phone: string): Promise<RiderCodeRegistration> {
    const normalized = normalizeCode(code);
    if (!isValidRiderCode(normalized)) {
        throw new Error('Invalid rider code.');
    }

    await migrateLegacyRegistrations();
    const db = await getLocalDb();
    const existing = await getRiderCodeRegistration(normalized);
    if (existing && existing.phone !== phone) {
        throw new Error('This rider code is already registered.');
    }

    const registration: RiderCodeRegistration = {
        code: normalized,
        phone,
        registeredAt: existing?.registeredAt ?? new Date().toISOString(),
    };
    await db.runAsync(
        `INSERT OR REPLACE INTO rider_code_registrations (code, phone, registered_at)
         VALUES (?, ?, ?)`,
        [registration.code, registration.phone, registration.registeredAt]
    );
    return registration;
}

export async function clearRiderCodeRegistrations(): Promise<void> {
    await initLocalDb();
    const db = await getLocalDb();
    await db.runAsync('DELETE FROM rider_code_registrations');
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(MIGRATION_KEY);
}
