import * as Font from 'expo-font';

export const useCustomFonts = () => {
    return Font.useFonts({
        'LGEIHeadline-Bold': require('../../assets/fonts/LGEIHeadline-Bold.otf'),
        'LGEIHeadline-Light': require('../../assets/fonts/LGEIHeadline-Light.otf'),
        'LGEIHeadline-Regular': require('../../assets/fonts/LGEIHeadline-Regular.otf'),
        'LGEIHeadline-Semibold': require('../../assets/fonts/LGEIHeadline-Semibold.otf'),
        'LGEIHeadline-Thin': require('../../assets/fonts/LGEIHeadline-Thin.otf'),
        'LGEIText-Bold': require('../../assets/fonts/LGEIText-Bold.otf'),
        'LGEIText-Light': require('../../assets/fonts/LGEIText-Light.otf'),
        'LGEIText-Regular': require('../../assets/fonts/LGEIText-Regular.otf'),
        'LGEIText-SemiBold': require('../../assets/fonts/LGEIText-SemiBold.otf'),
    });
};
