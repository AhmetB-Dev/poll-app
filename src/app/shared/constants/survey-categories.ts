export const SURVEY_CATEGORIES = [
  { label: 'Team Activities', value: 'team-activities' },
  { label: 'Health & Wellness', value: 'health' },
  { label: 'Gaming & Entertainment', value: 'gaming' },
  { label: 'Education & Learning', value: 'education-learning' },
  { label: 'Lifestyle & Preferences', value: 'lifestyle-preferences' },
  { label: 'Technology & Innovation', value: 'technology-innovation' },
] as const;

export type SurveyCategoryValue = (typeof SURVEY_CATEGORIES)[number]['value'];
