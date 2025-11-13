import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AppScreen, AppText } from '@/components/ui';
import { spacing } from '@/theme';

export default function ModalScreen() {
  return (
    <AppScreen style={styles.container}>
      <AppText variant="h2">This is a modal</AppText>
      <Link href="/" dismissTo style={styles.link}>
        <AppText variant="body" color="accent">Go to home screen</AppText>
      </Link>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  link: {
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
  },
});
