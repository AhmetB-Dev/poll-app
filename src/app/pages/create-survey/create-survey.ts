import { Component, HostListener, inject } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { SurveyService } from '../../features/surveys/services/survey.service';
import { SURVEY_CATEGORIES } from '../../shared/constants/survey-categories';
import { Survey } from '../../shared/models/survey.model';

/**
 * Raw form value for one survey question before it is converted into the app model.
 */
type SurveyQuestionFormValue = {
  title: string;
  allowMultipleChoice: boolean;
  answers: string[];
};

/**
 * Page component for creating and publishing a new survey.
 *
 * Responsibilities:
 * - manages the reactive form
 * - adds/removes questions and answers
 * - handles the custom category dropdown
 * - converts valid form data into a Survey model
 * - sends the finished survey to Supabase through SurveyService
 */
@Component({
  selector: 'app-create-survey',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})
export class CreateSurvey {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly surveyService = inject(SurveyService);

  /** Controls the success popup after a survey was published. */
  protected publishPopupOpen = false;

  /** Prevents duplicate publish requests while the current request is still running. */
  protected isPublishing = false;

  /** Controls whether the custom category menu is expanded. */
  protected categoryMenuOpen = false;

  /** Tracks hover state for the category trigger icon. */
  protected categoryTriggerHovered = false;

  /** Central list of available survey categories. */
  protected readonly categoryOptions = SURVEY_CATEGORIES;

  /**
   * Reactive form used by the create-survey page.
   *
   * It always starts with one question and two answer fields because a survey question
   * needs at least two possible answers.
   */
  protected readonly surveyForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    category: ['', [Validators.required]],
    endsAt: [''],
    questions: this.fb.array([this.createQuestion()]),
  });

  /** Returns the questions FormArray for cleaner template access. */
  protected get questions(): FormArray {
    return this.surveyForm.controls.questions;
  }

  /** Returns the visible label of the currently selected category. */
  protected get selectedCategoryLabel(): string {
    const selectedValue = this.surveyForm.controls.category.value;

    return (
      this.categoryOptions.find((category) => category.value === selectedValue)?.label ??
      'Choose category'
    );
  }

  /** True when the user has selected a category value. */
  protected get hasSelectedCategory(): boolean {
    return this.surveyForm.controls.category.value !== '';
  }

  /** Selects the correct dropdown icon based on menu and hover state. */
  protected get categoryIconSrc(): string {
    if (this.categoryMenuOpen && this.categoryTriggerHovered) {
      return '/assets/icons/arrow_drop_up_white.svg';
    }

    if (this.categoryMenuOpen) {
      return '/assets/icons/arrow_drop_up_orange.svg';
    }

    if (this.categoryTriggerHovered) {
      return '/assets/icons/arrow_drop_down_orange.svg';
    }

    return '/assets/icons/arrow_drop_down.svg';
  }

  /**
   * Creates one question form group with validation and two empty answer controls.
   */
  protected createQuestion() {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      allowMultipleChoice: false,
      answers: this.fb.array([this.createAnswerControl(), this.createAnswerControl()]),
    });
  }

  /** Returns the answer FormArray for a specific question index. */
  protected getAnswers(questionIndex: number): FormArray<FormControl<string>> {
    return this.questions.at(questionIndex).get('answers') as FormArray<FormControl<string>>;
  }

  /** Opens the native date picker when the user clicks into the date input. */
  protected openNativeDatePicker(dateInput: HTMLInputElement & { showPicker?: () => void }): void {
    dateInput.focus();

    try {
      dateInput.showPicker?.();
    } catch {}
  }

  /** Opens or closes the category dropdown. */
  protected toggleCategoryMenu(): void {
    this.categoryMenuOpen = !this.categoryMenuOpen;
  }

  /** Closes the category dropdown and marks the category field as touched. */
  protected closeCategoryMenu(): void {
    this.categoryMenuOpen = false;
    this.surveyForm.controls.category.markAsTouched();
  }

  /**
   * Saves the selected category value in the form and closes the dropdown.
   *
   * @param value Internal category value stored in the survey model and database.
   */
  protected selectCategory(value: string): void {
    this.surveyForm.controls.category.setValue(value);
    this.surveyForm.controls.category.markAsTouched();
    this.surveyForm.controls.category.updateValueAndValidity();

    this.categoryMenuOpen = false;
  }

  /** Closes the category dropdown when the user clicks outside the select area. */
  @HostListener('document:click', ['$event'])
  protected closeCategoryMenuOnOutsideClick(event: MouseEvent): void {
    const target = event.target;

    if (target instanceof HTMLElement && !target.closest('.create-survey__category-select')) {
      this.categoryMenuOpen = false;
    }
  }

  /** Closes the publish success popup manually. */
  protected closePublishPopup(): void {
    this.publishPopupOpen = false;
  }

  /** Adds a new empty question block to the survey form. */
  protected addQuestion(): void {
    this.questions.push(this.createQuestion());
  }

  /** Clears one main text/date field without removing the control itself. */
  protected clearMainField(fieldName: 'title' | 'description' | 'endsAt'): void {
    this.clearTextControl(this.surveyForm.controls[fieldName]);
  }

  /**
   * Removes a question or clears it when it is the last remaining question.
   *
   * @param questionIndex Index of the question in the questions FormArray.
   */
  protected removeQuestion(questionIndex: number): void {
    if (this.questions.length <= 1) {
      this.clearQuestion(questionIndex);
      return;
    }

    this.questions.removeAt(questionIndex);
  }

  /** Adds another answer field to the selected question. */
  protected addAnswer(questionIndex: number): void {
    this.getAnswers(questionIndex).push(this.createAnswerControl());
  }

  /**
   * Removes an answer or clears it when the minimum of two answers would be broken.
   */
  protected removeAnswer(questionIndex: number, answerIndex: number): void {
    const answers = this.getAnswers(questionIndex);

    if (answers.length <= 2) {
      this.clearTextControl(answers.at(answerIndex));
      return;
    }

    answers.removeAt(answerIndex);
  }

  /** Validates the form and publishes the survey when all required data is valid. */
  protected async submitSurvey(): Promise<void> {
    if (this.isPublishing || !this.hasValidSurveyForm()) {
      return;
    }

    await this.publishSurvey(this.buildSurvey());
  }

  /** Creates one validated text control for an answer option. */
  private createAnswerControl(): FormControl<string> {
    return this.fb.control('', [Validators.required, Validators.minLength(2)]);
  }

  /** Resets a question to its initial state without removing the question block. */
  private clearQuestion(questionIndex: number): void {
    const question = this.questions.at(questionIndex);
    const answers = this.getAnswers(questionIndex);

    this.resetQuestionValues(question);
    this.keepMinimumAnswers(answers);
    this.clearAnswerControls(answers);
    this.resetControlState(question);
  }

  /** Clears the question title and resets the multiple-choice flag. */
  private resetQuestionValues(question: AbstractControl): void {
    question.patchValue({
      title: '',
      allowMultipleChoice: false,
    });
  }

  /** Keeps exactly the minimum required answer controls when a question is cleared. */
  private keepMinimumAnswers(answers: FormArray<FormControl<string>>): void {
    while (answers.length > 2) {
      answers.removeAt(answers.length - 1);
    }
  }

  /** Clears all answer text controls for one question. */
  private clearAnswerControls(answers: FormArray<FormControl<string>>): void {
    answers.controls.forEach((answer) => this.clearTextControl(answer));
  }

  /** Clears one text control and resets its validation display state. */
  private clearTextControl(control: FormControl<string>): void {
    control.setValue('');
    this.resetControlState(control);
  }

  /** Resets touched/pristine state so cleared fields do not instantly show errors. */
  private resetControlState(control: AbstractControl): void {
    control.markAsPristine();
    control.markAsUntouched();
  }

  /** Returns true when the form is valid, otherwise shows all validation errors. */
  private hasValidSurveyForm(): boolean {
    if (this.surveyForm.valid) {
      return true;
    }

    this.surveyForm.markAllAsTouched();
    return false;
  }

  /** Converts the valid reactive form value into the Survey domain model. */
  private buildSurvey(): Survey {
    const formValue = this.surveyForm.getRawValue();
    const surveyId = crypto.randomUUID();
    const now = new Date().toISOString();
    return {
      id: surveyId,
      title: formValue.title.trim(),
      description: formValue.description.trim() || undefined,
      category: formValue.category,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      endsAt: this.toEndOfDayIso(formValue.endsAt),
      questions: this.buildQuestions(formValue.questions, surveyId),
    };
  }

  /** Builds all question models and links them to the generated survey id. */
  private buildQuestions(
    questions: SurveyQuestionFormValue[],
    surveyId: string,
  ): Survey['questions'] {
    return questions.map((question) => this.buildQuestion(question, surveyId));
  }

  /** Builds one question model including its generated answer models. */
  private buildQuestion(
    question: SurveyQuestionFormValue,
    surveyId: string,
  ): Survey['questions'][number] {
    const questionId = crypto.randomUUID();

    return {
      id: questionId,
      surveyId,
      title: question.title.trim(),
      allowMultipleChoice: question.allowMultipleChoice,
      answers: this.buildAnswers(question.answers, questionId),
    };
  }

  /** Builds answer models with an initial vote count of zero. */
  private buildAnswers(
    answers: string[],
    questionId: string,
  ): Survey['questions'][number]['answers'] {
    return answers.map((answer) => ({
      id: crypto.randomUUID(),
      questionId,
      text: answer.trim(),
      votesCount: 0,
    }));
  }

  /** Converts an HTML date value into an ISO timestamp at the end of that day. */
  private toEndOfDayIso(dateValue: string): string | null {
    if (!dateValue) {
      return null;
    }

    const endOfDay = new Date(`${dateValue}T23:59:59.999`);
    return Number.isNaN(endOfDay.getTime()) ? null : endOfDay.toISOString();
  }

  /** Sends the survey to the service and shows the success popup when saving worked. */
  private async publishSurvey(survey: Survey): Promise<void> {
    try {
      this.isPublishing = true;
      await this.surveyService.createSurvey(survey);
      this.publishPopupOpen = true;
    } catch (error) {
      console.error('Survey could not be created:', error);
    } finally {
      this.isPublishing = false;
    }
  }
}
