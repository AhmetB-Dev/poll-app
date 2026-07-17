import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { SurveyService } from '../../features/surveys/services/survey.service';
import { VoteService } from '../../features/votes/services/vote.service';
import { Question } from '../../shared/models/question.model';
import { Survey } from '../../shared/models/survey.model';

/**
 * Survey detail page for answering one survey and viewing live results.
 *
 * Responsibilities:
 * - reads the survey id from the current route
 * - keeps selected answers in local signal state
 * - supports single-choice and multiple-choice questions
 * - calculates result percentages for the UI
 * - submits votes through VoteService and reloads survey results
 */
@Component({
  selector: 'app-survey-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './survey-detail.html',
  styleUrls: ['./survey-detail.scss', './survey-detail-responsive.scss'],
})
export class SurveyDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly surveyService = inject(SurveyService);
  private readonly voteService = inject(VoteService);

  /** Stores selected answer ids by question id. */
  protected readonly selectedAnswers = signal<Record<string, string[]>>({});

  /** Prevents repeated clicks while the current vote request is running. */
  protected readonly isSubmittingVote = signal(false);

  /** Controls required-answer messages after the user tries to submit. */
  protected readonly showVoteErrors = signal(false);

  /** Remembers whether this browser has already completed the current survey. */
  protected readonly hasVoted = signal(this.hasCompletedCurrentSurvey());

  /** Controls whether the result popup is expanded. */
  protected resultsPopupOpen = true;


  /** Current survey resolved from the route id and the locally loaded survey list. */
  protected readonly survey = computed<Survey | undefined>(() => this.getCurrentSurvey());

  /** Restores the submitted selections whenever this survey page is opened again. */
  ngOnInit(): void {
    void this.restoreSelectedAnswers();
  }

  /**
   * Toggles the selected answer for a question based on the clicked input element.
   */
  protected toggleAnswer(question: Question, answerId: string, event: Event): void {
    if (this.hasVoted() || this.isSubmittingVote()) {
      return;
    }

    const input = this.getInputElement(event);

    if (!input) {
      return;
    }

    this.selectedAnswers.update((currentAnswers) =>
      this.updateSelectedAnswers(currentAnswers, question, answerId, input.checked),
    );
  }

  /** Checks whether a specific answer is currently selected in the UI. */
  protected isSelected(questionId: string, answerId: string): boolean {
    return this.selectedAnswers()[questionId]?.includes(answerId) ?? false;
  }

  /** Calculates the total vote count for all answers of one question. */
  protected totalVotes(question: Question): number {
    return question.answers.reduce((total, answer) => total + answer.votesCount, 0);
  }

  /** Calculates the rounded percentage value for one answer result bar. */
  protected percentage(question: Question, votesCount: number): number {
    const total = this.totalVotes(question);

    if (total === 0) {
      return 0;
    }

    return Math.round((votesCount / total) * 100);
  }

  /** Opens or closes the result popup. */
  protected toggleResultsPopup(): void {
    this.resultsPopupOpen = !this.resultsPopupOpen;
  }

  /** Closes the result popup when it is currently open. */
  protected closeResultsPopup(): void {
    if (!this.resultsPopupOpen) {
      return;
    }

    this.resultsPopupOpen = false;
  }

  /**
   * Converts a zero-based answer index into labels like A, B, C, ... AA, AB.
   */
  protected answerOptionLabel(answerIndex: number): string {
    let label = '';
    let currentIndex = answerIndex;

    do {
      label = String.fromCharCode(65 + (currentIndex % 26)) + label;
      currentIndex = Math.floor(currentIndex / 26) - 1;
    } while (currentIndex >= 0);

    return label;
  }

  /** Validates that every question has an answer and then submits the vote. */
  protected async submitVote(): Promise<void> {
    const survey = this.survey();

    if (!survey || this.hasVoted() || this.isSubmittingVote()) {
      return;
    }

    this.showVoteErrors.set(true);

    if (!this.hasAnsweredAllQuestions(survey)) {
      return;
    }

    this.isSubmittingVote.set(true);

    try {
      await this.saveVote(survey);
    } finally {
      this.isSubmittingVote.set(false);
    }
  }

  /** Returns whether one unanswered question should display its required message. */
  protected showRequiredAnswer(questionId: string): boolean {
    return this.showVoteErrors() && !this.hasSelectedAnswer(questionId);
  }

  /** Reads the stored completion state for the survey id in the current route. */
  private hasCompletedCurrentSurvey(): boolean {
    const surveyId = this.route.snapshot.paramMap.get('id');
    return surveyId ? this.voteService.hasVoted(surveyId) : false;
  }

  /** Loads the answers saved for a completed survey back into the checkbox state. */
  private async restoreSelectedAnswers(): Promise<void> {
    const surveyId = this.route.snapshot.paramMap.get('id');

    if (!surveyId || !this.hasVoted()) {
      return;
    }

    this.selectedAnswers.set(await this.voteService.getSelectedAnswers(surveyId));
  }

  /** Resolves the current survey from the route parameter. */
  private getCurrentSurvey(): Survey | undefined {
    const surveyId = this.route.snapshot.paramMap.get('id');
    return surveyId ? this.surveyService.getSurveyById(surveyId) : undefined;
  }

  /** Safely extracts the input element from a DOM event. */
  private getInputElement(event: Event): HTMLInputElement | null {
    return event.target instanceof HTMLInputElement ? event.target : null;
  }

  /** Chooses the correct update strategy for single-choice or multiple-choice questions. */
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

  /** Replaces the selected answer for a single-choice question. */
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

  /** Adds or removes one answer for a multiple-choice question. */
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

  /** Returns the next selected-answer list after a checkbox change. */
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

  /** Checks whether every question in the survey has at least one selected answer. */
  private hasAnsweredAllQuestions(survey: Survey): boolean {
    return survey.questions.every((question) => this.hasSelectedAnswer(question.id));
  }

  /** Checks whether one question has at least one selected answer. */
  private hasSelectedAnswer(questionId: string): boolean {
    return (this.selectedAnswers()[questionId]?.length ?? 0) > 0;
  }

  /** Saves the vote, locks the form and reloads the live results. */
  private async saveVote(survey: Survey): Promise<void> {
    try {
      await this.voteService.submitVote(survey, this.selectedAnswers());
      this.hasVoted.set(true);
      await this.surveyService.loadSurveys();
    } catch (error) {
      console.error('Vote could not be saved:', error);
    }
  }
}
