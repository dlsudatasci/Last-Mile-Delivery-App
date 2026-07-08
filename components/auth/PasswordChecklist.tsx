import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

const getPasswordChecklist = (password: string) => ({
    length: password.length >= 8 && password.length <= 15,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /^[A-Za-z0-9]*[!@#$%^&*]+[A-Za-z0-9]*$/.test(password),
});

export const PasswordChecklist = ({ password }: { password: string }) => {
    const rules = getPasswordChecklist(password);

    return (
        <View style={{ marginBottom: sizes.regular }}>
            {[
                { label: 'Must be 8–15 characters', key: 'length' },
                { label: 'At least one uppercase letter [A-Z]', key: 'uppercase' },
                { label: 'At least one lowercase letter [a-z]', key: 'lowercase' },
                { label: 'At least one number [0-9]', key: 'number' },
                { label: 'At least one special character [!@#$%^&*]', key: 'special' },
            ].map(({ label, key }) => (
                <Text
                    key={key}
                    style={{
                        fontSize: fontSizes.tiny,
                        color: rules[key as keyof typeof rules] ? 'green' : '#888',
                        fontFamily: 'LGEIText-Regular',
                    }}
                >
                    {rules[key as keyof typeof rules] ? '✓' : '•'} {label}
                </Text>
            ))}
        </View>
    );
};
