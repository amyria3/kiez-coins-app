import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { KaterBubble } from '../../components/Content';
import { NavRow } from '../../components/Rows';
import { SubScreen } from '../../components/Screen';
import { useAuth } from '../../data/auth';
import { space } from '../../theme/tokens';
import { useGoBack } from '../../lib/goBack';

/** Route `account/credentials` (Push aus „Dein Konto“): Zugangsdaten, also E-Mail und Passwort. */
export default function Credentials() {
  const router = useRouter();
  const goBack = useGoBack();
  const { session, hasPassword } = useAuth();

  return (
    <SubScreen title="Zugangsdaten" navigation="back" onLeadingPress={goBack}>
      <KaterBubble>
        {hasPassword
          ? 'Hier änderst Du Deine Adresse oder Dein Passwort. Den Code per Mail kannst Du immer nutzen.'
          : 'Du meldest Dich per Code an. Leg ein Passwort fest, dann geht es auch ohne Mail.'}
      </KaterBubble>
      <View style={styles.list}>
        <NavRow label="E-Mail" value={session?.user.email ?? 'Nicht angemeldet'} onPress={() => router.push('/account/email')} />
        <NavRow
          label={hasPassword ? 'Passwort ändern' : 'Passwort hinterlegen'}
          value={hasPassword ? 'Hinterlegt' : 'Noch keins'}
          onPress={() => router.push('/account/password')}
        />
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[8] },
});
