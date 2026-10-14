import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { deleteUnreferencedPhotoFiles } from '@/services/photo-storage';
import { loadReports, upsertReport } from '@/services/reports-storage';
import type { Report, ReportStats, ReportSummary } from '@/types/report';
import {
  getReportStats,
  photoUris,
  sortReportsNewestFirst,
  toReportSummary,
} from '@/utils/report-helpers';

type ReportsContextValue = {
  reports: Report[];
  summaries: ReportSummary[];
  recentSummaries: ReportSummary[];
  stats: ReportStats;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveReport: (report: Report) => Promise<Report>;
  getReport: (id: string) => Report | undefined;
};

const ReportsContext = createContext<ReportsContextValue | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const stored = await loadReports();
        if (cancelled) {
          return;
        }
        setReports(sortReportsNewestFirst(stored));
        setError(null);
      } catch {
        if (cancelled) {
          return;
        }
        setError('Unable to load saved reports.');
        setReports([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stored = await loadReports();
      setReports(sortReportsNewestFirst(stored));
    } catch {
      setError('Unable to load saved reports.');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveReport = useCallback(
    async (report: Report) => {
      const previous = reports.find((item) => item.id === report.id);
      const next = await upsertReport(report);
      if (previous) {
        const removedUris = photoUris(previous.photos ?? []).filter(
          (uri) => !photoUris(report.photos ?? []).includes(uri),
        );
        try {
          await deleteUnreferencedPhotoFiles(removedUris, next);
        } catch {
          // Metadata save already succeeded; orphan cleanup is best-effort.
        }
      }
      const sorted = sortReportsNewestFirst(next);
      setReports(sorted);
      return report;
    },
    [reports],
  );

  const getReport = useCallback(
    (id: string) => reports.find((report) => report.id === id),
    [reports],
  );

  const value = useMemo<ReportsContextValue>(() => {
    const summaries = reports.map(toReportSummary);
    return {
      reports,
      summaries,
      recentSummaries: summaries.slice(0, 5),
      stats: getReportStats(reports),
      loading,
      error,
      refresh,
      saveReport,
      getReport,
    };
  }, [reports, loading, error, refresh, saveReport, getReport]);

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports(): ReportsContextValue {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error('useReports must be used within ReportsProvider');
  }
  return context;
}
