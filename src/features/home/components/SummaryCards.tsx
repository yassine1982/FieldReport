import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SummaryCardsProps = {
  completed: number;
  completedThisMonth: number;
  drafts: number;
  onPressDrafts?: () => void;
};

export function SummaryCards({
  completed,
  completedThisMonth,
  drafts,
  onPressDrafts,
}: SummaryCardsProps) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <AppText variant="subtitle">Your activity</AppText>
        <View style={[styles.kicker, { backgroundColor: theme.surface }]}>
          <AppText variant="caption" color="textSecondary">
            This month
          </AppText>
        </View>
      </View>
      <View style={styles.row}>
        <Card style={styles.card}>
          <AppText variant="caption" color="textSecondary">
            Completed
          </AppText>
          <AppText style={styles.value}>{completed}</AppText>
          <AppText variant="caption" style={{ color: theme.success }}>
            +{completedThisMonth} this month
          </AppText>
        </Card>
        <Pressable
          accessibilityRole={onPressDrafts ? 'button' : undefined}
          accessibilityLabel={
            drafts === 1 ? 'Continue 1 draft report' : `Continue ${drafts} draft reports`
          }
          disabled={!onPressDrafts}
          onPress={onPressDrafts}
          style={styles.cardPress}>
          <Card style={styles.card}>
            <AppText variant="caption" color="textSecondary">
              Drafts
            </AppText>
            <AppText style={styles.value}>{drafts}</AppText>
            <AppText
              variant="caption"
              style={{ color: drafts > 0 ? theme.success : theme.textMuted }}>
              {drafts > 0 ? 'Continue a report' : 'No drafts right now'}
            </AppText>
          </Card>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  kicker: {
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  cardPress: {
    flex: 1,
  },
  card: {
    flex: 1,
    gap: Spacing.one,
    minHeight: 118,
  },
  value: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
});
