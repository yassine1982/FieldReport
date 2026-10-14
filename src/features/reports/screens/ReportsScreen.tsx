import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { useReports } from '@/context/ReportsContext';
import { ReportListItem } from '@/features/reports/components/ReportListItem';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ReportsScreen() {
  const theme = useTheme();
  const { summaries, loading, error, refresh } = useReports();

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="brand">Reports</AppText>
        <AppText variant="body" color="textSecondary">
          Drafts and completed intervention reports on this device.
        </AppText>
      </View>

      <Button label="New Report" onPress={() => router.push('/report/new')} />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
          <AppText variant="body" color="textSecondary">
            Loading reports…
          </AppText>
        </View>
      ) : null}

      {!loading && error ? (
        <EmptyState title="Couldn’t load reports" message={error} />
      ) : null}

      {!loading && !error && summaries.length === 0 ? (
        <EmptyState
          title="No reports yet"
          message="Create your first intervention report to see it listed here."
        />
      ) : null}

      {!loading && summaries.length > 0 ? (
        <View style={styles.list}>
          {summaries.map((report) => (
            <ReportListItem
              key={report.id}
              report={report}
              onPress={(item) => router.push(`/report/${item.id}`)}
            />
          ))}
        </View>
      ) : null}

      {!loading && error ? (
        <Button label="Try again" variant="secondary" onPress={() => void refresh()} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  loading: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  list: {
    gap: Spacing.three,
  },
});
