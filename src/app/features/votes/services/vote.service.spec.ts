import { TestBed } from '@angular/core/testing';

import { SupabaseService } from '../../../core/supabase/supabase.service';
import { Survey } from '../../../shared/models/survey.model';
import { VoteService } from './vote.service';

describe('VoteService', () => {
  let service: VoteService;
  let insertMock: ReturnType<typeof vi.fn>;
  let selectMock: ReturnType<typeof vi.fn>;
  let firstEqMock: ReturnType<typeof vi.fn>;
  let secondEqMock: ReturnType<typeof vi.fn>;
  let fromMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();

    insertMock = vi.fn(async () => ({ error: null }));
    secondEqMock = vi.fn(async () => ({ data: [], error: null }));
    firstEqMock = vi.fn(() => ({ eq: secondEqMock }));
    selectMock = vi.fn(() => ({ eq: firstEqMock }));
    fromMock = vi.fn(() => ({
      insert: insertMock,
      select: selectMock,
    }));

    TestBed.configureTestingModule({
      providers: [
        VoteService,
        {
          provide: SupabaseService,
          useValue: { client: { from: fromMock } },
        },
      ],
    });

    service = TestBed.inject(VoteService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should report whether the current browser completed a survey', () => {
    expect(service.hasVoted('survey-1')).toBe(false);

    localStorage.setItem('pollapp-completed-survey:survey-1', '{}');

    expect(service.hasVoted('survey-1')).toBe(true);
    expect(service.hasVoted('survey-2')).toBe(false);
  });

  it('should convert selected answers into vote rows and remember the completed vote', async () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '11111111-1111-4111-8111-111111111111',
    );
    const selectedAnswers = {
      'question-1': ['answer-1'],
      'question-2': ['answer-3', 'answer-4'],
    };

    await service.submitVote(createSurvey(), selectedAnswers);

    expect(fromMock).toHaveBeenCalledWith('votes');
    expect(insertMock).toHaveBeenCalledWith([
      {
        survey_id: 'survey-1',
        question_id: 'question-1',
        answer_id: 'answer-1',
        voter_key: '11111111-1111-4111-8111-111111111111',
      },
      {
        survey_id: 'survey-1',
        question_id: 'question-2',
        answer_id: 'answer-3',
        voter_key: '11111111-1111-4111-8111-111111111111',
      },
      {
        survey_id: 'survey-1',
        question_id: 'question-2',
        answer_id: 'answer-4',
        voter_key: '11111111-1111-4111-8111-111111111111',
      },
    ]);
    expect(localStorage.getItem('pollapp-voter-key')).toBe('11111111-1111-4111-8111-111111111111');
    expect(JSON.parse(localStorage.getItem('pollapp-completed-survey:survey-1') ?? '')).toEqual(
      selectedAnswers,
    );
  });

  it('should reuse an existing voter key', async () => {
    localStorage.setItem('pollapp-voter-key', 'known-voter');

    await service.submitVote(createSurvey(), { 'question-1': ['answer-2'] });

    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({ voter_key: 'known-voter' }),
    ]);
  });

  it('should skip the database insert when no answer was selected', async () => {
    await service.submitVote(createSurvey(), {});

    expect(insertMock).not.toHaveBeenCalled();
    expect(service.hasVoted('survey-1')).toBe(false);
  });

  it('should reject a second completed vote from the same browser', async () => {
    localStorage.setItem('pollapp-completed-survey:survey-1', '{}');

    await expect(
      service.submitVote(createSurvey(), { 'question-1': ['answer-1'] }),
    ).rejects.toThrow('already been completed');
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('should reject a duplicate request while the first vote is pending', async () => {
    let resolveInsert!: (value: { error: null }) => void;
    insertMock.mockImplementationOnce(
      () =>
        new Promise<{ error: null }>((resolve) => {
          resolveInsert = resolve;
        }),
    );

    const firstSubmission = service.submitVote(createSurvey(), {
      'question-1': ['answer-1'],
    });

    await expect(
      service.submitVote(createSurvey(), { 'question-1': ['answer-2'] }),
    ).rejects.toThrow('already being submitted');

    resolveInsert({ error: null });
    await firstSubmission;
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it('should release the pending state after a failed database insert', async () => {
    const databaseError = new Error('vote insert failed');
    insertMock
      .mockResolvedValueOnce({ error: databaseError })
      .mockResolvedValueOnce({ error: null });

    await expect(service.submitVote(createSurvey(), { 'question-1': ['answer-1'] })).rejects.toBe(
      databaseError,
    );

    await expect(
      service.submitVote(createSurvey(), { 'question-1': ['answer-1'] }),
    ).resolves.toBeUndefined();
    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it('should return valid selections from local storage without querying Supabase', async () => {
    const selectedAnswers = { 'question-1': ['answer-2'] };
    localStorage.setItem('pollapp-completed-survey:survey-1', JSON.stringify(selectedAnswers));

    await expect(service.getSelectedAnswers('survey-1')).resolves.toEqual(selectedAnswers);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it('should return an empty selection for a survey that was not completed', async () => {
    await expect(service.getSelectedAnswers('survey-1')).resolves.toEqual({});
    expect(selectMock).not.toHaveBeenCalled();
  });

  it('should reject invalid stored answer structures and use the legacy lookup', async () => {
    localStorage.setItem('pollapp-completed-survey:survey-1', JSON.stringify([]));

    await expect(service.getSelectedAnswers('survey-1')).resolves.toEqual({});
    expect(selectMock).toHaveBeenCalledWith('question_id, answer_id');
  });

  it('should restore legacy selections from Supabase, remove duplicates and cache them', async () => {
    localStorage.setItem('pollapp-completed-survey:survey-1', 'true');
    localStorage.setItem('pollapp-voter-key', 'legacy-voter');
    secondEqMock.mockResolvedValueOnce({
      data: [
        { question_id: 'question-1', answer_id: 'answer-1' },
        { question_id: 'question-1', answer_id: 'answer-1' },
        { question_id: 'question-2', answer_id: 'answer-3' },
      ],
      error: null,
    });

    const result = await service.getSelectedAnswers('survey-1');

    expect(selectMock).toHaveBeenCalledWith('question_id, answer_id');
    expect(firstEqMock).toHaveBeenCalledWith('survey_id', 'survey-1');
    expect(secondEqMock).toHaveBeenCalledWith('voter_key', 'legacy-voter');
    expect(result).toEqual({
      'question-1': ['answer-1'],
      'question-2': ['answer-3'],
    });
    expect(JSON.parse(localStorage.getItem('pollapp-completed-survey:survey-1') ?? '')).toEqual(
      result,
    );
  });

  it('should treat missing legacy database rows as an empty selection', async () => {
    localStorage.setItem('pollapp-completed-survey:survey-1', 'true');
    secondEqMock.mockResolvedValueOnce({ data: null, error: null });

    await expect(service.getSelectedAnswers('survey-1')).resolves.toEqual({});
  });

  it('should return an empty selection when restoring legacy votes fails', async () => {
    const databaseError = new Error('read failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.setItem('pollapp-completed-survey:survey-1', 'not-json');
    secondEqMock.mockResolvedValueOnce({ data: null, error: databaseError });

    await expect(service.getSelectedAnswers('survey-1')).resolves.toEqual({});
    expect(consoleError).toHaveBeenCalledWith(
      'Previously selected answers could not be loaded:',
      databaseError,
    );
  });

  function createSurvey(): Survey {
    return {
      id: 'survey-1',
      title: 'Favourite technology',
      category: 'technology-innovation',
      status: 'active',
      createdAt: '2026-09-13T10:00:00.000Z',
      endsAt: null,
      questions: [
        {
          id: 'question-1',
          surveyId: 'survey-1',
          title: 'Frontend framework?',
          allowMultipleChoice: false,
          answers: [
            { id: 'answer-1', questionId: 'question-1', text: 'Angular', votesCount: 0 },
            { id: 'answer-2', questionId: 'question-1', text: 'React', votesCount: 0 },
          ],
        },
        {
          id: 'question-2',
          surveyId: 'survey-1',
          title: 'Backend tools?',
          allowMultipleChoice: true,
          answers: [
            { id: 'answer-3', questionId: 'question-2', text: 'Django', votesCount: 0 },
            { id: 'answer-4', questionId: 'question-2', text: 'PostgreSQL', votesCount: 0 },
          ],
        },
      ],
    };
  }
});
