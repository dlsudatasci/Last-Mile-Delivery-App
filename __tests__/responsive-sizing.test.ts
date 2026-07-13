import {
    fontSize,
    fontSizes,
    height,
    hitSlop,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
    size,
    sizes,
    width,
} from "../lib/utils/responsive-sizing";

jest.mock("react-native", () => ({
    Dimensions: {
        get: jest.fn(() => ({
            width: 1080,
            height: 1920,
        })),
    },
    Platform: {
        OS: "android",
    },
    StatusBar: {
        currentHeight: 24,
    },
}));

// size() testing
describe("size()", () => {

    test("returns 0 when input is 0", () => {
        expect(size(0)).toBe(0);
    });

    test("scales 10 correctly", () => {
        const expected = ((SCREEN_HEIGHT / SCREEN_WIDTH) * 10) / 2.2;
        expect(size(10)).toBeCloseTo(expected);
    });

    test("scales 20 correctly", () => {
        const expected = ((SCREEN_HEIGHT / SCREEN_WIDTH) * 20) / 2.2;
        expect(size(20)).toBeCloseTo(expected);
    });

    test("scales decimal values", () => {
        const expected = ((SCREEN_HEIGHT / SCREEN_WIDTH) * 15.5) / 2.2;
        expect(size(15.5)).toBeCloseTo(expected);
    });
});

// width() testing (IDK if really needed)
describe("width()", () => {

    test("returns 0% of screen width", () => {
        expect(width(0)).toBe(0);
    });


    test("returns 50% of screen width", () => {
        expect(width(50)).toBe(SCREEN_WIDTH / 2);
    });

    test("returns 100% of screen width", () => {
        expect(width(100)).toBe(SCREEN_WIDTH);
    });
});

// height() (IDK if really needed)
describe("height()", () => {

    test("returns 0% of screen height", () => {
        expect(height(0)).toBe(0);
    });

    test("returns 50% of screen height", () => {
        expect(height(50)).toBe(SCREEN_HEIGHT / 2);
    });

    test("returns 100% of screen height", () => {
        expect(height(100)).toBe(SCREEN_HEIGHT);
    });
});

// fontSize() testing
describe("fontSize()", () => {

    test("calculates a small font size", () => {
        const expected = Math.round((12 * (1920 - 24)) / 680);
        expect(fontSize(12)).toBe(expected);
    });

    test("calculates a medium font size", () => {
        const expected = Math.round((20 * (1920 - 24)) / 680);
        expect(fontSize(20)).toBe(expected);
    });

    test("calculates a large font size", () => {
        const expected = Math.round((48 * (1920 - 24)) / 680);
        expect(fontSize(48)).toBe(expected);
    });

    test("returns 0 when input is 0", () => {
        expect(fontSize(0)).toBe(0);
    });
});

// fontSizes() testing
describe("fontSizes", () => {

    test("tiny font matches fontSize(12)", () => {
        expect(fontSizes.tiny).toBe(fontSize(12));
    });

    test("regular font matches fontSize(20)", () => {
        expect(fontSizes.regular).toBe(fontSize(20));
    });

    test("heading font matches fontSize(40)", () => {
        expect(fontSizes.heading).toBe(fontSize(40));
    });

    test("display font matches fontSize(48)", () => {
        expect(fontSizes.display).toBe(fontSize(48));
    });
});

// hitSlop() testing
describe("hitSlop", () => {

    test("uses size(10) for every side", () => {
        expect(hitSlop.top).toBe(size(10));
        expect(hitSlop.bottom).toBe(size(10));
        expect(hitSlop.left).toBe(size(10));
        expect(hitSlop.right).toBe(size(10));
    });
});

// sizes() testing
describe("sizes", () => {

    test("tiny size matches size(4)", () => {
        expect(sizes.tiny).toBe(size(4));
    });

    test("medium size matches size(16)", () => {
        expect(sizes.medium).toBe(size(16));
    });

    test("large size matches size(24)", () => {
        expect(sizes.large).toBe(size(24));
    });

    test("largest preset matches size(512)", () => {
        expect(sizes.size512).toBe(size(512));
    });
});
