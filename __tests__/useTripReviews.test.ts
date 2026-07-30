import { useTripReviews } from "../lib/store/useTripReviews";

// usetripReviews testing
describe("useTripReviews", () => {
    beforeEach(() => {
        // In case the mock responses in useTripReviews are removed.
        useTripReviews.setState({
            reviews: {
                "trip-3": {
                    status: "reviewed",
                    answers: {
                        d1: {
                            whyRoute: "Matinding trapiko",
                            affect: "Nakatipid sa oras",
                        },
                        d2: {
                            whyRoute: "Mas maikling ruta",
                            affect: "Nakaikli ng distansya",
                        },
                    },
                },
                "trip-4": {
                    status: "reviewed",
                    answers: {},
                    routeFeedback: {
                        optimalRoute: "Oo, ito ang pinakamagandang ruta",
                        whyNoDeviation: "Pinakamabilis na ang iminungkahing ruta",
                        experience: "Maganda",
                    },
                },
                "trip-7": {
                    status: "reviewed",
                    answers: {},
                    incompleteFeedback: {
                        reason: "Nakansela ang order / booking",
                        distanceReached: "Lampas kalahati",
                        willRetry: "Hindi",
                    },
                },
            },
        });
    });

    // #1
    test("initializes with seeded reviews", () => {
        const reviews = useTripReviews.getState().reviews;

        expect(reviews["trip-3"]).toBeDefined();
        expect(reviews["trip-4"]).toBeDefined();
        expect(reviews["trip-7"]).toBeDefined();

        expect(reviews["trip-3"].status).toBe("reviewed");
        expect(reviews["trip-4"].status).toBe("reviewed");
        expect(reviews["trip-7"].status).toBe("reviewed");
    });

    // #2 saveDeviation
    test("saveDeviation creates a new pending review", () => {
        useTripReviews.getState().saveDeviation("trip1", "d1", {
            whyRoute: "Traffic",
            affect: "Saved time",
        });

        const review = useTripReviews.getState().reviews["trip1"];

        expect(review.status).toBe("pending");
        expect(review.answers["d1"].whyRoute).toBe("Traffic");
    });

    // #3
    test("saveDeviation adds another deviation without overwriting existing ones", () => {
        useTripReviews.getState().saveDeviation("trip1", "d1", {
            whyRoute: "Traffic",
            affect: "Saved time",
        });

        useTripReviews.getState().saveDeviation("trip1", "d2", {
            whyRoute: "Construction",
            affect: "Longer trip",
        });

        const answers = useTripReviews.getState().reviews["trip1"].answers;

        expect(Object.keys(answers)).toHaveLength(2);
        expect(answers["d1"]).toBeDefined();
        expect(answers["d2"]).toBeDefined();
    });

    // #4
    test("saveDeviation overwrites an existing deviation", () => {
        useTripReviews.getState().saveDeviation("trip1", "d1", {
            whyRoute: "Traffic",
            affect: "Saved time",
        });

        useTripReviews.getState().saveDeviation("trip1", "d1", {
            whyRoute: "Flood",
            affect: "Delayed",
        });

        expect(
            useTripReviews.getState().reviews["trip1"].answers["d1"].whyRoute
        ).toBe("Flood");
    });

    // #5 saveRouteFeedback
    test("saveRouteFeedback creates a pending review", () => {
        useTripReviews.getState().saveRouteFeedback("trip2", {
            optimalRoute: "Yes",
            whyNoDeviation: "Fastest",
            experience: "Good",
        });

        const review = useTripReviews.getState().reviews["trip2"];

        expect(review.status).toBe("pending");
        expect(review.routeFeedback?.experience).toBe("Good");
    });

    test("savePostTrip creates a pending review", () => {
        useTripReviews.getState().savePostTrip("trip-post", {
            arrival: "On time",
            etaRating: 4,
            stressRating: 2,
            language: "en",
        });

        const review = useTripReviews.getState().reviews["trip-post"];

        expect(review.status).toBe("pending");
        expect(review.postTrip?.arrival).toBe("On time");
    });

    // #6
    test("saveRouteFeedback updates existing feedback", () => {
        useTripReviews.getState().saveRouteFeedback("trip2", {
            optimalRoute: "Yes",
            whyNoDeviation: "Fastest",
            experience: "Good",
        });

        useTripReviews.getState().saveRouteFeedback("trip2", {
            optimalRoute: "No",
            whyNoDeviation: "Traffic",
            experience: "Poor",
        });

        expect(
            useTripReviews.getState().reviews["trip2"].routeFeedback?.experience
        ).toBe("Poor");
    });

    // #7 saveIncompleteFeedback
    test("saveIncompleteFeedback creates a pending review", () => {
        useTripReviews.getState().saveIncompleteFeedback("trip5", {
            reason: "Cancelled",
            distanceReached: "Halfway",
            willRetry: "Yes",
        });

        const review = useTripReviews.getState().reviews["trip5"];

        expect(review.status).toBe("pending");
        expect(review.incompleteFeedback?.reason).toBe("Cancelled");
    });

    // #8
    test("saveIncompleteFeedback updates existing feedback", () => {
        useTripReviews.getState().saveIncompleteFeedback("trip5", {
            reason: "Cancelled",
            distanceReached: "Halfway",
            willRetry: "Yes",
        });

        useTripReviews.getState().saveIncompleteFeedback("trip5", {
            reason: "Vehicle issue",
            distanceReached: "Near destination",
            willRetry: "No",
        });

        expect(
            useTripReviews.getState().reviews["trip5"].incompleteFeedback?.reason
        ).toBe("Vehicle issue");
    });

    // #9 markReviewed
    test("markReviewed preserves existing answers", () => {
        useTripReviews.getState().saveDeviation("trip6", "d1", {
            whyRoute: "Traffic",
            affect: "Saved time",
        });

        useTripReviews.getState().markReviewed("trip6");

        const review = useTripReviews.getState().reviews["trip6"];

        expect(review.status).toBe("reviewed");
        expect(review.answers["d1"]).toBeDefined();
    });

    // #10
    test("markReviewed preserves routeFeedback", () => {
        useTripReviews.getState().savePostTrip("trip-4", {
            arrival: "Late",
            etaRating: 3,
            stressRating: 4,
            language: "tl",
        });
        useTripReviews.getState().markReviewed("trip-4");

        expect(
            useTripReviews.getState().reviews["trip-4"].routeFeedback
        ).toBeDefined();

        expect(
            useTripReviews.getState().reviews["trip-4"].status
        ).toBe("reviewed");
        expect(
            useTripReviews.getState().reviews["trip-4"].postTrip?.arrival
        ).toBe("Late");
    });

    // #11
    test("markReviewed preserves incompleteFeedback", () => {
        useTripReviews.getState().markReviewed("trip-7");

        expect(
            useTripReviews.getState().reviews["trip-7"].incompleteFeedback
        ).toBeDefined();

        expect(
            useTripReviews.getState().reviews["trip-7"].status
        ).toBe("reviewed");
    });

    // #12 markPending
    test("markPending preserves existing answers", () => {
        useTripReviews.getState().saveDeviation("trip6", "d1", {
            whyRoute: "Traffic",
            affect: "Saved time",
        });

        useTripReviews.getState().markPending("trip6");

        const review = useTripReviews.getState().reviews["trip6"];

        expect(review.status).toBe("pending");
        expect(review.answers["d1"]).toBeDefined();
    });
});
