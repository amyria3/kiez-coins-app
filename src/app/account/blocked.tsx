import { BlockedList } from '../../components/BlockedList';
import { SubScreen } from '../../components/Screen';
import { useGoBack } from '../../lib/goBack';

/** Route `account/blocked` (Push aus „Dein Konto“): blockierte Personen, Blockierung aufheben. Auch als Reiter „Gesperrt“ in den Kontakten. */
export default function BlockedUsers() {
  const goBack = useGoBack();
  return (
    <SubScreen title="Blockierte Personen" navigation="back" onLeadingPress={goBack}>
      <BlockedList />
    </SubScreen>
  );
}
