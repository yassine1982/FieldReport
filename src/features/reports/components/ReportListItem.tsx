import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spacing, TouchTarget } from '@/constants/theme';
import type { ReportSummary } from '@/types/report';
import { formatDisplayDate } from '@/utils/report-helpers';

type ReportListItemProps = {
  report: ReportSummary;
  onPress?: (report: ReportSummary) => void;
};

export function ReportListItem({ report, onPress }: ReportListItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${report.clientName}, ${report.status}`}
      onPress={() => onPress?.(report)}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <Card style={styles.item}>
        <View style={styles.top}>
          <View style={styles.copy}>
            <AppText variant="bodyMedium" numberOfLines={1}>
              {report.clientName}
            </AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {report.equipmentName}
            </AppText>
          </View>
          <StatusBadge status={report.status} />
        </View>
        <View style={styles.meta}>
          <AppText variant="caption" color="textMuted" numberOfLines={1} style={styles.preview}>
            {report.status === 'draft'
              ? report.problemPreview || 'Draft — tap to resume'
              : report.problemPreview || 'No problem description'}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {formatDisplayDate(report.interventionDate)}
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    gap: Spacing.three,
    minHeight: TouchTarget.min,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  preview: {
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
