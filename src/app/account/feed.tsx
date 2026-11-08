import { SubScreen } from '../../components/Screen';
import { FieldGroup, KaterBubble } from '../../components/Content';
import { SwitchRow } from '../../components/Form';
import { setFeedHide, useFeedHide } from '../../data/features';
import { useStore } from '../../data/store';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `account/feed` (Dein Konto › Einstellungen › Feed, Daria, 08.11.2026): Bilder und Textposts in Kiez und Überall
 * ausblenden. Challenges bleiben immer sichtbar, eigene Beiträge auch. Gespeichert auf dem Gerät, pro Konto.
 */
export default function FeedSettings() {
  const goBack = useGoBack();
  const { currentUserId } = useStore();
  const hide = useFeedHide();
  const set = (kind: 'photo' | 'text', show: boolean) => {
    if (currentUserId) setFeedHide(currentUserId, kind, !show);
  };
  return (
    <SubScreen title="Feed" navigation="back" onLeadingPress={goBack}>
      <KaterBubble>Du willst nur Challenges sehen? Hier blendest Du Bilder und Textposts aus. Deine eigenen siehst Du weiter.</KaterBubble>
      <FieldGroup label="In Kiez und Überall zeigen">
        <SwitchRow label="Bilder" description="Posts mit Fotos, ohne Challenge" value={!hide.photo} onValueChange={(v) => set('photo', v)} />
        <SwitchRow label="Textposts" description="Posts nur mit Text" value={!hide.text} onValueChange={(v) => set('text', v)} />
      </FieldGroup>
    </SubScreen>
  );
}
