import { PERIODS, useTripsFilter } from '@/lib/store/useTripsFilter';
import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Menu, Text, TouchableRipple, useTheme } from 'react-native-paper';

// Compact period dropdown that sits on the right side of the "Trips" header.
export default function TripsPeriodMenu() {
    const theme = useTheme();
    const period = useTripsFilter(s => s.period);
    const setPeriod = useTripsFilter(s => s.setPeriod);
    const [visible, setVisible] = useState(false);

    return (
        <Menu
            visible={visible}
            onDismiss={() => setVisible(false)}
            anchor={
                <TouchableRipple
                    onPress={() => setVisible(true)}
                    style={[styles.btn, { borderColor: theme.colors.outlineVariant ?? '#E2E8F0' }]}
                    borderless
                >
                    <View style={styles.row}>
                        <Text style={[styles.text, { color: theme.colors.onSurface }]}>{period}</Text>
                        <Icon source="chevron-down" size={sizes.medium} color={theme.colors.onSurfaceVariant} />
                    </View>
                </TouchableRipple>
            }
        >
            {PERIODS.map(p => (
                <Menu.Item
                    key={p}
                    title={p}
                    onPress={() => {
                        setPeriod(p);
                        setVisible(false);
                    }}
                />
            ))}
        </Menu>
    );
}

const styles = StyleSheet.create({
    btn: { borderRadius: sizes.size32, borderWidth: 1, marginRight: sizes.large },
    row: { flexDirection: 'row', alignItems: 'center', gap: sizes.tiny, paddingVertical: sizes.tiny, paddingLeft: sizes.regular, paddingRight: sizes.small },
    text: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.tiny },
});
