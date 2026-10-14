import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { useReports } from '@/context/ReportsContext';
import { RecentReportsList } from '@/features/home/components/RecentReportsList';
import { SummaryCards } from '@/features/home/components/SummaryCards';
import { WelcomeHeader } from '@/features/home/components/WelcomeHeader';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function HomeScreen() {
  const theme = useTheme();
  const { recentSummaries, stats, loading, error, refresh } = useReports();

  return (
    <Screen>
      <WelcomeHeader />
      <SummaryCards stats={stats} />
      <View style={styles.cta}>
        <Button label="New Report" onPress={() => router.push('/report/new')} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : null}

      {!loading && error ? (
        <>
          <EmptyState title="Couldn’t load reports" message={error} />
          <Button label="Try again" variant="secondary" onPress={() => void refresh()} />
        </>
      ) : null}

      {!loading && !error && recentSummaries.length === 0 ? (
        <EmptyState
          title="No reports yet"
          message="Tap New Report to create your first intervention report."
        />
      ) : null}

      {!loading && recentSummaries.length > 0 ? (
        <RecentReportsList
          reports={recentSummaries}
          onPressReport={(report) => router.push(`/report/${report.id}`)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cta: {
    marginTop: -Spacing.one,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
});
