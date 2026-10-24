import { GenderChoice } from '../../components/GenderChoice';
import { SubScreen } from '../../components/Screen';
import { useStore } from '../../data/store';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `account/geschlecht` (Dein Konto › Grammatisches Geschlecht, Daria 24.10.2026).
 * Die Wahl gilt sofort für Texte an Dich und, sobald gespeichert, für Texte anderer über Dich.
 */
export default function Geschlecht() {
  const goBack = useGoBack();
  const { profile, dispatch } = useStore();
  return (
    <SubScreen title="Grammatisches Geschlecht" navigation="back" onLeadingPress={goBack}>
      <GenderChoice value={profile.gender ?? 'person'} onChange={(gender) => dispatch({ type: 'updateProfile', patch: { gender } })} />
    </SubScreen>
  );
}
