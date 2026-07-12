// Imports
import { createSupportRequest } from "../lib/firebase-crud/support";

import {
    collection,
    doc,
    setDoc,
} from "@react-native-firebase/firestore";

import { auth, firestore } from "../lib/utils/firebaseConfig";

// Mocks
jest.mock("../lib/utils/firebaseConfig", () => ({
    auth: {
        currentUser: {
            uid: "test-user",
        },
    },
    firestore: {},
}));

jest.mock("@react-native-firebase/firestore", () => ({
    collection: jest.fn(),
    doc: jest.fn(),
    setDoc: jest.fn(),
}));

// createSupportRequest() testing
describe("createSupportRequest()", () => {
    const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => { });

    beforeEach(() => {
        jest.clearAllMocks();

        (collection as jest.Mock).mockReturnValue("ticketsCollection");
        (doc as jest.Mock).mockReturnValue("ticketDoc");
        (setDoc as jest.Mock).mockResolvedValue(undefined);
    });

    afterAll(() => {
        consoleSpy.mockRestore();
    });

    test("creates a support ticket successfully", async () => {
        await createSupportRequest(
            "Login Issue",
            "Cannot log into the application"
        );

        expect(collection).toHaveBeenCalledWith(
            firestore,
            "tickets"
        );

        expect(doc).toHaveBeenCalledWith(
            "ticketsCollection"
        );

        expect(setDoc).toHaveBeenCalledTimes(1);

        expect(setDoc).toHaveBeenCalledWith(
            "ticketDoc",
            expect.objectContaining({
                subject: "Login Issue",
                description: "Cannot log into the application",
                userId: "test-user",
                status: "pending",
            })
        );
    });

    test("throws when user is not authenticated", async () => {
        (auth as any).currentUser = null;

        await expect(
            createSupportRequest("Test", "Test")
        ).rejects.toThrow("User not authenticated");

        expect(setDoc).not.toHaveBeenCalled();
    });


    test("rethrows Firestore errors", async () => {
        (auth as any).currentUser = {
            uid: "test-user",
        };

        (setDoc as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            createSupportRequest("Test", "Description")
        ).rejects.toThrow("Firestore failed");
    });
});