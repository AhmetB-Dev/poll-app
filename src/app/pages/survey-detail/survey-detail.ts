import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { SurveyService } from '../../features/surveys/services/survey.service';
import { Question } from '../../shared/models/question.model';
import { Survey } from '../../shared/models/survey.model';

@Component({
  selector: 'app-survey-detail',
  imports: [RouterLink],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly surveyService = inject(SurveyService);

  protected readonly selectedAnswers = signal<Record<string, string>>({});

  protected readonly survey = computed<Survey | undefined>(() => {
    const surveyId = this.route.snapshot.paramMap.get('id');

    if (!surveyId) {
      return undefined;
    }

    return this.surveyService.getSurveyById(surveyId);
  });

  protected selectAnswer(questionId: string, answerId: string): void {
    this.selectedAnswers.update((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: answerId,
    }));
  }

  protected isSelected(questionId: string, answerId: string): boolean {
    return this.selectedAnswers()[questionId] === answerId;
  }

  protected totalVotes(question: Question): number {
    return question.answers.reduce((total, answer) => total + answer.votesCount, 0);
  }

  protected percentage(question: Question, votesCount: number): number {
    const total = this.totalVotes(question);

    if (total === 0) {
      return 0;
    }

    return Math.round((votesCount / total) * 100);
  }

  protected submitVote(): void {
    const survey = this.survey();

    if (!survey) {
      return;
    }

    const allQuestionsAnswered = survey.questions.every(
      (question) => this.selectedAnswers()[question.id],
    );

    if (!allQuestionsAnswered) {
      console.log('Please answer all questions.');
      return;
    }

    this.surveyService.vote(survey.id, this.selectedAnswers());

    console.log('Vote saved:', this.selectedAnswers());

    this.selectedAnswers.set({});
  }
}
