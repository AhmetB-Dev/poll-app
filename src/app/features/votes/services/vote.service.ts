import { Injectable, inject } from '@angular/core';

import { SupabaseService } from '../../../core/supabase/supabase.service';
import { Survey } from '../../../shared/models/survey.model';

/** Database insert shape for one selected answer vote. */
type VoteInsertRow = {
  survey_id: string;
  question_id: string;
  answer_id: string;
  voter_key: string;
};

/**
 * Handles vote persistence.
 *
 * Responsibilities:
 * - converts selected answer ids into database rows
 * - stores a browser-local voter key
 * - inserts vote rows into Supabase
 */
@Injectable({
  providedIn: 'root',
})
export class VoteService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Saves all selected answers for one survey.
   *
   * @param survey Survey that the user voted on.
   * @param selectedAnswers Map of question id to selected answer ids.
   */
  async submitVote(survey: Survey, selectedAnswers: Record<string, string[]>): Promise<void> {
    const voteRows = this.createVoteRows(survey, selectedAnswers);

    if (voteRows.length === 0) {
      return;
    }

    const { error } = await this.supabase.from('votes').insert(voteRows);

    if (error) {
      throw error;
    }
  }

  /** Creates all vote insert rows for the selected answers of one survey. */
  private createVoteRows(
    survey: Survey,
    selectedAnswers: Record<string, string[]>,
  ): VoteInsertRow[] {
    const voterKey = this.getVoterKey();

    return survey.questions.flatMap((question) =>
      this.createQuestionVoteRows(
        survey.id,
        question.id,
        selectedAnswers[question.id] ?? [],
        voterKey,
      ),
    );
  }

  /** Creates vote rows for all selected answers of one question. */
  private createQuestionVoteRows(
    surveyId: string,
    questionId: string,
    answerIds: string[],
    voterKey: string,
  ): VoteInsertRow[] {
    return answerIds.map((answerId) => ({
      survey_id: surveyId,
      question_id: questionId,
      answer_id: answerId,
      voter_key: voterKey,
    }));
  }

  /**
   * Returns a stable browser-local voter id.
   *
   * This is not real authentication. It only helps identify repeated votes from the
   * same browser and should not be treated as secure user identity.
   */
  private getVoterKey(): string {
    const storageKey = 'pollapp-voter-key';
    const existingKey = localStorage.getItem(storageKey);

    if (existingKey) {
      return existingKey;
    }

    const newKey = crypto.randomUUID();
    localStorage.setItem(storageKey, newKey);

    return newKey;
  }
}
