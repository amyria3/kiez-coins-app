import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { Button } from '../../components/Button';
import { KaterBubble, Notice } from '../../components/Content';
import { SubScreen } from '../../components/Screen';
import {
  apkDownloadUrl,
  checkVersion,
  installedSince,
  installedVersionLabel,
  installUpdateAndRestart,
  type VersionState,
} from '../../data/appRelease';
import { formatDateLong } from '../../data/format';
import { t } from '../../data/texts';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `account/version` (Dein Konto › App-Version, Daria, 2026-11-10).
 * Zeigt die installierte Version und je nach Lage: „Du hast schon die neueste Version“,
 * einen Download der neuen APK (neuer nativer Teil) oder „Aktualisieren und neu starten“ (Code-Update).
 * Nutzt denselben Abgleich wie der Hinweis `UpdateHint`.
 */
export default function AppVersion() {
  const goBack = useGoBack();
  const [state, setState] = useState<VersionState | 'checking' | 'offline'>('checking');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const check = useCallback(async () => {
    setState('checking');
    setFailed(false);
    try {
      setState(await checkVersion());
    } catch {
      setState('offline');
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const download = async () => {
    setBusy(true);
    try {
      await Linking.openURL(await apkDownloadUrl());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const restart = async () => {
    setBusy(true);
    try {
      await installUpdateAndRestart();
    } catch {
      // Laden oder Neustart ging nicht: Knopf bleibt, die Person versucht es noch einmal
      setFailed(true);
      setBusy(false);
    }
  };

  const since = installedSince();
  const installed = since
    ? t('Du hast {version}, Stand vom {datum}.', { version: installedVersionLabel(), datum: formatDateLong(since.toISOString()) })
    : t('Du hast {version}.', { version: installedVersionLabel() });

  const message =
    state === 'checking'
      ? 'Ich schau mal nach, ob es was Neues gibt …'
      : state === 'offline'
        ? 'Ich komme gerade nicht ins Netz. Versuch es gleich noch einmal.'
        : state.kind === 'apk'
          ? t('Es gibt Version {latest}! Lade sie herunter und installiere sie über die alte. Deine Daten bleiben.', { latest: state.latest })
          : state.kind === 'update'
            ? 'Es gibt ein Update! Ich lade es und starte die App neu. Deine Daten bleiben.'
            : state.kind === 'web'
              ? 'Im Browser hast Du immer die neueste Version. Sie kommt beim Laden der Seite von selbst.'
              : state.kind === 'dev'
                ? 'Das ist eine Entwicklungs-Version. Updates gibt es hier nicht.'
                : 'Du hast schon die neueste Version.';

  const action =
    state === 'offline' ? (
      <Button label="Noch einmal prüfen" onPress={check} />
    ) : state !== 'checking' && state.kind === 'apk' ? (
      <Button label="Herunterladen" onPress={download} busy={busy} />
    ) : state !== 'checking' && state.kind === 'update' ? (
      <Button label="Aktualisieren und neu starten" onPress={restart} busy={busy} />
    ) : null;

  return (
    <SubScreen title="App-Version" navigation="back" onLeadingPress={goBack} actions={action}>
      <KaterBubble>{installed}</KaterBubble>
      <Notice message={message} />
      {failed ? <Notice variant="warning" message="Das hat nicht geklappt. Versuch es noch einmal." /> : null}
    </SubScreen>
  );
}
