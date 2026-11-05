import { startOfMonth, startOfWeek } from "../lib/common/dateOptions";

jest.mock("expo-localization", () => ({
    getCalendars: () => [
        {
            timeZone: "Asia/Singapore",
        },
    ],
}));

//startOfWeek() testing
describe("startOfWeek()", () => {

    test("returns the same date when given a Monday", () => {
        // Local-time constructor (month is 0-based) so results don't depend on the machine timezone.
        const date = new Date(2026, 6, 6);
        const result = startOfWeek(new Date(date));

        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(6); // July (0 = January)
        expect(result.getDate()).toBe(6);
    });

    test("returns Monday when given a Wednesday", () => {
        const date = new Date(2026, 6, 8);
        const result = startOfWeek(new Date(date));

        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(6);
        expect(result.getDate()).toBe(6);
    });

    test("returns the previous Monday when given a Sunday", () => {
        const date = new Date(2026, 6, 12);
        const result = startOfWeek(new Date(date));

        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(6);
        expect(result.getDate()).toBe(6);
    });

    // Month test
    test("handles crossing into the previous month", () => {
        const date = new Date(2026, 7, 1);
        const result = startOfWeek(new Date(date));

        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(6); // July
        expect(result.getDate()).toBe(27);
    });

    // Year test
    test("handles crossing into the previous year", () => {
        const date = new Date(2027, 0, 1);
        const result = startOfWeek(new Date(date));

        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(11); // December
        expect(result.getDate()).toBe(28);
    });
});

// startOfMonth() testing
describe("startOfMonth()", () => {

    test("returns the same date when already the first day of the month", () => {
        const date = new Date(2026, 6, 1);
        const result = startOfMonth(date);

        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(6);
        expect(result.getDate()).toBe(1);
    });

    test("returns the first day when given a middle date", () => {
        const date = new Date(2026, 6, 17);
        const result = startOfMonth(date);

        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(6);
        expect(result.getDate()).toBe(1);
    });

    test("returns the first day when given the last day of the month", () => {
        const date = new Date(2026, 6, 31);
        const result = startOfMonth(date);

        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(6);
        expect(result.getDate()).toBe(1);
    });

    test("returns January 1 when given a date in January", () => {
        const date = new Date(2026, 0, 15);
        const result = startOfMonth(date);

        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(0);
        expect(result.getDate()).toBe(1);
    });

    test("handles leap year dates correctly", () => {
        const date = new Date(2028, 1, 29);
        const result = startOfMonth(date);

        expect(result.getFullYear()).toBe(2028);
        expect(result.getMonth()).toBe(1); // February
        expect(result.getDate()).toBe(1);
    });
});