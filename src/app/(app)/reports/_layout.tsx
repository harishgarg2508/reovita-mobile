import { Stack } from 'expo-router';

// Reports stack: upload, manual entry, retake, and report detail. Headers are drawn by each screen.
export default function ReportsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }} />;
}
