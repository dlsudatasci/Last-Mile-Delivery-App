import AsyncStorage from '@react-native-async-storage/async-storage';

import { LngLat, SearchResult } from '@/lib/utils/directions';
import { getLocalDb, initLocalDb } from './sqlite';

const STORAGE_KEY = 'devia-recent-destinations';
const MIGRATION_KEY = 'devia-recent-destinations-sqlite-migrated';
const MAX_RECENT_DESTINATIONS = 8;
const DEFAULT_USER_KEY = 'anonymous';

export interface RecentDestination {
    name: string;
    fullAddress: string;
    coordinates: LngLat;
    updatedAt: string;
    userId: string;
}

type RecentDestinationMap = Record<string, RecentDestination[]>;

async function readLegacyAll(): Promise<RecentDestinationMap> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as RecentDestinationMap) : {};
    } catch {
        return {};
    }
}

async function migrateLegacyRecentDestinations(): Promise<void> {
    const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
    if (migrated === 'true') return;

    await initLocalDb();
    const db = await getLocalDb();
    const all = await readLegacyAll();
    for (const destinations of Object.values(all)) {
        for (const destination of destinations) {
            await db.runAsync(
                `INSERT OR REPLACE INTO recent_destinations
                    (user_id, name, full_address, longitude, latitude, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    destination.userId,
                    destination.name,
                    destination.fullAddress,
                    destination.coordinates[0],
                    destination.coordinates[1],
                    destination.updatedAt,
                ]
            );
        }
    }
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
}

function getUserKey(userId?: string | null): string {
    return userId?.trim() || DEFAULT_USER_KEY;
}

function getDestinationKey(destination: Pick<RecentDestination, 'name' | 'coordinates'>): string {
    return `${destination.name.trim().toLowerCase()}|${destination.coordinates.map(value => value.toFixed(5)).join(',')}`;
}

export async function getRecentDestinations(userId?: string | null): Promise<RecentDestination[]> {
    await migrateLegacyRecentDestinations();
    const db = await getLocalDb();
    const rows = await db.getAllAsync<{
        user_id: string;
        name: string;
        full_address: string;
        longitude: number;
        latitude: number;
        updated_at: string;
    }>(
        `SELECT user_id, name, full_address, longitude, latitude, updated_at
         FROM recent_destinations
         WHERE user_id = ?
         ORDER BY updated_at DESC, rowid DESC
         LIMIT ?`,
        [getUserKey(userId), MAX_RECENT_DESTINATIONS]
    );
    return rows.map(row => ({
        name: row.name,
        fullAddress: row.full_address,
        coordinates: [row.longitude, row.latitude],
        updatedAt: row.updated_at,
        userId: row.user_id,
    }));
}

export async function saveRecentDestination(result: SearchResult, userId?: string | null): Promise<RecentDestination[]> {
    await migrateLegacyRecentDestinations();
    const db = await getLocalDb();
    const userKey = getUserKey(userId);
    const now = new Date().toISOString();
    const recent: RecentDestination = {
        name: result.name,
        fullAddress: result.fullAddress,
        coordinates: result.coordinates,
        updatedAt: now,
        userId: userKey,
    };

    await db.runAsync(
        `DELETE FROM recent_destinations
         WHERE user_id = ? AND name = ? AND longitude = ? AND latitude = ?`,
        [userKey, recent.name, recent.coordinates[0], recent.coordinates[1]]
    );
    await db.runAsync(
        `INSERT INTO recent_destinations (user_id, name, full_address, longitude, latitude, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userKey, recent.name, recent.fullAddress, recent.coordinates[0], recent.coordinates[1], recent.updatedAt]
    );

    const extra = await db.getAllAsync<{ name: string; longitude: number; latitude: number }>(
        `SELECT name, longitude, latitude
         FROM recent_destinations
         WHERE user_id = ?
         ORDER BY updated_at DESC, rowid DESC
         LIMIT -1 OFFSET ?`,
        [userKey, MAX_RECENT_DESTINATIONS]
    );
    for (const item of extra) {
        await db.runAsync(
            `DELETE FROM recent_destinations
             WHERE user_id = ? AND name = ? AND longitude = ? AND latitude = ?`,
            [userKey, item.name, item.longitude, item.latitude]
        );
    }

    return getRecentDestinations(userKey);
}

export async function clearRecentDestinations(userId?: string | null): Promise<void> {
    await initLocalDb();
    const db = await getLocalDb();
    if (!userId) {
        await db.runAsync('DELETE FROM recent_destinations');
        await AsyncStorage.removeItem(STORAGE_KEY);
        await AsyncStorage.removeItem(MIGRATION_KEY);
        return;
    }

    await db.runAsync('DELETE FROM recent_destinations WHERE user_id = ?', [getUserKey(userId)]);
}
