import { forwardRef, Children, useCallback, type ReactNode } from 'react';
import { Alert, Platform, Text as RNText, type TextProps } from 'react-native';

import { tPadded, t, useTexts } from '../data/texts';

/**
 * `Text` mit Übersetzung: Reine Textstücke in den Kindern laufen durch `t()` (data/texts.ts).
 * Alle Screens und Komponenten importieren `Text` von hier statt aus react-native.
 * Texte mit Werten darin (Namen, Zahlen) übersetzt `t('… {name} …', { name })` an der Stelle selbst.
 */
type Props = TextProps & {
  /**
   * Namen, Decknamen, Gruppennamen: weder `t()` noch die Übersetzung im Browser fassen sie an.
   * Safari machte sonst aus „Sof“ ein „Sofa“ (Daria, 21.10.2026). Im Web setzt das `translate="no"`.
   */
  noTranslate?: boolean;
};

export const Text = forwardRef<RNText, Props>(function Text({ children, accessibilityLabel, noTranslate, ...props }, ref) {
  useTexts();
  const setRef = useCallback(
    (node: RNText | null) => {
      if (noTranslate && Platform.OS === 'web' && node) {
        const el = node as unknown as HTMLElement;
        el.setAttribute?.('translate', 'no');
        el.classList?.add('notranslate');
      }
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref, noTranslate],
  );
  return (
    <RNText ref={setRef} accessibilityLabel={accessibilityLabel ? t(accessibilityLabel) : accessibilityLabel} {...props}>
      {noTranslate ? children : translateChildren(children)}
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
