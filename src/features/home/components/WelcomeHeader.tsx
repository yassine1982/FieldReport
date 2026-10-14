import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function WelcomeHeader() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.logoMark, { backgroundColor: theme.primary }]}>
        <AppText variant="subtitle" color="primaryContrast" style={styles.logoLetter}>
          FR
        </AppText>
      </View>
      <View style={styles.copy}>
        <AppText variant="brand">FieldReport</AppText>
        <AppText variant="body" color="textSecondary">
          Create professional intervention reports in minutes.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontWeight: '700',
  },
  copy: {
    flex: 1,
    gap: Spacing.one,
  },
});
