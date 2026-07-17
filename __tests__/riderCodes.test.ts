import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveLocalAccount } from '../lib/local-db/accounts';
import {
    clearRiderCodeRegistrations,
    getAccountForRiderCode,
    getRiderCodeRegistration,
    isValidRiderCode,
    registerRiderCode,
    RIDER_CODES,
    sanitizeRiderCode,
} from '../lib/local-db/riderCodes';

describe('rider code local registration', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        await clearRiderCodeRegistrations();
    });

    test('accepts only the pre-generated 6-digit rider codes', () => {
        expect(RIDER_CODES).toHaveLength(11);
        expect(isValidRiderCode(RIDER_CODES[0])).toBe(true);
        expect(isValidRiderCode('123456')).toBe(true);
        expect(isValidRiderCode('000000')).toBe(false);
    });

    test('normalizes code input to six digits', () => {
        expect(sanitizeRiderCode('184 275 extra')).toBe('184275');
    });

    test('stores and reads a registered rider code', async () => {
        const registration = await registerRiderCode('184275', '09123456789');

        expect(registration.code).toBe('184275');
        await expect(getRiderCodeRegistration('184275')).resolves.toMatchObject({
            code: '184275',
            phone: '09123456789',
        });
    });

    test('restores the linked local account for a registered code', async () => {
        await saveLocalAccount({
            riderCode: '184275',
            phone: '09123456789',
            fullName: 'Rider One',
            gender: 'Male',
            ageRange: '25-34',
            city: 'Manila',
            yearsExperience: '1-3 years',
            acceptedPolicies: true,
            createdAt: '2026-07-17T00:00:00.000Z',
        });
        await registerRiderCode('184275', '09123456789');

        await expect(getAccountForRiderCode('184275')).resolves.toMatchObject({
            fullName: 'Rider One',
            phone: '09123456789',
        });
    });

    test('does not let a registered code move to a different phone number', async () => {
        await registerRiderCode('184275', '09123456789');

        await expect(registerRiderCode('184275', '09999999999')).rejects.toThrow('already registered');
    });
});
