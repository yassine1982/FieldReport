import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ReportListItem } from '@/features/reports/components/ReportListItem';
import { Spacing } from '@/constants/theme';
import type { ReportSummary } from '@/types/report';

type RecentReportsListProps = {
  reports: ReportSummary[];
  onPressReport?: (report: ReportSummary) => void;
};

export function RecentReportsList({ reports, onPressReport }: RecentReportsListProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText variant="subtitle">Recent reports</AppText>
      </View>
      <View style={styles.list}>
        {reports.map((report) => (
          <ReportListItem key={report.id} report={report} onPress={onPressReport} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {
    gap: Spacing.three,
  },
});
