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
    const [surveysResponse, questionsResponse, answersResponse, resultsResponse] =
      await Promise.all([
        this.supabase
          .from('surveys')
          .select('id, title, description, category, status, created_at, updated_at, ends_at')
          .order('created_at', { ascending: false }),

        this.supabase
          .from('questions')
          .select('id, survey_id, title, allow_multiple_choice, position')
          .order('position', { ascending: true }),

        this.supabase
          .from('answers')
          .select('id, question_id, text, position')
          .order('position', { ascending: true }),

        this.supabase.from('answer_results').select('answer_id, votes_count'),
      ]);

    if (surveysResponse.error) {
      throw surveysResponse.error;
    }

    if (questionsResponse.error) {
      throw questionsResponse.error;
    }

    if (answersResponse.error) {
      throw answersResponse.error;
    }

    if (resultsResponse.error) {
      throw resultsResponse.error;
    }

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
    const { error: surveyError } = await this.supabase.from('surveys').insert({
      id: survey.id,
      title: survey.title,
      description: survey.description ?? null,
      category: survey.category,
      status: survey.status,
      ends_at: survey.endsAt,
    });

    if (surveyError) {
      throw surveyError;
    }

    const questionRows = survey.questions.map((question, questionIndex) => ({
      id: question.id,
      survey_id: survey.id,
      title: question.title,
      allow_multiple_choice: question.allowMultipleChoice,
      position: questionIndex + 1,
    }));

    const { error: questionsError } = await this.supabase.from('questions').insert(questionRows);

    if (questionsError) {
      throw questionsError;
    }

    const answerRows = survey.questions.flatMap((question) =>
      question.answers.map((answer, answerIndex) => ({
        id: answer.id,
        question_id: question.id,
        text: answer.text,
        position: answerIndex + 1,
      })),
    );

    const { error: answersError } = await this.supabase.from('answers').insert(answerRows);

    if (answersError) {
      throw answersError;
    }

    this.surveys.update((currentSurveys) => [survey, ...currentSurveys]);
  }

  private mapSurveyRows(
    surveyRows: SurveyRow[],
    questionRows: QuestionRow[],
    answerRows: AnswerRow[],
    resultRows: AnswerResultRow[],
  ): Survey[] {
    const votesByAnswerId = new Map(
      resultRows.map((resultRow) => [resultRow.answer_id, resultRow.votes_count]),
    );

    const answersByQuestionId = new Map<string, Answer[]>();

    for (const answerRow of answerRows) {
      const answers = answersByQuestionId.get(answerRow.question_id) ?? [];

      answers.push({
        id: answerRow.id,
        questionId: answerRow.question_id,
        text: answerRow.text,
        votesCount: votesByAnswerId.get(answerRow.id) ?? 0,
      });

      answersByQuestionId.set(answerRow.question_id, answers);
    }

    const questionsBySurveyId = new Map<string, Question[]>();

    for (const questionRow of questionRows) {
      const questions = questionsBySurveyId.get(questionRow.survey_id) ?? [];

      questions.push({
        id: questionRow.id,
        surveyId: questionRow.survey_id,
        title: questionRow.title,
        allowMultipleChoice: questionRow.allow_multiple_choice,
        answers: answersByQuestionId.get(questionRow.id) ?? [],
      });

      questionsBySurveyId.set(questionRow.survey_id, questions);
    }

    return surveyRows.map((surveyRow) => ({
      id: surveyRow.id,
      title: surveyRow.title,
      description: surveyRow.description ?? undefined,
      category: surveyRow.category,
      status: surveyRow.status,
      createdAt: surveyRow.created_at,
      updatedAt: surveyRow.updated_at,
      endsAt: surveyRow.ends_at,
      questions: questionsBySurveyId.get(surveyRow.id) ?? [],
    }));
  }
}
