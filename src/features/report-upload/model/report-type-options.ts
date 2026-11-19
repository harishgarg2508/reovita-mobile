import type { Ionicons } from '@expo/vector-icons';

import type { ReportType } from '@entities/report';

export interface ReportTypeOption {
  value: ReportType;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// What the person can say they are uploading. Each one is stored in its own folder on the server.
export const REPORT_TYPE_OPTIONS: ReportTypeOption[] = [
  { value: 'blood_report', label: 'Blood report', hint: 'Lab results. Read, explained and added to your score.', icon: 'water-outline' },
  { value: 'prescription', label: 'Prescription', hint: 'A doctor’s note with medicines. Written out in plain words.', icon: 'medkit-outline' },
  { value: 'scan', label: 'Scan or imaging', hint: 'X-ray, MRI, CT or ultrasound report.', icon: 'scan-outline' },
  { value: 'other', label: 'Other', hint: 'Any other health document. You can name it.', icon: 'document-text-outline' },
];
