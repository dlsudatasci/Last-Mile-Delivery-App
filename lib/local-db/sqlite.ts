import AsyncStorage from '@react-native-async-storage/async-storage';

type QueryParams = (string | number | null)[];

export interface LocalDb {
    execAsync: (sql: string) => Promise<void>;
    runAsync: (sql: string, params?: QueryParams) => Promise<void>;
    getFirstAsync: <T>(sql: string, params?: QueryParams) => Promise<T | null>;
    getAllAsync: <T>(sql: string, params?: QueryParams) => Promise<T[]>;
}

const FALLBACK_STORAGE_KEY = 'devia-local-sqlite-fallback';

interface FallbackTables {
    local_accounts: Record<string, any>;
    rider_code_registrations: Record<string, any>;
    recent_destinations: any[];
    rowid: number;
}

const emptyTables = (): FallbackTables => ({
    local_accounts: {},
    rider_code_registrations: {},
    recent_destinations: [],
    rowid: 0,
});

let dbPromise: Promise<LocalDb> | null = null;
let initPromise: Promise<void> | null = null;

async function readFallbackTables(): Promise<FallbackTables> {
    try {
        const raw = await AsyncStorage.getItem(FALLBACK_STORAGE_KEY);
        return raw ? { ...emptyTables(), ...(JSON.parse(raw) as Partial<FallbackTables>) } : emptyTables();
    } catch {
        return emptyTables();
    }
}

async function writeFallbackTables(tables: FallbackTables): Promise<void> {
    await AsyncStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(tables));
}

function createFallbackDb(): LocalDb {
    return {
        execAsync: async () => {},
        runAsync: async (sql, params = []) => {
            const tables = await readFallbackTables();

            if (sql.includes('DELETE FROM local_accounts')) {
                if (sql.includes('WHERE phone = ?')) {
                    delete tables.local_accounts[String(params[0])];
                } else {
                    tables.local_accounts = {};
                }
                await writeFallbackTables(tables);
                return;
            }

            if (sql.includes('INTO local_accounts')) {
                const phone = String(params[0]);
                tables.local_accounts[phone] = {
                    phone,
                    rider_code: params[1] ?? null,
                    full_name: params[2],
                    gender: params[3],
                    age_range: params[4],
                    city: params[5],
                    years_experience: params[6],
                    accepted_policies: params[7],
                    created_at: params[8],
                };
                await writeFallbackTables(tables);
                return;
            }

            if (sql.includes('DELETE FROM rider_code_registrations')) {
                if (sql.includes('WHERE code = ?')) {
                    delete tables.rider_code_registrations[String(params[0])];
                } else {
                    tables.rider_code_registrations = {};
                }
                await writeFallbackTables(tables);
                return;
            }

            if (sql.includes('INTO rider_code_registrations')) {
                const code = String(params[0]);
                tables.rider_code_registrations[code] = {
                    code,
                    phone: params[1],
                    registered_at: params[2],
                };
                await writeFallbackTables(tables);
                return;
            }

            if (sql.includes('DELETE FROM recent_destinations')) {
                if (sql.includes('WHERE user_id = ? AND name = ?')) {
                    tables.recent_destinations = tables.recent_destinations.filter(
                        row =>
                            !(
                                row.user_id === params[0] &&
                                row.name === params[1] &&
                                row.longitude === params[2] &&
                                row.latitude === params[3]
                            )
                    );
                } else if (sql.includes('WHERE user_id = ?')) {
                    tables.recent_destinations = tables.recent_destinations.filter(row => row.user_id !== params[0]);
                } else {
                    tables.recent_destinations = [];
                }
                await writeFallbackTables(tables);
                return;
            }

            if (sql.includes('INTO recent_destinations')) {
                tables.rowid += 1;
                tables.recent_destinations.push({
                    __rowid: tables.rowid,
                    user_id: params[0],
                    name: params[1],
                    full_address: params[2],
                    longitude: params[3],
                    latitude: params[4],
                    updated_at: params[5],
                });
                await writeFallbackTables(tables);
            }
        },
        getFirstAsync: async (sql, params = []) => {
            const tables = await readFallbackTables();
            if (sql.includes('FROM local_accounts')) {
                return (tables.local_accounts[String(params[0])] ?? null) as any;
            }
            if (sql.includes('FROM rider_code_registrations')) {
                return (tables.rider_code_registrations[String(params[0])] ?? null) as any;
            }
            return null;
        },
        getAllAsync: async (sql, params = []) => {
            const tables = await readFallbackTables();
            if (sql.includes('FROM recent_destinations')) {
                const hasOffset = sql.includes('OFFSET');
                const offset = hasOffset && typeof params[1] === 'number' ? params[1] : 0;
                const limit = !hasOffset && typeof params[1] === 'number' ? params[1] : undefined;
                return tables.recent_destinations
                    .filter(row => row.user_id === params[0])
                    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at) || b.__rowid - a.__rowid)
                    .slice(offset, limit ? offset + limit : undefined) as any;
            }
            return [];
        },
    };
}

async function openNativeDb(): Promise<LocalDb | null> {
    try {
        // Keep this dynamic so older dev/test builds without the native module
        // do not crash during module evaluation.
        const SQLite = require('expo-sqlite');
        if (!SQLite?.openDatabaseAsync) return null;
        return await SQLite.openDatabaseAsync('devia-local.db');
    } catch (error) {
        console.warn('expo-sqlite native module unavailable; using local storage fallback.', error);
        return null;
    }
}

export function getLocalDb(): Promise<LocalDb> {
    if (!dbPromise) {
        dbPromise = (async () => (await openNativeDb()) ?? createFallbackDb())();
    }
    return dbPromise;
}

export async function initLocalDb() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        const db = await getLocalDb();
        await db.execAsync(`
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS local_accounts (
                phone TEXT PRIMARY KEY NOT NULL,
                rider_code TEXT,
                full_name TEXT NOT NULL,
                gender TEXT NOT NULL,
                age_range TEXT NOT NULL,
                city TEXT NOT NULL,
                years_experience TEXT NOT NULL,
                accepted_policies INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS rider_code_registrations (
                code TEXT PRIMARY KEY NOT NULL,
                phone TEXT NOT NULL,
                registered_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS recent_destinations (
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                full_address TEXT NOT NULL,
                longitude REAL NOT NULL,
                latitude REAL NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (user_id, name, longitude, latitude)
            );
        `);
    })();

    return initPromise;
}
