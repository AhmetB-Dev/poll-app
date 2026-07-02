import { Component, inject } from '@angular/core';
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

  protected createQuestion() {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      answers: this.fb.array([
        this.fb.control('', [Validators.required, Validators.minLength(2)]),
        this.fb.control('', [Validators.required, Validators.minLength(2)]),
      ]),
    });
  }

  protected getAnswers(questionIndex: number): FormArray<FormControl<string>> {
    return this.questions.at(questionIndex).get('answers') as FormArray<FormControl<string>>;
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
