export type DietaryGoal = 'stay_healthy' | 'build_muscle' | 'lose_weight';
export type DietType = 'vegetarian' | 'eggetarian' | 'non_vegetarian' | 'vegan' | 'jain';

export interface DietaryOverview {
  age: number;
  height_cm: number;
  weight_kg: number;
  bmi: number;
  category: string;
  label: string;
  healthy_weight_kg: { min: number; max: number };
  suggested_goal: DietaryGoal;
  goals: { value: DietaryGoal; label: string; suggested: boolean; available: boolean; reason: string | null }[];
  diet_types: { value: DietType; label: string }[];
}

export interface MealSlot {
  slot: string;
  time: string;
  items: { food: string; portion: string }[];
  note: string;
}

export interface DietaryChart {
  summary: string;
  meal_plan: MealSlot[];
  eat_more: string[];
  limit: string[];
  habits: string[];
  improve: string[];
  weekly_tip: string;
  see_a_professional: string;
  bmi: number;
  bmi_band: string;
  bmi_label: string;
  healthy_weight_kg: { min: number; max: number };
  goal: DietaryGoal;
  diet_type: DietType;
  targets: { calories_min: number; calories_max: number; protein_g_min: number; protein_g_max: number; water_litres_min: number; water_litres_max: number };
  disclaimer: string;
}

export interface DietaryChartView {
  id: string;
  created_at: string;
  prompt_version: string;
  goal: DietaryGoal;
  diet_type: DietType;
  chart: DietaryChart;
}

// One line of the history list.
export interface DietaryChartListItem {
  id: string;
  created_at: string;
  goal: DietaryGoal;
  diet_type: DietType;
  bmi: number;
  bmi_category: string;
  calories_min: number | null;
  calories_max: number | null;
  summary: string;
}
