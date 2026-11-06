// Mirrors HomeResponseDto in reovita-service.
export interface HomeSummary {
  percent: number;
  banner: 'amber' | null;
  unlock_lines: string[];
  has_critical: boolean;
  critical_banner: boolean;
  health_score: string | null;
  briefing: string | null;
  recent_flags: unknown[];
}
