import { Injectable, signal } from '@angular/core';

import { Survey } from '../../../shared/models/survey.model';

@Injectable({
  providedIn: 'root',
})
export class SurveyService {
  private readonly surveys = signal<Survey[]>(this.createDemoSurveys());

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

  private createDemoSurveys(): Survey[] {
    const now = new Date().toISOString();

    return [
      {
        id: 'fit-wellness-survey',
        title: 'Fit & wellness survey',
        description: 'Help us understand which wellness activities people would enjoy most.',
        category: 'health',
        createdAt: now,
        updatedAt: now,
        endsAt: this.dateInDays(2),
        questions: [
          {
            id: 'fit-question-1',
            surveyId: 'fit-wellness-survey',
            title: 'Which wellness activity would you prefer?',
            answers: [
              {
                id: 'fit-answer-1',
                questionId: 'fit-question-1',
                text: 'Yoga session',
                votesCount: 8,
              },
              {
                id: 'fit-answer-2',
                questionId: 'fit-question-1',
                text: 'Fitness challenge',
                votesCount: 5,
              },
            ],
          },
        ],
      },
      {
        id: 'team-event-survey',
        title: 'Let’s plan the next team event',
        description: 'Vote for the activity you would enjoy most at the next team event.',
        category: 'team-activities',
        createdAt: now,
        updatedAt: now,
        endsAt: this.dateInDays(3),
        questions: [
          {
            id: 'team-question-1',
            surveyId: 'team-event-survey',
            title: 'Which team event should we choose?',
            answers: [
              {
                id: 'team-answer-1',
                questionId: 'team-question-1',
                text: 'Outdoor event',
                votesCount: 12,
              },
              {
                id: 'team-answer-2',
                questionId: 'team-question-1',
                text: 'Dinner evening',
                votesCount: 9,
              },
            ],
          },
        ],
      },
      {
        id: 'favorite-game-genre',
        title: 'Favorite game genre',
        description: 'Tell us which game genre you enjoy playing the most.',
        category: 'gaming',
        createdAt: now,
        updatedAt: now,
        endsAt: this.dateInDays(4),
        questions: [
          {
            id: 'gaming-question-1',
            surveyId: 'favorite-game-genre',
            title: 'Which game genre is your favorite?',
            answers: [
              {
                id: 'gaming-answer-1',
                questionId: 'gaming-question-1',
                text: 'Action',
                votesCount: 7,
              },
              {
                id: 'gaming-answer-2',
                questionId: 'gaming-question-1',
                text: 'Strategy',
                votesCount: 11,
              },
            ],
          },
        ],
      },
    ];
  }

  private dateInDays(days: number): string {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }
}
