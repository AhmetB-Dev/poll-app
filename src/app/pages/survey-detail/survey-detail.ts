import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { SurveyService } from '../../features/surveys/services/survey.service';
import { VoteService } from '../../features/votes/services/vote.service';
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
  private readonly voteService = inject(VoteService);

  protected readonly selectedAnswers = signal<Record<string, string[]>>({});

  protected resultsPopupOpen = true;

  protected readonly survey = computed<Survey | undefined>(() => {
    const surveyId = this.route.snapshot.paramMap.get('id');

    if (!surveyId) {
      return undefined;
    }

    return this.surveyService.getSurveyById(surveyId);
  });

  protected toggleAnswer(question: Question, answerId: string, event: Event): void {
    const input = event.target;

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.selectedAnswers.update((currentAnswers) => {
      const selectedAnswerIds = currentAnswers[question.id] ?? [];

      if (!question.allowMultipleChoice) {
        return {
          ...currentAnswers,
          [question.id]: input.checked ? [answerId] : [],
        };
      }

      return {
        ...currentAnswers,
        [question.id]: input.checked
          ? [...selectedAnswerIds, answerId]
          : selectedAnswerIds.filter((selectedAnswerId) => selectedAnswerId !== answerId),
      };
    });
  }

  protected isSelected(questionId: string, answerId: string): boolean {
    return this.selectedAnswers()[questionId]?.includes(answerId) ?? false;
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

  protected get resultsIconSrc(): string {
    if (this.resultsPopupOpen) {
      return '/assets/icons/arrow_drop_down_dark.svg';
    }

    return '/assets/icons/arrow_drop_up_dark.svg';
  }

  protected toggleResultsPopup(): void {
    this.resultsPopupOpen = !this.resultsPopupOpen;
  }

  protected closeResultsPopup(): void {
    this.resultsPopupOpen = false;
  }

  protected answerOptionLabel(answerIndex: number): string {
    let label = '';
    let currentIndex = answerIndex;

    do {
      label = String.fromCharCode(65 + (currentIndex % 26)) + label;
      currentIndex = Math.floor(currentIndex / 26) - 1;
    } while (currentIndex >= 0);

    return label;
  }

  protected async submitVote(): Promise<void> {
    const survey = this.survey();

    if (!survey) {
      return;
    }

    const allQuestionsAnswered = survey.questions.every(
      (question) => (this.selectedAnswers()[question.id]?.length ?? 0) > 0,
    );

    if (!allQuestionsAnswered) {
      console.log('Please answer all questions.');
      return;
    }

    try {
      await this.voteService.submitVote(survey, this.selectedAnswers());
      await this.surveyService.loadSurveys();
      this.selectedAnswers.set({});
    } catch (error) {
      console.error('Vote could not be saved:', error);
    }
  }
}
