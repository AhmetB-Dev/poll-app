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

  protected readonly survey = computed<Survey | undefined>(() => this.getCurrentSurvey());

  protected toggleAnswer(question: Question, answerId: string, event: Event): void {
    const input = this.getInputElement(event);

    if (!input) {
      return;
    }

    this.selectedAnswers.update((currentAnswers) =>
      this.updateSelectedAnswers(currentAnswers, question, answerId, input.checked),
    );
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

    if (!survey || !this.hasAnsweredAllQuestions(survey)) {
      console.log('Please answer all questions.');
      return;
    }

    await this.saveVote(survey);
  }

  private getCurrentSurvey(): Survey | undefined {
    const surveyId = this.route.snapshot.paramMap.get('id');
    return surveyId ? this.surveyService.getSurveyById(surveyId) : undefined;
  }

  private getInputElement(event: Event): HTMLInputElement | null {
    return event.target instanceof HTMLInputElement ? event.target : null;
  }

  private updateSelectedAnswers(
    currentAnswers: Record<string, string[]>,
    question: Question,
    answerId: string,
    checked: boolean,
  ): Record<string, string[]> {
    if (!question.allowMultipleChoice) {
      return this.updateSingleChoiceAnswer(currentAnswers, question.id, answerId, checked);
    }

    return this.updateMultipleChoiceAnswer(currentAnswers, question.id, answerId, checked);
  }

  private updateSingleChoiceAnswer(
    currentAnswers: Record<string, string[]>,
    questionId: string,
    answerId: string,
    checked: boolean,
  ): Record<string, string[]> {
    return {
      ...currentAnswers,
      [questionId]: checked ? [answerId] : [],
    };
  }

  private updateMultipleChoiceAnswer(
    currentAnswers: Record<string, string[]>,
    questionId: string,
    answerId: string,
    checked: boolean,
  ): Record<string, string[]> {
    const selectedAnswerIds = currentAnswers[questionId] ?? [];
    const nextAnswers = this.toggleAnswerId(selectedAnswerIds, answerId, checked);

    return {
      ...currentAnswers,
      [questionId]: nextAnswers,
    };
  }

  private toggleAnswerId(
    selectedAnswerIds: string[],
    answerId: string,
    checked: boolean,
  ): string[] {
    if (checked) {
      return [...selectedAnswerIds, answerId];
    }

    return selectedAnswerIds.filter((selectedAnswerId) => selectedAnswerId !== answerId);
  }

  private hasAnsweredAllQuestions(survey: Survey): boolean {
    return survey.questions.every((question) => this.hasSelectedAnswer(question.id));
  }

  private hasSelectedAnswer(questionId: string): boolean {
    return (this.selectedAnswers()[questionId]?.length ?? 0) > 0;
  }

  private async saveVote(survey: Survey): Promise<void> {
    try {
      await this.voteService.submitVote(survey, this.selectedAnswers());
      await this.surveyService.loadSurveys();
      this.selectedAnswers.set({});
    } catch (error) {
      console.error('Vote could not be saved:', error);
    }
  }
}
