import { useLocalSearchParams } from 'expo-router';

import { ReportAuditScreen } from '@features/report-upload';

export default function ReportAuditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReportAuditScreen reportId={String(id)} />;
}
