import { Alert, Linking, Platform } from 'react-native';

import { t } from '../data/texts';
import { shareText } from './share';

/**
 * Orte, Telefonnummern und Links öffnen (Daria, 2026-11-13): Erinnerungen und Schaufenster-Adressen öffnen die
 * Karten-App des Geräts, rufen an oder öffnen den Link.
 * - iPhone-App: Apple Karten (`maps:`). Android-App: `geo:`, dann fragt Android, welche Karten-App (Google Maps,
 *   OsmAnd, Organic Maps …).
 * - Browser: auf iPhone und iPad Apple Karten, sonst Google Maps im Web.
 */
export function mapsUrl(place: string): string {
  const q = encodeURIComponent(place.trim());
  if (Platform.OS === 'ios') return `maps:?q=${q}`;
  if (Platform.OS === 'android') return `geo:0,0?q=${q}`;
  const apple = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in globalThis;
  return apple ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Link zum Teilen: Google Maps im Web öffnet sich auf jedem Gerät, auch ohne App */
export const shareableMapsUrl = (place: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.trim())}`;

const fail = () => Alert.alert(t('Hat nicht geklappt'), t('Das ließ sich gerade nicht öffnen.'));

export function openInMaps(place: string) {
  Linking.openURL(mapsUrl(place)).catch(() => Linking.openURL(shareableMapsUrl(place)).catch(fail));
}

/** Ort mit Namen teilen, z. B. „Auentee Leipzig, Hauptstraße 1 – https://www.google.com/maps/…“ */
export function sharePlace(place: string, name?: string) {
  const line = name ? `${name}, ${place}` : place;
  shareText(`${line}\n${shareableMapsUrl(place)}`);
}

/** Fragt, ob der Ort in der Karte öffnen oder geteilt werden soll */
export function placeActions(place: string, name?: string) {
  Alert.alert(name ?? place, name ? place : undefined, [
    { text: t('In Karten öffnen'), onPress: () => openInMaps(place) },
    { text: t('Ort teilen'), onPress: () => sharePlace(place, name) },
    { text: t('Abbrechen'), style: 'cancel' },
  ]);
}

export function callPhone(phone: string) {
  Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(fail);
}

export const normalizeLink = (link: string) => {
  const v = link.trim();
  return !v || /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
};

export function openLink(link: string) {
  Linking.openURL(normalizeLink(link)).catch(fail);
}

/** „https://www.auentee.de/shop“ → „auentee.de/shop“ */
export const shortLinkText = (link: string) => link.replace(/^[a-z]+:\/\/(www\.)?/i, '').replace(/\/$/, '');
