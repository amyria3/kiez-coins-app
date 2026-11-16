/**
 * Web und Tests: kein Expo-Push. Die echte Fassung für die Android-App steht in `pushNative.native.ts`
 * (Metro wählt sie dort von selbst). Die Web-App nutzt Web-Push (`push.ts`).
 */
export const nativePushOn = async (): Promise<boolean> => false;
export const nativePushDenied = async (): Promise<boolean> => false;
export const enableNativePush = async (): Promise<boolean> => false;
export const disableNativePush = async (): Promise<void> => undefined;
export const onPushOpen = (_open: (url: string) => void): (() => void) => () => undefined;
