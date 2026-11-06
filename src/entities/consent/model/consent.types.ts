// Mirrors ConsentResponseDto and GrantConsentDto in reovita-service.
export type ConsentType = 'health_data' | 'llm_processing' | 'location' | 'notifications' | 'food_image';

export interface Consent {
  id: string;
  type: ConsentType;
  version: string;
  granted_at: string;
  revoked_at: string | null;
  active: boolean;
  is_current_version: boolean;
}
