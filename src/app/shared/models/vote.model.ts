/**
 * Vote model representing one selected answer for one question.
 *
 * Multiple-choice questions can create multiple vote rows because every selected
 * answer is stored as its own vote entry.
 */
export interface Vote {
  /** Unique vote id. */
  id: string;

  /** Id of the voted survey. */
  surveyId: string;

  /** Id of the answered question. */
  questionId: string;

  /** Id of the selected answer. */
  answerId: string;

  /** ISO timestamp when the vote was created. */
  createdAt: string;
}
