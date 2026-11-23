import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { Notice } from '../../../components/Content';
import { SubScreen } from '../../../components/Screen';
import { CardActions } from '../../../components/showcase/CardActions';
import { DigitalCard } from '../../../components/showcase/DigitalCard';
import { Text } from '../../../components/T';
import { cardOrigin } from '../../../data/cardActions.mjs';
import {
  acceptsFriends,
  follow,
  loadShowcase,
  requestShowcaseFriend,
  type Showcase,
  type ShowcaseAccess,
  type ShowcaseFriendResult,
} from '../../../data/showcase';
import { countShowcaseVisit } from '../../../data/showcaseCard';
import { useStore } from '../../../data/store';
import { t } from '../../../data/texts';
import { useGoBack } from '../../../lib/goBack';
import { color, space, text } from '../../../theme/tokens';

/**
 * Route `schaufenster/[id]/visitenkarte`: die Digitale Visitenkarte in der App (2026-11-23). Oben dieselbe Vorschau
 * wie in der Linkvorschau der Messenger, darunter die Weiterleitungsoptionen (components/showcase/CardActions.tsx,
 * Regel in data/cardActions.mjs).
 * - Team: weitergeben (Teilen, Link kopieren, QR-Code, Mail) und Kontakte von Hand eintragen.
 * - Mitglieder: Kontakt speichern, Kontakt schicken oder tauschen (Name und Mail aus dem Profil), folgen, anfreunden.
 * `?von=schaufenster` heißt: aus dem Schaufenster gekommen, dann führt der letzte Knopf dorthin zurück.
 * Die Druckbare Visitenkarte hat ihren eigenen Bildschirm (`schaufenster/[id]/druck`).
 */
export default function ShowcaseBusinessCard() {
  const { id, von } = useLocalSearchParams<{ id: string; von?: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const { currentUserId } = useStore();
  const [data, setData] = useState<{ showcase: Showcase; access: ShowcaseAccess } | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [friendable, setFriendable] = useState(false);
  const [friendResult, setFriendResult] = useState<ShowcaseFriendResult | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  const reload = useCallback(() => {
    loadShowcase(id, currentUserId).then(setData, () => setData(null));
  }, [id, currentUserId]);
  useFocusEffect(reload);

  useEffect(() => {
    if (!currentUserId || !id) return;
    acceptsFriends(id).then(setFriendable, () => setFriendable(false));
  }, [currentUserId, id]);

  // Aufruf der Digitalen Visitenkarte zählt einmal pro Öffnen; das Team zählt bei sich nicht mit (prüft die Datenbank)
  const counted = useRef(false);
  useEffect(() => {
    if (!data || counted.current || data.access.team) return;
    counted.current = true;
    countShowcaseVisit(data.showcase.slug, 'card');
  }, [data]);

  if (data === undefined) {
    return (
      <SubScreen title="Digitale Visitenkarte" navigation="back" onLeadingPress={goBack}>
        <ActivityIndicator color={color.text.secondary} />
      </SubScreen>
    );
  }
  const shareable = !!data && data.showcase.visibility === 'public' && data.showcase.switches.online;
  if (!data || !shareable) {
    return (
      <SubScreen title="Digitale Visitenkarte" navigation="back" onLeadingPress={goBack}>
        <Notice
          message={
            data?.access.team
              ? 'Die Digitale Visitenkarte gibt es, sobald Dein Schaufenster öffentlich und online ist. Öffentlich wird es auf der Seite „Schaufenster“ mit dem Schalter „Für alle sichtbar, auch im Web“.'
              : 'Zu diesem Schaufenster gibt es gerade keine Digitale Visitenkarte.'
          }
        />
      </SubScreen>
    );
  }

  const { showcase: s, access } = data;
  const team = access.team;
  const origin = team ? 'manage' : cardOrigin({ von });

  const toggleFollow = async () => {
    setBusy(true);
    const ok = await follow(s.id, true);
    setBusy(false);
    if (ok) setNotice({ ok: true, message: t('Du folgst jetzt {name}.', { name: s.name }) });
    reload();
  };
  const befriend = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await requestShowcaseFriend(s.id);
      setFriendResult(result);
      if (result === 'sent') setNotice({ ok: true, message: t('Deine Freundschaftsanfrage an {name} ist unterwegs.', { name: s.name }) });
      if (result === 'friends') setNotice({ ok: true, message: t('Du bist jetzt mit {name} befreundet.', { name: s.name }) });
    } catch (error) {
      setNotice({ ok: false, message: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const toShowcase = () => {
    if (origin === 'showcase' && router.canGoBack()) router.back();
    else router.push({ pathname: '/schaufenster/[id]', params: { id: s.id } });
  };

  return (
    <SubScreen title="Digitale Visitenkarte" navigation="back" onLeadingPress={goBack}>
      <View style={styles.page}>
        <DigitalCard showcase={s} />
        {team ? (
          <Text style={styles.body}>
            {t('So sieht Eure Digitale Visitenkarte aus. Ändern kannst Du die Angaben unter „Inhalte bearbeiten“.')}
          </Text>
        ) : null}
        {notice ? <Notice variant={notice.ok ? undefined : 'warning'} message={notice.message} onClose={() => setNotice(null)} /> : null}
        <CardActions
          showcase={s}
          viewer={team ? 'team' : 'member'}
          origin={origin}
          following={access.following}
          canBefriend={friendable && !access.founder && friendResult === null}
          busy={busy}
          onFollow={toggleFollow}
          onBefriend={befriend}
          onShowcase={toShowcase}
        />
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[24] },
  body: { ...text.body, color: color.text.primary },
});
