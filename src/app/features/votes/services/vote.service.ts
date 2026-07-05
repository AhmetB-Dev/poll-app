import { Injectable, inject } from '@angular/core';

import { SupabaseService } from '../../../core/supabase/supabase.service';
import { Survey } from '../../../shared/models/survey.model';

type VoteInsertRow = {
  survey_id: string;
  question_id: string;
  answer_id: string;
  voter_key: string;
};

@Injectable({
  providedIn: 'root',
})
export class VoteService {
  private readonly supabase = inject(SupabaseService).client;

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
