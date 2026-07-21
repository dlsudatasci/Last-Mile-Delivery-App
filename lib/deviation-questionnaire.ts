export type QuestionnaireLanguage = 'en' | 'tl';

export type PrimaryDeviationReason =
    | 'Traffic Congestion'
    | 'Avoid Intersection'
    | 'Road Blockage/Hazard (Flood, Accident, Poor road condition)'
    | 'Personal Stop (Meal, Restroom, Break, Refueling, etc.)'
    | 'Shortcut/Faster Route/Personal Preference/Familiar Road'
    | 'Searching for Parking'
    | 'Wrong Turn'
    | 'Navigation Error / Map issue'
    | 'Other';

export interface LocalizedOption<T extends string = string> {
    value: T;
    label: Record<QuestionnaireLanguage, string>;
}

export interface DeviationQuestionnaireAnswers {
    primaryReason: PrimaryDeviationReason | '';
    primaryReasonOther?: string;
    trafficSeverity?: string;
    rushHourCause?: string;
    chooseDuringNonRush?: string;
    blockageReason?: string;
    blockageReasonOther?: string;
    personalStopReason?: string[];
    personalStopOther?: string;
    stopDuration?: string;
    deviateAgainFrequency: string;
    avoidRoadFrequency: string;
}

export const LANGUAGE_LABELS: Record<QuestionnaireLanguage, string> = {
    en: 'English',
    tl: 'Tagalog',
};

export const PRIMARY_REASON_OPTIONS: LocalizedOption<PrimaryDeviationReason>[] = [
    {
        value: 'Traffic Congestion',
        label: { en: 'Traffic or slow-moving vehicles', tl: 'Traffic o mabagal ang daloy' },
    },
    {
        value: 'Avoid Intersection',
        label: { en: 'Avoided an intersection', tl: 'Umiwas sa intersection' },
    },
    {
        value: 'Road Blockage/Hazard (Flood, Accident, Poor road condition)',
        label: {
            en: 'Blocked or unsafe road (flood, accident, bad road)',
            tl: 'May harang o delikado ang daan (baha, aksidente, sirang kalsada)',
        },
    },
    {
        value: 'Personal Stop (Meal, Restroom, Break, Refueling, etc.)',
        label: {
            en: 'Personal stop (meal, restroom, break, refuel)',
            tl: 'Personal na stop (pagkain, banyo, pahinga, gas)',
        },
    },
    {
        value: 'Shortcut/Faster Route/Personal Preference/Familiar Road',
        label: {
            en: 'Shortcut, faster route, or familiar road',
            tl: 'Shortcut, mas mabilis na ruta, o pamilyar na daan',
        },
    },
    {
        value: 'Searching for Parking',
        label: { en: 'Looking for parking', tl: 'Naghahanap ng parking' },
    },
    {
        value: 'Wrong Turn',
        label: { en: 'Wrong turn', tl: 'Maling liko' },
    },
    {
        value: 'Navigation Error / Map issue',
        label: {
            en: 'Navigation or map issue',
            tl: 'Problema sa navigation o mapa',
        },
    },
    {
        value: 'Other',
        label: { en: 'Other reason', tl: 'Iba pang dahilan' },
    },
];

export const TRAFFIC_SEVERITY_OPTIONS: LocalizedOption[] = [
    {
        value: '1 = Very Light',
        label: { en: '1 - Very light / moving freely', tl: '1 - Maluwag / tuloy-tuloy ang takbo' },
    },
    {
        value: '2 = Light',
        label: { en: '2 - Light / slight slowdown', tl: '2 - Medyo maluwag / bahagyang bumabagal' },
    },
    {
        value: '3 = Moderate',
        label: { en: '3 - Moderate / moving but slow', tl: '3 - Katamtaman / umaandar pero mabagal' },
    },
    {
        value: '4 = Heavy',
        label: { en: '4 - Heavy / very slow', tl: '4 - Mabigat / sobrang bagal' },
    },
    {
        value: '5 = Severe',
        label: { en: '5 - Severe / stop-and-go or almost stopped', tl: '5 - Pinakamabigat / stop-and-go o halos hindi umaandar' },
    },
];

export const YES_NO_UNSURE_OPTIONS: LocalizedOption[] = [
    { value: 'Yes', label: { en: 'Yes', tl: 'Oo' } },
    { value: 'No', label: { en: 'No', tl: 'Hindi' } },
    { value: 'Unsure', label: { en: 'Unsure', tl: 'Hindi Sigurado' } },
];

export const BLOCKAGE_OPTIONS: LocalizedOption[] = [
    { value: 'Flood', label: { en: 'Flood', tl: 'Baha' } },
    { value: 'Accident', label: { en: 'Accident', tl: 'Aksidente' } },
    { value: 'Road closure', label: { en: 'Road closure', tl: 'Sarado ang daan' } },
    { value: 'Illegal parking', label: { en: 'Illegal parking blocking the way', tl: 'Illegal parking na nakaharang' } },
    { value: 'Other', label: { en: 'Other', tl: 'Iba pa' } },
];

export const PERSONAL_STOP_OPTIONS: LocalizedOption[] = [
    { value: 'Break', label: { en: 'Break', tl: 'Pahinga' } },
    { value: 'Meal', label: { en: 'Meal', tl: 'Pagkain' } },
    { value: 'Restroom', label: { en: 'Restroom', tl: 'Banyo' } },
    { value: 'Refuel', label: { en: 'Refuel', tl: 'Nagpa-gas' } },
    { value: 'Took a Call', label: { en: 'Answered a call', tl: 'Sumagot ng tawag' } },
    { value: 'Accident/Repair', label: { en: 'Accident or vehicle repair', tl: 'Aksidente o repair ng motor' } },
    { value: 'Other', label: { en: 'Other stop reason', tl: 'Iba pang dahilan ng stop' } },
];

export const STOP_DURATION_OPTIONS: LocalizedOption[] = [
    { value: '< 5mins', label: { en: 'Less than 5 minutes', tl: 'Wala pang 5 minuto' } },
    { value: '5-15mins', label: { en: '5 to 15 minutes', tl: '5 hanggang 15 minuto' } },
    { value: '15-30mins', label: { en: '15 to 30 minutes', tl: '15 hanggang 30 minuto' } },
    { value: '> 30mins', label: { en: 'More than 30 minutes', tl: 'Mahigit 30 minuto' } },
];

export const FREQUENCY_OPTIONS: LocalizedOption[] = [
    { value: 'Always', label: { en: 'Always', tl: 'Palagi' } },
    { value: 'Often', label: { en: 'Often', tl: 'Madalas' } },
    { value: 'Sometimes', label: { en: 'Sometimes', tl: 'Minsan' } },
    { value: 'Rarely', label: { en: 'Rarely', tl: 'Bihira' } },
    { value: 'Never', label: { en: 'Never', tl: 'Hindi' } },
];

export const AVOID_ROAD_FREQUENCY_OPTIONS: LocalizedOption[] = [
    ...FREQUENCY_OPTIONS,
    {
        value: "I don't usually pass here",
        label: { en: "I don't usually use this road", tl: 'Hindi ako madalas dumaan dito' },
    },
];

export const QUESTION_TEXT = {
    primaryReason: {
        en: 'What was the main reason you changed route here?',
        tl: 'Ano ang pinaka-main reason bakit ka nag-change route dito?',
    },
    trafficSeverity: {
        en: 'How heavy was the traffic? Choose 1 for very light and 5 for severe/heaviest.',
        tl: 'Gaano kabigat ang traffic? Piliin ang 1 kung maluwag at 5 kung pinakamabigat.',
    },
    rushHourCause: {
        en: 'Do you think this traffic happened because it was rush hour?',
        tl: 'Sa tingin mo, dahil ba sa rush hour kaya traffic dito?',
    },
    chooseDuringNonRush: {
        en: 'If it was not rush hour, would you still use this road?',
        tl: 'Kung hindi rush hour, dadaan ka pa rin ba dito?',
    },
    blockageReason: {
        en: 'What blocked the road or made it unsafe?',
        tl: 'Ano ang nakaharang o delikado sa daan?',
    },
    personalStopReason: {
        en: 'Why did you need to stop?',
        tl: 'Bakit mo kailangan mag-stop?',
    },
    stopDuration: {
        en: 'About how long did the stop take?',
        tl: 'Mga gaano katagal ang stop?',
    },
    deviateAgainFrequency: {
        en: 'If the same situation happens again, how often would you change route like this?',
        tl: 'Kung mangyari ulit ang same situation, gaano kadalas ka mag-change route tulad nito?',
    },
    avoidRoadFrequency: {
        en: 'When going this way, how often do you usually avoid this road?',
        tl: 'Kapag ganito ang biyahe, gaano mo kadalas iniiwasan ang daan na ito?',
    },
};

export function shouldAskTrafficFollowUps(reason: PrimaryDeviationReason | '') {
    return reason === 'Traffic Congestion' || reason === 'Avoid Intersection';
}

export function shouldAskBlockageFollowUp(reason: PrimaryDeviationReason | '') {
    return reason === 'Road Blockage/Hazard (Flood, Accident, Poor road condition)';
}

export function shouldAskPersonalStopFollowUps(reason: PrimaryDeviationReason | '') {
    return reason === 'Personal Stop (Meal, Restroom, Break, Refueling, etc.)';
}

export function isDeviationQuestionnaireComplete(answers: DeviationQuestionnaireAnswers) {
    if (!answers.primaryReason) return false;
    if (answers.primaryReason === 'Other' && !answers.primaryReasonOther?.trim()) return false;

    if (shouldAskTrafficFollowUps(answers.primaryReason)) {
        if (!answers.trafficSeverity || !answers.rushHourCause || !answers.chooseDuringNonRush) return false;
    }

    if (shouldAskBlockageFollowUp(answers.primaryReason)) {
        if (!answers.blockageReason) return false;
        if (answers.blockageReason === 'Other' && !answers.blockageReasonOther?.trim()) return false;
    }

    if (shouldAskPersonalStopFollowUps(answers.primaryReason)) {
        if (!answers.personalStopReason?.length || !answers.stopDuration) return false;
        if (answers.personalStopReason.includes('Other') && !answers.personalStopOther?.trim()) return false;
    }

    return !!answers.deviateAgainFrequency && !!answers.avoidRoadFrequency;
}
