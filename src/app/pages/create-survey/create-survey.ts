import { Component, HostListener, inject } from '@angular/core';
import {
  FormArray,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Survey } from '../../shared/models/survey.model';
import { SurveyService } from '../../features/surveys/services/survey.service';

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

  protected readonly categoryOptions = [
    { label: 'Team activities', value: 'team-activities' },
    { label: 'Health & wellness', value: 'health' },
    { label: 'Gaming & entertainment', value: 'gaming' },
    { label: 'Workplace & workflow', value: 'workplace' },
  ];

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
      answers: this.fb.array([
        this.fb.control('', [Validators.required, Validators.minLength(2)]),
        this.fb.control('', [Validators.required, Validators.minLength(2)]),
      ]),
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

    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (!target.closest('.create-survey__category-select')) {
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
    const control = this.surveyForm.controls[fieldName];

    control.setValue('');
    control.markAsPristine();
    control.markAsUntouched();
  }

  protected removeQuestion(questionIndex: number): void {
    if (this.questions.length <= 1) {
      this.clearQuestion(questionIndex);
      return;
    }

    this.questions.removeAt(questionIndex);
  }

  protected addAnswer(questionIndex: number): void {
    this.getAnswers(questionIndex).push(
      this.fb.control('', [Validators.required, Validators.minLength(2)]),
    );
  }

  protected removeAnswer(questionIndex: number, answerIndex: number): void {
    const answers = this.getAnswers(questionIndex);

    if (answers.length <= 2) {
      answers.at(answerIndex).setValue('');
      answers.at(answerIndex).markAsPristine();
      answers.at(answerIndex).markAsUntouched();
      return;
    }

    answers.removeAt(answerIndex);
  }

  private clearQuestion(questionIndex: number): void {
    const question = this.questions.at(questionIndex);
    const answers = this.getAnswers(questionIndex);

    question.patchValue({
      title: '',
      allowMultipleChoice: false,
    });

    while (answers.length > 2) {
      answers.removeAt(answers.length - 1);
    }

    answers.controls.forEach((answer) => {
      answer.setValue('');
      answer.markAsPristine();
      answer.markAsUntouched();
    });

    question.markAsPristine();
    question.markAsUntouched();
  }

  private toEndOfDayIso(dateValue: string): string | null {
    if (!dateValue) {
      return null;
    }

    const endOfDay = new Date(`${dateValue}T23:59:59.999`);

    if (Number.isNaN(endOfDay.getTime())) {
      return null;
    }

    return endOfDay.toISOString();
  }

  protected async submitSurvey(): Promise<void> {
    if (this.isPublishing) {
      return;
    }

    if (this.surveyForm.invalid) {
      this.surveyForm.markAllAsTouched();
      return;
    }

    const formValue = this.surveyForm.getRawValue();

    const surveyId = crypto.randomUUID();
    const now = new Date().toISOString();

    const survey: Survey = {
      id: surveyId,
      title: formValue.title.trim(),
      description: formValue.description.trim() || undefined,
      category: formValue.category,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      endsAt: this.toEndOfDayIso(formValue.endsAt),
      questions: formValue.questions.map((question) => {
        const questionId = crypto.randomUUID();

        return {
          id: questionId,
          surveyId,
          title: question.title.trim(),
          allowMultipleChoice: question.allowMultipleChoice,
          answers: question.answers.map((answer) => ({
            id: crypto.randomUUID(),
            questionId,
            text: answer.trim(),
            votesCount: 0,
          })),
        };
      }),
    };

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
