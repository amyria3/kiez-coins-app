import { KaterBubble } from '../../components/Content';
import { FeatureSwitches } from '../../components/FeatureSwitches';
import { SubScreen } from '../../components/Screen';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `account/funktionen` (Dein Konto › Funktionen): Modi Privat, Gruppe und Kiez verbergen und einen
 * als Standard festlegen (Daria, 27.10.2026).
 */
export default function FeaturesScreen() {
  const goBack = useGoBack();
  return (
    <SubScreen title="Funktionen" navigation="back" onLeadingPress={goBack}>
      <KaterBubble>Verbirg, was Du gerade nicht brauchst. Mit dem Auge holst Du es Dir zurück, wann Du willst.</KaterBubble>
      <FeatureSwitches />
    </SubScreen>
  );
}
