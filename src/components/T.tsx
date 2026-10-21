import { forwardRef, Children, type ReactNode } from 'react';
import { Alert, Text as RNText, type TextProps } from 'react-native';

import { tPadded, t, useTexts } from '../data/texts';

/**
 * `Text` mit Übersetzung: Reine Textstücke in den Kindern laufen durch `t()` (data/texts.ts).
 * Alle Screens und Komponenten importieren `Text` von hier statt aus react-native.
 * Texte mit Werten darin (Namen, Zahlen) übersetzt `t('… {name} …', { name })` an der Stelle selbst.
 */
export const Text = forwardRef<RNText, TextProps>(function Text({ children, accessibilityLabel, ...props }, ref) {
  useTexts();
  return (
    <RNText ref={ref} accessibilityLabel={accessibilityLabel ? t(accessibilityLabel) : accessibilityLabel} {...props}>
      {translateChildren(children)}
    </RNText>
  );
});

function translateChildren(children: ReactNode): ReactNode {
  if (typeof children === 'string') return tPadded(children);
  if (Array.isArray(children)) {
    return Children.map(children, (child) => (typeof child === 'string' ? tPadded(child) : child));
  }
  return children;
}

let alertPatched = false;
/** Titel, Meldung und Buttons von `Alert.alert` übersetzen. Einmal im Root-Layout aufrufen (nach WebAlert). */
export function translateAlerts() {
  if (alertPatched) return;
  alertPatched = true;
  const original = Alert.alert;
  Alert.alert = (title, message, buttons, options) =>
    original(
      t(title),
      message ? t(message) : message,
      buttons?.map((b) => (b.text ? { ...b, text: t(b.text) } : b)),
      options,
    );
}
