import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Spacing } from '@/constants/theme';

export function ClientsScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="brand">Clients</AppText>
        <AppText variant="body" color="textSecondary">
          Manage client and site information for your jobs.
        </AppText>
      </View>
      <Card>
        <AppText variant="subtitle">Coming soon</AppText>
        <AppText variant="body" color="textSecondary" style={styles.copy}>
          Client profiles and equipment history are planned for a later MVP milestone.
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
