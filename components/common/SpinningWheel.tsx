import { sizes } from '@/lib/utils/responsive-sizing';
import React, { useEffect, useRef } from 'react';
import { Animated, View, useColorScheme } from 'react-native';

const SpinningWheel = () => {
    const rotateValue = useRef(new Animated.Value(0)).current;

    const colorScheme = useColorScheme();

    const wheel =
        colorScheme === 'dark' ? require('@/assets/images/wheel-dark.png') : require('@/assets/images/wheel-light.png');

    useEffect(() => {
        Animated.loop(
            Animated.timing(rotateValue, {
                toValue: 1,
                duration: 2000, // Duration of one complete rotation
                useNativeDriver: true, // Native driver for better performance
            })
        ).start();
    }, [rotateValue]);

    // Interpolate rotation value
    const rotateInterpolate = rotateValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'], // Spin from 0 to 360 degrees
    });

    const animatedStyle = {
        transform: [{ rotate: rotateInterpolate }],
    };

    return (
        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            <Animated.Image source={wheel} style={[{ width: sizes.size128, height: sizes.size128 }, animatedStyle]} />
        </View>
    );
};

export default SpinningWheel;
