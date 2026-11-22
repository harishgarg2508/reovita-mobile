export type FoodScanKind = 'meal' | 'fridge';

export interface MealItem {
  food: string;
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealScanResult {
  dish_name: string;
  confidence: 'low' | 'medium' | 'high';
  items: MealItem[];
  total: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  fit: 'light' | 'balanced' | 'heavy';
  fit_note: string;
  tips: string[];
  // How much of a day's calories this meal is, when the person's basics are saved.
  share_of_day_pct?: number;
  diet_type: string | null;
  goal: string | null;
  estimate_note: string;
  disclaimer: string;
}

export interface FridgeScanResult {
  ingredients: { name: string; note: string }[];
  meal_ideas: { name: string; uses: string[]; also_need: string[]; minutes: number | null; why: string }[];
  use_soon: string[];
  shopping_hints: string[];
  diet_type: string | null;
  goal: string | null;
  estimate_note: string;
  disclaimer: string;
}

export interface FoodScanView<R = MealScanResult | FridgeScanResult> {
  id: string;
  kind: FoodScanKind;
  created_at: string;
  prompt_version: string;
  // The photo that was scanned is kept with the answer (read with useFoodScanPhoto).
  has_photo: boolean;
  result: R;
}
