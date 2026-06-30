import { Injectable, signal } from '@angular/core';

import { Survey } from '../../../shared/models/survey.model';

@Injectable({
  providedIn: 'root',
})
export class SurveyService {
  private readonly surveys = signal<Survey[]>([]);

  readonly allSurveys = this.surveys.asReadonly();

  createSurvey(survey: Survey): void {
    this.surveys.update((currentSurveys) => [survey, ...currentSurveys]);
  }

  getSurveyById(id: string): Survey | undefined {
    return this.surveys().find((survey) => survey.id === id);
  }

  vote(surveyId: string, selectedAnswers: Record<string, string>): void {
    this.surveys.update((currentSurveys) =>
      currentSurveys.map((survey) => {
        if (survey.id !== surveyId) {
          return survey;
        }

        return {
          ...survey,
          questions: survey.questions.map((question) => {
            const selectedAnswerId = selectedAnswers[question.id];

            return {
              ...question,
              answers: question.answers.map((answer) => {
                if (answer.id !== selectedAnswerId) {
                  return answer;
                }

                return {
                  ...answer,
                  votesCount: answer.votesCount + 1,
                };
              }),
            };
          }),
        };
      }),
    );
  }
}
