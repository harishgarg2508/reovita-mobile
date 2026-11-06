// Mirrors ObservationDto, InterpretationDto and ConfirmReportResponseDto in reovita-service.
export type ObservationStatus = 'Normal' | 'Watch' | 'High' | 'Low' | 'Critical';

export interface Observation {
  id?: string;
  biomarker_code: string;
  name_raw: string;
  value_num: number;
  value_qualifier?: string | null;
  unit: string;
  ref_low?: number | null;
  ref_high?: number | null;
  status: ObservationStatus;
  confidence: number;
  source: 'ocr' | 'user_edit' | 'manual';
  collected_on?: string;
}

export interface InterpretationOutput {
  summary?: string;
  explanations?: unknown[];
  action_points?: string[];
}

export interface Interpretation {
  model: string;
  degraded: boolean;
  kb_version: string;
  output_json: InterpretationOutput;
}

export interface ConfirmReportResult {
  percent: number;
  next_step: string;
  observations: Observation[];
  interpretation: Interpretation;
}
