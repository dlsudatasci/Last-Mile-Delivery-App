// Imports
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    getLocalDb,
    initLocalDb,
    isNativeSqliteAvailable,
} from "../lib/local-db/sqlite";

// Mocks
jest.mock("@react-native-async-storage/async-storage", () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
}));

jest.mock("react-native", () => ({
    NativeModules: {
        ExpoSQLite: undefined,
    },
}));

jest.mock("expo-sqlite", () => ({
    openDatabaseAsync: jest.fn(),
}));


beforeEach(() => {
    jest.clearAllMocks();

    let storage: Record<string, string> = {};

    (AsyncStorage.getItem as jest.Mock).mockImplementation(
        async (key: string) => storage[key] ?? null
    );

    (AsyncStorage.setItem as jest.Mock).mockImplementation(
        async (key: string, value: string) => {
            storage[key] = value;
        }
    );
});

// getLocalDb() testing
describe("getLocalDb()", () => {
    test("uses the fallback database when native SQLite is unavailable", async () => {
        const db = await getLocalDb();

        expect(db.backend).toBe("fallback");
    });

    test("saves and retrieves a local account using the fallback database", async () => {
        const db = await getLocalDb();

        await db.runAsync(
            "INSERT INTO local_accounts",
            [
                "09171234567",
                "123456",
                "Juan Dela Cruz",
                "Male",
                "25-34",
                "Pasig",
                "3 years",
                1,
                "2026-08-28T10:00:00.000Z",
            ]
        );

        const account = await db.getFirstAsync(
            "SELECT * FROM local_accounts WHERE phone = ?",
            ["09171234567"]
        );

        expect(account).toEqual({
            phone: "09171234567",
            rider_code: "123456",
            full_name: "Juan Dela Cruz",
            gender: "Male",
            age_range: "25-34",
            city: "Pasig",
            years_experience: "3 years",
            accepted_policies: 1,
            created_at: "2026-08-28T10:00:00.000Z",
        });
    });

    test("returns null when the local account does not exist", async () => {
        const db = await getLocalDb();

        const account = await db.getFirstAsync(
            "SELECT * FROM local_accounts WHERE phone = ?",
            ["09999999999"]
        );

        expect(account).toBeNull();
    });

    test("deletes a local account by phone number", async () => {
        const db = await getLocalDb();

        await db.runAsync(
            "INSERT INTO local_accounts",
            [
                "09171234567",
                "123456",
                "Juan Dela Cruz",
                "Male",
                "25-34",
                "Pasig",
                "3 years",
                1,
                "2026-08-28T10:00:00.000Z",
            ]
        );

        const beforeDelete = await db.getFirstAsync(
            "SELECT * FROM local_accounts WHERE phone = ?",
            ["09171234567"]
        );

        expect(beforeDelete).not.toBeNull();

        await db.runAsync(
            "DELETE FROM local_accounts WHERE phone = ?",
            ["09171234567"]
        );

        const afterDelete = await db.getFirstAsync(
            "SELECT * FROM local_accounts WHERE phone = ?",
            ["09171234567"]
        );

        expect(afterDelete).toBeNull();
    });


    test("deletes all local accounts", async () => {
        const db = await getLocalDb();

        await db.runAsync(
            "INSERT INTO local_accounts",
            [
                "09171234567",
                "123456",
                "Juan Dela Cruz",
                "Male",
                "25-34",
                "Pasig",
                "3 years",
                1,
                "2026-08-28T10:00:00.000Z",
            ]
        );

        await db.runAsync(
            "INSERT INTO local_accounts",
            [
                "09987654321",
                "654321",
                "Maria Santos",
                "Female",
                "25-34",
                "Manila",
                "5 years",
                1,
                "2026-08-28T11:00:00.000Z",
            ]
        );

        const firstAccount = await db.getFirstAsync(
            "SELECT * FROM local_accounts WHERE phone = ?",
            ["09171234567"]
        );

        const secondAccount = await db.getFirstAsync(
            "SELECT * FROM local_accounts WHERE phone = ?",
            ["09987654321"]
        );

        expect(firstAccount).not.toBeNull();
        expect(secondAccount).not.toBeNull();

        await db.runAsync("DELETE FROM local_accounts");

        const deletedFirstAccount = await db.getFirstAsync(
            "SELECT * FROM local_accounts WHERE phone = ?",
            ["09171234567"]
        );

        const deletedSecondAccount = await db.getFirstAsync(
            "SELECT * FROM local_accounts WHERE phone = ?",
            ["09987654321"]
        );

        expect(deletedFirstAccount).toBeNull();
        expect(deletedSecondAccount).toBeNull();
    });


    test("saves and retrieves a rider code registration", async () => {
        const db = await getLocalDb();

        await db.runAsync(
            "INSERT INTO rider_code_registrations",
            [
                "RIDER123",
                "09171234567",
                "2026-08-28T10:00:00.000Z",
            ]
        );

        const registration = await db.getFirstAsync(
            "SELECT * FROM rider_code_registrations WHERE code = ?",
            ["RIDER123"]
        );

        expect(registration).toEqual({
            code: "RIDER123",
            phone: "09171234567",
            registered_at: "2026-08-28T10:00:00.000Z",
        });
    });

    test("returns null when the rider code registration does not exist", async () => {
        const db = await getLocalDb();

        const registration = await db.getFirstAsync(
            "SELECT * FROM rider_code_registrations WHERE code = ?",
            ["UNKNOWN-CODE"]
        );

        expect(registration).toBeNull();
    });

    test("deletes a rider code registration by code", async () => {
        const db = await getLocalDb();

        await db.runAsync(
            "INSERT INTO rider_code_registrations",
            [
                "RIDER123",
                "09171234567",
                "2026-08-28T10:00:00.000Z",
            ]
        );

        const beforeDelete = await db.getFirstAsync(
            "SELECT * FROM rider_code_registrations WHERE code = ?",
            ["RIDER123"]
        );

        expect(beforeDelete).not.toBeNull();

        await db.runAsync(
            "DELETE FROM rider_code_registrations WHERE code = ?",
            ["RIDER123"]
        );

        const afterDelete = await db.getFirstAsync(
            "SELECT * FROM rider_code_registrations WHERE code = ?",
            ["RIDER123"]
        );

        expect(afterDelete).toBeNull();
    });

    test("deletes all rider code registrations", async () => {
        const db = await getLocalDb();

        await db.runAsync(
            "INSERT INTO rider_code_registrations",
            [
                "RIDER123",
                "09171234567",
                "2026-08-28T10:00:00.000Z",
            ]
        );

        await db.runAsync(
            "INSERT INTO rider_code_registrations",
            [
                "RIDER456",
                "09987654321",
                "2026-08-28T11:00:00.000Z",
            ]
        );

        const firstRegistration = await db.getFirstAsync(
            "SELECT * FROM rider_code_registrations WHERE code = ?",
            ["RIDER123"]
        );

        const secondRegistration = await db.getFirstAsync(
            "SELECT * FROM rider_code_registrations WHERE code = ?",
            ["RIDER456"]
        );

        expect(firstRegistration).not.toBeNull();
        expect(secondRegistration).not.toBeNull();

        await db.runAsync(
            "DELETE FROM rider_code_registrations"
        );

        const deletedFirstRegistration = await db.getFirstAsync(
            "SELECT * FROM rider_code_registrations WHERE code = ?",
            ["RIDER123"]
        );

        const deletedSecondRegistration = await db.getFirstAsync(
            "SELECT * FROM rider_code_registrations WHERE code = ?",
            ["RIDER456"]
        );

        expect(deletedFirstRegistration).toBeNull();
        expect(deletedSecondRegistration).toBeNull();
    });

    test("saves and retrieves a recent destination", async () => {
        const db = await getLocalDb();

        await db.runAsync(
            "INSERT INTO recent_destinations",
            [
                "user123",
                "SM Megamall",
                "SM Megamall, Ortigas",
                121.0567,
                14.5841,
                "2026-08-28T10:00:00.000Z",
            ]
        );

        const destinations = await db.getAllAsync(
            "SELECT * FROM recent_destinations WHERE user_id = ?",
            ["user123"]
        );

        expect(destinations).toHaveLength(1);

        expect(destinations[0]).toEqual(
            expect.objectContaining({
                user_id: "user123",
                name: "SM Megamall",
                full_address: "SM Megamall, Ortigas",
                longitude: 121.0567,
                latitude: 14.5841,
                updated_at: "2026-08-28T10:00:00.000Z",
            })
        );
    });

    test("only retrieves recent destinations belonging to the requested user", async () => {
        const db = await getLocalDb();

        await db.runAsync(
            "INSERT INTO recent_destinations",
            [
                "user123",
                "SM Megamall",
                "SM Megamall, Ortigas",
                121.0567,
                14.5841,
                "2026-08-28T10:00:00.000Z",
            ]
        );

        await db.runAsync(
            "INSERT INTO recent_destinations",
            [
                "user456",
                "Ayala Malls",
                "Ayala Malls, Makati",
                121.0278,
                14.5547,
                "2026-08-28T11:00:00.000Z",
            ]
        );

        const destinations = await db.getAllAsync(
            "SELECT * FROM recent_destinations WHERE user_id = ?",
            ["user123"]
        );

        expect(destinations).toHaveLength(1);

        expect(destinations[0]).toEqual(
            expect.objectContaining({
                user_id: "user123",
                name: "SM Megamall",
            })
        );
    });

    test("sorts recent destinations by newest updated date first", async () => {
        const db = await getLocalDb();

        await db.runAsync(
            "INSERT INTO recent_destinations",
            [
                "user123",
                "Older Destination",
                "Older Address",
                121.0000,
                14.5000,
                "2026-08-28T08:00:00.000Z",
            ]
        );

        await db.runAsync(
            "INSERT INTO recent_destinations",
            [
                "user123",
                "Newer Destination",
                "Newer Address",
                121.1000,
                14.6000,
                "2026-08-28T11:00:00.000Z",
            ]
        );

        const destinations = await db.getAllAsync(
            "SELECT * FROM recent_destinations WHERE user_id = ?",
            ["user123"]
        );

        expect(destinations).toHaveLength(2);

        expect(destinations[0]).toEqual(
            expect.objectContaining({
                name: "Newer Destination",
                updated_at: "2026-08-28T11:00:00.000Z",
            })
        );

        expect(destinations[1]).toEqual(
            expect.objectContaining({
                name: "Older Destination",
                updated_at: "2026-08-28T08:00:00.000Z",
            })
        );
    });

    test("limits the number of recent destinations returned", async () => {
        const db = await getLocalDb();

        await db.runAsync(
            "INSERT INTO recent_destinations",
            [
                "user123",
                "Destination 1",
                "Address 1",
                121.0000,
                14.5000,
                "2026-08-28T08:00:00.000Z",
            ]
        );

        await db.runAsync(
            "INSERT INTO recent_destinations",
            [
                "user123",
                "Destination 2",
                "Address 2",
                121.1000,
                14.6000,
                "2026-08-28T09:00:00.000Z",
            ]
        );

        await db.runAsync(
            "INSERT INTO recent_destinations",
            [
                "user123",
                "Destination 3",
                "Address 3",
                121.2000,
                14.7000,
                "2026-08-28T10:00:00.000Z",
            ]
        );

        const destinations = await db.getAllAsync(
            "SELECT * FROM recent_destinations WHERE user_id = ? LIMIT ?",
            ["user123", 2]
        );

        expect(destinations).toHaveLength(2);

        expect(destinations[0]).toEqual(
            expect.objectContaining({
                name: "Destination 3",
            })
        );

        expect(destinations[1]).toEqual(
            expect.objectContaining({
                name: "Destination 2",
            })
        );
    });
});

// isNativeSqliteAvailable() testing
describe("isNativeSqliteAvailable()", () => {
    test("reports that native SQLite is unavailable", async () => {
        const result = await isNativeSqliteAvailable();

        expect(result).toBe(false);
    });
});

// initLocalDb() testing
describe("initLocalDb()", () => {
    test("initializes the local database without throwing an error", async () => {
        await expect(initLocalDb()).resolves.toBeUndefined();
    });

    test("can be called multiple times without throwing an error", async () => {
        await expect(
            Promise.all([
                initLocalDb(),
                initLocalDb(),
            ])
        ).resolves.toEqual([
            undefined,
            undefined,
        ]);
    });
});

