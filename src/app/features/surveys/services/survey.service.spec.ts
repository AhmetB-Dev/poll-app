import { TestBed } from '@angular/core/testing';

import { SupabaseService } from '../../../core/supabase/supabase.service';
import { Survey } from '../../../shared/models/survey.model';
import { SurveyService } from './survey.service';

type TableName = 'surveys' | 'questions' | 'answers' | 'answer_results';

type DatabaseResponse = {
  data: unknown[] | null;
  error: unknown;
};

describe('SurveyService', () => {
  let service: SurveyService;
  let responses: Record<TableName, DatabaseResponse>;
  let insertErrors: Record<Exclude<TableName, 'answer_results'>, unknown>;
  let selectMocks: Record<TableName, ReturnType<typeof vi.fn>>;
  let orderMocks: Record<Exclude<TableName, 'answer_results'>, ReturnType<typeof vi.fn>>;
  let insertMocks: Record<Exclude<TableName, 'answer_results'>, ReturnType<typeof vi.fn>>;
  let fromMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    responses = {
      surveys: {
        data: [
          {
            id: 'survey-1',
            title: 'Team lunch',
            description: null,
            category: 'team-activities',
            status: 'active',
            created_at: '2026-09-10T10:00:00.000Z',
            updated_at: '2026-09-11T10:00:00.000Z',
            ends_at: '2026-09-30T21:59:59.999Z',
          },
        ],
        error: null,
      },
      questions: {
        data: [
          {
            id: 'question-1',
            survey_id: 'survey-1',
            title: 'Which day works?',
            allow_multiple_choice: true,
            position: 1,
          },
        ],
        error: null,
      },
      answers: {
        data: [
          {
            id: 'answer-1',
            question_id: 'question-1',
            text: 'Monday',
            position: 1,
          },
          {
            id: 'answer-2',
            question_id: 'question-1',
            text: 'Friday',
            position: 2,
          },
        ],
        error: null,
      },
      answer_results: {
        data: [{ answer_id: 'answer-1', votes_count: 4 }],
        error: null,
      },
    };

    insertErrors = {
      surveys: null,
      questions: null,
      answers: null,
    };

    orderMocks = {
      surveys: vi.fn(async () => responses.surveys),
      questions: vi.fn(async () => responses.questions),
      answers: vi.fn(async () => responses.answers),
    };

    insertMocks = {
      surveys: vi.fn(async () => ({ error: insertErrors.surveys })),
      questions: vi.fn(async () => ({ error: insertErrors.questions })),
      answers: vi.fn(async () => ({ error: insertErrors.answers })),
    };

    selectMocks = {
      surveys: vi.fn(() => ({ order: orderMocks.surveys })),
      questions: vi.fn(() => ({ order: orderMocks.questions })),
      answers: vi.fn(() => ({ order: orderMocks.answers })),
      answer_results: vi.fn(async () => responses.answer_results),
    };

    fromMock = vi.fn((table: TableName) => {
      if (table === 'answer_results') {
        return { select: selectMocks.answer_results };
      }

      return {
        select: selectMocks[table],
        insert: insertMocks[table],
      };
    });

    await TestBed.configureTestingModule({
      providers: [
        SurveyService,
        {
          provide: SupabaseService,
          useValue: { client: { from: fromMock } },
        },
      ],
    }).compileComponents();

    service = TestBed.inject(SurveyService);
    await vi.waitFor(() => expect(service.allSurveys()).toHaveLength(1));
  });

  it('should map flat database rows to the nested survey model', () => {
    expect(service.allSurveys()).toEqual([
      {
        id: 'survey-1',
        title: 'Team lunch',
        description: undefined,
        category: 'team-activities',
        status: 'active',
        createdAt: '2026-09-10T10:00:00.000Z',
        updatedAt: '2026-09-11T10:00:00.000Z',
        endsAt: '2026-09-30T21:59:59.999Z',
        questions: [
          {
            id: 'question-1',
            surveyId: 'survey-1',
            title: 'Which day works?',
            allowMultipleChoice: true,
            answers: [
              {
                id: 'answer-1',
                questionId: 'question-1',
                text: 'Monday',
                votesCount: 4,
              },
              {
                id: 'answer-2',
                questionId: 'question-1',
                text: 'Friday',
                votesCount: 0,
              },
            ],
          },
        ],
      },
    ]);
  });

  it('should use the expected ordering for database reads', () => {
    expect(orderMocks.surveys).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(orderMocks.questions).toHaveBeenCalledWith('position', { ascending: true });
    expect(orderMocks.answers).toHaveBeenCalledWith('position');
  });

  it('should return a survey by id and undefined for an unknown id', () => {
    expect(service.getSurveyById('survey-1')?.title).toBe('Team lunch');
    expect(service.getSurveyById('missing')).toBeUndefined();
  });

  it('should reject loading when one Supabase request fails', async () => {
    const databaseError = new Error('questions unavailable');
    responses.questions.error = databaseError;

    await expect(service.loadSurveys()).rejects.toBe(databaseError);
    expect(service.allSurveys()).toHaveLength(1);
  });

  it('should treat missing response data as empty collections', async () => {
    responses.surveys.data = null;
    responses.questions.data = null;
    responses.answers.data = null;
    responses.answer_results.data = null;

    await service.loadSurveys();

    expect(service.allSurveys()).toEqual([]);
  });

  it('should map surveys and questions even when related rows are missing', async () => {
    responses.surveys.data = [
      {
        id: 'survey-with-question',
        title: 'Incomplete relations',
        description: 'Still readable',
        category: 'gaming',
        status: 'active',
        created_at: '2026-09-13T10:00:00.000Z',
        updated_at: '2026-09-13T10:00:00.000Z',
        ends_at: null,
      },
      {
        id: 'survey-without-question',
        title: 'Empty survey',
        description: null,
        category: 'health',
        status: 'active',
        created_at: '2026-09-13T10:00:00.000Z',
        updated_at: '2026-09-13T10:00:00.000Z',
        ends_at: null,
      },
    ];
    responses.questions.data = [
      {
        id: 'question-without-answers',
        survey_id: 'survey-with-question',
        title: 'No answers yet',
        allow_multiple_choice: false,
        position: 1,
      },
    ];
    responses.answers.data = [];
    responses.answer_results.data = [];

    await service.loadSurveys();

    expect(service.getSurveyById('survey-with-question')?.questions[0].answers).toEqual([]);
    expect(service.getSurveyById('survey-without-question')?.questions).toEqual([]);
  });

  it('should insert a survey, its questions and its answers and prepend local state', async () => {
    const survey = createNewSurvey();

    await service.createSurvey(survey);

    expect(insertMocks.surveys).toHaveBeenCalledWith({
      id: 'survey-2',
      title: 'Preferred framework',
      description: null,
      category: 'technology-innovation',
      status: 'active',
      ends_at: null,
    });
    expect(insertMocks.questions).toHaveBeenCalledWith([
      {
        id: 'question-2',
        survey_id: 'survey-2',
        title: 'Which framework do you prefer?',
        allow_multiple_choice: false,
        position: 1,
      },
    ]);
    expect(insertMocks.answers).toHaveBeenCalledWith([
      {
        id: 'answer-3',
        question_id: 'question-2',
        text: 'Angular',
        position: 1,
      },
      {
        id: 'answer-4',
        question_id: 'question-2',
        text: 'React',
        position: 2,
      },
    ]);
    expect(service.allSurveys().map(({ id }) => id)).toEqual(['survey-2', 'survey-1']);
  });

  it('should stop the write workflow and preserve state when the survey insert fails', async () => {
    const databaseError = new Error('insert failed');
    insertErrors.surveys = databaseError;

    await expect(service.createSurvey(createNewSurvey())).rejects.toBe(databaseError);

    expect(insertMocks.questions).not.toHaveBeenCalled();
    expect(insertMocks.answers).not.toHaveBeenCalled();
    expect(service.allSurveys().map(({ id }) => id)).toEqual(['survey-1']);
  });

  function createNewSurvey(): Survey {
    return {
      id: 'survey-2',
      title: 'Preferred framework',
      category: 'technology-innovation',
      status: 'active',
      createdAt: '2026-09-13T10:00:00.000Z',
      updatedAt: '2026-09-13T10:00:00.000Z',
      endsAt: null,
      questions: [
        {
          id: 'question-2',
          surveyId: 'survey-2',
          title: 'Which framework do you prefer?',
          allowMultipleChoice: false,
          answers: [
            {
              id: 'answer-3',
              questionId: 'question-2',
              text: 'Angular',
              votesCount: 0,
            },
            {
              id: 'answer-4',
              questionId: 'question-2',
              text: 'React',
              votesCount: 0,
            },
          ],
        },
      ],
    };
  }
});
