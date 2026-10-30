import {
    AVOID_ROAD_FREQUENCY_OPTIONS,
    BLOCKAGE_OPTIONS,
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
    isDeviationQuestionnaireComplete,
    shouldAskBlockageFollowUp,
    shouldAskPersonalStopFollowUps,
    shouldAskTrafficFollowUps
} from './deviation-questionnaire';
import { FetchedGeneratedRoute, FetchRideData } from './firebase-crud/rides';
import { RideDeviationEvent } from './store/useRideStore';
import { DeviationAnswers, DeviationMetadata, PostTripAnswers, TripReview } from './store/useTripReviews';

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

export function getChangeRouteCount(review?: TripReview, detectedCount: number = 0) {
    // Detected changes are saved on the ride before the rider completes the
    // questionnaire. Do not make the UI report zero simply because the separate
    // deviation-response documents have not been written yet.
    const submittedCount = review ? Object.keys(review.answers ?? {}).length : 0;
    return Math.max(submittedCount, Number.isFinite(detectedCount) ? Math.max(0, detectedCount) : 0);
}

export function hasCompleteTripReview(review?: TripReview, detectedCount: number = 0) {
    const postTrip = review?.postTrip;
    if (!postTrip?.arrival?.trim() || !Number.isFinite(postTrip.etaRating) || !Number.isFinite(postTrip.stressRating)) {
        return false;
    }

    const requiredDeviationCount = Number.isFinite(detectedCount) ? Math.max(0, Math.floor(detectedCount)) : 0;
    const deviationAnswers = Object.values(review?.answers ?? {});
    if (deviationAnswers.length < requiredDeviationCount) return false;

    return deviationAnswers.slice(0, requiredDeviationCount).every(answer =>
        !!answer.questionnaire && isDeviationQuestionnaireComplete(answer.questionnaire)
    );
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
        { label: language === 'tl' ? 'Maaga, sakto, o late ka ba dumating?' : 'Did you arrive earlier, on time, or late?', value: postTrip.arrival },
        {
            label: language === 'tl' ? 'Gaano ka-accurate ang ETA? (1 = hindi accurate, 5 = very accurate)' : 'How accurate was the ETA? (1 = not accurate, 5 = very accurate)',
            value: `${postTrip.etaRating}/5`,
        },
        {
            label: language === 'tl' ? 'Gaano ka-stress ang biyahe? (1 = hindi stressful, 5 = very stressful)' : 'How stressful was the trip? (1 = not stressful, 5 = very stressful)',
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

export function formatCompactDuration(seconds?: number | null): string {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return 'Not available';
    const totalSec = Math.max(0, Math.round(seconds));
    if (totalSec < 60) return `${totalSec}s`;
    if (totalSec >= 3600) {
        const hours = Math.floor(totalSec / 3600);
        const mins = Math.round((totalSec % 3600) / 60);
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    const mins = Math.floor(totalSec / 60);
    const remSec = totalSec % 60;
    if (remSec > 0 && mins < 10) {
        return `${mins}m ${remSec}s`;
    }
    return `${Math.round(totalSec / 60)}m`;
}

export function formatTripTimeSummary({
    suggestedDurationSec,
    actualDurationSec,
    language = 'en',
}: {
    suggestedDurationSec?: number | null;
    actualDurationSec?: number | null;
    language?: QuestionnaireLanguage;
}): string | null {
    if (
        typeof suggestedDurationSec !== 'number' ||
        !Number.isFinite(suggestedDurationSec) ||
        suggestedDurationSec <= 0 ||
        typeof actualDurationSec !== 'number' ||
        !Number.isFinite(actualDurationSec) ||
        actualDurationSec <= 0
    ) {
        return null;
    }

    const diffSec = Math.round(actualDurationSec - suggestedDurationSec);
    const absDiffText = formatCompactDuration(Math.abs(diffSec));
    const suggestedText = formatCompactDuration(suggestedDurationSec);
    const actualText = formatCompactDuration(actualDurationSec);

    let outcome: string;
    if (Math.abs(diffSec) < 30) {
        outcome = language === 'tl' ? 'sakto sa oras' : 'on time';
    } else if (diffSec < 0) {
        outcome = language === 'tl' ? `${absDiffText} mas mabilis` : `${absDiffText} shorter`;
    } else {
        outcome = language === 'tl' ? `${absDiffText} mas matagal` : `${absDiffText} longer`;
    }

    return language === 'tl'
        ? `Suggested: ${suggestedText} · Aktuwal: ${actualText} (${outcome})`
        : `Suggested: ${suggestedText} · Actual: ${actualText} (${outcome})`;
}

export interface DeviationTimeImpact {
    previousEtaSec: number | null;
    newEtaSec: number | null;
    actualRemainingSec: number | null;
    actualTimeDiffSec: number | null;
    etaTimeDiffSec: number | null;
    isActuallyFaster: boolean | null;
    isEtaFaster: boolean | null;
    shortBadgeText: string | null;
    expectedRowValue: string | null;
    actualRowValue: string | null;
    formatSummary: (language?: QuestionnaireLanguage) => string | null;
}

export function getDeviationTimeImpact({
    metadata,
    event,
    trip,
    generatedRoute,
}: {
    metadata?: DeviationMetadata | null;
    event?: Partial<RideDeviationEvent> | null;
    trip?: Partial<Pick<FetchRideData, 'startTime' | 'endTime' | 'duration' | 'suggestedRouteDurationSec'>> | null;
    generatedRoute?: Partial<FetchedGeneratedRoute> | null;
}): DeviationTimeImpact {
    const timestamp = event?.timestamp ?? metadata?.timestamp ?? generatedRoute?.generatedAt ?? null;

    let elapsedSec: number | undefined =
        typeof event?.elapsedDurationSec === 'number' && Number.isFinite(event.elapsedDurationSec)
            ? Math.max(0, Math.round(event.elapsedDurationSec))
            : undefined;

    if (
        elapsedSec === undefined &&
        typeof trip?.startTime === 'number' &&
        typeof timestamp === 'number' &&
        timestamp >= trip.startTime
    ) {
        const rawElapsed = Math.max(0, Math.round((timestamp - trip.startTime) / 1000));
        elapsedSec =
            typeof trip.duration === 'number' && trip.duration > 0
                ? Math.min(Math.round(trip.duration), rawElapsed)
                : rawElapsed;
    }

    const rawPrevEta = event?.previousEtaSec ?? metadata?.previousEtaSec;
    let previousEtaSec: number | null =
        typeof rawPrevEta === 'number' && Number.isFinite(rawPrevEta) && rawPrevEta > 0
            ? Math.round(rawPrevEta)
            : null;

    if (previousEtaSec === null) {
        if (typeof trip?.suggestedRouteDurationSec === 'number' && trip.suggestedRouteDurationSec > 0) {
            previousEtaSec =
                typeof elapsedSec === 'number'
                    ? Math.max(0, Math.round(trip.suggestedRouteDurationSec - elapsedSec))
                    : Math.round(trip.suggestedRouteDurationSec);
        } else if (
            typeof generatedRoute?.remainingTravelTimeOriginal === 'number' &&
            generatedRoute.remainingTravelTimeOriginal > 0
        ) {
            previousEtaSec =
                typeof elapsedSec === 'number'
                    ? Math.max(0, Math.round(generatedRoute.remainingTravelTimeOriginal - elapsedSec))
                    : Math.round(generatedRoute.remainingTravelTimeOriginal);
        }
    }

    const rawNewEta = event?.newEtaSec ?? metadata?.newEtaSec ?? generatedRoute?.remainingTravelTimeNew;
    const newEtaSec: number | null =
        typeof rawNewEta === 'number' && Number.isFinite(rawNewEta) && rawNewEta > 0
            ? Math.round(rawNewEta)
            : null;

    const rawActualRemaining = event?.actualRemainingSec ?? metadata?.actualRemainingSec;
    let actualRemainingSec: number | null =
        typeof rawActualRemaining === 'number' && Number.isFinite(rawActualRemaining) && rawActualRemaining >= 0
            ? Math.round(rawActualRemaining)
            : null;

    if (actualRemainingSec === null) {
        if (typeof trip?.duration === 'number' && trip.duration > 0) {
            actualRemainingSec =
                typeof elapsedSec === 'number'
                    ? Math.max(0, Math.round(trip.duration - elapsedSec))
                    : Math.round(trip.duration);
        } else if (
            typeof trip?.endTime === 'number' &&
            typeof timestamp === 'number' &&
            trip.endTime >= timestamp
        ) {
            actualRemainingSec = Math.max(0, Math.round((trip.endTime - timestamp) / 1000));
        }
    }

    const rawActualDiff = event?.actualTimeDiffSec ?? metadata?.actualTimeDiffSec;
    const actualTimeDiffSec: number | null =
        typeof rawActualDiff === 'number' && Number.isFinite(rawActualDiff)
            ? Math.round(rawActualDiff)
            : typeof actualRemainingSec === 'number' && typeof previousEtaSec === 'number'
                ? actualRemainingSec - previousEtaSec
                : null;

    const isActuallyFaster: boolean | null =
        typeof actualTimeDiffSec === 'number'
            ? actualTimeDiffSec < 0
            : event?.isActuallyFaster ?? metadata?.isActuallyFaster ?? null;

    const etaTimeDiffSec: number | null =
        typeof newEtaSec === 'number' && typeof previousEtaSec === 'number'
            ? newEtaSec - previousEtaSec
            : null;

    const isEtaFaster: boolean | null =
        typeof etaTimeDiffSec === 'number' ? etaTimeDiffSec < 0 : metadata?.isFaster ?? null;

    let shortBadgeText: string | null = null;
    if (typeof actualTimeDiffSec === 'number') {
        if (Math.abs(actualTimeDiffSec) < 30) {
            shortBadgeText = 'On-time arrival';
        } else if (actualTimeDiffSec < 0) {
            shortBadgeText = `${formatCompactDuration(Math.abs(actualTimeDiffSec))} shorter arrival`;
        } else {
            shortBadgeText = `${formatCompactDuration(Math.abs(actualTimeDiffSec))} longer arrival`;
        }
    } else if (typeof isActuallyFaster === 'boolean') {
        shortBadgeText = isActuallyFaster ? 'Shorter arrival' : 'Longer arrival';
    } else if (typeof isEtaFaster === 'boolean') {
        shortBadgeText = isEtaFaster ? 'Shorter route ETA' : 'Longer route ETA';
    }

    let expectedRowValue: string | null = null;
    if (typeof previousEtaSec === 'number') {
        expectedRowValue =
            typeof newEtaSec === 'number'
                ? `${formatCompactDuration(previousEtaSec)} (Rerouted ETA: ${formatCompactDuration(newEtaSec)})`
                : formatCompactDuration(previousEtaSec);
    } else if (typeof newEtaSec === 'number') {
        expectedRowValue = `Rerouted ETA: ${formatCompactDuration(newEtaSec)}`;
    }

    let actualRowValue: string | null = null;
    if (typeof actualRemainingSec === 'number' && typeof actualTimeDiffSec === 'number') {
        const outcome =
            Math.abs(actualTimeDiffSec) < 30
                ? 'on time'
                : actualTimeDiffSec < 0
                    ? `${formatCompactDuration(Math.abs(actualTimeDiffSec))} shorter`
                    : `${formatCompactDuration(Math.abs(actualTimeDiffSec))} longer`;
        actualRowValue = `${formatCompactDuration(actualRemainingSec)} (${outcome})`;
    } else if (typeof isActuallyFaster === 'boolean') {
        actualRowValue = isActuallyFaster ? 'Shorter arrival time' : 'Longer arrival time';
    } else if (typeof isEtaFaster === 'boolean') {
        actualRowValue = isEtaFaster ? 'Shorter estimated time (ETA)' : 'Longer estimated time (ETA)';
    }

    const formatSummary = (language: QuestionnaireLanguage = 'en'): string | null => {
        if (
            typeof actualTimeDiffSec === 'number' &&
            typeof actualRemainingSec === 'number' &&
            typeof previousEtaSec === 'number'
        ) {
            let diffLabel: string;
            if (Math.abs(actualTimeDiffSec) < 30) {
                diffLabel = language === 'tl' ? 'Sakto sa oras' : 'On time';
            } else if (actualTimeDiffSec < 0) {
                diffLabel =
                    language === 'tl'
                        ? `${formatCompactDuration(Math.abs(actualTimeDiffSec))} mas mabilis`
                        : `${formatCompactDuration(Math.abs(actualTimeDiffSec))} shorter`;
            } else {
                diffLabel =
                    language === 'tl'
                        ? `${formatCompactDuration(Math.abs(actualTimeDiffSec))} mas matagal`
                        : `${formatCompactDuration(Math.abs(actualTimeDiffSec))} longer`;
            }
            const detailLabel =
                language === 'tl'
                    ? `${formatCompactDuration(actualRemainingSec)} aktuwal vs ${formatCompactDuration(previousEtaSec)} inaasahan`
                    : `${formatCompactDuration(actualRemainingSec)} actual vs ${formatCompactDuration(previousEtaSec)} expected`;
            return `${diffLabel} (${detailLabel})`;
        }
        if (typeof isActuallyFaster === 'boolean') {
            return isActuallyFaster
                ? language === 'tl'
                    ? 'Mas mabilis na pagdating'
                    : 'Shorter arrival time'
                : language === 'tl'
                    ? 'Mas matagal na pagdating'
                    : 'Longer arrival time';
        }
        if (typeof isEtaFaster === 'boolean') {
            return isEtaFaster
                ? language === 'tl'
                    ? 'Mas mabilis na ETA'
                    : 'Shorter route ETA'
                : language === 'tl'
                    ? 'Mas matagal na ETA'
                    : 'Longer route ETA';
        }
        return null;
    };

    return {
        previousEtaSec,
        newEtaSec,
        actualRemainingSec,
        actualTimeDiffSec,
        etaTimeDiffSec,
        isActuallyFaster,
        isEtaFaster,
        shortBadgeText,
        expectedRowValue,
        actualRowValue,
        formatSummary,
    };
}
