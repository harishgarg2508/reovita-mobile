import { Platform } from 'react-native';

// Animated runs on the native driver on iOS and Android. Web has no native driver, so it stays off there.
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';
