// Manual readings the subject enters (spec section 5): blood pressure and weight.
export type MeasurementType = 'bp_sys' | 'bp_dia' | 'weight_kg';

export interface Measurement {
  id: string;
  type: MeasurementType;
  value: number;
  measured_at: string;
}

export interface CreateMeasurementInput {
  type: MeasurementType;
  value: number;
  measured_at?: string;
}
