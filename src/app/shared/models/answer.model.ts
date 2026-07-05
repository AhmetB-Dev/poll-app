/**
 * Answer option for a survey question.
 *
 * Each answer belongs to exactly one question and stores the current vote count
 * used by the result display.
 */
export interface Answer {
  /** Unique answer id. */
  id: string;

  /** Id of the question this answer belongs to. */
  questionId: string;

  /** Visible answer text shown to the user. */
  text: string;

  /** Number of votes this answer has received. */
  votesCount: number;
}
