import { LANGUAGE_LABELS } from "@/lib/deviation-questionnaire";
import {
    formatPoint,
    formatRideRouteTitle,
    formatRouteInstructionSummary,
    getChangeRouteCount,
    getDeviationRows,
    getPostTripRows,
    getReviewStatusLabel,
    summarizeDeviation,
} from "../lib/trip-record-display";

// formatRideRouteTitle() testing
describe("formatRideRouteTitle()", () => {
    test("returns the ride name when it is a specific route title", () => {
        expect(
            formatRideRouteTitle({
                rideName: "Manila to Quezon City",
            })
        ).toBe("Manila → Quezon City");
    });

    test("returns Metro Manila Trip when ride name is missing", () => {
        expect(
            formatRideRouteTitle({
                rideName: "   ",
            })
        ).toBe("Metro Manila Trip");
    });

    test("returns Metro Manila Trip when ride name is empty", () => {
        expect(
            formatRideRouteTitle({
                rideName: "",
            })
        ).toBe("Metro Manila Trip");
    });

    test("returns Metro Manila Trip for generic ride names", () => {
        expect(
            formatRideRouteTitle({
                rideName: "Recorded Trip",
            })
        ).toBe("Metro Manila Trip");

        expect(
            formatRideRouteTitle({
                rideName: "New Trip",
            })
        ).toBe("Metro Manila Trip");
    });

    test("normalizes towards and arrow route separators", () => {
        expect(
            formatRideRouteTitle({
                rideName: "Manila towards Makati",
            })
        ).toBe("Manila → Makati");

        expect(
            formatRideRouteTitle({
                rideName: "Manila -> Makati",
            })
        ).toBe("Manila → Makati");
    });

    test("normalizes hyphen route separators", () => {
        expect(
            formatRideRouteTitle({
                rideName: "Manila - Makati",
            })
        ).toBe("Manila → Makati");
    });

    test("trims whitespace from the ride name", () => {
        expect(
            formatRideRouteTitle({
                rideName: "  Manila to Makati  ",
            })
        ).toBe("Manila → Makati");
    });
});

// getReviewStatusLabel() testing
describe("getReviewStatusLabel()", () => {
    test("returns Recorded when no review is provided", () => {
        expect(getReviewStatusLabel()).toBe("Recorded");
    });

    test("returns Reviewed when review status is reviewed", () => {
        expect(
            getReviewStatusLabel({
                status: "reviewed",
            } as any)
        ).toBe("Reviewed");
    });

    test("returns Pending Questions when review is not reviewed", () => {
        expect(
            getReviewStatusLabel({
                status: "pending",
            } as any)
        ).toBe("Pending Questions");
    });
});

// getChangeRouteCount() testing
describe("getChangeRouteCount()", () => {
    test("returns zero when no review is provided", () => {
        expect(getChangeRouteCount()).toBe(0);
    });

    test("returns zero when the review has no answers", () => {
        expect(
            getChangeRouteCount({
                answers: {},
            } as any)
        ).toBe(0);
    });

    test("returns the number of answers in the review", () => {
        expect(
            getChangeRouteCount({
                answers: {
                    reason: "traffic",
                    severity: "heavy",
                    avoidAgain: "yes",
                },
            } as any)
        ).toBe(3);
    });

    test("counts only the keys in the answers object", () => {
        expect(
            getChangeRouteCount({
                answers: {
                    first: "value",
                    second: "value",
                },
            } as any)
        ).toBe(2);
    });
});

// formatPoint() testing
describe("formatPoint()", () => {
    test("formats latitude and longitude to five decimal places", () => {
        expect(
            formatPoint({
                latitude: 14.5995,
                longitude: 120.9842,
            })
        ).toBe('14.59950, 120.98420');
    });

    test("rounds coordinates to five decimal places", () => {
        expect(
            formatPoint({
                latitude: 14.59956789,
                longitude: 120.98426789,
            })
        ).toBe("14.59957, 120.98427");
    });

    test("returns Not available when no point is provided", () => {
        expect(formatPoint()).toBe("Not available");
    });

    test("returns Not available when point is null", () => {
        expect(formatPoint(null)).toBe("Not available");
    });
});

// formatRouteInstructionSummary() testing
describe("formatRouteInstructionSummary()", () => {
    test("returns Not available when instruction is missing", () => {
        expect(formatRouteInstructionSummary()).toBe("Not available");
    });

    test("returns Not available when instruction is empty", () => {
        expect(formatRouteInstructionSummary("   ")).toBe("Not available");
    });

    test("trims whitespace from the instruction", () => {
        expect(
            formatRouteInstructionSummary("  Turn left onto Rizal Avenue  ")
        ).toBe("Turn left onto Rizal Avenue");
    });

    test("removes distance information from the end of an instruction", () => {
        expect(
            formatRouteInstructionSummary("Turn left in 200 meters")
        ).toBe("Turn left");
    });

    test("removes reason information from the end of an instruction", () => {
        expect(
            formatRouteInstructionSummary("Turn left because of traffic")
        ).toBe("Turn left");
    });

    test("removes the street name from the end of an instruction", () => {
        expect(
            formatRouteInstructionSummary(
                "Turn left onto Rizal Avenue",
                "Rizal Avenue"
            )
        ).toBe("Turn left");
    });

    test("removes trailing route direction words", () => {
        expect(
            formatRouteInstructionSummary("Turn left toward")
        ).toBe("Turn left");
    });

    test("removes trailing punctuation", () => {
        expect(
            formatRouteInstructionSummary("Turn left onto Rizal Avenue.")
        ).toBe("Turn left onto Rizal Avenue");
    });

    test("returns the original instruction when the formatted summary becomes empty", () => {
        expect(
            formatRouteInstructionSummary("Rizal Avenue", "Rizal Avenue")
        ).toBe("Rizal Avenue");
    });
});

// getPostTripRows() testing
describe("getPostTripRows()", () => {
    test("returns an empty array when no post-trip answers are provided", () => {
        expect(getPostTripRows()).toEqual([]);
    });

    test("returns post-trip rows in English", () => {
        expect(
            getPostTripRows({
                arrival: "on_time",
                etaRating: 4,
                stressRating: 2,
                language: "en",
            })
        ).toEqual([
            {
                label: "Did you arrive earlier, on time, or late?",
                value: "on_time",
            },
            {
                label: "How accurate was the ETA? (1 = not accurate, 5 = very accurate)",
                value: "4/5",
            },
            {
                label: "How stressful was the trip? (1 = not stressful, 5 = very stressful)",
                value: "2/5",
            },
            {
                label: "Language",
                value: LANGUAGE_LABELS.en,
            },
        ]);
    });

    test("uses Tagalog labels when the language is tl", () => {
        expect(
            getPostTripRows({
                arrival: "early",
                etaRating: 5,
                stressRating: 3,
                language: "tl",
            })
        ).toEqual([
            {
                label: "Maaga, sakto, o late ka ba dumating?",
                value: "early",
            },
            {
                label: "Gaano ka-accurate ang ETA? (1 = hindi accurate, 5 = very accurate)",
                value: "5/5",
            },
            {
                label: "Gaano ka-stress ang biyahe? (1 = hindi stressful, 5 = very stressful)",
                value: "3/5",
            },
            {
                label: "Language",
                value: LANGUAGE_LABELS.tl,
            },
        ]);
    });

    test("defaults to English when language is not provided", () => {
        expect(
            getPostTripRows({
                arrival: "late",
                etaRating: 1,
                stressRating: 5,
            })
        ).toEqual([
            {
                label: "Did you arrive earlier, on time, or late?",
                value: "late",
            },
            {
                label: "How accurate was the ETA? (1 = not accurate, 5 = very accurate)",
                value: "1/5",
            },
            {
                label: "How stressful was the trip? (1 = not stressful, 5 = very stressful)",
                value: "5/5",
            },
            {
                label: "Language",
                value: LANGUAGE_LABELS.en,
            },
        ]);
    });
});

// getDeviationRows() testing
describe("getDeviationRows()", () => {
    test("returns legacy route-change rows when no questionnaire is provided", () => {
        expect(
            getDeviationRows({
                whyRoute: "Traffic",
                affect: "Yes",
            })
        ).toEqual([
            {
                label: "Primary reason",
                value: "Traffic",
            },
            {
                label: "Would make this route change again",
                value: "Yes",
            },
        ]);
    });

    test("includes traffic follow-up rows for traffic congestion", () => {
        const rows = getDeviationRows({
            whyRoute: "",
            affect: "",
            language: "en",
            questionnaire: {
                primaryReason: "Traffic Congestion",
                trafficSeverity: "4 = Heavy",
                rushHourCause: "Yes",
                chooseDuringNonRush: "No",
                deviateAgainFrequency: "Often",
                avoidRoadFrequency: "Sometimes",
            },
        });

        expect(rows.map(row => row.value)).toEqual([
            "Traffic or slow-moving vehicles",
            "4 - Heavy / very slow",
            "Yes",
            "No",
            "Often",
            "Sometimes",
            "English",
        ]);
    });

    test("uses the custom blockage reason when blockage reason is Other", () => {
        const rows = getDeviationRows({
            whyRoute: "",
            affect: "",
            language: "en",
            questionnaire: {
                primaryReason:
                    "Road Blockage/Hazard (Flood, Accident, Poor road condition)",
                blockageReason: "Other",
                blockageReasonOther: "Construction materials",
                deviateAgainFrequency: "Sometimes",
                avoidRoadFrequency: "Rarely",
            },
        });

        expect(rows).toContainEqual({
            label: "What blocked the road or made it unsafe?",
            value: "Construction materials",
        });
    });

    test("includes personal stop reasons and duration", () => {
        const rows = getDeviationRows({
            whyRoute: "",
            affect: "",
            language: "en",
            questionnaire: {
                primaryReason:
                    "Personal Stop (Meal, Restroom, Break, Refueling, etc.)",
                personalStopReason: ["Meal", "Restroom"],
                stopDuration: "5-15mins",
                deviateAgainFrequency: "Sometimes",
                avoidRoadFrequency: "Rarely",
            },
        });

        expect(rows).toContainEqual({
            label: "Why did you need to stop?",
            value: "Meal, Restroom",
        });

        expect(rows).toContainEqual({
            label: "About how long did the stop take?",
            value: "5 to 15 minutes",
        });
    });

    test("uses Tagalog labels and the custom primary reason", () => {
        const rows = getDeviationRows({
            whyRoute: "",
            affect: "",
            language: "tl",
            questionnaire: {
                primaryReason: "Other",
                primaryReasonOther: "Road construction",
                deviateAgainFrequency: "Sometimes",
                avoidRoadFrequency: "Rarely",
            },
        });

        expect(rows).toEqual([
            {
                label: "Ano ang pinaka-main reason bakit ka nag-change route dito?",
                value: "Road construction",
            },
            {
                label:
                    "Kung mangyari ulit ang same situation, gaano kadalas ka mag-change route tulad nito?",
                value: "Minsan",
            },
            {
                label:
                    "Kapag ganito ang biyahe, gaano mo kadalas iniiwasan ang daan na ito?",
                value: "Bihira",
            },
            {
                label: "Language",
                value: "Tagalog",
            },
        ]);
    });
});

// summarizeDeviation() testing
describe("summarizeDeviation()", () => {
    test("builds a summary from route metadata and instructions", () => {
        const result = summarizeDeviation(
            {
                whyRoute: "Traffic",
                affect: "Yes",
                metadata: {
                    streetName: "Rizal Avenue",
                    generatedInstruction: "Turn right onto Rizal Avenue",
                    deviationInstruction: "Turn left onto Rizal Avenue",
                },
            },
            0
        );

        expect(result).toEqual({
            title: "Change Route 1",
            street: "Rizal Avenue",
            description: "Turn left instead of Turn right.",
        });
    });

    test("uses whyRoute when route instructions are unavailable", () => {
        const result = summarizeDeviation(
            {
                whyRoute: "Avoided heavy traffic",
                affect: "Yes",
                metadata: {
                    streetName: "EDSA",
                },
            },
            1
        );

        expect(result).toEqual({
            title: "Change Route 2",
            street: "EDSA",
            description: "Avoided heavy traffic",
        });
    });

    test("uses fallback values when metadata and whyRoute are unavailable", () => {
        const result = summarizeDeviation(
            {
                whyRoute: "",
                affect: "",
            },
            2
        );

        expect(result).toEqual({
            title: "Change Route 3",
            street: "Street not available",
            description: "Route changed from the suggested path.",
        });
    });
});