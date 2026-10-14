import { useLocalSearchParams } from 'expo-router';

import { NewReportScreen } from '@/features/reports/screens/NewReportScreen';

export default function NewReportRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = params.id;
  const reportId = Array.isArray(rawId) ? rawId[0] : rawId;

  return <NewReportScreen reportId={reportId} />;
}
