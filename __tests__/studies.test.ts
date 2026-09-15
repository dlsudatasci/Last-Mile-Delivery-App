// Imports
import {
    getJoinedDeviaRouteStudy,
    getStudyProgress,
    STUDY_TRIP_LIMIT,
} from "../lib/studies";

// getStudyProgress() testing
describe("getStudyProgress()", () => {
    test("calculates progress when trips are below the limit", () => {
        expect(getStudyProgress(2, 5)).toEqual({
            tripsRecorded: 2,
            creditedTrips: 2,
            overLimitTrips: 0,
            progress: 0.4,
        });
    });

    test("caps credited trips at the required limit", () => {
        expect(getStudyProgress(7, 5)).toEqual({
            tripsRecorded: 7,
            creditedTrips: 5,
            overLimitTrips: 2,
            progress: 1,
        });
    });

    test("handles zero trips", () => {
        expect(getStudyProgress(0, 5)).toEqual({
            tripsRecorded: 0,
            creditedTrips: 0,
            overLimitTrips: 0,
            progress: 0,
        });
    });

    test("uses the default study trip limit when trips required is not provided", () => {
        expect(getStudyProgress(2)).toEqual({
            tripsRecorded: 2,
            creditedTrips: 2,
            overLimitTrips: 0,
            progress: 2 / STUDY_TRIP_LIMIT,
        });
    });

    test("normalizes negative trips to zero", () => {
        expect(getStudyProgress(-3, 5)).toEqual({
            tripsRecorded: 0,
            creditedTrips: 0,
            overLimitTrips: 0,
            progress: 0,
        });
    });

    test("normalizes decimal trips to whole numbers", () => {
        expect(getStudyProgress(2.9, 5)).toEqual({
            tripsRecorded: 2,
            creditedTrips: 2,
            overLimitTrips: 0,
            progress: 0.4,
        });
    });

    test("handles non-finite trips as zero", () => {
        expect(getStudyProgress(Infinity, 5)).toEqual({
            tripsRecorded: 0,
            creditedTrips: 0,
            overLimitTrips: 0,
            progress: 0,
        });
    });

    test("ensures trips required is at least one", () => {
        expect(getStudyProgress(3, 0)).toEqual({
            tripsRecorded: 3,
            creditedTrips: 1,
            overLimitTrips: 2,
            progress: 1,
        });
    });
});

// getJoinedDeviaRouteStudy() testing
describe("getJoinedDeviaRouteStudy()", () => {
    test("returns the study with calculated progress", () => {
        expect(getJoinedDeviaRouteStudy(3)).toEqual({
            id: "devia-route",
            name: "Devia Route Study",
            reward: 250,
            dates: "July 23 - July 24, 2025",
            description:
                "Record up to 5 delivery trips for the DEVIA route study. Each credited trip helps researchers understand real rider route choices.",
            tripsRequired: 5,
            org: "DLSU Research Team",
            joined: false,
            tripsRecorded: 3,
            creditedTrips: 3,
            overLimitTrips: 0,
            progress: 0.6,
        });
    });

    test("sets joined to true when requested", () => {
        expect(getJoinedDeviaRouteStudy(5, true).joined).toBe(true);
    });

    test("caps progress when recorded trips exceed the study limit", () => {
        const study = getJoinedDeviaRouteStudy(8);

        expect(study.tripsRecorded).toBe(8);
        expect(study.creditedTrips).toBe(5);
        expect(study.overLimitTrips).toBe(3);
        expect(study.progress).toBe(1);
    });
});