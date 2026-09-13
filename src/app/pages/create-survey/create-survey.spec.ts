import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { SurveyService } from '../../features/surveys/services/survey.service';
import { CreateSurvey } from './create-survey';

describe('CreateSurvey', () => {
  let component: CreateSurvey;
  let fixture: ComponentFixture<CreateSurvey>;
  let createSurveyMock: ReturnType<typeof vi.fn>;
  let router: Router;

  beforeEach(async () => {
    createSurveyMock = vi.fn(async () => undefined);

    await TestBed.configureTestingModule({
      imports: [CreateSurvey],
      providers: [
        provideRouter([]),
        {
          provide: SurveyService,
          useValue: { createSurvey: createSurveyMock },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateSurvey);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with one validated question and two answer controls', () => {
    const form = component['surveyForm'];

    expect(component['questions'].length).toBe(1);
    expect(component['getAnswers'](0).length).toBe(2);
    expect(form.valid).toBe(false);

    form.controls.title.setValue('ab');
    expect(form.controls.title.hasError('minlength')).toBe(true);

    component['getQuestionTitleControl'](0).setValue('four');
    expect(component['getQuestionTitleControl'](0).hasError('minlength')).toBe(true);

    component['getAnswers'](0).at(0).setValue('a');
    expect(component['getAnswers'](0).at(0).hasError('minlength')).toBe(true);
  });

  it('should reject past end dates and allow the current date', () => {
    const endDateControl = component['surveyForm'].controls.endsAt;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date();

    endDateControl.setValue(toDateInputValue(yesterday));
    expect(endDateControl.hasError('pastDate')).toBe(true);

    endDateControl.setValue(toDateInputValue(today));
    expect(endDateControl.hasError('pastDate')).toBe(false);
  });

  it('should add and remove question blocks', () => {
    component['addQuestion']();
    expect(component['questions'].length).toBe(2);

    const secondQuestion = component['questions'].at(1);
    component['removeQuestion'](secondQuestion);

    expect(component['questions'].length).toBe(1);
  });

  it('should ignore unknown question and answer controls', () => {
    const questionCount = component['questions'].length;
    const answers = component['getAnswers'](0);
    const answerCount = answers.length;
    const foreignQuestion = component['createQuestion']();
    const foreignAnswer = foreignQuestion.controls.answers.at(0);

    component['removeQuestion'](foreignQuestion);
    component['removeAnswer'](0, foreignAnswer);

    expect(component['questions'].length).toBe(questionCount);
    expect(answers.length).toBe(answerCount);
  });

  it('should clear the last question while preserving two empty answers', () => {
    const question = component['questions'].at(0);
    const answers = component['getAnswers'](0);
    question.patchValue({ title: 'A filled question', allowMultipleChoice: true });
    answers.at(0).setValue('First');
    answers.at(1).setValue('Second');
    component['addAnswer'](0);
    answers.at(2).setValue('Third');
    question.markAllAsTouched();

    component['removeQuestion'](question);

    expect(component['questions'].length).toBe(1);
    expect(question.get('title')?.value).toBe('');
    expect(question.get('allowMultipleChoice')?.value).toBe(false);
    expect(answers.length).toBe(2);
    expect(answers.getRawValue()).toEqual(['', '']);
    expect(question.untouched).toBe(true);
    expect(question.pristine).toBe(true);
  });

  it('should remove extra answers but only clear an answer at the minimum', () => {
    const answers = component['getAnswers'](0);
    answers.at(0).setValue('First');

    component['removeAnswer'](0, answers.at(0));
    expect(answers.length).toBe(2);
    expect(answers.at(0).value).toBe('');

    component['addAnswer'](0);
    const thirdAnswer = answers.at(2);
    thirdAnswer.setValue('Third');
    component['removeAnswer'](0, thirdAnswer);

    expect(answers.length).toBe(2);
    expect(answers.controls).not.toContain(thirdAnswer);
  });

  it('should update category state and validation through the shared dropdown', () => {
    const category = component['surveyForm'].controls.category;

    component['selectCategory']('gaming');

    expect(category.value).toBe('gaming');
    expect(category.touched).toBe(true);

    category.markAsUntouched();
    component['markCategoryTouched']();
    expect(category.touched).toBe(true);
  });

  it('should return alphabetic labels and numeric fallback labels', () => {
    expect(component['getAnswerLabel'](0)).toBe('A');
    expect(component['getAnswerLabel'](25)).toBe('Z');
    expect(component['getAnswerLabel'](26)).toBe('27');
  });

  it('should clear main fields and reset their visual validation state', () => {
    const title = component['surveyForm'].controls.title;
    title.setValue('Survey title');
    title.markAsTouched();
    title.markAsDirty();

    component['clearMainField']('title');

    expect(title.value).toBe('');
    expect(title.untouched).toBe(true);
    expect(title.pristine).toBe(true);
  });

  it('should expose validation messages only after a control was touched', () => {
    const title = component['surveyForm'].controls.title;

    expect(component['showValidationError'](title, 'required')).toBe(false);

    title.markAsTouched();
    expect(component['showValidationError'](title, 'required')).toBe(true);
  });

  it('should mark the complete form as touched instead of publishing invalid data', async () => {
    await component['submitSurvey']();

    expect(createSurveyMock).not.toHaveBeenCalled();
    expect(component['surveyForm'].controls.title.touched).toBe(true);
    expect(component['getQuestionTitleControl'](0).touched).toBe(true);
    expect(component['getAnswers'](0).at(0).touched).toBe(true);
  });

  it('should trim form data, build linked models and publish a valid survey', async () => {
    const uuids = mockSurveyUuids();
    fillValidForm();
    const endDate = toDateInputValue(new Date());
    component['surveyForm'].controls.endsAt.setValue(endDate);

    await component['submitSurvey']();

    expect(createSurveyMock).toHaveBeenCalledWith({
      id: uuids.surveyId,
      title: 'Team lunch',
      description: 'Choose a date',
      category: 'team-activities',
      status: 'active',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      endsAt: new Date(`${endDate}T23:59:59.999`).toISOString(),
      questions: [
        {
          id: uuids.questionId,
          surveyId: uuids.surveyId,
          title: 'Which day works?',
          allowMultipleChoice: true,
          answers: [
            {
              id: uuids.firstAnswerId,
              questionId: uuids.questionId,
              text: 'Monday',
              votesCount: 0,
            },
            {
              id: uuids.secondAnswerId,
              questionId: uuids.questionId,
              text: 'Friday',
              votesCount: 0,
            },
          ],
        },
      ],
    });
    const publishedSurvey = createSurveyMock.mock.calls[0][0];
    expect(publishedSurvey.updatedAt).toBe(publishedSurvey.createdAt);
    expect(component['publishPopupOpen']()).toBe(true);
    expect(component['isPublishing']()).toBe(false);
    expect(component['publishErrorMessage']()).toBe('');
  });

  it('should omit an empty description and optional end date', async () => {
    mockSurveyUuids();
    fillValidForm();
    component['surveyForm'].controls.description.setValue('   ');
    component['surveyForm'].controls.endsAt.setValue('');

    await component['submitSurvey']();

    expect(createSurveyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: undefined,
        endsAt: null,
      }),
    );
  });

  it('should return null for a malformed end date', () => {
    expect(component['toEndOfDayIso']('not-a-date')).toBeNull();
  });

  it('should show an error and unlock publishing when the service rejects', async () => {
    const error = new Error('database unavailable');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    createSurveyMock.mockRejectedValueOnce(error);
    mockSurveyUuids();
    fillValidForm();

    await component['submitSurvey']();

    expect(component['publishPopupOpen']()).toBe(false);
    expect(component['isPublishing']()).toBe(false);
    expect(component['publishErrorMessage']()).toBe(
      'The survey could not be saved. Please try again.',
    );
    expect(consoleError).toHaveBeenCalledWith('Survey could not be created:', error);
  });

  it('should ignore repeated publish attempts while one request is pending', async () => {
    let resolveCreate!: () => void;
    createSurveyMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    mockSurveyUuids();
    fillValidForm();

    const firstSubmission = component['submitSurvey']();
    await vi.waitFor(() => expect(component['isPublishing']()).toBe(true));
    await component['submitSurvey']();

    expect(createSurveyMock).toHaveBeenCalledTimes(1);
    resolveCreate();
    await firstSubmission;
  });

  it('should close the success popup and navigate to the published survey', async () => {
    const uuids = mockSurveyUuids();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fillValidForm();
    await component['submitSurvey']();

    await component['closePublishPopup']();

    expect(component['publishPopupOpen']()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/survey', uuids.surveyId]);
  });

  it('should close the popup without navigating when no survey was published', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component['publishPopupOpen'].set(true);

    await component['closePublishPopup']();

    expect(component['publishPopupOpen']()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should focus the date input, update its minimum and open the native picker', () => {
    const input = document.createElement('input');
    const showPicker = vi.fn();
    input.type = 'date';
    Object.defineProperty(input, 'showPicker', { value: showPicker });
    const focus = vi.spyOn(input, 'focus');

    component['openNativeDatePicker'](input);

    expect(input.min).toBe(toDateInputValue(new Date()));
    expect(focus).toHaveBeenCalled();
    expect(showPicker).toHaveBeenCalled();
  });

  function fillValidForm(): void {
    const form = component['surveyForm'];
    form.controls.title.setValue('  Team lunch  ');
    form.controls.description.setValue('  Choose a date  ');
    component['selectCategory']('team-activities');

    const question = component['questions'].at(0);
    question.patchValue({
      title: '  Which day works?  ',
      allowMultipleChoice: true,
    });
    const answers = component['getAnswers'](0);
    answers.at(0).setValue('  Monday  ');
    answers.at(1).setValue('  Friday  ');
  }

  function mockSurveyUuids() {
    const values = {
      surveyId: '11111111-1111-4111-8111-111111111111',
      questionId: '22222222-2222-4222-8222-222222222222',
      firstAnswerId: '33333333-3333-4333-8333-333333333333',
      secondAnswerId: '44444444-4444-4444-8444-444444444444',
    } as const;

    vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce(values.surveyId)
      .mockReturnValueOnce(values.questionId)
      .mockReturnValueOnce(values.firstAnswerId)
      .mockReturnValueOnce(values.secondAnswerId);

    return values;
  }

  function toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
});
