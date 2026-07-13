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