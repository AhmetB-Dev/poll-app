import { Answer } from './answer.model';

/**
 * One question inside a survey.
 *
 * A question can be single-choice or multiple-choice and contains at least two
 * answer options in the create-survey flow.
 */
export interface Question {
  /** Unique question id. */
  id: string;

  /** Id of the parent survey. */
  surveyId: string;

  /** Visible question title shown in the UI. */
  title: string;

  /** Allows selecting more than one answer when true. */
  allowMultipleChoice: boolean;

  /** Answer options belonging to this question. */
  answers: Answer[];
}
