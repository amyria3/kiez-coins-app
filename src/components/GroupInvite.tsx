import { StyleSheet } from 'react-native';

import { Button } from './Button';
import { FieldGroup } from './Content';
import { CopyField } from './Form';
import { InviteQr } from './InviteQr';
import { Text } from './T';
import { inviteLink, inviteMessage, MAX_MEMBERS } from '../data/groups';
import type { Group } from '../data/types';
import { t } from '../data/texts';
import { shareText } from '../lib/share';
import { color, text } from '../theme/tokens';

/**
 * Gruppeneinladung in zwei Wegen (Daria, 08.11.2026): Instant-Einladung (QR-Code) zum Scannen vor Ort, darunter Link und Passcode
 * zum Verschicken. Steht auf der Gruppenseite und auf `groups/[id]/invite` (Knopf „Freunde und Familie einladen“ im leeren Gruppenfeed).
 */
export function GroupInvite({ group }: { group: Group }) {
  if (group.members.length >= MAX_MEMBERS) {
    return <Text style={styles.meta}>{t('Die Gruppe ist voll. Mehr als {MAX_MEMBERS} Mitglieder geht nicht.', { MAX_MEMBERS })}</Text>;
  }
  const link = inviteLink(group.inviteCode);
  return (
    <>
      <FieldGroup label="Instant-Einladung">
        <Text style={styles.meta}>Wer den Code mit der Kamera scannt, kommt direkt zum Beitreten.</Text>
        <InviteQr value={link} label={t('Instant-Einladung zum Scannen')} />
      </FieldGroup>
      <FieldGroup label="Einladung per Link und Passcode">
        <CopyField label="Einladungslink" value={link} />
        <CopyField label="Passcode" value={group.inviteCode} />
        <Button label="Einladung teilen" variant="secondary" icon="friends" onPress={() => shareText(inviteMessage(group))} />
      </FieldGroup>
    </>
  );
}

const styles = StyleSheet.create({
  meta: { ...text.caption, color: color.text.secondary },
});
