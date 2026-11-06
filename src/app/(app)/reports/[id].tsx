import { useLocalSearchParams } from 'expo-router';

import { ReportReviewScreen } from '@features/report-confirm';

export default function ReportRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReportReviewScreen reportId={id} />;
}
