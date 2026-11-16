import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/Button';
import { FieldGroup, QuestionHint } from '../../components/Content';
import { SwitchRow } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { Text } from '../../components/T';
import {
  ALL_ON,
  disablePush,
  enablePush,
  loadPushSettings,
  pushState,
  savePushSetting,
  type PushCategory,
  type PushSettings,
  type PushState,
} from '../../data/push';
import { useStore } from '../../data/store';
import { errorText } from '../../data/remote';
import { useGoBack } from '../../lib/goBack';
import { color, space, text } from '../../theme/tokens';

/** Arten mit eigenem Schalter (Daria, 2026-11-16), passend zu den Ereignissen in Migration 20261116000300_push */
const CATEGORIES: { key: PushCategory; label: string; description: string }[] = [
  { key: 'messages', label: 'Nachrichten', description: 'Neue Nachrichten von Freund:innen' },
  {
    key: 'challenges',
    label: 'Challenges',
    description: 'Angenommen, Mitmachen, Erledigt gemeldet, Bestätigt, Bezahlt',
  },
  { key: 'friends', label: 'Freundschaften und Einladungen', description: 'Freundschaftsanfragen, angenommene Einladungen' },
  { key: 'showcase', label: 'Schaufenster', description: 'Neue Follower:innen, neue Fragen zu Deinen Posts' },
];

/** Was unter dem Hauptschalter steht, je nach Stand auf diesem Gerät */
const STATE_HINT: Record<PushState, string | null> = {
  on: null,
  off: null,
  denied: 'Dein Browser blockiert Mitteilungen für KiezCoins. Erlaube sie in den Einstellungen des Browsers oder des Handys.',
  install:
    'Auf dem iPhone kommen Push-Nachrichten nur in der Web-App auf dem Home-Bildschirm an. Öffne KiezCoins in Safari, tippe auf „Teilen“ › „Zum Home-Bildschirm“ und schalte sie dort ein.',
  unsupported: 'Dieser Browser kann keine Push-Nachrichten empfangen.',
};

/**
 * Route `account/notifications` (Dein Konto › Benachrichtigungen, Daria, 2026-11-16): Hauptschalter für Push auf
 * diesem Gerät und je Art ein Schalter. Der Hauptschalter (`push` in profile_settings) gilt für alle Geräte.
 */
export default function Notifications() {
  const goBack = useGoBack();
  const { profile, dispatch, currentUserId, mode } = useStore();
  const [state, setState] = useState<PushState | null>(null);
  const [settings, setSettings] = useState<PushSettings>(ALL_ON);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const live = mode === 'live' && !!currentUserId;

  useEffect(() => {
    pushState().then(setState, () => setState('unsupported'));
    if (live) loadPushSettings(currentUserId).then((s) => s && setSettings(s));
  }, [live, currentUserId]);

  const master = profile.push && state === 'on';
  const canSwitch = state === 'on' || state === 'off';

  const toggleMaster = async (on: boolean) => {
    setBusy(true);
    setProblem(null);
    try {
      // Direkt aus dem Tippen: Safari fragt nur dann nach der Erlaubnis
      const next = on ? await enablePush() : await disablePush();
      setState(next);
      dispatch({ type: 'updateProfile', patch: { push: on && next === 'on' } });
    } catch (error) {
      setProblem(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const toggleCategory = async (key: PushCategory, on: boolean) => {
    setSettings((s) => ({ ...s, [key]: on }));
    if (live && !(await savePushSetting(currentUserId, key, on))) setSettings((s) => ({ ...s, [key]: !on }));
  };

  const hint = state ? STATE_HINT[state] : null;
  return (
    <SubScreen title="Benachrichtigungen" navigation="back" onLeadingPress={goBack}>
      <SwitchRow
        label="Push-Nachrichten"
        description={master ? 'Auf diesem Gerät eingeschaltet' : 'Auf diesem Gerät ausgeschaltet'}
        value={master}
        onValueChange={(on) => (canSwitch && !busy ? toggleMaster(on) : undefined)}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {problem ? <Text style={styles.error}>{problem}</Text> : null}
      {state === 'off' && profile.push && !busy ? (
        <Button label="Auf diesem Gerät einschalten" variant="secondary" onPress={() => toggleMaster(true)} />
      ) : null}
      <FieldGroup label="Wofür?">
        <View style={styles.list}>
          {CATEGORIES.map((c) => (
            <SwitchRow
              key={c.key}
              label={c.label}
              description={c.description}
              value={settings[c.key]}
              onValueChange={(on) => toggleCategory(c.key, on)}
            />
          ))}
        </View>
      </FieldGroup>
      <QuestionHint
        question="Auf welchen Geräten kommen sie an?"
        answer="Auf jedem Gerät, auf dem Du Push-Nachrichten hier eingeschaltet hast. Die Schalter darunter gelten für alle Deine Geräte."
      />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[12] },
  hint: { ...text.hint, color: color.text.secondary },
  error: { ...text.hint, color: color.accent.error },
});
