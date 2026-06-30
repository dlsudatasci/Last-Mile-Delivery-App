import { Snackbar, Text } from 'react-native-paper';
export type SnackbarType = 'success' | 'error' | 'warning' | 'info';

interface CustomSnackbarProps {
    visible: boolean;
    message: string;
    onDismiss: () => void;
    type?: SnackbarType;
}

export default function CustomSnackbar({ visible, message, onDismiss, type = 'info' }: CustomSnackbarProps) {
    const getSnackbarStyle = () => {
        switch (type) {
            case 'success':
                return { backgroundColor: '#4CAF50' };
            case 'error':
                return { backgroundColor: '#F44336' };
            case 'warning':
                return { backgroundColor: '#FF9800' };
            default:
                return { backgroundColor: '#2196F3' };
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return 'check-circle';
            case 'error':
                return 'alert-circle';
            case 'warning':
                return 'alert';
            default:
                return 'information';
        }
    };

    return (
        <Snackbar
            visible={visible}
            onDismiss={onDismiss}
            style={getSnackbarStyle()}
            icon={getIcon()}
            action={{ label: 'Close', onPress: onDismiss }}
        >
            <Text style={{ color: '#FFFFFF' }}>{message}</Text>
        </Snackbar>
    );
}
