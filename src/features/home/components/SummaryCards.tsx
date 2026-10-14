import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ReportStats } from '@/types/report';

type SummaryCardsProps = {
  stats: ReportStats;
};

type SummaryItem = {
  key: keyof ReportStats;
  label: string;
  value: number;
  accent: 'primary' | 'warning' | 'success';
};

export function SummaryCards({ stats }: SummaryCardsProps) {
  const theme = useTheme();

  const items: SummaryItem[] = [
    { key: 'total', label: 'Total reports', value: stats.total, accent: 'primary' },
    { key: 'drafts', label: 'Drafts', value: stats.drafts, accent: 'warning' },
    { key: 'completed', label: 'Completed', value: stats.completed, accent: 'success' },
  ];

  return (
    <View style={styles.row}>
      {items.map((item) => {
        const accentColor =
          item.accent === 'primary'
            ? theme.primary
            : item.accent === 'warning'
              ? theme.warning
              : theme.success;
        const accentBackground =
          item.accent === 'primary'
            ? theme.backgroundElement
            : item.accent === 'warning'
              ? theme.warningLight
              : theme.successLight;

        return (
          <Card key={item.key} style={[styles.card, { backgroundColor: accentBackground }]} padded>
            <View style={[styles.dot, { backgroundColor: accentColor }]} />
            <AppText variant="title" style={{ color: accentColor }}>
              {item.value}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {item.label}
            </AppText>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  card: {
    flex: 1,
    gap: Spacing.one,
    minHeight: 96,
    shadowOpacity: 0,
    elevation: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radii.full,
    marginBottom: Spacing.one,
  },
});
