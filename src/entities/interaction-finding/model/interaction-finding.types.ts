export type InteractionStatus = 'dataset_not_loaded' | 'medicines_not_mapped' | 'no_findings' | 'findings';

export interface InteractionFinding {
  severity: string;
  medication_a: string;
  medication_b: string;
  mechanism: string;
  source_record_id: string | null;
}

// GET /v1/interactions. The status says exactly what was checked; the app never infers "safe" from an empty list.
export interface InteractionCheck {
  status: InteractionStatus;
  message: string;
  findings: InteractionFinding[];
  unmatched_medications: string[];
  disclaimer: string;
}
