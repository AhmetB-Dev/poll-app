import { Injectable, inject, signal } from '@angular/core';

import { SupabaseService } from '../../../core/supabase/supabase.service';
import { Answer } from '../../../shared/models/answer.model';
import { Question } from '../../../shared/models/question.model';
import { Survey, SurveyStatus } from '../../../shared/models/survey.model';

/** Raw database row from the surveys table. */
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

/** Raw database row from the questions table. */
type QuestionRow = {
  id: string;
  survey_id: string;
  title: string;
  allow_multiple_choice: boolean;
  position: number;
};

/** Raw database row from the answers table. */
type AnswerRow = {
  id: string;
  question_id: string;
  text: string;
  position: number;
};

/** Read-only result row that combines answer ids with their current vote count. */
type AnswerResultRow = {
  answer_id: string;
  votes_count: number;
};

/**
 * Central data service for surveys.
 *
 * Responsibilities:
 * - loads surveys, questions, answers and result counts from Supabase
 * - maps database rows into nested Survey models used by the UI
 * - creates new surveys by inserting survey, question and answer rows
 * - exposes loaded surveys as a readonly Angular signal
 */
@Injectable({
  providedIn: 'root',
})
export class SurveyService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly surveys = signal<Survey[]>([]);

  /** Readonly survey state used by components. */
  readonly allSurveys = this.surveys.asReadonly();

  /** Loads initial survey data as soon as the service is created. */
  constructor() {
    void this.loadSurveys();
  }

  /** Fetches all survey-related data from Supabase and refreshes local state. */
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

  /** Returns one loaded survey by id, or undefined when it is not available locally. */
  getSurveyById(id: string): Survey | undefined {
    return this.surveys().find((survey) => survey.id === id);
  }

  /**
   * Persists a new survey with all its questions and answers.
   *
   * Important: These inserts are sequential frontend calls, not a database transaction.
   * For a production-level app, this should later become a Supabase RPC/Postgres function.
   */
  async createSurvey(survey: Survey): Promise<void> {
    await this.insertSurvey(survey);
    await this.insertQuestions(survey);
    await this.insertAnswers(survey);

    this.surveys.update((currentSurveys) => [survey, ...currentSurveys]);
  }

  /** Starts all read requests needed to build the nested survey view model. */
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

  /** Throws the first Supabase response error so calling code can stop safely. */
  private throwIfResponseError(...responses: Array<{ error: unknown }>): void {
    for (const response of responses) {
      if (response.error) {
        throw response.error;
      }
    }
  }

  /** Inserts the main survey row into the surveys table. */
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

  /** Inserts all question rows that belong to the survey. */
  private async insertQuestions(survey: Survey): Promise<void> {
    const { error } = await this.supabase.from('questions').insert(this.createQuestionRows(survey));

    this.throwIfError(error);
  }

  /** Inserts all answer rows for all questions in the survey. */
  private async insertAnswers(survey: Survey): Promise<void> {
    const { error } = await this.supabase.from('answers').insert(this.createAnswerRows(survey));

    this.throwIfError(error);
  }

  /** Throws a Supabase insert error when a write request failed. */
  private throwIfError(error: unknown): void {
    if (error) {
      throw error;
    }
  }

  /** Converts question models into database insert rows. */
  private createQuestionRows(survey: Survey) {
    return survey.questions.map((question, questionIndex) => ({
      id: question.id,
      survey_id: survey.id,
      title: question.title,
      allow_multiple_choice: question.allowMultipleChoice,
      position: questionIndex + 1,
    }));
  }

  /** Converts nested answer models into flat database insert rows. */
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

  /** Builds nested Survey models from flat database rows. */
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

  /** Creates a lookup map so vote counts can be assigned quickly to answers. */
  private createVotesByAnswerId(resultRows: AnswerResultRow[]): Map<string, number> {
    return new Map(resultRows.map((resultRow) => [resultRow.answer_id, resultRow.votes_count]));
  }

  /** Groups answer models by their question id. */
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

  /** Adds one mapped answer to the answers-by-question lookup map. */
  private addAnswerToQuestionMap(
    answersByQuestionId: Map<string, Answer[]>,
    answerRow: AnswerRow,
    votesByAnswerId: Map<string, number>,
  ): void {
    const answers = answersByQuestionId.get(answerRow.question_id) ?? [];

    answers.push(this.mapAnswerRow(answerRow, votesByAnswerId));
    answersByQuestionId.set(answerRow.question_id, answers);
  }

  /** Converts one answer database row into the app Answer model. */
  private mapAnswerRow(answerRow: AnswerRow, votesByAnswerId: Map<string, number>): Answer {
    return {
      id: answerRow.id,
      questionId: answerRow.question_id,
      text: answerRow.text,
      votesCount: votesByAnswerId.get(answerRow.id) ?? 0,
    };
  }

  /** Groups question models by their survey id. */
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

  /** Adds one mapped question to the questions-by-survey lookup map. */
  private addQuestionToSurveyMap(
    questionsBySurveyId: Map<string, Question[]>,
    questionRow: QuestionRow,
    answersByQuestionId: Map<string, Answer[]>,
  ): void {
    const questions = questionsBySurveyId.get(questionRow.survey_id) ?? [];

    questions.push(this.mapQuestionRow(questionRow, answersByQuestionId));
    questionsBySurveyId.set(questionRow.survey_id, questions);
  }

  /** Converts one question database row into the app Question model. */
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

  /** Converts one survey database row into the app Survey model. */
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
