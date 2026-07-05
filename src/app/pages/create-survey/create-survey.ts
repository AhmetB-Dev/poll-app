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

type SurveyQuestionFormValue = {
  title: string;
  allowMultipleChoice: boolean;
  answers: string[];
};

@Component({
  selector: 'app-create-survey',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})
export class CreateSurvey {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly surveyService = inject(SurveyService);

  protected publishPopupOpen = false;
  protected isPublishing = false;

  protected categoryMenuOpen = false;
  protected categoryTriggerHovered = false;

  protected readonly categoryOptions = SURVEY_CATEGORIES;

  protected readonly surveyForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    category: ['', [Validators.required]],
    endsAt: [''],
    questions: this.fb.array([this.createQuestion()]),
  });

  protected get questions(): FormArray {
    return this.surveyForm.controls.questions;
  }

  protected get selectedCategoryLabel(): string {
    const selectedValue = this.surveyForm.controls.category.value;

    return (
      this.categoryOptions.find((category) => category.value === selectedValue)?.label ??
      'Choose category'
    );
  }

  protected get hasSelectedCategory(): boolean {
    return this.surveyForm.controls.category.value !== '';
  }

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

  protected createQuestion() {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      allowMultipleChoice: false,
      answers: this.fb.array([this.createAnswerControl(), this.createAnswerControl()]),
    });
  }

  protected getAnswers(questionIndex: number): FormArray<FormControl<string>> {
    return this.questions.at(questionIndex).get('answers') as FormArray<FormControl<string>>;
  }

  protected toggleCategoryMenu(): void {
    this.categoryMenuOpen = !this.categoryMenuOpen;
  }

  protected closeCategoryMenu(): void {
    this.categoryMenuOpen = false;
    this.surveyForm.controls.category.markAsTouched();
  }

  protected selectCategory(value: string): void {
    this.surveyForm.controls.category.setValue(value);
    this.surveyForm.controls.category.markAsTouched();
    this.surveyForm.controls.category.updateValueAndValidity();

    this.categoryMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  protected closeCategoryMenuOnOutsideClick(event: MouseEvent): void {
    const target = event.target;

    if (target instanceof HTMLElement && !target.closest('.create-survey__category-select')) {
      this.categoryMenuOpen = false;
    }
  }

  protected closePublishPopup(): void {
    this.publishPopupOpen = false;
  }

  protected addQuestion(): void {
    this.questions.push(this.createQuestion());
  }

  protected clearMainField(fieldName: 'title' | 'description' | 'endsAt'): void {
    this.clearTextControl(this.surveyForm.controls[fieldName]);
  }

  protected removeQuestion(questionIndex: number): void {
    if (this.questions.length <= 1) {
      this.clearQuestion(questionIndex);
      return;
    }

    this.questions.removeAt(questionIndex);
  }

  protected addAnswer(questionIndex: number): void {
    this.getAnswers(questionIndex).push(this.createAnswerControl());
  }

  protected removeAnswer(questionIndex: number, answerIndex: number): void {
    const answers = this.getAnswers(questionIndex);

    if (answers.length <= 2) {
      this.clearTextControl(answers.at(answerIndex));
      return;
    }

    answers.removeAt(answerIndex);
  }

  protected async submitSurvey(): Promise<void> {
    if (this.isPublishing || !this.hasValidSurveyForm()) {
      return;
    }

    await this.publishSurvey(this.buildSurvey());
  }

  private createAnswerControl(): FormControl<string> {
    return this.fb.control('', [Validators.required, Validators.minLength(2)]);
  }

  private clearQuestion(questionIndex: number): void {
    const question = this.questions.at(questionIndex);
    const answers = this.getAnswers(questionIndex);

    this.resetQuestionValues(question);
    this.keepMinimumAnswers(answers);
    this.clearAnswerControls(answers);
    this.resetControlState(question);
  }

  private resetQuestionValues(question: AbstractControl): void {
    question.patchValue({
      title: '',
      allowMultipleChoice: false,
    });
  }

  private keepMinimumAnswers(answers: FormArray<FormControl<string>>): void {
    while (answers.length > 2) {
      answers.removeAt(answers.length - 1);
    }
  }

  private clearAnswerControls(answers: FormArray<FormControl<string>>): void {
    answers.controls.forEach((answer) => this.clearTextControl(answer));
  }

  private clearTextControl(control: FormControl<string>): void {
    control.setValue('');
    this.resetControlState(control);
  }

  private resetControlState(control: AbstractControl): void {
    control.markAsPristine();
    control.markAsUntouched();
  }

  private hasValidSurveyForm(): boolean {
    if (this.surveyForm.valid) {
      return true;
    }

    this.surveyForm.markAllAsTouched();
    return false;
  }

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

  private buildQuestions(
    questions: SurveyQuestionFormValue[],
    surveyId: string,
  ): Survey['questions'] {
    return questions.map((question) => this.buildQuestion(question, surveyId));
  }

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

  private toEndOfDayIso(dateValue: string): string | null {
    if (!dateValue) {
      return null;
    }

    const endOfDay = new Date(`${dateValue}T23:59:59.999`);
    return Number.isNaN(endOfDay.getTime()) ? null : endOfDay.toISOString();
  }

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
