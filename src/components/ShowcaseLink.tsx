import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button } from './Button';
import { FieldGroup, Notice, QuestionHint } from './Content';
import { TextField } from './Form';
import { Icon } from './icons/Icon';
import { Text } from './T';
import { createShowcase, groupShowcaseOn, showcaseOfGroup, useShowcaseEnabled, type Showcase } from '../data/showcase';
import type { Group } from '../data/types';
import { t } from '../data/texts';
import { color, radius, space, text } from '../theme/tokens';

/**
 * Schaufenster auf der Gruppenseite (Daria, 2026-11-10): Die Gründer:in legt es an, alle Mitglieder öffnen es.
 * Feature `schaufenster` für diese Gruppe, für alle an (useShowcaseEnabled). Ist es für die Gruppe aus, legt sie keins an,
 * und ein bestehendes steht hier als „Offline“ (Daria, 2026-11-10).
 */
export function ShowcaseLink({ group, isFounder }: { group: Group; isFounder: boolean }) {
  const enabled = useShowcaseEnabled(group.id);
  const router = useRouter();
  // undefined: lädt oder keins, null: Fehler (Migration fehlt)
  const [showcase, setShowcase] = useState<Showcase | undefined | null>(undefined);
  const [loaded, setLoaded] = useState(false);
  // Schalter der Gruppe (Migration 20261110001600); undefined: Migration fehlt, dann gilt `enabled`
  const [groupOn, setGroupOn] = useState<boolean | undefined>(undefined);
  const [name, setName] = useState(group.name);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      Promise.all([showcaseOfGroup(group.id), groupShowcaseOn(group.id)]).then(([s, on]) => {
        setShowcase(s);
        setGroupOn(on);
        setLoaded(true);
      });
    }, [enabled, group.id]),
  );

  if (!enabled || !loaded) return null;
  if (showcase === null) {
    return (
      <FieldGroup label="Schaufenster">
        <Notice variant="warning" message="Das Schaufenster lädt gerade nicht. Fehlt noch die Migration 20261110000400_schaufenster?" />
      </FieldGroup>
    );
  }
  if (showcase) {
    return (
      <FieldGroup label="Schaufenster">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Schaufenster „{name}“ öffnen', { name: showcase.name })}
          onPress={() => router.push({ pathname: '/schaufenster/[id]', params: { id: showcase.id } })}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          {showcase.logo ? <Image source={showcase.logo} style={styles.logo} contentFit="cover" /> : <View style={[styles.logo, styles.logoEmpty]} />}
          <View style={styles.flex}>
            <Text noTranslate style={styles.name} numberOfLines={1}>
              {showcase.name}
            </Text>
            <Text style={styles.meta}>
              {!showcase.switches.online ? 'Offline' : showcase.visibility === 'public' ? 'Öffentlich' : 'Nur für Eingeladene'}
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={color.text.secondary} />
        </Pressable>
      </FieldGroup>
    );
  }
  if (!isFounder || groupOn === false) return null;

  const create = async () => {
    setBusy(true);
    setFailed(null);
    try {
      const id = await createShowcase(group.id, name.trim());
      router.push({ pathname: '/schaufenster/[id]/bearbeiten', params: { id } });
    } catch (error) {
      setFailed((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FieldGroup label="Schaufenster">
      {/* Erklärung als Frage zum Aufklappen, Name und Knopf mit mehr Luft (Daria, 2026-11-10) */}
      <QuestionHint
        question="Was ist ein Schaufenster?"
        answer="Die öffentliche Seite Eurer Gruppe, zum Beispiel für einen Laden, Verein oder Club. Ihr zeigt dort Posts, Termine, Öffnungszeiten und Adresse. Andere folgen Euch und speichern Eure Termine. Ihr bestimmt, ob alle es sehen oder nur Eingeladene. Jede Gruppe hat höchstens ein Schaufenster."
      />
      <View style={styles.form}>
        <TextField label="Name" value={name} onChangeText={setName} maxLength={60} />
        <Button label="Schaufenster anlegen" variant="secondary" busy={busy} disabled={!name.trim()} onPress={create} />
        {failed ? <Notice variant="warning" message={failed} /> : null}
      </View>
    </FieldGroup>
  );
}

const styles = StyleSheet.create({
  form: { gap: space[16], marginTop: space[16] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[12],
    padding: space[12],
    borderRadius: radius.xl,
    backgroundColor: color.bg.surface,
  },
  pressed: { opacity: 0.7 },
  logo: { width: 40, height: 40, borderRadius: 20 },
  logoEmpty: { backgroundColor: color.bg.screen },
  flex: { flex: 1, gap: space[2] },
  name: { ...text.title, fontSize: 16, color: color.text.primary },
  meta: { ...text.caption, color: color.text.secondary },
});
