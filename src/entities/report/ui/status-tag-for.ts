import type { HealthStatus } from '@shared/ui/theme/tokens';

import type { ObservationStatus } from '../model/report.types';

// Maps the backend status to the three-colour health system.
export function healthStatusOf(status: ObservationStatus): HealthStatus {
  if (status === 'Normal') return 'normal';
  if (status === 'Critical') return 'critical';
  return 'watch';
}
