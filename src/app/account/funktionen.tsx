import { KaterBubble } from '../../components/Content';
import { FeatureSwitches } from '../../components/FeatureSwitches';
import { SubScreen } from '../../components/Screen';
import { useGoBack } from '../../lib/goBack';

/**
 * Route `account/funktionen` (Dein Konto › Funktionen): Bild, We-Challenge und Gruppen
 * an- und abschalten (Daria, 24.10.2026). Abschalten blendet das Erstellen aus, der Feed bleibt gleich.
 */
export default function FeaturesScreen() {
  const goBack = useGoBack();
  return (
    <SubScreen title="Funktionen" navigation="back" onLeadingPress={goBack}>
      <KaterBubble>Schalte nur an, was Du gerade brauchst. Den Rest holst Du Dir dazu, wann Du willst.</KaterBubble>
      <FeatureSwitches />
    </SubScreen>
  );
}
