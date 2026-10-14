import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Spacing } from '@/constants/theme';

export function SettingsScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="brand">Settings</AppText>
        <AppText variant="body" color="textSecondary">
          Account, branding, and preferences.
        </AppText>
      </View>
      <Card>
        <AppText variant="subtitle">Coming soon</AppText>
        <AppText variant="body" color="textSecondary" style={styles.copy}>
          Authentication, Pro branding, and subscription settings are intentionally out of scope for
          this first Home milestone.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  copy: {
    marginTop: Spacing.two,
  },
});
