import { useTripReviews } from "../lib/store/useTripReviews";

// usetripReviews testing
describe("useTripReviews", () => {
    beforeEach(() => {
        useTripReviews.setState({
            reviews: {},
            },
        );
    });

    // #1 saveDeviation
    test("saveDeviation creates a new pending review", () => {
        useTripReviews.getState().saveDeviation("trip1", "d1", {
            whyRoute: "Traffic",
            affect: "Saved time",
        });

        const review = useTripReviews.getState().reviews["trip1"];

        expect(review.status).toBe("pending");
        expect(review.answers["d1"].whyRoute).toBe("Traffic");
    });

    // #2
    test("saveDeviation stores questionnaire, metadata, and language", () => {
        useTripReviews.getState().saveDeviation("trip-rich", "d1", {
            whyRoute: "Traffic",
            affect: "Saved time",
            language: "tl",

            questionnaire: {
                primaryReason: "Traffic Congestion",
                trafficSeverity: "Heavy",
                rushHourCause: "Work commute",
                chooseDuringNonRush: "Yes",
                deviateAgainFrequency: "Often",
                avoidRoadFrequency: "Sometimes",
            },

            metadata: {
                deviationId: "deviation-1",
                routeId: "route-1",
                rideId: "ride-1",
                userId: "user-1",
                index: 2,
                isFaster: true,
                hour: 8,
                dayOfWeek: "Monday",
                dayType: "Weekday",
                gpsLocation: {
                    latitude: 14.5995,
                    longitude: 120.9842,
                },
            },
        });

        const answer =
            useTripReviews.getState().reviews["trip-rich"].answers["d1"];

        expect(answer.whyRoute).toBe("Traffic");
        expect(answer.affect).toBe("Saved time");
        expect(answer.language).toBe("tl");

        expect(answer.questionnaire).toEqual({
            primaryReason: "Traffic Congestion",
            trafficSeverity: "Heavy",
            rushHourCause: "Work commute",
            chooseDuringNonRush: "Yes",
            deviateAgainFrequency: "Often",
            avoidRoadFrequency: "Sometimes",
        });

        expect(answer.metadata?.deviationId).toBe("deviation-1");
        expect(answer.metadata?.routeId).toBe("route-1");
        expect(answer.metadata?.rideId).toBe("ride-1");
        expect(answer.metadata?.isFaster).toBe(true);
        expect(answer.metadata?.gpsLocation).toEqual({
            latitude: 14.5995,
            longitude: 120.9842,
        });
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
        useTripReviews.getState().saveRouteFeedback("trip-4", {
            optimalRoute: "Yes",
            whyNoDeviation: "Fastest",
            experience: "Good",
        });

        useTripReviews.getState().savePostTrip("trip-4", {
            arrival: "Late",
            etaRating: 3,
            stressRating: 4,
            language: "tl",
        });

        useTripReviews.getState().markReviewed("trip-4");
        const review = useTripReviews.getState().reviews["trip-4"];

        expect(review.routeFeedback).toEqual({
            optimalRoute: "Yes",
            whyNoDeviation: "Fastest",
            experience: "Good",
        });

        expect(review.status).toBe("reviewed");
        expect(review.postTrip?.arrival).toBe("Late");
    });

    // #11
    test("markReviewed preserves incompleteFeedback", () => {
        useTripReviews.getState().saveIncompleteFeedback("trip-7", {
            reason: "Cancelled",
            distanceReached: "Halfway",
            willRetry: "No",
        });

        useTripReviews.getState().markReviewed("trip-7");
        const review = useTripReviews.getState().reviews["trip-7"];

        expect(review.incompleteFeedback).toEqual({
            reason: "Cancelled",
            distanceReached: "Halfway",
            willRetry: "No",
        });

        expect(review.status).toBe("reviewed");
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

    // #13
    test("markPending preserves postTrip, routeFeedback, and incompleteFeedback", () => {
        useTripReviews.getState().savePostTrip("trip-pending", {
            arrival: "On time",
            etaRating: 4,
            stressRating: 2,
            language: "en",
        });

        useTripReviews.getState().saveRouteFeedback("trip-pending", {
            optimalRoute: "Yes",
            whyNoDeviation: "Fastest",
            experience: "Good",
        });

        useTripReviews.getState().saveIncompleteFeedback("trip-pending", {
            reason: "Cancelled",
            distanceReached: "Halfway",
            willRetry: "Yes",
        });

        useTripReviews.getState().markPending("trip-pending");

        const review = useTripReviews.getState().reviews["trip-pending"];

        expect(review.status).toBe("pending");
        expect(review.postTrip?.arrival).toBe("On time");
        expect(review.routeFeedback?.experience).toBe("Good");
        expect(review.incompleteFeedback?.reason).toBe("Cancelled");
    });
});
