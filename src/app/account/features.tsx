import { useRouter } from 'expo-router';
import { FieldGroup, KaterBubble } from '../../components/Content';
import { FeatureSwitches } from '../../components/FeatureSwitches';
import { NavRow } from '../../components/Rows';
import { SubScreen } from '../../components/Screen';
import { useCrosspostEnabled } from '../../data/crosspost';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `account/features` (Dein Konto › Funktionen): Modi Privat, Gruppe und Kiez verbergen und einen
 * als Standard festlegen (Daria, 27.10.2026). Darunter die verbundenen Konten fürs Weiterposten (Daria, 09.11.2026).
 */
export default function FeaturesScreen() {
  const goBack = useGoBack();
  const router = useRouter();
  // Weiterposten: für alle erst nach Freigabe, für Moderatorinnen schon zum Testen (Daria, 05.11.2026)
  const crosspost = useCrosspostEnabled();
  return (
    <SubScreen title="Funktionen" navigation="back" onLeadingPress={goBack}>
      <KaterBubble>Verbirg, was Du gerade nicht brauchst. Mit dem Schalter holst Du es Dir zurück, wann Du willst.</KaterBubble>
      <FeatureSwitches />
      {crosspost ? (
        <FieldGroup label="Weiterposten">
          <NavRow label="Verbundene Konten" value="BlueSky, Mastodon" onPress={() => router.push('/account/weiterposten')} />
        </FieldGroup>
      ) : null}
    </SubScreen>
  );
}
