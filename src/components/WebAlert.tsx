import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View, type AlertButton } from 'react-native';

import { color, radius, space, text } from '../theme/tokens';
import { Button } from './Button';

// Im Browser ist `Alert.alert` von react-native-web leer: Rückfragen wie „Challenge löschen?“ erscheinen dort nicht.
// WebAlertHost ersetzt `Alert.alert` in der Web-App durch einen eigenen Dialog im Stil der App.
// Die Screens rufen weiter `Alert.alert` auf, auf iOS und Android ändert sich nichts.

type Dialog = { title: string; message?: string; buttons: AlertButton[]; cancelable: boolean };

let show: ((dialog: Dialog) => void) | undefined;
const queue: Dialog[] = [];

if (Platform.OS === 'web') {
  Alert.alert = (title, message, buttons, options) => {
    const dialog: Dialog = {
      title,
      message: message ?? undefined,
      buttons: buttons?.length ? buttons : [{ text: 'OK' }],
      cancelable: options?.cancelable ?? true,
    };
    if (show) show(dialog);
    else queue.push(dialog);
  };
}

/** Einmal im Root-Layout einbinden. Rendert nur im Browser etwas. */
export function WebAlertHost() {
  const [dialogs, setDialogs] = useState<Dialog[]>([]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    show = (dialog) => setDialogs((current) => [...current, dialog]);
    if (queue.length) setDialogs(queue.splice(0));
    return () => {
      show = undefined;
    };
  }, []);

  const dialog = dialogs[0];
  if (!dialog) return null;

  function close(button?: AlertButton) {
    setDialogs((current) => current.slice(1));
    button?.onPress?.();
  }

  const cancel = dialog.buttons.find((b) => b.style === 'cancel');
  // Hauptaktion oben, „Abbrechen“ immer zuletzt
  const ordered = [...dialog.buttons.filter((b) => b.style !== 'cancel'), ...(cancel ? [cancel] : [])];
  const single = ordered.length === 1;

  return (
    <View style={styles.backdrop} accessibilityViewIsModal>
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityLabel="Schließen"
        onPress={() => dialog.cancelable && cancel && close(cancel)}
      />
      <View style={styles.card} accessibilityRole="alert">
        <Text style={[text.title, styles.title]}>{dialog.title}</Text>
        {dialog.message ? <Text style={[text.body, styles.message]}>{dialog.message}</Text> : null}
        <View style={styles.buttons}>
          {ordered.map((button, i) => (
            <Button
              key={`${button.text}-${i}`}
              label={button.text ?? 'OK'}
              onPress={() => close(button)}
              variant={
                button.style === 'destructive'
                  ? 'danger'
                  : button.style === 'cancel'
                    ? 'ghost'
                    : single || i === 0
                      ? 'primary'
                      : 'secondary'
              }
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[24],
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: color.bg.surface,
    borderRadius: radius.card,
    padding: space[24],
    gap: space[8],
  },
  title: { color: color.text.primary },
  message: { color: color.text.secondary },
  buttons: { marginTop: space[16], gap: space[8] },
});
