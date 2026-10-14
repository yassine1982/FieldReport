import { useLocalSearchParams } from 'expo-router';

import { ReportDetailScreen } from '@/features/reports/screens/ReportDetailScreen';

export default function ReportDetailRoute() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const reportId = Array.isArray(params.id) ? params.id[0] : params.id;

  return <ReportDetailScreen reportId={reportId ?? ''} />;
}
