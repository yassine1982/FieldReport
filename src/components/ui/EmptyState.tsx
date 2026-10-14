import { StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Spacing } from '@/constants/theme';

type EmptyStateProps = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <Card style={styles.card}>
      <AppText variant="subtitle">{title}</AppText>
      <AppText variant="body" color="textSecondary" style={styles.message}>
        {message}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  message: {
    marginTop: Spacing.one,
  },
});
