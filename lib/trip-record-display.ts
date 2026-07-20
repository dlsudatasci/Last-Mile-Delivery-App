import {
    AVOID_ROAD_FREQUENCY_OPTIONS,
    BLOCKAGE_OPTIONS,
    DeviationQuestionnaireAnswers,
    FREQUENCY_OPTIONS,
    LANGUAGE_LABELS,
    LocalizedOption,
    PERSONAL_STOP_OPTIONS,
    PRIMARY_REASON_OPTIONS,
    QUESTION_TEXT,
    QuestionnaireLanguage,
    STOP_DURATION_OPTIONS,
    TRAFFIC_SEVERITY_OPTIONS,
    YES_NO_UNSURE_OPTIONS,
    shouldAskBlockageFollowUp,
    shouldAskPersonalStopFollowUps,
    shouldAskTrafficFollowUps,
} from './deviation-questionnaire';
import { FetchRideData } from './firebase-crud/rides';
import { DeviationAnswers, PostTripAnswers, TripReview } from './store/useTripReviews';

export interface DisplayRow {
    label: string;
    value: string;
}

const GENERIC_RIDE_NAMES = new Set(['recorded trip', 'new trip', 'new delivery trip', 'trip']);

export function formatRideRouteTitle(ride: Pick<FetchRideData, 'rideName'>) {
    const name = ride.rideName?.trim();
    if (!name || GENERIC_RIDE_NAMES.has(name.toLowerCase())) {
        return 'Metro Manila Trip';
    }

    return name
        .replace(/\s+(to|towards|->|→)\s+/i, ' → ')
        .replace(/\s+-\s+/g, ' → ');
}

export function getReviewStatusLabel(review?: TripReview) {
    if (!review) return 'Recorded';
    if (review.status === 'reviewed') return 'Reviewed';
    return 'Pending Questions';
}

export function getChangeRouteCount(review?: TripReview) {
    return review ? Object.keys(review.answers ?? {}).length : 0;
}

export function formatPoint(point?: { latitude: number; longitude: number } | null) {
    if (!point) return 'Not available';
    return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}

export function formatRouteInstructionSummary(instruction?: string | null, streetName?: string | null) {
    if (!instruction?.trim()) return 'Not available';

    let summary = instruction
        .trim()
        .replace(/\s+(?:in|for)\s+\d+(?:\.\d+)?\s*(?:m|meter|meters|km|kilometer|kilometers)\b.*$/i, '')
        .replace(/\s+(?:due to|because of|to avoid|for a short stop)\b.*$/i, '');

    if (streetName?.trim()) {
        const escapedStreet = streetName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        summary = summary
            .replace(new RegExp(`\\s+(?:onto|on|toward|towards)\\s+${escapedStreet}\\b.*$`, 'i'), '')
            .replace(new RegExp(`\\s+${escapedStreet}\\b.*$`, 'i'), '');
    }

    summary = summary
        .replace(/\s+(?:onto|on|toward|towards)\s*$/i, '')
        .replace(/[.,]\s*$/, '')
        .trim();

    return summary || instruction.trim();
}

function optionLabel(value: string | undefined, options: LocalizedOption[], language: QuestionnaireLanguage) {
    if (!value) return '';
    return options.find(option => option.value === value)?.label[language] ?? value;
}

export function getPostTripRows(postTrip?: PostTripAnswers): DisplayRow[] {
    if (!postTrip) return [];
    const language = postTrip.language ?? 'en';
    return [
        { label: language === 'tl' ? 'Dumating ka ba?' : 'Did you arrive?', value: postTrip.arrival },
        {
            label: language === 'tl' ? 'Gaano katumpak ang ETA?' : 'How accurate is the suggested ETA?',
            value: `${postTrip.etaRating}/5`,
        },
        {
            label: language === 'tl' ? 'Gaano ka-stress ang biyahe?' : 'How stressful was the trip?',
            value: `${postTrip.stressRating}/5`,
        },
        { label: 'Language', value: LANGUAGE_LABELS[language] },
    ];
}

export function getDeviationRows(answer: DeviationAnswers): DisplayRow[] {
    const questionnaire = answer.questionnaire;
    if (!questionnaire) {
        return [
            { label: 'Primary reason', value: answer.whyRoute },
            { label: 'Would make this route change again', value: answer.affect },
            { label: 'Usually avoid this road', value: answer.confidence },
        ].filter(row => row.value);
    }

    const language = answer.language ?? 'en';
    const rows: DisplayRow[] = [];
    const primaryReasonValue =
        questionnaire.primaryReason === 'Other' && questionnaire.primaryReasonOther
            ? questionnaire.primaryReasonOther
            : optionLabel(questionnaire.primaryReason, PRIMARY_REASON_OPTIONS, language);

    rows.push({ label: QUESTION_TEXT.primaryReason[language], value: primaryReasonValue });

    if (shouldAskTrafficFollowUps(questionnaire.primaryReason)) {
        rows.push(
            {
                label: QUESTION_TEXT.trafficSeverity[language],
                value: optionLabel(questionnaire.trafficSeverity, TRAFFIC_SEVERITY_OPTIONS, language),
            },
            {
                label: QUESTION_TEXT.rushHourCause[language],
                value: optionLabel(questionnaire.rushHourCause, YES_NO_UNSURE_OPTIONS, language),
            },
            {
                label: QUESTION_TEXT.chooseDuringNonRush[language],
                value: optionLabel(questionnaire.chooseDuringNonRush, YES_NO_UNSURE_OPTIONS, language),
            }
        );
    }

    if (shouldAskBlockageFollowUp(questionnaire.primaryReason)) {
        const blockageValue =
            questionnaire.blockageReason === 'Other' && questionnaire.blockageReasonOther
                ? questionnaire.blockageReasonOther
                : optionLabel(questionnaire.blockageReason, BLOCKAGE_OPTIONS, language);
        rows.push({ label: QUESTION_TEXT.blockageReason[language], value: blockageValue });
    }

    if (shouldAskPersonalStopFollowUps(questionnaire.primaryReason)) {
        const reasons = (questionnaire.personalStopReason ?? [])
            .map(reason =>
                reason === 'Other' && questionnaire.personalStopOther
                    ? questionnaire.personalStopOther
                    : optionLabel(reason, PERSONAL_STOP_OPTIONS, language)
            )
            .filter(Boolean)
            .join(', ');
        rows.push(
            { label: QUESTION_TEXT.personalStopReason[language], value: reasons },
            {
                label: QUESTION_TEXT.stopDuration[language],
                value: optionLabel(questionnaire.stopDuration, STOP_DURATION_OPTIONS, language),
            }
        );
    }

    rows.push(
        {
            label: QUESTION_TEXT.deviateAgainFrequency[language],
            value: optionLabel(questionnaire.deviateAgainFrequency, FREQUENCY_OPTIONS, language),
        },
        {
            label: QUESTION_TEXT.avoidRoadFrequency[language],
            value: optionLabel(questionnaire.avoidRoadFrequency, AVOID_ROAD_FREQUENCY_OPTIONS, language),
        },
        { label: 'Language', value: LANGUAGE_LABELS[language] }
    );

    return rows.filter(row => row.value);
}

export function summarizeDeviation(answer: DeviationAnswers, index: number) {
    const metadata = answer.metadata;
    const title = `Change Route ${index + 1}`;
    const street = metadata?.streetName || metadata?.originalRouteEdge || 'Street not available';
    const description =
        metadata?.generatedInstruction && metadata?.deviationInstruction
            ? `${formatRouteInstructionSummary(metadata.deviationInstruction, metadata.streetName)} instead of ${formatRouteInstructionSummary(
                  metadata.generatedInstruction,
                  metadata.streetName
              )}.`
            : answer.whyRoute || 'Route changed from the suggested path.';

    return { title, street, description };
}
