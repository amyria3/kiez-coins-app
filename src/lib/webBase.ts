import Constants from 'expo-constants';

/**
 * Pfad, unter dem die Web-App liegt: „/app“ auf kiezcoins.de, „“ auf app.kiezcoins.de.
 * Kommt aus experiments.baseUrl (app.config.js, gesetzt über EXPO_WEB_BASE_URL beim Web-Build).
 */
export const webBase = () => String(Constants.expoConfig?.experiments?.baseUrl ?? '').replace(/\/$/, '');
