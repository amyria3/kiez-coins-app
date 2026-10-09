import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space, text } from '../theme/tokens';
import { ActionBar } from './ActionBar';
import { Cat, type CatMood } from './icons/Brand';
import { NavigationBar } from './NavigationBar';

type SubScreenProps = {
  title: string;
  subtitle?: string;
  navigation: 'back' | 'close';
  onLeadingPress: () => void;
  /** Buttons für die ActionBar */
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Aufbau aller Unterseiten aus Figma: NavigationBar (fest), Inhalt in `scroll-y-auto`
 * (Abstand 16, unten 24) und ActionBar (fest, bleibt über der Tastatur).
 */
export function SubScreen({ title, subtitle, navigation, onLeadingPress, actions, children }: SubScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <NavigationBar title={title} subtitle={subtitle} variant={navigation} onLeadingPress={onLeadingPress} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {children}
        </ScrollView>
        {actions ? <ActionBar>{actions}</ActionBar> : <View style={{ height: insets.bottom }} />}
      </KeyboardAvoidingView>
    </View>
  );
}

type ResultScreenProps = {
  mood?: CatMood;
  badge?: ReactNode;
  title: string;
  message: string;
  actions: ReactNode;
};

/** Erfolgs-Screens (`…/success`): Kater, Status, Titel und Text mittig, Buttons unten. */
export function ResultScreen({ mood = 'default', badge, title, message, actions }: ResultScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.resultContent}>
        <Cat mood={mood} height={86} />
        {badge}
        <Text style={styles.resultTitle} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.resultMessage}>{message}</Text>
      </ScrollView>
      <ActionBar>{actions}</ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg.screen },
  flex: { flex: 1 },
  content: {
    paddingTop: space[16],
    paddingHorizontal: space[16],
    paddingBottom: space[24],
    gap: space[16],
  },
  resultContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: space[32],
    paddingHorizontal: space[24],
    gap: space[16],
  },
  resultTitle: { ...text.title, color: color.text.primary, textAlign: 'center' },
  resultMessage: { ...text.body, color: color.text.secondary, textAlign: 'center' },
});
