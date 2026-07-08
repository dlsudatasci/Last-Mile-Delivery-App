import {
    STUDY_COMPENSATION_AMOUNT,
    STUDY_REQUIRED_SUBMISSIONS,
    enrollInStudy,
    getCompensationClaim,
    getStudyParticipation,
    isValidPhilippineMobileNumber,
    joinStudy,
    notifyQuotaReachedForValidation,
    submitCompensationClaim,
} from "../lib/firebase-crud/study";

import { getAuth } from "@react-native-firebase/auth";
import {
    collection,
    doc,
    getDoc,
    setDoc,
} from "@react-native-firebase/firestore";

import { getTotalRideCount } from "../lib/firebase-crud/rides";

// Mocks
jest.mock("../lib/utils/firebaseConfig", () => ({
    firestore: {},
}));

jest.mock("@react-native-firebase/auth", () => ({
    getAuth: jest.fn(),
}));

jest.mock("@react-native-firebase/firestore", () => ({
    doc: jest.fn(),
    getDoc: jest.fn(),
    collection: jest.fn(),
    setDoc: jest.fn(),
    serverTimestamp: jest.fn(),
}));

jest.mock("../lib/firebase-crud/rides", () => ({
    getTotalRideCount: jest.fn(),
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

// getStudyParticipaction() testing
describe("getStudyParticipation()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (getAuth as jest.Mock).mockReturnValue({
            currentUser: {
                uid: "user123",
                email: "test@example.com",
            },
        });

        (doc as jest.Mock).mockReturnValue("participant-doc");
    });

    test("returns participant data when document exists", async () => {
        const participant = {
            riderName: "Juan Dela Cruz",
            phoneNumber: "09171234567",
            status: "joined",
        };

        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => participant,
        });

        await expect(getStudyParticipation()).resolves.toEqual(participant);
    });

    test("returns null when participant does not exist", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        await expect(getStudyParticipation()).resolves.toBeNull();
    });

    test("uses the supplied userId instead of the authenticated user", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        await getStudyParticipation("anotherUser");

        expect(doc).toHaveBeenCalledWith(
            expect.anything(),
            "studyParticipants",
            "anotherUser"
        );
    });

    test("throws when there is no authenticated user", async () => {
        (getAuth as jest.Mock).mockReturnValue({
            currentUser: null,
        });

        await expect(getStudyParticipation()).rejects.toThrow(
            "User not authenticated"
        );
    });
});

// getCompensationClaim() testing
describe("getCompensationClaim()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (getAuth as jest.Mock).mockReturnValue({
            currentUser: {
                uid: "user123",
                email: "test@example.com",
            },
        });

        (doc as jest.Mock).mockReturnValue("claim-doc");
    });

    test("returns a compensation claim when it exists", async () => {
        const claim = {
            accountName: "Juan Dela Cruz",
            amount: 250,
            status: "pending_validation",
        };

        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => claim,
        });

        await expect(getCompensationClaim()).resolves.toEqual(claim);
    });

    test("returns null when no claim exists", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        await expect(getCompensationClaim()).resolves.toBeNull();
    });

    test("uses the supplied userId instead of the authenticated user", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        await getCompensationClaim("anotherUser");

        expect(doc).toHaveBeenCalledWith(
            expect.anything(),
            "compensationClaims",
            "anotherUser"
        );
    });

    test("throws when there is no authenticated user", async () => {
        (getAuth as jest.Mock).mockReturnValue({
            currentUser: null,
        });

        await expect(getCompensationClaim()).rejects.toThrow(
            "User not authenticated"
        );
    });


});

// joinStudy() testing
describe("joinStudy()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (getAuth as jest.Mock).mockReturnValue({
            currentUser: {
                uid: "user123",
                email: "user@test.com",
            },
        });

        (doc as jest.Mock).mockReturnValue("participant-doc");
        (setDoc as jest.Mock).mockResolvedValue(undefined);
    });

    const validData = {
        riderName: "Juan Dela Cruz",
        phoneNumber: "09171234567",
        deliveryPlatform: "Grab",
        vehicleType: "Motorcycle",
        acceptedTerms: true,
        acceptedPrivacy: true,
    };

    test("joins the study with valid data", async () => {
        const result = await joinStudy(validData);

        expect(setDoc).toHaveBeenCalledTimes(1);

        expect(result).toMatchObject({
            riderName: "Juan Dela Cruz",
            phoneNumber: "09171234567",
            deliveryPlatform: "Grab",
            vehicleType: "Motorcycle",
            userId: "user123",
            email: "user@test.com",
            status: "joined",
        });
    });

    test("trims whitespace before saving", async () => {
        await joinStudy({
            ...validData,
            riderName: "  Juan  ",
            phoneNumber: "0917 123-4567",
            deliveryPlatform: " Grab ",
            vehicleType: " Motorcycle ",
        });

        expect(setDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                riderName: "Juan",
                phoneNumber: "09171234567",
                deliveryPlatform: "Grab",
                vehicleType: "Motorcycle",
            }),
            { merge: true }
        );
    });

    test("throws when rider name is blank", async () => {
        await expect(
            joinStudy({
                ...validData,
                riderName: "",
            })
        ).rejects.toThrow("Rider name is required.");
    });

    test("throws when phone number is invalid", async () => {
        await expect(
            joinStudy({
                ...validData,
                phoneNumber: "08123456789",
            })
        ).rejects.toThrow(
            "Use a valid Philippine mobile number starting with 09."
        );
    });

    test("throws when delivery platform is blank", async () => {
        await expect(
            joinStudy({
                ...validData,
                deliveryPlatform: "",
            })
        ).rejects.toThrow("Delivery platform is required.");
    });

    test("throws when vehicle type is blank", async () => {
        await expect(
            joinStudy({
                ...validData,
                vehicleType: "",
            })
        ).rejects.toThrow("Vehicle type is required.");
    });

    test("throws when terms are not accepted", async () => {
        await expect(
            joinStudy({
                ...validData,
                acceptedTerms: false,
            })
        ).rejects.toThrow(
            "Please accept the terms and privacy policy to join."
        );
    });

    test("throws when privacy policy is not accepted", async () => {
        await expect(
            joinStudy({
                ...validData,
                acceptedPrivacy: false,
            })
        ).rejects.toThrow(
            "Please accept the terms and privacy policy to join."
        );
    });
});
 
// enrollInStudy() testing
describe("enrollInStudy()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (getAuth as jest.Mock).mockReturnValue({
            currentUser: {
                uid: "user123",
                email: "user@test.com",
            },
        });

        (doc as jest.Mock).mockReturnValue("participant-doc");
        (setDoc as jest.Mock).mockResolvedValue(undefined);
    });

    const validConsent = {
        acceptedPrivacyPolicy: true,
        acceptedDataUsage: true,
        acceptedParticipationTerms: true,
    };

    test("enrolls successfully using the user's profile", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => ({
                fullName: "Juan Dela Cruz",
                phone: "09171234567",
            }),
        });

        const result = await enrollInStudy(validConsent);

        expect(setDoc).toHaveBeenCalledTimes(1);

        expect(result).toMatchObject({
            riderName: "Juan Dela Cruz",
            phoneNumber: "09171234567",
            acceptedDataUsage: true,
            acceptedPrivacy: true,
            acceptedTerms: true,
            status: "joined",
        });
    });

    test("uses username when fullName is unavailable", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => ({
                username: "Juan123",
                phone: "09171234567",
            }),
        });

        const result = await enrollInStudy(validConsent);

        expect(result.riderName).toBe("Juan123");
    });

    test("uses empty values when profile does not exist", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        const result = await enrollInStudy(validConsent);

        expect(result.riderName).toBe("");
        expect(result.phoneNumber).toBe("");
    });

    test("throws when privacy policy is not accepted", async () => {
        await expect(
            enrollInStudy({
                ...validConsent,
                acceptedPrivacyPolicy: false,
            })
        ).rejects.toThrow(
            "Please agree to all terms and conditions to enroll."
        );
    });

    test("throws when data usage is not accepted", async () => {
        await expect(
            enrollInStudy({
                ...validConsent,
                acceptedDataUsage: false,
            })
        ).rejects.toThrow(
            "Please agree to all terms and conditions to enroll."
        );
    });

    test("throws when participation terms are not accepted", async () => {
        await expect(
            enrollInStudy({
                ...validConsent,
                acceptedParticipationTerms: false,
            })
        ).rejects.toThrow(
            "Please agree to all terms and conditions to enroll."
        );
    });
});

// notifyQuotaReachedForValidation() testing
describe("notifyQuotaReachedForValidation()", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (getAuth as jest.Mock).mockReturnValue({
            currentUser: {
                uid: "user123",
                email: "user@test.com",
            },
        });

        (doc as jest.Mock).mockReturnValue("notification-doc");
        (setDoc as jest.Mock).mockResolvedValue(undefined);
    });

    test("returns false when submission quota has not been reached", async () => {
        (getTotalRideCount as jest.Mock).mockResolvedValue(
            STUDY_REQUIRED_SUBMISSIONS - 1
        );

        const result = await notifyQuotaReachedForValidation();

        expect(result).toBe(false);
        expect(setDoc).not.toHaveBeenCalled();
    });

    test("returns true when notification already exists", async () => {
        (getTotalRideCount as jest.Mock).mockResolvedValue(
            STUDY_REQUIRED_SUBMISSIONS
        );

        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
        });

        const result = await notifyQuotaReachedForValidation();

        expect(result).toBe(true);
        expect(setDoc).not.toHaveBeenCalled();
    });

    test("creates an admin notification when quota is reached", async () => {
        (getTotalRideCount as jest.Mock).mockResolvedValue(
            STUDY_REQUIRED_SUBMISSIONS
        );

        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        const result = await notifyQuotaReachedForValidation();

        expect(result).toBe(true);

        expect(setDoc).toHaveBeenCalledTimes(1);

        expect(setDoc).toHaveBeenCalledWith(
            "notification-doc",
            expect.objectContaining({
                type: "quota_reached_ready_for_cross_check",
                userId: "user123",
                email: "user@test.com",
                recordedSubmissions: STUDY_REQUIRED_SUBMISSIONS,
                requiredSubmissions: STUDY_REQUIRED_SUBMISSIONS,
                status: "unread",
            })
        );
    });

    test("uses the supplied userId instead of the authenticated user", async () => {
        (getTotalRideCount as jest.Mock).mockResolvedValue(
            STUDY_REQUIRED_SUBMISSIONS
        );

        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
        });

        await notifyQuotaReachedForValidation("anotherUser");

        expect(getTotalRideCount).toHaveBeenCalledWith("anotherUser");
    });
});

// submitCompensationClaim() testing
describe("submitCompensationClaim()", () => {
    const validClaim = {
        paymentMethod: "gcash" as const,
        accountName: "Juan Dela Cruz",
        accountNumber: "09171234567",
        phoneNumber: "09171234567",
    };

    beforeEach(() => {
        jest.clearAllMocks();

        (getAuth as jest.Mock).mockReturnValue({
            currentUser: {
                uid: "user123",
                email: "user@test.com",
            },
        });

        (doc as jest.Mock).mockReturnValue("claim-doc");
        (collection as jest.Mock).mockReturnValue("notification-collection");
        (setDoc as jest.Mock).mockResolvedValue(undefined);

        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => ({
                status: "joined",
            }),
        });

        (getTotalRideCount as jest.Mock).mockResolvedValue(
            STUDY_REQUIRED_SUBMISSIONS
        );
    });

    test("throws when user has not joined the study", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false,
        });

        await expect(
            submitCompensationClaim(validClaim)
        ).rejects.toThrow(
            "Join the Devia Route Study before submitting a compensation claim."
        );
    });

    test("throws when participant status is not joined", async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => ({
                status: "removed",
            }),
        });

        await expect(
            submitCompensationClaim(validClaim)
        ).rejects.toThrow(
            "Join the Devia Route Study before submitting a compensation claim."
        );
    });

    test("throws when required submissions have not been reached", async () => {
        (getTotalRideCount as jest.Mock).mockResolvedValue(
            STUDY_REQUIRED_SUBMISSIONS - 1
        );

        await expect(
            submitCompensationClaim(validClaim)
        ).rejects.toThrow(
            `You need ${STUDY_REQUIRED_SUBMISSIONS} validated submissions before claiming compensation.`
        );
    });

    test("throws for an invalid phone number", async () => {
        await expect(
            submitCompensationClaim({
                ...validClaim,
                phoneNumber: "12345",
            })
        ).rejects.toThrow(
            "Use a valid Philippine mobile number starting with 09."
        );
    });

    test("throws when account name is blank", async () => {
        await expect(
            submitCompensationClaim({
                ...validClaim,
                accountName: "",
            })
        ).rejects.toThrow("Account name is required.");
    });

    test("throws when account number is blank", async () => {
        await expect(
            submitCompensationClaim({
                ...validClaim,
                accountNumber: "",
            })
        ).rejects.toThrow("Account number is required.");
    });

    test("creates a compensation claim", async () => {
        const result = await submitCompensationClaim(validClaim);

        expect(result.paymentMethod).toBe("gcash");
        expect(result.accountName).toBe("Juan Dela Cruz");
        expect(result.accountNumber).toBe("09171234567");
        expect(result.phoneNumber).toBe("09171234567");
        expect(result.status).toBe("pending_validation");
        expect(result.userId).toBe("user123");
        expect(result.amount).toBe(STUDY_COMPENSATION_AMOUNT);

        expect(result.referenceNumber).toContain("DEVIA-");
    });

    test("stores the compensation claim in Firestore", async () => {
        await submitCompensationClaim(validClaim);

        expect(setDoc).toHaveBeenNthCalledWith(
            1,
            "claim-doc",
            expect.objectContaining({
                paymentMethod: "gcash",
                accountName: "Juan Dela Cruz",
                status: "pending_validation",
                amount: STUDY_COMPENSATION_AMOUNT,
            }),
            { merge: true }
        );
    });

    test("creates an admin notification", async () => {
        await submitCompensationClaim(validClaim);

        expect(setDoc).toHaveBeenNthCalledWith(
            2,
            "claim-doc",
            expect.objectContaining({
                type: "compensation_claim_ready_for_validation",
                userId: "user123",
                email: "user@test.com",
                amount: STUDY_COMPENSATION_AMOUNT,
                status: "unread",
            })
        );
    });

    test("removes spaces and hyphens from the phone number", async () => {
        const result = await submitCompensationClaim({
            ...validClaim,
            phoneNumber: "0917-123-4567",
        });

        expect(result.phoneNumber).toBe("09171234567");
    });

    test("trims account name and account number", async () => {
        const result = await submitCompensationClaim({
            ...validClaim,
            accountName: "  Juan Dela Cruz  ",
            accountNumber: "  09171234567  ",
        });

        expect(result.accountName).toBe("Juan Dela Cruz");
        expect(result.accountNumber).toBe("09171234567");
    });
});