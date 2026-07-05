import { Injectable, inject, signal } from '@angular/core';

import { SupabaseService } from '../../../core/supabase/supabase.service';
import { Answer } from '../../../shared/models/answer.model';
import { Question } from '../../../shared/models/question.model';
import { Survey, SurveyStatus } from '../../../shared/models/survey.model';

type SurveyRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: SurveyStatus;
  created_at: string;
  updated_at: string;
  ends_at: string | null;
};

type QuestionRow = {
  id: string;
  survey_id: string;
  title: string;
  allow_multiple_choice: boolean;
  position: number;
};

type AnswerRow = {
  id: string;
  question_id: string;
  text: string;
  position: number;
};

type AnswerResultRow = {
  answer_id: string;
  votes_count: number;
};

@Injectable({
  providedIn: 'root',
})
export class SurveyService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly surveys = signal<Survey[]>([]);

  readonly allSurveys = this.surveys.asReadonly();

  constructor() {
    void this.loadSurveys();
  }

  async loadSurveys(): Promise<void> {
    const responses = await this.fetchSurveyData();
    this.throwIfResponseError(...responses);

    const [surveysResponse, questionsResponse, answersResponse, resultsResponse] = responses;

    this.surveys.set(
      this.mapSurveyRows(
        surveysResponse.data ?? [],
        questionsResponse.data ?? [],
        answersResponse.data ?? [],
        resultsResponse.data ?? [],
      ),
    );
  }

  getSurveyById(id: string): Survey | undefined {
    return this.surveys().find((survey) => survey.id === id);
  }

  async createSurvey(survey: Survey): Promise<void> {
    await this.insertSurvey(survey);
    await this.insertQuestions(survey);
    await this.insertAnswers(survey);

    this.surveys.update((currentSurveys) => [survey, ...currentSurveys]);
  }

  private fetchSurveyData() {
    return Promise.all([
      this.supabase
        .from('surveys')
        .select('id, title, description, category, status, created_at, updated_at, ends_at')
        .order('created_at', { ascending: false }),
      this.supabase
        .from('questions')
        .select('id, survey_id, title, allow_multiple_choice, position')
        .order('position', { ascending: true }),
      this.supabase.from('answers').select('id, question_id, text, position').order('position'),
      this.supabase.from('answer_results').select('answer_id, votes_count'),
    ]);
  }

  private throwIfResponseError(...responses: Array<{ error: unknown }>): void {
    for (const response of responses) {
      if (response.error) {
        throw response.error;
      }
    }
  }

  private async insertSurvey(survey: Survey): Promise<void> {
    const { error } = await this.supabase.from('surveys').insert({
      id: survey.id,
      title: survey.title,
      description: survey.description ?? null,
      category: survey.category,
      status: survey.status,
      ends_at: survey.endsAt,
    });

    this.throwIfError(error);
  }

  private async insertQuestions(survey: Survey): Promise<void> {
    const { error } = await this.supabase.from('questions').insert(this.createQuestionRows(survey));

    this.throwIfError(error);
  }

  private async insertAnswers(survey: Survey): Promise<void> {
    const { error } = await this.supabase.from('answers').insert(this.createAnswerRows(survey));

    this.throwIfError(error);
  }

  private throwIfError(error: unknown): void {
    if (error) {
      throw error;
    }
  }

  private createQuestionRows(survey: Survey) {
    return survey.questions.map((question, questionIndex) => ({
      id: question.id,
      survey_id: survey.id,
      title: question.title,
      allow_multiple_choice: question.allowMultipleChoice,
      position: questionIndex + 1,
    }));
  }

  private createAnswerRows(survey: Survey) {
    return survey.questions.flatMap((question) =>
      question.answers.map((answer, answerIndex) => ({
        id: answer.id,
        question_id: question.id,
        text: answer.text,
        position: answerIndex + 1,
      })),
    );
  }

  private mapSurveyRows(
    surveyRows: SurveyRow[],
    questionRows: QuestionRow[],
    answerRows: AnswerRow[],
    resultRows: AnswerResultRow[],
  ): Survey[] {
    const votesByAnswerId = this.createVotesByAnswerId(resultRows);
    const answersByQuestionId = this.groupAnswersByQuestionId(answerRows, votesByAnswerId);
    const questionsBySurveyId = this.groupQuestionsBySurveyId(questionRows, answersByQuestionId);

    return surveyRows.map((surveyRow) => this.mapSurveyRow(surveyRow, questionsBySurveyId));
  }

  private createVotesByAnswerId(resultRows: AnswerResultRow[]): Map<string, number> {
    return new Map(resultRows.map((resultRow) => [resultRow.answer_id, resultRow.votes_count]));
  }

  private groupAnswersByQuestionId(
    answerRows: AnswerRow[],
    votesByAnswerId: Map<string, number>,
  ): Map<string, Answer[]> {
    const answersByQuestionId = new Map<string, Answer[]>();

    for (const answerRow of answerRows) {
      this.addAnswerToQuestionMap(answersByQuestionId, answerRow, votesByAnswerId);
    }

    return answersByQuestionId;
  }

  private addAnswerToQuestionMap(
    answersByQuestionId: Map<string, Answer[]>,
    answerRow: AnswerRow,
    votesByAnswerId: Map<string, number>,
  ): void {
    const answers = answersByQuestionId.get(answerRow.question_id) ?? [];

    answers.push(this.mapAnswerRow(answerRow, votesByAnswerId));
    answersByQuestionId.set(answerRow.question_id, answers);
  }

  private mapAnswerRow(answerRow: AnswerRow, votesByAnswerId: Map<string, number>): Answer {
    return {
      id: answerRow.id,
      questionId: answerRow.question_id,
      text: answerRow.text,
      votesCount: votesByAnswerId.get(answerRow.id) ?? 0,
    };
  }

  private groupQuestionsBySurveyId(
    questionRows: QuestionRow[],
    answersByQuestionId: Map<string, Answer[]>,
  ): Map<string, Question[]> {
    const questionsBySurveyId = new Map<string, Question[]>();

    for (const questionRow of questionRows) {
      this.addQuestionToSurveyMap(questionsBySurveyId, questionRow, answersByQuestionId);
    }

    return questionsBySurveyId;
  }

  private addQuestionToSurveyMap(
    questionsBySurveyId: Map<string, Question[]>,
    questionRow: QuestionRow,
    answersByQuestionId: Map<string, Answer[]>,
  ): void {
    const questions = questionsBySurveyId.get(questionRow.survey_id) ?? [];

    questions.push(this.mapQuestionRow(questionRow, answersByQuestionId));
    questionsBySurveyId.set(questionRow.survey_id, questions);
  }

  private mapQuestionRow(
    questionRow: QuestionRow,
    answersByQuestionId: Map<string, Answer[]>,
  ): Question {
    return {
      id: questionRow.id,
      surveyId: questionRow.survey_id,
      title: questionRow.title,
      allowMultipleChoice: questionRow.allow_multiple_choice,
      answers: answersByQuestionId.get(questionRow.id) ?? [],
    };
  }

  private mapSurveyRow(surveyRow: SurveyRow, questionsBySurveyId: Map<string, Question[]>): Survey {
    return {
      id: surveyRow.id,
      title: surveyRow.title,
      description: surveyRow.description ?? undefined,
      category: surveyRow.category,
      status: surveyRow.status,
      createdAt: surveyRow.created_at,
      updatedAt: surveyRow.updated_at,
      endsAt: surveyRow.ends_at,
      questions: questionsBySurveyId.get(surveyRow.id) ?? [],
    };
  }
}
