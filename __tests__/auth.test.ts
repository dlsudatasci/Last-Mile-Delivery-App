// Imports
import {
    createUserProfile,
    emailToPhone,
    getUserProfile,
    isValidPhilippineMobileNumber,
    phoneToEmail,
    resolveAuthenticatedSession,
    saveOnboardingProfile,
    signInWithPhone,
    signUpOrSignInWithPhone,
    updateUserProfile
} from "../lib/firebase-crud/auth";

import {
    createUserWithEmailAndPassword,
    getAuth,
    signInWithEmailAndPassword,
} from "@react-native-firebase/auth";

import {
    doc,
    getDoc,
    setDoc,
} from "@react-native-firebase/firestore";

import { useUser } from "@/stores/useUser";
import { getLocalAccount } from "../lib/local-db/accounts";

// Mocks
const mockPutFile = jest.fn();
const mockGetDownloadURL = jest.fn();
const mockRef = jest.fn();

jest.mock("../lib/utils/firebaseConfig", () => ({
    firestore: {},
}));

jest.mock("@react-native-firebase/auth", () => ({
    getAuth: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
}));

jest.mock("@react-native-firebase/firestore", () => ({
    doc: jest.fn(),
    getDoc: jest.fn(),
    setDoc: jest.fn(),
}));

jest.mock("@react-native-firebase/storage", () => {
    return () => ({
        ref: mockRef,
    });
});

jest.mock("../lib/local-db/accounts", () => ({
    getLocalAccount: jest.fn(),
}));

jest.mock("@/stores/useUser", () => ({
    useUser: {
        getState: jest.fn(),
    },
}));

// isValidPhilippineMobileNumber() testing
describe("isValidPhilippineMobileNumber()", () => {

    test("accepts a valid mobile number", () => {
        expect(isValidPhilippineMobileNumber("09171234567")).toBe(true);
    });

    test("accepts a number with spaces", () => {
        expect(isValidPhilippineMobileNumber("0917 123 4567")).toBe(true);
    });

    test("accepts a number with dashes", () => {
        expect(isValidPhilippineMobileNumber("0917-123-4567")).toBe(true);
    });

    test("accepts a number with spaces and dashes", () => {
        expect(isValidPhilippineMobileNumber("0917 123-4567")).toBe(true);
    });

    test("rejects an invalid prefix", () => {
        expect(isValidPhilippineMobileNumber("08171234567")).toBe(false);
    });

    test("rejects a number that is too short", () => {
        expect(isValidPhilippineMobileNumber("0917123456")).toBe(false);
    });

    test("rejects a number that is too long", () => {
        expect(isValidPhilippineMobileNumber("091712345678")).toBe(false);
    });

    test("rejects letters", () => {
        expect(isValidPhilippineMobileNumber("0917abc4567")).toBe(false);
    });

    test("rejects an empty string", () => {
        expect(isValidPhilippineMobileNumber("")).toBe(false);
    });
});

// phoneToEmail() testing
describe("phoneToEmail()", () => {

    test("converts a phone number into a Devia email", () => {
        expect(phoneToEmail("09171234567"))
            .toBe("09171234567@devia.app");
    });

    test("removes spaces before creating the email", () => {
        expect(phoneToEmail("0917 123 4567"))
            .toBe("09171234567@devia.app");
    });

    test("removes hyphens before creating the email", () => {
        expect(phoneToEmail("0917-123-4567"))
            .toBe("09171234567@devia.app");
    });
});


// emailToPhone() testing
describe("emailToPhone()", () => {

    test("extracts a phone number from a Devia email", () => {
        expect(emailToPhone("09171234567@devia.app"))
            .toBe("09171234567");
    });

    test("returns null for a non-Devia email", () => {
        expect(emailToPhone("user@gmail.com")).toBeNull();
    });

    test("returns null for an invalid phone inside the email", () => {
        expect(emailToPhone("123456@devia.app")).toBeNull();
    });

    test("returns null when email is null", () => {
        expect(emailToPhone(null)).toBeNull();
    });

    test("returns null when email is undefined", () => {
        expect(emailToPhone(undefined)).toBeNull();
    });

    test("returns null when the email has no phone number", () => {
        expect(emailToPhone("@devia.app")).toBeNull();
    });
});

// signUpOrSignInWithPhone() testing
describe("signUpOrSignInWithPhone()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (getAuth as jest.Mock).mockReturnValue("mock-auth");
    });

    test("creates a new Firebase account", async () => {
        const mockUser = {
            uid: "user123",
            email: "09171234567@devia.app",
        };

        (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
            user: mockUser,
        });

        const result = await signUpOrSignInWithPhone("09171234567");

        expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
            "mock-auth",
            "09171234567@devia.app",
            "Devia-09171234567-sample"
        );

        expect(result).toEqual({
            user: mockUser,
            isNewUser: true,
        });
    });

    test("signs in when the account already exists", async () => {
        const mockUser = {
            uid: "user123",
            email: "09171234567@devia.app",
        };

        (createUserWithEmailAndPassword as jest.Mock).mockRejectedValue({
            code: "auth/email-already-in-use",
        });

        (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
            user: mockUser,
        });

        const result = await signUpOrSignInWithPhone("09171234567");

        expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
            "mock-auth",
            "09171234567@devia.app",
            "Devia-09171234567-sample"
        );

        expect(result).toEqual({
            user: mockUser,
            isNewUser: false,
        });
    });

    test("rethrows unexpected Firebase errors", async () => {
        const error = {
            code: "auth/network-request-failed",
        };

        (createUserWithEmailAndPassword as jest.Mock).mockRejectedValue(error);

        await expect(
            signUpOrSignInWithPhone("09171234567")
        ).rejects.toEqual(error);
    });


    test("normalizes the phone number before creating the account", async () => {
        (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
            user: {
                uid: "user123",
            },
        });

        await signUpOrSignInWithPhone("0917-123-4567");

        expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
            "mock-auth",
            "09171234567@devia.app",
            "Devia-09171234567-sample"
        );
    });
});

// signInWithPhone() testing
describe("signInWithPhone()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (getAuth as jest.Mock).mockReturnValue("mock-auth");
    });

    test("returns the authenticated user", async () => {
        const mockUser = {
            uid: "user123",
            email: "09171234567@devia.app",
        };

        (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
            user: mockUser,
        });

        const result = await signInWithPhone("09171234567");

        expect(result).toEqual(mockUser);
    });

    test("throws account-not-found when the user does not exist", async () => {
        (signInWithEmailAndPassword as jest.Mock).mockRejectedValue({
            code: "auth/user-not-found",
        });

        await expect(
            signInWithPhone("09171234567")
        ).rejects.toThrow("account-not-found");
    });

    test("throws account-not-found for invalid credentials", async () => {
        (signInWithEmailAndPassword as jest.Mock).mockRejectedValue({
            code: "auth/invalid-credential",
        });

        await expect(
            signInWithPhone("09171234567")
        ).rejects.toThrow("account-not-found");
    });

    test("throws account-not-found for wrong password", async () => {
        (signInWithEmailAndPassword as jest.Mock).mockRejectedValue({
            code: "auth/wrong-password",
        });

        await expect(
            signInWithPhone("09171234567")
        ).rejects.toThrow("account-not-found");
    });

    test("rethrows unexpected Firebase errors", async () => {
        const error = {
            code: "auth/network-request-failed",
        };

        (signInWithEmailAndPassword as jest.Mock).mockRejectedValue(error);

        await expect(
            signInWithPhone("09171234567")
        ).rejects.toEqual(error);
    });

    test("normalizes the phone number before signing in", async () => {
        (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
            user: {
                uid: "user123",
            },
        });

        await signInWithPhone("0917 123 4567");

        expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
            "mock-auth",
            "09171234567@devia.app",
            "Devia-09171234567-sample"
        );
    });
});

// saveOnboardingProfile() testing
describe("saveOnboardingProfile()", () => {
    const profile = {
        fullName: "Juan Dela Cruz",
        preferredName: "Juan Dela Cruz",
        gender: "Male",
        ageRange: "25-34",
        city: "Pasig",
        yearsExperience: "3 years",
        deliveryPlatform: "Grab",
        riderCode: "123456",
        phone: "09171234567",
        acceptedPolicies: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        (doc as jest.Mock).mockReturnValue("user-doc");
        (setDoc as jest.Mock).mockResolvedValue(undefined);
    });

    test("saves the onboarding profile", async () => {
        const result = await saveOnboardingProfile("user123", profile);

        expect(result.success).toBe(true);

        expect(result.data).toEqual({
            id: "user123",
            ...profile,
            username: profile.fullName,
        });

        expect(setDoc).toHaveBeenCalledTimes(1);
    });

    test("stores username using the full name", async () => {
        await saveOnboardingProfile("user123", profile);

        expect(setDoc).toHaveBeenCalledWith(
            "user-doc",
            expect.objectContaining({
                username: "Juan Dela Cruz",
                fullName: "Juan Dela Cruz",
            }),
            { merge: true }
        );
    });

    test("uses merge:true when saving", async () => {
        await saveOnboardingProfile("user123", profile);

        expect(setDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.any(Object),
            { merge: true }
        );
    });

    test("rethrows Firestore errors", async () => {
        (setDoc as jest.Mock).mockRejectedValue(
            new Error("Firestore Error")
        );

        await expect(
            saveOnboardingProfile("user123", profile)
        ).rejects.toThrow("Firestore Error");
    });
});


// getUserProfile() testing
describe("getUserProfile()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (doc as jest.Mock).mockReturnValue("user-doc");
    });

    test("returns the user profile when it exists", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => ({
                username: "Juan",
                email: "juan@test.com",
            }),
        });

        const result = await getUserProfile("user123");

        expect(result).toEqual({
            success: true,
            data: {
                id: "user123",
                username: "Juan",
                email: "juan@test.com",
            },
        });
    });

    test("returns an error when the profile does not exist", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        const result = await getUserProfile("user123");

        expect(result).toEqual({
            success: false,
            error: "User profile not found",
        });
    });

    test("rethrows Firestore errors", async () => {
        (getDoc as jest.Mock).mockRejectedValue(
            new Error("Firestore Error")
        );

        await expect(
            getUserProfile("user123")
        ).rejects.toThrow("Firestore Error");
    });
});

// updateUserProfile() testing
describe("updateUserProfile()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (doc as jest.Mock).mockReturnValue("user-doc");
        (setDoc as jest.Mock).mockResolvedValue(undefined);

        const uploadTask = Promise.resolve() as any;
        uploadTask.on = jest.fn();

        mockPutFile.mockReturnValue(uploadTask);

        mockGetDownloadURL.mockResolvedValue(
            "https://firebase.dev/profile.jpg"
        );

        mockRef.mockReturnValue({
            putFile: mockPutFile,
            getDownloadURL: mockGetDownloadURL,
        });
    });

    test("updates profile successfully", async () => {
        const result = await updateUserProfile(
            "user123",
            "Juan Dela Cruz"
        );

        expect(setDoc).toHaveBeenCalledWith(
            "user-doc",
            expect.objectContaining({
                username: "Juan Dela Cruz",
            }),
            { merge: true }
        );

        expect(result).toEqual({
            success: true,
            data: {
                username: "Juan Dela Cruz",
            },
        });
    });

    test("uses merge:true when updating Firestore", async () => {
        await updateUserProfile(
            "user123",
            "Juan"
        );

        expect(setDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.any(Object),
            { merge: true }
        );
    });

    test("rethrows Firestore errors", async () => {
        (setDoc as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            updateUserProfile(
                "user123",
                "Juan"
            )
        ).rejects.toThrow("Firestore failed");
    });


});

// resolveAuthenticatedSession() testing
describe("resolveAuthenticatedSession()", () => {
    const user = {
        uid: "user123",
        email: "09171234567@devia.app",
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns the home destination when Firestore profile exists", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => ({
                username: "Juan",
                fullName: "Juan Dela Cruz",
            }),
        });

        const result = await resolveAuthenticatedSession(user as any);

        expect(result.destination).toBe("/main/(tabs)/home");
        expect(result.profile?.username).toBe("Juan");
    });

    test("uses the persisted profile when Firestore lookup fails", async () => {
        (getDoc as jest.Mock).mockRejectedValue(
            new Error("Firestore unavailable")
        );

        (useUser.getState as jest.Mock).mockReturnValue({
            user: {
                id: "user123",
                username: "Persisted User",
            },
            setUser: jest.fn(),
        });

        const result = await resolveAuthenticatedSession(user as any);

        expect(result.destination).toBe("/main/(tabs)/home");
        expect(result.profile?.username).toBe("Persisted User");
    });

    test("restores a profile from local storage", async () => {
        (getDoc as jest.Mock).mockRejectedValue(
            new Error("Firestore unavailable")
        );

        const setUser = jest.fn();

        (useUser.getState as jest.Mock).mockReturnValue({
            user: null,
            setUser,
        });

        (getLocalAccount as jest.Mock).mockResolvedValue({
            phone: "09171234567",
            fullName: "Juan Dela Cruz",
            gender: "Male",
            ageRange: "25-34",
            city: "Pasig",
            yearsExperience: "3 years",
            createdAt: new Date().toISOString(),
        });

        const result = await resolveAuthenticatedSession(user as any);

        expect(result.destination).toBe("/main/(tabs)/home");

        expect(setUser).toHaveBeenCalled();

        expect(result.profile?.fullName).toBe("Juan Dela Cruz");
    });

    test("routes to create-profile when no profile exists", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        (useUser.getState as jest.Mock).mockReturnValue({
            user: null,
            setUser: jest.fn(),
        });

        (getLocalAccount as jest.Mock).mockResolvedValue(null);

        const result = await resolveAuthenticatedSession(user as any);

        expect(result).toEqual({
            destination: "/create-profile",
            profile: null,
        });
    });

    test("falls back when Firestore profile has no username or fullName", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => ({}),
        });

        (useUser.getState as jest.Mock).mockReturnValue({
            user: null,
            setUser: jest.fn(),
        });

        (getLocalAccount as jest.Mock).mockResolvedValue(null);

        const result = await resolveAuthenticatedSession(user as any);

        expect(result.destination).toBe("/create-profile");
    });

    test("routes to create-profile when email is not a Devia account", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        (useUser.getState as jest.Mock).mockReturnValue({
            user: null,
            setUser: jest.fn(),
        });

        const result = await resolveAuthenticatedSession({
            uid: "user123",
            email: "juan@gmail.com",
        } as any);

        expect(result).toEqual({
            destination: "/create-profile",
            profile: null,
        });

        expect(getLocalAccount).not.toHaveBeenCalled();
    });

    test("does not use a persisted profile belonging to another user", async () => {
        (getDoc as jest.Mock).mockRejectedValue(
            new Error("Firestore unavailable")
        );

        const setUser = jest.fn();

        (useUser.getState as jest.Mock).mockReturnValue({
            user: {
                id: "user999",
                username: "Wrong User",
            },
            setUser,
        });

        (getLocalAccount as jest.Mock).mockResolvedValue(null);

        const result = await resolveAuthenticatedSession({
            uid: "user123",
            email: "09171234567@devia.app",
        } as any);

        expect(result.destination).toBe("/create-profile");
        expect(result.profile).toBeNull();
        expect(setUser).not.toHaveBeenCalled();
    });
});

// createUserProfile() testing
describe("createUserProfile()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (doc as jest.Mock).mockReturnValue("user-doc");
        (setDoc as jest.Mock).mockResolvedValue(undefined);
    });

    test("creates a user profile", async () => {
        const result = await createUserProfile(
            "user123",
            "Juan"
        );

        expect(setDoc).toHaveBeenCalledWith(
            "user-doc",
            expect.objectContaining({
                username: "Juan",
            }),
            { merge: true }
        );

        expect(result).toEqual({
            success: true,
            data: {
                id: "user123",
                username: "Juan",
            },
        });
    });

    test("uses merge:true when creating the profile", async () => {
        await createUserProfile(
            "user123",
            "Juan"
        );

        expect(setDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.any(Object),
            { merge: true }
        );
    });

    test("rethrows Firestore errors", async () => {
        (setDoc as jest.Mock).mockRejectedValue(
            new Error("Firestore failed")
        );

        await expect(
            createUserProfile(
                "user123",
                "Juan"
            )
        ).rejects.toThrow("Firestore failed");
    });


});