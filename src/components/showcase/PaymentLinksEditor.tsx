import { Pressable, StyleSheet, View } from 'react-native';

import { PAYMENT_AMOUNT_MAX, PAYMENT_LINKS_MAX, PAYMENT_TITLE_MAX, paymentLinkProblem } from '../../data/paymentLinks.mjs';
import { t } from '../../data/texts';
import { color, space, text } from '../../theme/tokens';
import { Button } from '../Button';
import { TextField } from '../Form';
import { Text } from '../T';

/** Ein Zahlungslink im Formular; der Betrag ist leer, wenn keiner angegeben ist */
export type PaymentDraft = { title: string; amount: string; url: string };

/**
 * Felder für die Zahlungslinks (Daria, 2026-11-23): je Eintrag Titel, Betrag (optional) und Link zum Bezahlen, bis zu
 * zehn, mit „Entfernen“ und „Zahlungslink hinzufügen“. Steht seit 2026-11-24 unter „Funktionen“ beim Schalter
 * „Bezahlen“ (ShowcaseFunctions), vorher unter „Inhalte bearbeiten“. Regeln in src/data/paymentLinks.mjs.
 */
export function PaymentLinksEditor({ value, onChange }: { value: PaymentDraft[]; onChange: (next: PaymentDraft[]) => void }) {
  const setField = (i: number, key: keyof PaymentDraft) => (v: string) => onChange(value.map((p, j) => (j === i ? { ...p, [key]: v } : p)));
  return (
    <View style={styles.list}>
      {value.map((p, i) => {
        const problem = paymentLinkProblem(p);
        return (
          <View key={i} style={styles.item}>
            <TextField
              label={value.length > 1 ? t('Titel {n}', { n: i + 1 }) : t('Titel')}
              value={p.title}
              onChangeText={setField(i, 'title')}
              maxLength={PAYMENT_TITLE_MAX}
              placeholder="Gutschein: Frühstück für zwei"
              error={problem === 'title' ? 'Bitte gib einen Titel ein.' : undefined}
            />
            <TextField label="Betrag" value={p.amount} onChangeText={setField(i, 'amount')} maxLength={PAYMENT_AMOUNT_MAX} placeholder="24 €" helperText="Optional" />
            <TextField
              label="Link zum Bezahlen"
              value={p.url}
              onChangeText={setField(i, 'url')}
              maxLength={300}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="https://buy.stripe.com/…"
              error={problem === 'url' ? 'Der Link beginnt mit https://' : undefined}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Zahlungslink {n} entfernen', { n: i + 1 })}
              hitSlop={8}
              onPress={() => onChange(value.filter((_, j) => j !== i))}
              style={styles.remove}
            >
              <Text style={styles.removeText}>Entfernen</Text>
            </Pressable>
          </View>
        );
      })}
      {value.length < PAYMENT_LINKS_MAX ? (
        <Button
          label={value.length ? 'Weiteren Zahlungslink hinzufügen' : 'Zahlungslink hinzufügen'}
          icon="plus"
          variant="ghost"
          onPress={() => onChange([...value, { title: '', amount: '', url: '' }])}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[12] },
  item: { gap: space[12], paddingBottom: space[12], borderBottomWidth: 1, borderBottomColor: color.line.hairline },
  remove: { alignSelf: 'flex-end' },
  removeText: { ...text.caption, color: color.text.secondary, textDecorationLine: 'underline' },
});
