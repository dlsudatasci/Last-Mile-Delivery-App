// Cleans console from logs while running tests (For testing)
jest.spyOn(console, "error").mockImplementation(() => {});
jest.spyOn(console, "warn").mockImplementation(() => {});
jest.spyOn(console, "log").mockImplementation(() => {});

afterAll(() => {
    jest.restoreAllMocks();
});

// Expo
jest.mock("expo-localization", () => ({
    getCalendars: jest.fn(() => [
        {
            timeZone: "Asia/Singapore",
        },
    ]),
}));

jest.mock("expo-constants", () => ({
    expoConfig: {
        extra: {},
    },
}));

jest.mock(
    "@react-native-async-storage/async-storage",
    () =>
        require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

const mockSqliteTables = new Map<string, any[]>();
let mockSqliteRowId = 0;

const ensureTable = (name: string) => {
    if (!mockSqliteTables.has(name)) mockSqliteTables.set(name, []);
    return mockSqliteTables.get(name)!;
};

jest.mock("expo-sqlite", () => ({
    openDatabaseAsync: jest.fn(async () => ({
        execAsync: jest.fn(async () => {}),
        runAsync: jest.fn(async (sql: string, params: any[] = []) => {
            if (sql.includes("DELETE FROM local_accounts")) {
                const rows = ensureTable("local_accounts");
                if (sql.includes("WHERE phone = ?")) {
                    mockSqliteTables.set(
                        "local_accounts",
                        rows.filter(row => row.phone !== params[0])
                    );
                } else {
                    mockSqliteTables.set("local_accounts", []);
                }
                return;
            }
            if (sql.includes("INTO local_accounts")) {
                const rows = ensureTable("local_accounts").filter(row => row.phone !== params[0]);
                rows.push({
                    phone: params[0],
                    rider_code: params[1],
                    full_name: params[2],
                    gender: params[3],
                    age_range: params[4],
                    city: params[5],
                    years_experience: params[6],
                    accepted_policies: params[7],
                    created_at: params[8],
                });
                mockSqliteTables.set("local_accounts", rows);
                return;
            }
            if (sql.includes("DELETE FROM rider_code_registrations")) {
                const rows = ensureTable("rider_code_registrations");
                if (sql.includes("WHERE code = ?")) {
                    mockSqliteTables.set(
                        "rider_code_registrations",
                        rows.filter(row => row.code !== params[0])
                    );
                } else {
                    mockSqliteTables.set("rider_code_registrations", []);
                }
                return;
            }
            if (sql.includes("INTO rider_code_registrations")) {
                const rows = ensureTable("rider_code_registrations").filter(row => row.code !== params[0]);
                rows.push({ code: params[0], phone: params[1], registered_at: params[2] });
                mockSqliteTables.set("rider_code_registrations", rows);
                return;
            }
            if (sql.includes("DELETE FROM recent_destinations")) {
                const rows = ensureTable("recent_destinations");
                if (sql.includes("WHERE user_id = ? AND name = ?")) {
                    mockSqliteTables.set(
                        "recent_destinations",
                        rows.filter(
                            row =>
                                !(
                                    row.user_id === params[0] &&
                                    row.name === params[1] &&
                                    row.longitude === params[2] &&
                                    row.latitude === params[3]
                                )
                        )
                    );
                } else if (sql.includes("WHERE user_id = ?")) {
                    mockSqliteTables.set(
                        "recent_destinations",
                        rows.filter(row => row.user_id !== params[0])
                    );
                } else {
                    mockSqliteTables.set("recent_destinations", []);
                }
                return;
            }
            if (sql.includes("INTO recent_destinations")) {
                ensureTable("recent_destinations").push({
                    __rowid: ++mockSqliteRowId,
                    user_id: params[0],
                    name: params[1],
                    full_address: params[2],
                    longitude: params[3],
                    latitude: params[4],
                    updated_at: params[5],
                });
            }
        }),
        getFirstAsync: jest.fn(async (sql: string, params: any[] = []) => {
            if (sql.includes("FROM local_accounts")) {
                return ensureTable("local_accounts").find(row => row.phone === params[0]) ?? null;
            }
            if (sql.includes("FROM rider_code_registrations")) {
                return ensureTable("rider_code_registrations").find(row => row.code === params[0]) ?? null;
            }
            return null;
        }),
        getAllAsync: jest.fn(async (sql: string, params: any[] = []) => {
            if (sql.includes("FROM recent_destinations")) {
                const hasOffset = sql.includes("OFFSET");
                const offset = hasOffset && typeof params[1] === "number" ? params[1] : 0;
                const limit = !hasOffset && typeof params[1] === "number" ? params[1] : undefined;
                return ensureTable("recent_destinations")
                    .filter(row => row.user_id === params[0])
                    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at) || b.__rowid - a.__rowid)
                    .slice(offset, limit);
            }
            return [];
        }),
    })),
}));

jest.mock("expo-location");

// Firebase App
jest.mock("@react-native-firebase/app", () => ({}));

// Firebase Auth
jest.mock("@react-native-firebase/auth", () => ({
    getAuth: jest.fn(() => ({
        currentUser: {
            uid: "user123",
        },
    })),
}));

// Firestore
const mockBatchSet = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn();

jest.mock("@react-native-firebase/firestore", () => ({
    // Firestore instance
    getFirestore: jest.fn(() => ({})),

    // References
    collection: jest.fn(),
    doc: jest.fn(),

    // Queries
    query: jest.fn((...args) => args),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    startAfter: jest.fn(),

    // Reads
    getDoc: jest.fn(),
    getDocs: jest.fn(),

    // Writes
    updateDoc: jest.fn(),

    writeBatch: jest.fn(() => ({
        set: mockBatchSet,
        delete: mockBatchDelete,
        update: mockBatchUpdate,
        commit: mockBatchCommit,
    })),

    // Aggregate queries
    getCountFromServer: jest.fn(),
    getAggregateFromServer: jest.fn(),

    count: jest.fn(),
    sum: jest.fn(),
    average: jest.fn(),
}));

// Firebase Storage
const mockUploadTask = {
    on: jest.fn(),
};

const mockGetDownloadURL = jest.fn().mockResolvedValue(
    "https://firebase.storage/mock.jpg"
);

const mockStorageRef = {
    putFile: jest.fn(() => mockUploadTask),
    getDownloadURL: mockGetDownloadURL,
};

jest.mock("@react-native-firebase/storage", () => ({
    __esModule: true,

    default: jest.fn(() => ({
        ref: jest.fn(() => mockStorageRef),
    })),

    deleteObject: jest.fn(),
}));
