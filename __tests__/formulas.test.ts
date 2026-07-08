import { formatDuration, formatTime } from "../lib/common/formulas";

// formatTime() testing
describe("formatTime()", () => {

    test("formats seconds only", () => {
        expect(formatTime(45)).toBe("00:45");
    });

    // Boundary: 59s
    test("formats 59s", () => {
        expect(formatTime(59)).toBe("00:59");
    });

    test("formats exactly 1m", () => {
        expect(formatTime(60)).toBe("01:00");
    });

    // Boundary: 1m 1s
    test("formats 1m 1s", () => {
        expect(formatTime(61)).toBe("01:01");
    });

    test("formats minutes only", () => {
        expect(formatTime(120)).toBe("02:00");
    });

    // Boundary: 59m 59s
    test("formats 59m 59s", () => {
        expect(formatTime(3599)).toBe("59:59");
    });

    test("formats exactly 1h", () => {
        expect(formatTime(3600)).toBe("01:00:00");
    });

    // Boundary: 1h 1s
    test("formats 1h 1s", () => {
        expect(formatTime(3601)).toBe("01:00:01");
    });
 
    test("formats hours only", () => {
        expect(formatTime(10800)).toBe("03:00:00");
    });

    // Minutes + seconds test
    test("formats minutes and seconds", () => {
        expect(formatTime(125)).toBe("02:05");
    });

    // Hour + seconds test
    test("formats hours and seconds", () => {
        expect(formatTime(3603)).toBe("01:00:03");
    });

    // Hour + minutess test
    test("formats hours and minutes", () => {
        expect(formatTime(3720)).toBe("01:02:00");
    });

    // Hour + minutes + seconds test
    test("formats hours, minutes and seconds", () => {
        expect(formatTime(10921)).toBe("03:02:01");
    });

    test("formats zero seconds", () => {
        expect(formatTime(0)).toBe("00:00");
    });

    test("formats 24 hours (large value)", () => {
        expect(formatTime(86400)).toBe("24:00:00");
    });
});

// formatDuration() testing
describe("formatDuration()", () => {

    test("formats seconds only", () => {
        expect(formatDuration(45)).toBe("0m 45s");
    });

    // Boundary: 59s
    test("formats 59s", () => {
        expect(formatDuration(59)).toBe("0m 59s");
    });

    test("formats exactly 1m", () => {
        expect(formatDuration(60)).toBe("1m ");
    });

    // Boundary: 1m 1s
    test("formats 1m 1s", () => {
        expect(formatDuration(61)).toBe("1m ");
    });

    test("formats minutes only", () => {
        expect(formatDuration(120)).toBe("2m ");
    });

    // Boundary: 59m 59s
    test("formats 59m 59s", () => {
        expect(formatDuration(3599)).toBe("59m ");
    });

    test("formats exactly 1h", () => {
        expect(formatDuration(3600)).toBe("1h 0s");
    });

    // Boundary: 1h 1s
    test("formats 1h 1s", () => {
        expect(formatDuration(3601)).toBe("1h 1s");
    });

    test("formats hours only", () => {
        expect(formatDuration(10800)).toBe("3h 0s");
    });

    // Minutes + seconds
    test("formats 3m 8s", () => {
        expect(formatDuration(188)).toBe("3m ");
    });

    // Hours + seconds
    test("formats 2h 4s", () => {
        expect(formatDuration(7204)).toBe("2h 4s");
    });

    // Hours + minutes
    test("formats 1h 2m", () => {
        expect(formatDuration(3720)).toBe("1h ");
    });

    // Hours + minutes + seconds
    test("formats 3h 2m 1s", () => {
        expect(formatDuration(10921)).toBe("3h ");
    });

    test("formats zero duration", () => {
        expect(formatDuration(0)).toBe("0m 0s");
    });

    test("formats 24h (large value)", () => {
        expect(formatDuration(86400)).toBe("24h 0s");
    });

});
