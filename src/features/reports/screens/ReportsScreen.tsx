import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Radii, Spacing } from '@/constants/theme';
import { useReports } from '@/context/ReportsContext';
import { ReportListItem } from '@/features/reports/components/ReportListItem';
import { useTheme } from '@/hooks/use-theme';
import type { ReportStatus } from '@/types/report';
import { reportReference } from '@/utils/report-helpers';

type ReportFilter = 'all' | ReportStatus;

const FILTERS: { id: ReportFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'draft', label: 'Drafts' },
];

export function ReportsScreen() {
  const theme = useTheme();
  const { summaries, loading, error, refresh } = useReports();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ReportFilter>('all');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return summaries.filter((report) => {
      if (filter !== 'all' && report.status !== filter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const haystack = [
        report.clientName,
        report.equipmentName,
        report.problemPreview,
        reportReference(report.id),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [summaries, query, filter]);

  const countLabel = visible.length === 1 ? '1 report' : `${visible.length} reports`;

  return (
    <Screen>
      <View style={styles.header}>
        <AppText style={styles.title}>Reports</AppText>
        <AppText variant="body" color="textSecondary">
          All your interventions, in one place.
        </AppText>
      </View>

      <View style={[styles.search, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
        <AppText color="textMuted">⌕</AppText>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by client or reference"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel="Search by client or reference"
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <View style={styles.filters}>
        {FILTERS.map((item) => {
          const selected = filter === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setFilter(item.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.backgroundElement : theme.surface,
                  borderColor: selected ? theme.backgroundElement : theme.border,
                },
              ]}>
              <AppText variant="bodyMedium" color={selected ? 'primary' : 'textSecondary'}>
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
          <AppText variant="body" color="textSecondary">
            Loading reports…
          </AppText>
        </View>
      ) : null}

      {!loading && error ? <EmptyState title="Couldn’t load reports" message={error} /> : null}

      {!loading && !error && summaries.length === 0 ? (
        <EmptyState
          title="No reports yet"
          message="Create your first intervention report from Home."
        />
      ) : null}

      {!loading && !error && summaries.length > 0 && visible.length === 0 ? (
        <EmptyState title="No matching reports" message="Try another name, reference, or filter." />
      ) : null}

      {!loading && visible.length > 0 ? (
        <View style={styles.list}>
          <View style={styles.listHeading}>
            <AppText variant="subtitle">Recent</AppText>
            <View style={[styles.count, { backgroundColor: theme.surface }]}>
              <AppText variant="caption" color="textSecondary">
                {countLabel}
              </AppText>
            </View>
          </View>
          {visible.map((report) => (
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

      {!loading && !error && summaries.length === 0 ? (
        <Button label="+ New report" onPress={() => router.push('/report/new')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  search: {
    minHeight: 52,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: Spacing.three,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 40,
    borderRadius: Radii.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  list: {
    gap: Spacing.three,
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  count: {
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
