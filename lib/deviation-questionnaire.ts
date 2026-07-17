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
        label: { en: 'Traffic Congestion', tl: 'Matinding Trapik (Traffic Congestion)' },
    },
    {
        value: 'Avoid Intersection',
        label: { en: 'Avoid Intersection', tl: 'Para umiwas sa intersection' },
    },
    {
        value: 'Road Blockage/Hazard (Flood, Accident, Poor road condition)',
        label: {
            en: 'Road Blockage/Hazard (Flood, Accident, Poor road condition)',
            tl: 'Harang/Panganib sa Kalsada (Baha, Aksidente, Sira-sirang kalsada)',
        },
    },
    {
        value: 'Personal Stop (Meal, Restroom, Break, Refueling, etc.)',
        label: {
            en: 'Personal Stop (Meal, Restroom, Break, Refueling, etc.)',
            tl: 'Personal na Paghinto (Pagkain, Banyo, Pahinga, Pagpapakarga ng gas, atbp.)',
        },
    },
    {
        value: 'Shortcut/Faster Route/Personal Preference/Familiar Road',
        label: {
            en: 'Shortcut/Faster Route/Personal Preference/Familiar Road',
            tl: 'Shortcut/Mas mabilis na ruta/Personal na kagustuhan/Pamilyar na kalsada',
        },
    },
    {
        value: 'Searching for Parking',
        label: { en: 'Searching for Parking', tl: 'Naghahanap ng mapaparadahan (Parking)' },
    },
    {
        value: 'Wrong Turn',
        label: { en: 'Wrong Turn', tl: 'Nagkamali ng liko' },
    },
    {
        value: 'Navigation Error / Map issue',
        label: {
            en: 'Navigation Error / Map issue',
            tl: 'Error sa nabigasyon (Waze/Google Maps) / Problema sa mapa',
        },
    },
    {
        value: 'Other',
        label: { en: 'Other: (Type Answer)', tl: 'Iba pa: (I-type ang Sagot)' },
    },
];

export const TRAFFIC_SEVERITY_OPTIONS: LocalizedOption[] = [
    { value: '1 = Very Light', label: { en: '1 = Very Light', tl: '1 = Napakaluwag (Very Light)' } },
    { value: '2 = Light', label: { en: '2 = Light', tl: '2 = Maluwag (Light)' } },
    { value: '3 = Moderate', label: { en: '3 = Moderate', tl: '3 = Katamtaman (Moderate)' } },
    { value: '4 = Heavy', label: { en: '4 = Heavy', tl: '4 = Mabigat (Heavy)' } },
    { value: '5 = Severe', label: { en: '5 = Severe', tl: '5 = Napakabigat / Malala (Severe)' } },
];

export const YES_NO_UNSURE_OPTIONS: LocalizedOption[] = [
    { value: 'Yes', label: { en: 'Yes', tl: 'Oo' } },
    { value: 'No', label: { en: 'No', tl: 'Hindi' } },
    { value: 'Unsure', label: { en: 'Unsure', tl: 'Hindi Sigurado' } },
];

export const BLOCKAGE_OPTIONS: LocalizedOption[] = [
    { value: 'Flood', label: { en: 'Flood', tl: 'Baha' } },
    { value: 'Accident', label: { en: 'Accident', tl: 'Aksidente' } },
    { value: 'Road closure', label: { en: 'Road closure', tl: 'Saradong kalsada' } },
    { value: 'Illegal parking', label: { en: 'Illegal parking', tl: 'Ilegal na pag-park (Illegal parking)' } },
    { value: 'Other', label: { en: 'Other', tl: 'Iba pa' } },
];

export const PERSONAL_STOP_OPTIONS: LocalizedOption[] = [
    { value: 'Break', label: { en: 'Break', tl: 'Pahinga' } },
    { value: 'Meal', label: { en: 'Meal', tl: 'Pagkain' } },
    { value: 'Restroom', label: { en: 'Restroom', tl: 'Banyo (Restroom)' } },
    { value: 'Refuel', label: { en: 'Refuel', tl: 'Nagpakarga ng gas (Refuel)' } },
    { value: 'Took a Call', label: { en: 'Took a Call', tl: 'Sumagot ng tawag' } },
    { value: 'Accident/Repair', label: { en: 'Accident/Repair', tl: 'Aksidente / Pag-aayos ng sasakyan' } },
    { value: 'Other', label: { en: 'Others: (Type Here)', tl: 'Iba pa: (I-type Dito)' } },
];

export const STOP_DURATION_OPTIONS: LocalizedOption[] = [
    { value: '< 5mins', label: { en: '< 5mins', tl: 'Wala pang 5 minuto (< 5mins)' } },
    { value: '5-15mins', label: { en: '5-15mins', tl: '5 hanggang 15 minuto' } },
    { value: '15-30mins', label: { en: '15-30mins', tl: '15 hanggang 30 minuto' } },
    { value: '> 30mins', label: { en: '> 30mins', tl: 'Mahigit 30 minuto (> 30mins)' } },
];

export const FREQUENCY_OPTIONS: LocalizedOption[] = [
    { value: 'Always', label: { en: 'Always', tl: 'Palagi' } },
    { value: 'Often', label: { en: 'Often', tl: 'Madalas' } },
    { value: 'Sometimes', label: { en: 'Sometimes', tl: 'Minsan' } },
    { value: 'Rarely', label: { en: 'Rarely', tl: 'Bihira' } },
    { value: 'Never', label: { en: 'Never', tl: 'Hindi kailanman' } },
];

export const AVOID_ROAD_FREQUENCY_OPTIONS: LocalizedOption[] = [
    ...FREQUENCY_OPTIONS,
    {
        value: "I don't usually pass here",
        label: { en: "I don't usually pass here", tl: 'Hindi ako karaniwang dumadaan dito' },
    },
];

export const QUESTION_TEXT = {
    primaryReason: {
        en: 'What was the PRIMARY reason you deviated from this road?',
        tl: 'Ano ang PANGUNAHING dahilan kung bakit ka nag-iba ng ruta mula sa kalsadang ito?',
    },
    trafficSeverity: { en: 'Rate the traffic severity.', tl: 'I-rate ang lala ng trapik.' },
    rushHourCause: {
        en: 'Do you think the traffic is caused by rush hour?',
        tl: 'Sa tingin mo ba ang trapik ay dahil sa rush hour?',
    },
    chooseDuringNonRush: {
        en: 'Would you choose this road during non-rush-hour conditions?',
        tl: 'Pipiliin mo ba ang kalsadang ito kapag hindi rush hour?',
    },
    blockageReason: { en: 'What was the reason for the blockage?', tl: 'Ano ang naging dahilan ng pagkaharang?' },
    personalStopReason: {
        en: 'What reason did you have for a personal stop?',
        tl: 'Ano ang naging dahilan ng iyong personal na paghinto?',
    },
    stopDuration: {
        en: 'How long was your stop approximately?',
        tl: 'Tinatayang gaano katagal ang iyong paghinto?',
    },
    deviateAgainFrequency: {
        en: 'How often would you deviate again under the same circumstances?',
        tl: 'Gaano ka kadalas umiiba ng ruta sa ilalim ng parehong sitwasyon?',
    },
    avoidRoadFrequency: {
        en: 'How often do you usually avoid this road?',
        tl: 'Gaano mo kadalas karaniwang iniiwasan ang kalsadang ito?',
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
