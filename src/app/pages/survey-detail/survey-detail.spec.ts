import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { SurveyService } from '../../features/surveys/services/survey.service';
import { VoteService } from '../../features/votes/services/vote.service';
import { Question } from '../../shared/models/question.model';
import { Survey } from '../../shared/models/survey.model';
import { SurveyDetail } from './survey-detail';

describe('SurveyDetail', () => {
  let component: SurveyDetail;
  let fixture: ComponentFixture<SurveyDetail>;
  let survey: Survey;
  let getSurveyByIdMock: ReturnType<typeof vi.fn>;
  let loadSurveysMock: ReturnType<typeof vi.fn>;
  let hasVotedMock: ReturnType<typeof vi.fn>;
  let getSelectedAnswersMock: ReturnType<typeof vi.fn>;
  let submitVoteMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    survey = createSurvey();
    const surveysState = signal([survey]);

    getSurveyByIdMock = vi.fn((id: string) =>
      surveysState().find((currentSurvey) => currentSurvey.id === id),
    );
    loadSurveysMock = vi.fn(async () => undefined);
    hasVotedMock = vi.fn(() => false);
    getSelectedAnswersMock = vi.fn(async () => ({}));
    submitVoteMock = vi.fn(async () => undefined);

    await TestBed.configureTestingModule({
      imports: [SurveyDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'survey-1' }),
            },
          },
        },
        {
          provide: SurveyService,
          useValue: {
            allSurveys: surveysState.asReadonly(),
            getSurveyById: getSurveyByIdMock,
            loadSurveys: loadSurveysMock,
          },
        },
        {
          provide: VoteService,
          useValue: {
            hasVoted: hasVotedMock,
            getSelectedAnswers: getSelectedAnswersMock,
            submitVote: submitVoteMock,
          },
        },
      ],
    }).compileComponents();

    await createComponent();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component['survey']()).toBe(survey);
    expect(getSurveyByIdMock).toHaveBeenCalledWith('survey-1');
  });

  it('should restore selected answers for a previously completed survey', async () => {
    fixture.destroy();
    hasVotedMock.mockReturnValue(true);
    getSelectedAnswersMock.mockResolvedValue({
      'question-1': ['answer-2'],
      'question-2': ['answer-3'],
    });

    await createComponent();
    await vi.waitFor(() =>
      expect(component['selectedAnswers']()).toEqual({
        'question-1': ['answer-2'],
        'question-2': ['answer-3'],
      }),
    );

    expect(getSelectedAnswersMock).toHaveBeenCalledWith('survey-1');
  });

  it('should not restore answers when the survey was not completed', () => {
    expect(hasVotedMock).toHaveBeenCalledWith('survey-1');
    expect(getSelectedAnswersMock).not.toHaveBeenCalled();
  });

  it('should replace selections for a single-choice question', () => {
    const question = survey.questions[0];

    component['toggleAnswer'](question, 'answer-1', changeEvent(true));
    expect(component['selectedAnswers']()).toEqual({ 'question-1': ['answer-1'] });

    component['toggleAnswer'](question, 'answer-2', changeEvent(true));
    expect(component['selectedAnswers']()).toEqual({ 'question-1': ['answer-2'] });
    expect(component['isSelected']('question-1', 'answer-2')).toBe(true);

    component['toggleAnswer'](question, 'answer-2', changeEvent(false));
    expect(component['selectedAnswers']()).toEqual({ 'question-1': [] });
  });

  it('should add and remove selections for a multiple-choice question', () => {
    const question = survey.questions[1];

    component['toggleAnswer'](question, 'answer-3', changeEvent(true));
    component['toggleAnswer'](question, 'answer-4', changeEvent(true));
    expect(component['selectedAnswers']()['question-2']).toEqual(['answer-3', 'answer-4']);

    component['toggleAnswer'](question, 'answer-3', changeEvent(false));
    expect(component['selectedAnswers']()['question-2']).toEqual(['answer-4']);
  });

  it('should ignore answer changes while voting is locked or the event target is invalid', () => {
    const question = survey.questions[0];

    component['toggleAnswer'](question, 'answer-1', new Event('change'));
    expect(component['selectedAnswers']()).toEqual({});

    component['hasVoted'].set(true);
    component['toggleAnswer'](question, 'answer-1', changeEvent(true));
    expect(component['selectedAnswers']()).toEqual({});

    component['hasVoted'].set(false);
    component['isSubmittingVote'].set(true);
    component['toggleAnswer'](question, 'answer-1', changeEvent(true));
    expect(component['selectedAnswers']()).toEqual({});
  });

  it('should calculate vote totals and rounded percentages', () => {
    const question = survey.questions[0];

    expect(component['totalVotes'](question)).toBe(4);
    expect(component['percentage'](question, 3)).toBe(75);
    expect(component['percentage']({ ...question, answers: [] }, 0)).toBe(0);
  });

  it('should create spreadsheet-style answer labels', () => {
    expect(component['answerOptionLabel'](0)).toBe('A');
    expect(component['answerOptionLabel'](25)).toBe('Z');
    expect(component['answerOptionLabel'](26)).toBe('AA');
    expect(component['answerOptionLabel'](27)).toBe('AB');
    expect(component['answerOptionLabel'](51)).toBe('AZ');
  });

  it('should toggle and close the results popup', () => {
    expect(component['resultsPopupOpen']).toBe(true);

    component['toggleResultsPopup']();
    expect(component['resultsPopupOpen']).toBe(false);

    component['closeResultsPopup']();
    expect(component['resultsPopupOpen']).toBe(false);

    component['toggleResultsPopup']();
    component['closeResultsPopup']();
    expect(component['resultsPopupOpen']).toBe(false);
  });

  it('should require at least one answer for every question', async () => {
    component['selectedAnswers'].set({ 'question-1': ['answer-1'] });

    await component['submitVote']();

    expect(component['showVoteErrors']()).toBe(true);
    expect(component['showRequiredAnswer']('question-1')).toBe(false);
    expect(component['showRequiredAnswer']('question-2')).toBe(true);
    expect(submitVoteMock).not.toHaveBeenCalled();
  });

  it('should submit complete selections, lock the form and reload survey results', async () => {
    const selectedAnswers = {
      'question-1': ['answer-1'],
      'question-2': ['answer-3', 'answer-4'],
    };
    component['selectedAnswers'].set(selectedAnswers);

    await component['submitVote']();

    expect(submitVoteMock).toHaveBeenCalledWith(survey, selectedAnswers);
    expect(component['hasVoted']()).toBe(true);
    expect(loadSurveysMock).toHaveBeenCalledOnce();
    expect(component['isSubmittingVote']()).toBe(false);
  });

  it('should prevent duplicate submissions while a vote is pending', async () => {
    let resolveVote!: () => void;
    submitVoteMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveVote = resolve;
        }),
    );
    component['selectedAnswers'].set({
      'question-1': ['answer-1'],
      'question-2': ['answer-3'],
    });

    const firstSubmission = component['submitVote']();
    await vi.waitFor(() => expect(component['isSubmittingVote']()).toBe(true));
    await component['submitVote']();

    expect(submitVoteMock).toHaveBeenCalledTimes(1);
    resolveVote();
    await firstSubmission;
  });

  it('should report a failed vote without locking the survey', async () => {
    const error = new Error('vote failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    submitVoteMock.mockRejectedValueOnce(error);
    component['selectedAnswers'].set({
      'question-1': ['answer-1'],
      'question-2': ['answer-3'],
    });

    await component['submitVote']();

    expect(consoleError).toHaveBeenCalledWith('Vote could not be saved:', error);
    expect(component['hasVoted']()).toBe(false);
    expect(component['isSubmittingVote']()).toBe(false);
    expect(loadSurveysMock).not.toHaveBeenCalled();
  });

  it('should not submit when the current survey cannot be resolved', async () => {
    getSurveyByIdMock.mockReturnValue(undefined);

    await component['submitVote']();

    expect(submitVoteMock).not.toHaveBeenCalled();
  });

  it('should safely handle a route without a survey id', async () => {
    Object.defineProperty(TestBed.inject(ActivatedRoute).snapshot, 'paramMap', {
      value: convertToParamMap({}),
    });

    expect(component['hasCompletedCurrentSurvey']()).toBe(false);
    expect(component['getCurrentSurvey']()).toBeUndefined();
    await component['restoreSelectedAnswers']();
    expect(getSelectedAnswersMock).not.toHaveBeenCalled();
  });

  async function createComponent(): Promise<void> {
    fixture = TestBed.createComponent(SurveyDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function changeEvent(checked: boolean): Event {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: input });
    return event;
  }

  function createSurvey(): Survey {
    return {
      id: 'survey-1',
      title: 'Technology survey',
      description: 'Choose your tools',
      category: 'technology-innovation',
      status: 'active',
      createdAt: '2026-09-13T10:00:00.000Z',
      updatedAt: '2026-09-13T10:00:00.000Z',
      endsAt: null,
      questions: [
        createQuestion('question-1', false, [
          { id: 'answer-1', text: 'Angular', votesCount: 3 },
          { id: 'answer-2', text: 'React', votesCount: 1 },
        ]),
        createQuestion('question-2', true, [
          { id: 'answer-3', text: 'Django', votesCount: 2 },
          { id: 'answer-4', text: 'PostgreSQL', votesCount: 2 },
        ]),
      ],
    };
  }

  function createQuestion(
    id: string,
    allowMultipleChoice: boolean,
    answers: Array<{ id: string; text: string; votesCount: number }>,
  ): Question {
    return {
      id,
      surveyId: 'survey-1',
      title: `Question ${id}`,
      allowMultipleChoice,
      answers: answers.map((answer) => ({
        ...answer,
        questionId: id,
      })),
    };
  }
});
