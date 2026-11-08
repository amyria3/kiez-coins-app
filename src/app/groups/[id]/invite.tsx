import { useLocalSearchParams } from 'expo-router';

import { KaterCard } from '../../../components/Content';
import { GroupInvite } from '../../../components/GroupInvite';
import { SubScreen } from '../../../components/Screen';
import { useStore } from '../../../data/store';
import { useGoBack } from '../../../lib/goBack';

/**
 * Route `groups/[id]/invite`: „Freunde und Familie einladen“ aus dem leeren Gruppenfeed (Daria, 08.11.2026).
 * Instant-Einladung per QR-Code oder Einladung per Link und Passcode.
 */
export default function GroupInviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack();
  const { groups } = useStore();
  const group = groups.find((g) => g.id === id);

  return (
    <SubScreen title="Freunde und Familie einladen" subtitle={group?.name} navigation="back" onLeadingPress={goBack}>
      {group ? <GroupInvite group={group} /> : <KaterCard>Diese Gruppe gibt es nicht mehr, oder Du bist nicht mehr dabei.</KaterCard>}
    </SubScreen>
  );
}
