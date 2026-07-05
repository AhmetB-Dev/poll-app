/**
 * Central list of selectable survey categories.
 *
 * The label is shown in the UI. The value is stored in the survey data and used
 * for filtering, so value changes can affect existing database rows.
 */
export const SURVEY_CATEGORIES = [
  { label: 'Team Activities', value: 'team-activities' },
  { label: 'Health & Wellness', value: 'health' },
  { label: 'Gaming & Entertainment', value: 'gaming' },
  { label: 'Education & Learning', value: 'education-learning' },
  { label: 'Lifestyle & Preferences', value: 'lifestyle-preferences' },
  { label: 'Technology & Innovation', value: 'technology-innovation' },
] as const;

/** Union type of all valid category values from SURVEY_CATEGORIES. */
export type SurveyCategoryValue = (typeof SURVEY_CATEGORIES)[number]['value'];
