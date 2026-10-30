import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';

import { supabase } from './supabase';
import { OPERATOR } from '../data/legal';
import { look } from '../theme/look';

/**
 * Fehlerbericht für den Fehler-Screen (src/components/ErrorScreen.tsx).
 * Landet in der Tabelle `error_reports` (Migration 20261025000200). Klappt das nicht, geht er per E-Mail.
 */
export type ErrorReport = {
  message: string;
  stack: string;
  comment: string;
  screen: string;
  platform: string;
  app_version: string;
  look: string;
  start_info: string;
};

/** Zuletzt geöffneter Screen. RootStack in src/app/_layout.tsx setzt ihn bei jedem Wechsel. */
let lastScreen = '';
export function setLastScreen(path: string) {
  lastScreen = path;
}

function currentScreen() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.pathname + window.location.search;
  return lastScreen;
}

function platformInfo() {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') return `web, ${navigator.userAgent}`;
  return `${Platform.OS} ${String(Platform.Version)}`;
}

export function buildErrorReport(error: unknown, comment = ''): ErrorReport {
  const err = error instanceof Error ? error : new Error(String(error));
  const start = typeof window !== 'undefined' ? (window as unknown as { __kiezStart?: string }).__kiezStart : undefined;
  return {
    message: (err.message || String(error) || 'Unbekannter Fehler').slice(0, 1000),
    stack: String(err.stack ?? '').slice(0, 8000),
    comment: comment.trim().slice(0, 1000),
    screen: currentScreen().slice(0, 300),
    platform: platformInfo().slice(0, 300),
    app_version: String(Constants.expoConfig?.version ?? '').slice(0, 50),
    look: String(look).slice(0, 30),
    start_info: String(start ?? '').slice(0, 300),
  };
}

/** Schickt den Bericht an die Datenbank. Wirft bei Fehler, damit der Screen die E-Mail anbietet. */
export async function sendErrorReport(report: ErrorReport) {
  const { error } = await supabase.from('error_reports').insert(report);
  if (error) throw error;
}

/** Text für E-Mail und Zwischenablage */
export function errorReportText(report: ErrorReport) {
  return [
    report.comment ? `Was ich gemacht habe: ${report.comment}` : '',
    `Fehler: ${report.message}`,
    `Screen: ${report.screen || '–'}`,
    `Gerät: ${report.platform}`,
    `Version: ${report.app_version || '–'}, Look: ${report.look}`,
    report.start_info ? `Start: ${report.start_info}` : '',
    '',
    report.stack.slice(0, 1500),
  ]
    .filter((line, i) => line !== '' || i === 6)
    .join('\n');
}

/** Öffnet das Mailprogramm mit dem Bericht an das Postfach aus dem Impressum */
export async function mailErrorReport(report: ErrorReport) {
  const subject = encodeURIComponent('Fehlerbericht KiezCoins');
  const body = encodeURIComponent(errorReportText(report));
  await Linking.openURL(`mailto:${OPERATOR.email}?subject=${subject}&body=${body}`);
}
