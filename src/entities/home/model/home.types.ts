// Mirrors HomeResponseDto in reovita-service.
export interface HomeReportSummary {
  id: string;
  created_at: string;
}

export interface HomeSummary {
  percent: number;
  banner: 'amber' | null;
  unlock_lines: string[];
  has_critical: boolean;
  critical_banner: boolean;
  critical_report_id: string | null;
  health_score: string | null;
  health_score_parts: { lifestyle: number | null; conditions: number | null; reports: number | null } | null;
  briefing: string | null;
  reports_count: number;
  recent_reports: HomeReportSummary[];
  /** Deprecated on the server. Use recent_reports. */
  recent_flags: unknown[];
}
