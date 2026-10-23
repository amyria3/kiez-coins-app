
import { SwitchRow } from '../../components/Form';
import { SubScreen } from '../../components/Screen';
import { useStore } from '../../data/store';
import { useGoBack } from '../../lib/goBack';

/** Route `settings/notifications` (Push aus „Dein Konto“): Push-Nachrichten an- und abschalten. */
export default function Notifications() {
  const goBack = useGoBack();
  const { profile, dispatch } = useStore();
  return (
    <SubScreen title="Benachrichtigungen" navigation="back" onLeadingPress={goBack}>
      <SwitchRow
        label="Push-Nachrichten"
        description="Kommentare, Antworten und Bestätigungen"
        value={profile.push}
        onValueChange={(push) => dispatch({ type: 'updateProfile', patch: { push } })}
      />
    </SubScreen>
  );
}
