import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spacing } from '@/constants/theme';
import type { ReportSummary } from '@/types/report';
import { formatCalendarDate, formatRelativeDay, reportReference } from '@/utils/report-helpers';

type ReportListItemProps = {
  report: ReportSummary;
  dateStyle?: 'relative' | 'calendar';
  onPress?: (report: ReportSummary) => void;
};

export function ReportListItem({ report, dateStyle = 'calendar', onPress }: ReportListItemProps) {
  const when =
    dateStyle === 'relative'
      ? formatRelativeDay(report.interventionDate)
      : formatCalendarDate(report.interventionDate);
  const reference = reportReference(report.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${reference}, ${report.clientName}, ${report.status}`}
      onPress={() => onPress?.(report)}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <Card style={styles.item}>
        <View style={styles.top}>
          <AppText variant="caption" color="textMuted">
            {reference}
          </AppText>
          <StatusBadge status={report.status} />
        </View>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {report.clientName}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {report.equipmentName} · {when}
        </AppText>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    gap: Spacing.one,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.88,
  },
});
