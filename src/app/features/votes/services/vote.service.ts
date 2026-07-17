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

/** Database read shape for restoring one selected answer. */
type VoteSelectionRow = {
  question_id: string;
  answer_id: string;
};

/** Selected answer ids grouped by question id. */
type SelectedAnswers = Record<string, string[]>;

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
  private readonly pendingSurveyIds = new Set<string>();

  /** Returns whether this browser has already completed the selected survey. */
  hasVoted(surveyId: string): boolean {
    return localStorage.getItem(this.getCompletedSurveyStorageKey(surveyId)) !== null;
  }

  /** Restores the answers previously submitted by this browser. */
  async getSelectedAnswers(surveyId: string): Promise<SelectedAnswers> {
    const storedAnswers = this.readStoredSelectedAnswers(surveyId);

    if (storedAnswers) {
      return storedAnswers;
    }

    if (!this.hasVoted(surveyId)) {
      return {};
    }

    return this.loadSelectedAnswersFromDatabase(surveyId);
  }

  /**
   * Saves all selected answers for one survey.
   *
   * @param survey Survey that the user voted on.
   * @param selectedAnswers Map of question id to selected answer ids.
   */
  async submitVote(survey: Survey, selectedAnswers: SelectedAnswers): Promise<void> {
    if (this.hasVoted(survey.id)) {
      throw new Error('This survey has already been completed in this browser.');
    }

    if (this.pendingSurveyIds.has(survey.id)) {
      throw new Error('This vote is already being submitted.');
    }

    const voteRows = this.createVoteRows(survey, selectedAnswers);

    if (voteRows.length === 0) {
      return;
    }

    this.pendingSurveyIds.add(survey.id);

    try {
      const { error } = await this.supabase.from('votes').insert(voteRows);

      if (error) {
        throw error;
      }

      this.storeSelectedAnswers(survey.id, selectedAnswers);
    } finally {
      this.pendingSurveyIds.delete(survey.id);
    }
  }

  /** Creates the browser-storage key used to remember one completed survey. */
  private getCompletedSurveyStorageKey(surveyId: string): string {
    return `pollapp-completed-survey:${surveyId}`;
  }

  /** Reads and validates selected answers stored by a previous successful vote. */
  private readStoredSelectedAnswers(surveyId: string): SelectedAnswers | null {
    const storedValue = localStorage.getItem(this.getCompletedSurveyStorageKey(surveyId));

    if (!storedValue || storedValue === 'true') {
      return null;
    }

    try {
      const parsedValue: unknown = JSON.parse(storedValue);
      return this.isSelectedAnswers(parsedValue) ? parsedValue : null;
    } catch {
      return null;
    }
  }

  /** Stores the completed vote together with all selected answer ids. */
  private storeSelectedAnswers(surveyId: string, selectedAnswers: SelectedAnswers): void {
    localStorage.setItem(
      this.getCompletedSurveyStorageKey(surveyId),
      JSON.stringify(selectedAnswers),
    );
  }

  /** Loads selections created before answer ids were stored in the browser. */
  private async loadSelectedAnswersFromDatabase(surveyId: string): Promise<SelectedAnswers> {
    const voterKey = this.getVoterKey();
    const { data, error } = await this.supabase
      .from('votes')
      .select('question_id, answer_id')
      .eq('survey_id', surveyId)
      .eq('voter_key', voterKey);

    if (error) {
      console.error('Previously selected answers could not be loaded:', error);
      return {};
    }

    const voteRows = (data ?? []) as VoteSelectionRow[];
    const selectedAnswers = voteRows.reduce<SelectedAnswers>((answers, vote) => {
      const questionAnswers = answers[vote.question_id] ?? [];

      if (!questionAnswers.includes(vote.answer_id)) {
        answers[vote.question_id] = [...questionAnswers, vote.answer_id];
      }

      return answers;
    }, {});

    if (Object.keys(selectedAnswers).length > 0) {
      this.storeSelectedAnswers(surveyId, selectedAnswers);
    }

    return selectedAnswers;
  }

  /** Checks that a parsed browser value has the expected selected-answer structure. */
  private isSelectedAnswers(value: unknown): value is SelectedAnswers {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    return Object.values(value).every(
      (answerIds) =>
        Array.isArray(answerIds) && answerIds.every((answerId) => typeof answerId === 'string'),
    );
  }

  /** Creates all vote insert rows for the selected answers of one survey. */
  private createVoteRows(
    survey: Survey,
    selectedAnswers: SelectedAnswers,
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
