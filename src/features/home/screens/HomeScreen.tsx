import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { useReports } from '@/context/ReportsContext';
import { RecentReportsList } from '@/features/home/components/RecentReportsList';
import { SummaryCards } from '@/features/home/components/SummaryCards';
import { WelcomeHeader } from '@/features/home/components/WelcomeHeader';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { countCompletedThisMonth } from '@/utils/report-helpers';

export function HomeScreen() {
  const theme = useTheme();
  const { reports, recentSummaries, stats, loading, error, refresh } = useReports();
  const newestDraft = reports.find((report) => report.status === 'draft');

  return (
    <Screen>
      <WelcomeHeader />

      <Card style={[styles.hero, { backgroundColor: theme.backgroundElement, shadowOpacity: 0, elevation: 0 }]}>
        <AppText variant="title">Ready for your next job?</AppText>
        <AppText variant="body" color="textSecondary">
          Create a clear, professional report in minutes.
        </AppText>
        <Button label="+ New report" onPress={() => router.push('/report/new')} />
      </Card>

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

      {!loading && !error ? (
        <SummaryCards
          completed={stats.completed}
          completedThisMonth={countCompletedThisMonth(reports)}
          drafts={stats.drafts}
          onPressDrafts={
            newestDraft
              ? () => router.push({ pathname: '/report/new', params: { id: newestDraft.id } })
              : undefined
          }
        />
      ) : null}

      {!loading && !error && recentSummaries.length === 0 ? (
        <EmptyState
          title="No reports yet"
          message="Tap New report to create your first intervention report."
        />
      ) : null}

      {!loading && recentSummaries.length > 0 ? (
        <RecentReportsList
          reports={recentSummaries.slice(0, 2)}
          onPressReport={(report) => router.push(`/report/${report.id}`)}
          onSeeAll={() => router.push('/reports')}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: Spacing.three,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
});
