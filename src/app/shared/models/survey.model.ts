import { Question } from './question.model';

/** Allowed lifecycle states for a survey. */
export type SurveyStatus = 'draft' | 'active' | 'closed';

/**
 * Main survey model used by the Angular app.
 *
 * It is intentionally nested for the UI: a survey contains questions, and each
 * question contains its answer options.
 */
export interface Survey {
  /** Unique survey id. */
  id: string;

  /** Visible survey title. */
  title: string;

  /** Optional longer explanation shown below the title. */
  description?: string;

  /** Internal category value used for display and filtering. */
  category: string;

  /** Current lifecycle status of the survey. */
  status: SurveyStatus;

  /** Questions belonging to this survey. */
  questions: Question[];

  /** ISO timestamp when the survey was created. */
  createdAt: string;

  /** ISO timestamp when the survey was last updated. */
  updatedAt?: string;

  /** ISO timestamp when the survey ends, or null when it has no end date. */
  endsAt: string | null;
}
