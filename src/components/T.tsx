import { forwardRef, Children, useCallback, type ReactNode } from 'react';
import { Alert, Platform, StyleSheet, Text as RNText, type TextProps } from 'react-native';

import { tPadded, t, useTexts } from '../data/texts';
import { useSpaceText } from '../theme/signal';
import { color } from '../theme/tokens';

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

/** Karla läuft enger (Daria, 2026-11-11): −0,4 als Standard, wenn der Stil keinen eigenen Abstand setzt */
const KARLA_SPACING = -0.4;
function withKarlaSpacing(style: TextProps['style']): TextProps['style'] {
  const flat = StyleSheet.flatten(style);
  if (!flat?.fontFamily?.startsWith('Karla') || flat.letterSpacing != null) return style;
  return [style, { letterSpacing: KARLA_SPACING }];
}

/**
 * Zeilenumbruch an einer Stelle für die ganze App (Daria, 2026-11-24: „Solche Umbrüche sind seltsam … nicht erlauben
 * und zentral steuern“). Vorher brach der Browser zu lange Wörter an beliebiger Stelle ohne Trennstrich
 * („Öffnungsze|iten“, „Teeprob|e“), weil react-native-web `word-wrap: break-word` setzt.
 * - Web: Silbentrennung nach den Regeln der Sprache (`hyphens: auto`, Sprache aus `<html lang>`, gesetzt in
 *   data/texts.ts), nur bei Wörtern ab 8 Zeichen und mit mindestens 4 Zeichen vor und nach dem Strich. Erst wenn ein
 *   Wort auch so nicht passt, bricht es hart um (`overflow-wrap: break-word`). `text-wrap: pretty` vermeidet einzelne
 *   Wörter allein in der letzten Zeile. Browser ohne diese Angaben ignorieren sie.
 * - Android: Silbentrennung des Systems (`android_hyphenationFrequency`).
 * - Namen, Adressen, Mail und Links (`noTranslate`) werden nie getrennt, nur im Notfall umgebrochen.
 * Die Layouts geben Text trotzdem genug Breite (UX-Regeln, „So brechen Texte um“).
 */
const WRAP_WEB = { hyphens: 'auto', hyphenateLimitChars: '8 4 4', WebkitHyphenateLimitBefore: 4, WebkitHyphenateLimitAfter: 4, overflowWrap: 'break-word', textWrap: 'pretty' } as object;
const WRAP_WEB_NAMES = { hyphens: 'manual', overflowWrap: 'break-word', textWrap: 'pretty' } as object;
const wrapStyle = (noTranslate?: boolean) => (Platform.OS === 'web' ? (noTranslate ? WRAP_WEB_NAMES : WRAP_WEB) : null);

/**
 * Schrift im Ton des Themes (Daria, 2026-11-24: „eine weniger rosa Farbe, … konsistent mit gelben Buttons“): Haupt- und
 * Nebenschrift (`color.text.primary`, `color.text.secondary`) nehmen im Schaufenster, in Me & Myself und in Functional
 * den Farbton des Akzents an (`color.textTone`). Alle anderen Farben bleiben, wie der Stil sie setzt.
 */
function toneColor(style: TextProps['style'], tone: { primary: string; secondary: string }): TextProps['style'] {
  if (tone.primary === color.text.primary) return style;
  const c = StyleSheet.flatten(style)?.color;
  if (c === color.text.primary) return [style, { color: tone.primary }];
  if (c === color.text.secondary) return [style, { color: tone.secondary }];
  return style;
}

export const Text = forwardRef<RNText, Props>(function Text({ children, accessibilityLabel, noTranslate, style, ...props }, ref) {
  useTexts();
  const tone = useSpaceText();
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
    <RNText
      ref={setRef}
      accessibilityLabel={accessibilityLabel ? t(accessibilityLabel) : accessibilityLabel}
      android_hyphenationFrequency={noTranslate ? 'none' : 'normal'}
      style={[wrapStyle(noTranslate), toneColor(withKarlaSpacing(style), tone)]}
      {...props}
    >
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
