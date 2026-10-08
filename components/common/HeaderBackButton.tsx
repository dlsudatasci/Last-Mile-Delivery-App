import { router } from 'expo-router';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';

import { hitSlop, sizes } from '@/lib/utils/responsive-sizing';

interface HeaderBackButtonProps {
    onPress?: () => void;
    color?: string;
    style?: StyleProp<ViewStyle>;
}

export default function HeaderBackButton({ onPress, color, style }: HeaderBackButtonProps) {
    const theme = useTheme();

    const handlePress = () => {
        if (onPress) {
            onPress();
            return;
        }

        router.back();
    };

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={hitSlop}
            onPress={handlePress}
            style={({ pressed }) => [styles.button, style, pressed && styles.pressed]}
        >
            <Icon source="chevron-left" size={sizes.size32} color={color ?? theme.colors.onSurface} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressed: {
        opacity: 0.6,
    },
});
