import AsyncStorage from '@react-native-async-storage/async-storage';

// Web: Die Sitzung bleibt im Speicher des Browsers (localStorage), wie bisher.
// In der App kommt sie in den geschützten Speicher des Geräts, siehe authStorage.native.ts.
export const authStorage = AsyncStorage;
