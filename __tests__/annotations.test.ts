// Imports
import {
    Annotation,
    deleteAnnotation,
    saveAnnotation,
} from "../lib/firebase-crud/annotations";

import {
    collection,
    doc,
    setDoc
} from "@react-native-firebase/firestore";

import { deleteObject } from "@react-native-firebase/storage";


// Mocks
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn();

jest.mock("@react-native-firebase/firestore", () => ({
    collection: jest.fn(),
    doc: jest.fn(),
    setDoc: jest.fn(),
    writeBatch: jest.fn(() => ({
        delete: mockBatchDelete,
        commit: mockBatchCommit,
    })),
}));

const mockPutFile = jest.fn();
const mockGetDownloadURL = jest.fn();
const mockRef = jest.fn();

jest.mock("@react-native-firebase/storage", () => {
    const storage = jest.fn(() => ({
        ref: mockRef,
    }));

    return {
        __esModule: true,
        default: storage,
        deleteObject: jest.fn(),
    };
});

jest.mock("../lib/utils/firebaseConfig", () => ({
    auth: {
        currentUser: {
            uid: "user123",
        },
    },
    firestore: {},
}));

// saveAnnotation() testing
describe("saveAnnotation()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (collection as jest.Mock)
            .mockReturnValueOnce("rides")
            .mockReturnValueOnce("annotations");

        (doc as jest.Mock)
            .mockReturnValueOnce({
                id: "ride123",
            })
            .mockReturnValueOnce({
                id: "annotation123",
            });

        (setDoc as jest.Mock).mockResolvedValue(undefined);

        const uploadTask: any = Promise.resolve();
        uploadTask.on = jest.fn();

        mockPutFile.mockReturnValue(uploadTask);

        mockGetDownloadURL.mockResolvedValue(
            "https://firebase.dev/image.jpg"
        );

        mockRef.mockReturnValue({
            putFile: mockPutFile,
            getDownloadURL: mockGetDownloadURL,
        });
    });

    test("saves annotation without media", async () => {
        const result = await saveAnnotation({
            rideId: "ride123",
            annotationId: "abc",
            type: "point",
            points: [],
        });

        expect(mockPutFile).not.toHaveBeenCalled();

        expect(setDoc).toHaveBeenCalled();

        expect(result.userId).toBe("user123");
        expect(result.mediaUri).toBeNull();
    });

    test("uploads media before saving annotation", async () => {
        const uploadTask: any = {
            on: jest.fn(),
            then: undefined,
        };

        mockPutFile.mockReturnValue(uploadTask);

        const result = await saveAnnotation({
            rideId: "ride123",
            annotationId: "abc",
            type: "point",
            points: [],
            mediaUri: "/image.jpg",
        });

        expect(mockRef).toHaveBeenCalled();

        expect(mockPutFile).toHaveBeenCalledWith(
            "/image.jpg"
        );

        expect(mockGetDownloadURL).toHaveBeenCalled();

        expect(result.mediaUri).toBe(
            "https://firebase.dev/image.jpg"
        );
    });

    test("throws when user is not authenticated", async () => {
        jest.resetModules();

        jest.doMock("../lib/utils/firebaseConfig", () => ({
            auth: {
                currentUser: null,
            },
            firestore: {},
        }));

        const {
            saveAnnotation,
        } = require("../lib/firebase-crud/annotations");

        await expect(
            saveAnnotation({
                rideId: "ride123",
                annotationId: "abc",
                type: "point",
                points: [],
            })
        ).rejects.toThrow("User not authenticated");
    });

    test("rethrows upload errors", async () => {
        const uploadTask: any = {
            on: jest.fn(),
            then: jest.fn((_resolve, reject) =>
                Promise.reject(new Error("Upload failed")).catch(reject)
            ),
        };

        mockPutFile.mockReturnValue(uploadTask);

        await expect(
            saveAnnotation({
                rideId: "ride123",
                annotationId: "abc",
                type: "point",
                points: [],
                mediaUri: "/image.jpg",
            })
        ).rejects.toThrow("Upload failed");
    });

    test("rethrows Firestore errors", async () => {
        (setDoc as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            saveAnnotation({
                rideId: "ride123",
                annotationId: "abc",
                type: "point",
                points: [],
            })
        ).rejects.toThrow("Firestore failed");
    });
});

// deleteAnnotation() testing
describe("deleteAnnotation()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        mockBatchCommit.mockResolvedValue(undefined);

        (collection as jest.Mock).mockReset();
        (doc as jest.Mock).mockReset();

        (collection as jest.Mock).mockReturnValue(
            "annotations"
        );

        (doc as jest.Mock).mockReturnValue(
            "annotation-doc"
        );

        mockRef.mockReturnValue({});
    });

    const annotation: Annotation = {
        id: "annotation123",
        rideId: "ride123",
        userId: "user123",
        annotationId: "abc",
        type: "point",
        points: [],
        createdAt: Date.now(),
    };

    test("deletes annotation without media", async () => {
        await deleteAnnotation(annotation);

        expect(mockBatchDelete).toHaveBeenCalledWith(
            "annotation-doc"
        );

        expect(deleteObject).not.toHaveBeenCalled();

        expect(mockBatchCommit).toHaveBeenCalled();
    });

    test("deletes media before committing batch", async () => {
        (deleteObject as jest.Mock).mockResolvedValue(
            undefined
        );

        await deleteAnnotation({
            ...annotation,
            mediaUri: "https://firebase.dev/image.jpg",
        });

        expect(mockRef).toHaveBeenCalled();

        expect(deleteObject).toHaveBeenCalled();

        expect(mockBatchCommit).toHaveBeenCalled();
    });

    test("throws when deleteObject fails", async () => {
        (deleteObject as jest.Mock).mockRejectedValue(
            new Error("Storage failed")
        );

        await expect(
            deleteAnnotation({
                ...annotation,
                mediaUri: "https://firebase.dev/image.jpg",
            })
        ).rejects.toThrow("Storage failed");
    });

    test("throws when batch commit fails", async () => {
        mockBatchCommit.mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            deleteAnnotation(annotation)
        ).rejects.toThrow("Firestore failed");
    });
});