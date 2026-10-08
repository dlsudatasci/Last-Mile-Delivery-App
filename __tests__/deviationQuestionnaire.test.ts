import {
    PRIMARY_REASON_OPTIONS,
    QUESTION_TEXT,
    TRAFFIC_SEVERITY_OPTIONS,
    isDeviationQuestionnaireComplete,
    shouldAskBlockageFollowUp,
    shouldAskPersonalStopFollowUps,
    shouldAskTrafficFollowUps,
} from "../lib/deviation-questionnaire";

describe("deviation questionnaire helpers", () => {
    test("traffic congestion and avoid intersection show traffic follow-ups", () => {
        expect(shouldAskTrafficFollowUps("Traffic Congestion")).toBe(true);
        expect(shouldAskTrafficFollowUps("Avoid Intersection")).toBe(true);
        expect(shouldAskTrafficFollowUps("Wrong Turn")).toBe(false);
    });

    test("road blockage and personal stop show their own follow-ups", () => {
        expect(shouldAskBlockageFollowUp("Road Blockage/Hazard (Flood, Accident, Poor road condition)")).toBe(true);
        expect(shouldAskPersonalStopFollowUps("Personal Stop (Meal, Restroom, Break, Refueling, etc.)")).toBe(true);
    });

    test("other primary reasons only require the always-asked frequency questions", () => {
        expect(
            isDeviationQuestionnaireComplete({
                primaryReason: "Wrong Turn",
                personalStopReason: [],
                deviateAgainFrequency: "Rarely",
                avoidRoadFrequency: "Sometimes",
            })
        ).toBe(true);
    });

    test("short traffic response is incomplete until traffic follow-ups are answered", () => {
        expect(
            isDeviationQuestionnaireComplete({
                primaryReason: "Traffic Congestion",
                personalStopReason: [],
                deviateAgainFrequency: "Often",
                avoidRoadFrequency: "Always",
            })
        ).toBe(false);
    });

    test("english and tagalog labels share canonical question keys", () => {
        expect(QUESTION_TEXT.primaryReason.en).toContain("main reason");
        expect(QUESTION_TEXT.primaryReason.tl).toContain("main reason");
    });

    test("traffic severity question explains the 1 to 5 scale", () => {
        expect(QUESTION_TEXT.trafficSeverity.en).toContain("1 for very light");
        expect(QUESTION_TEXT.trafficSeverity.en).toContain("5 for severe");
        expect(QUESTION_TEXT.trafficSeverity.tl).toContain("1 kung maluwag");
        expect(QUESTION_TEXT.trafficSeverity.tl).toContain("5 kung pinakamabigat");
    });

    test("tagalog labels are simple and rider-friendly", () => {
        expect(PRIMARY_REASON_OPTIONS.find(option => option.value === "Traffic Congestion")?.label.tl).toBe(
            "Traffic o mabagal ang daloy"
        );
        expect(TRAFFIC_SEVERITY_OPTIONS[4].label.tl).toContain("stop-and-go");
    });

    test("primary reason other requires an explanation", () => {
        expect(
            isDeviationQuestionnaireComplete({
                primaryReason: "Other",
                deviateAgainFrequency: "Sometimes",
                avoidRoadFrequency: "Rarely",
            })
        ).toBe(false);

        expect(
            isDeviationQuestionnaireComplete({
                primaryReason: "Other",
                primaryReasonOther: "Road was easier",
                deviateAgainFrequency: "Sometimes",
                avoidRoadFrequency: "Rarely",
            })
        ).toBe(true);
    });

    test("road blockage with Other requires an explanation", () => {
        expect(
            isDeviationQuestionnaireComplete({
                primaryReason: "Road Blockage/Hazard (Flood, Accident, Poor road condition)",
                blockageReason: "Other",
                deviateAgainFrequency: "Sometimes",
                avoidRoadFrequency: "Rarely",
            })
        ).toBe(false);

        expect(
            isDeviationQuestionnaireComplete({
                primaryReason: "Road Blockage/Hazard (Flood, Accident, Poor road condition)",
                blockageReason: "Other",
                blockageReasonOther: "Construction materials blocked the road",
                deviateAgainFrequency: "Sometimes",
                avoidRoadFrequency: "Rarely",
            })
        ).toBe(true);
    });

    test("personal stop with Other requires an explanation", () => {
        expect(
            isDeviationQuestionnaireComplete({
                primaryReason: "Personal Stop (Meal, Restroom, Break, Refueling, etc.)",
                personalStopReason: ["Other"],
                stopDuration: "5-15mins",
                deviateAgainFrequency: "Sometimes",
                avoidRoadFrequency: "Rarely",
            })
        ).toBe(false);

        expect(
            isDeviationQuestionnaireComplete({
                primaryReason: "Personal Stop (Meal, Restroom, Break, Refueling, etc.)",
                personalStopReason: ["Other"],
                personalStopOther: "Had to wait for someone",
                stopDuration: "5-15mins",
                deviateAgainFrequency: "Sometimes",
                avoidRoadFrequency: "Rarely",
            })
        ).toBe(true);
    });

    test("complete traffic questionnaire is valid", () => {
        expect(
            isDeviationQuestionnaireComplete({
                primaryReason: "Traffic Congestion",
                trafficSeverity: "4 = Heavy",
                rushHourCause: "Yes",
                chooseDuringNonRush: "No",
                deviateAgainFrequency: "Often",
                avoidRoadFrequency: "Sometimes",
            })
        ).toBe(true);
    });
});
