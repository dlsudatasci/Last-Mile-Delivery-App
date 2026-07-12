import {
    PERIODS,
    PERIOD_DAYS,
    useTripsFilter,
} from "../lib/store/useTripsFilter";

// useTripsFilter testing
describe("useTripsFilter", () => {
    beforeEach(() => {
        useTripsFilter.setState({
            period: "Monthly",
        });
    });

    test("has Monthly as the default period", () => {
        expect(useTripsFilter.getState().period).toBe(
            "Monthly"
        );
    });

    test("updates the period", () => {
        useTripsFilter
            .getState()
            .setPeriod("Weekly");

        expect(useTripsFilter.getState().period).toBe(
            "Weekly"
        );

        useTripsFilter
            .getState()
            .setPeriod("Daily");

        expect(useTripsFilter.getState().period).toBe(
            "Daily"
        );
    });

    test("exports the available periods", () => {
        expect(PERIODS).toEqual([
            "Daily",
            "Weekly",
            "Monthly",
        ]);
    });

    test("exports the correct day mapping", () => {
        expect(PERIOD_DAYS).toEqual({
            Daily: 1,
            Weekly: 7,
            Monthly: 30,
        });
    });
});