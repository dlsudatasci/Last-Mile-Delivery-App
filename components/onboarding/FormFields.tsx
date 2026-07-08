import { fontSizes, sizes } from '@/lib/utils/responsive-sizing';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, Modal, Portal, Text, TouchableRipple } from 'react-native-paper';

const TEAL = '#0E6E73';

type SelectFieldProps = {
    label: string;
    value: string;
    placeholder?: string;
    options: string[];
    onSelect: (value: string) => void;
    error?: boolean;
};

/** A bordered field that opens a modal list of options. Dependency-free. */
export function SelectField({ label, value, placeholder = 'Select an option', options, onSelect, error }: SelectFieldProps) {
    const [open, setOpen] = useState(false);

    return (
        <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TouchableRipple
                onPress={() => setOpen(true)}
                style={[styles.fieldBox, error && styles.fieldBoxError]}
                borderless
            >
                <View style={styles.fieldRow}>
                    <Text style={[styles.fieldValue, !value && styles.fieldPlaceholder]} numberOfLines={1}>
                        {value || placeholder}
                    </Text>
                    <Icon source="chevron-down" size={sizes.size28} color="#64748B" />
                </View>
            </TouchableRipple>

            <Portal>
                <Modal visible={open} onDismiss={() => setOpen(false)} contentContainerStyle={styles.modal}>
                    <Text style={styles.modalTitle}>{label}</Text>
                    <ScrollView style={styles.modalList}>
                        {options.map(option => (
                            <TouchableRipple
                                key={option}
                                onPress={() => {
                                    onSelect(option);
                                    setOpen(false);
                                }}
                            >
                                <View style={styles.optionRow}>
                                    <Text style={[styles.optionText, option === value && styles.optionTextSelected]}>
                                        {option}
                                    </Text>
                                    {option === value && <Icon source="check" size={sizes.medium} color={TEAL} />}
                                </View>
                            </TouchableRipple>
                        ))}
                    </ScrollView>
                </Modal>
            </Portal>
        </View>
    );
}

type DateFieldProps = {
    label: string;
    value: string; // formatted "Mon D, YYYY" or empty
    onChange: (value: string) => void;
    error?: boolean;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Birth date field. Opens a modal with Month / Day / Year selectors. */
export function DateField({ label, value, onChange, error }: DateFieldProps) {
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState('');
    const [day, setDay] = useState('');
    const [year, setYear] = useState('');

    const years = useMemo(() => {
        const current = new Date().getFullYear();
        const list: string[] = [];
        for (let y = current - 18; y >= current - 80; y--) list.push(String(y));
        return list;
    }, []);

    const days = useMemo(() => Array.from({ length: 31 }, (_, i) => String(i + 1)), []);

    const confirm = () => {
        if (month && day && year) {
            onChange(`${month} ${day}, ${year}`);
            setOpen(false);
        }
    };

    return (
        <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TouchableRipple
                onPress={() => setOpen(true)}
                style={[styles.fieldBox, error && styles.fieldBoxError]}
                borderless
            >
                <View style={styles.fieldRow}>
                    <Text style={[styles.fieldValue, !value && styles.fieldPlaceholder]}>{value || 'Select date'}</Text>
                    <Icon source="calendar" size={sizes.medium} color="#64748B" />
                </View>
            </TouchableRipple>

            <Portal>
                <Modal visible={open} onDismiss={() => setOpen(false)} contentContainerStyle={styles.modal}>
                    <Text style={styles.modalTitle}>Birth Date</Text>
                    <SelectField label="Month" value={month} options={MONTHS} onSelect={setMonth} />
                    <SelectField label="Day" value={day} options={days} onSelect={setDay} />
                    <SelectField label="Year" value={year} options={years} onSelect={setYear} />
                    <Button
                        mode="contained"
                        buttonColor={TEAL}
                        textColor="#ffffff"
                        style={styles.doneButton}
                        labelStyle={styles.doneLabel}
                        disabled={!month || !day || !year}
                        onPress={confirm}
                    >
                        Done
                    </Button>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    fieldWrap: { marginBottom: sizes.medium },
    fieldLabel: {
        fontFamily: 'LGEIText-SemiBold',
        fontSize: fontSizes.tiny,
        color: '#334155',
        marginBottom: sizes.tiny,
    },
    fieldBox: {
        height: sizes.size56,
        borderWidth: 1,
        borderColor: '#79747E',
        borderRadius: sizes.small,
        paddingHorizontal: sizes.regular,
        justifyContent: 'center',
        backgroundColor: '#ffffff',
    },
    fieldBoxError: { borderColor: '#DC2626' },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    fieldValue: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.small,
        color: '#0F172A',
        flex: 1,
    },
    fieldPlaceholder: { color: '#94A3B8' },
    modal: {
        backgroundColor: '#ffffff',
        marginHorizontal: sizes.large,
        borderRadius: sizes.medium,
        padding: sizes.large,
    },
    modalTitle: {
        fontFamily: 'LGEIHeadline-Bold',
        fontSize: fontSizes.regular,
        color: '#0F172A',
        marginBottom: sizes.medium,
    },
    modalList: { maxHeight: sizes.size384 },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: sizes.regular,
    },
    optionText: {
        fontFamily: 'LGEIText-Regular',
        fontSize: fontSizes.small,
        color: '#334155',
    },
    optionTextSelected: {
        fontFamily: 'LGEIText-SemiBold',
        color: TEAL,
    },
    doneButton: { marginTop: sizes.small, borderRadius: sizes.small },
    doneLabel: { fontFamily: 'LGEIText-SemiBold', fontSize: fontSizes.small },
});
