import { Component, HostListener, inject } from '@angular/core';
import {
  FormArray,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  private readonly router = inject(Router);

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

  protected addQuestion(): void {
    this.questions.push(this.createQuestion());
  }

  protected removeQuestion(questionIndex: number): void {
    if (this.questions.length <= 1) {
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
      return;
    }

    answers.removeAt(answerIndex);
  }

  protected submitSurvey(): void {
    console.log('Submit clicked');

    if (this.surveyForm.invalid) {
      console.log('Form is invalid:', this.surveyForm.getRawValue());
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
      createdAt: now,
      updatedAt: now,
      endsAt: formValue.endsAt ? new Date(formValue.endsAt).toISOString() : null,
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

    console.log('Created survey:', survey);

    this.surveyService.createSurvey(survey);
    this.router.navigate(['/survey', survey.id]);
  }
}
