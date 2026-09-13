import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SurveyService } from '../../features/surveys/services/survey.service';
import { Survey } from '../../shared/models/survey.model';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let surveysState: WritableSignal<Survey[]>;

  beforeEach(async () => {
    surveysState = signal<Survey[]>([]);

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        {
          provide: SurveyService,
          useValue: { allSurveys: surveysState.asReadonly() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show active surveys by default', () => {
    surveysState.set([
      createSurvey('no-end', null, 'gaming'),
      createSurvey('future', daysFromNow(2), 'education-learning'),
      createSurvey('past', daysFromNow(-2), 'gaming'),
    ]);

    expect(component['filteredSurveys']().map(({ id }) => id)).toEqual(['no-end', 'future']);
  });

  it('should filter surveys by status and category', () => {
    surveysState.set([
      createSurvey('active-gaming', daysFromNow(2), 'gaming'),
      createSurvey('active-health', daysFromNow(3), 'health'),
      createSurvey('past-gaming', daysFromNow(-2), 'gaming'),
      createSurvey('past-health', daysFromNow(-3), 'health'),
      createSurvey('without-end', null, 'health'),
    ]);

    component['selectCategory']('gaming');
    expect(component['filteredSurveys']().map(({ id }) => id)).toEqual(['active-gaming']);

    component['selectStatus']('past');
    expect(component['filteredSurveys']().map(({ id }) => id)).toEqual(['past-gaming']);

    component['selectCategory']('');
    expect(component['filteredSurveys']().map(({ id }) => id)).toEqual([
      'past-gaming',
      'past-health',
    ]);
  });

  it('should sort ending-soon surveys by date and limit the result to three', () => {
    surveysState.set([
      createSurvey('fourth', daysFromNow(4)),
      createSurvey('second', daysFromNow(2)),
      createSurvey('without-end', null),
      createSurvey('first', daysFromNow(1)),
      createSurvey('past', daysFromNow(-1)),
      createSurvey('third', daysFromNow(3)),
    ]);

    expect(component['endingSoonSurveys']().map(({ id }) => id)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('should resolve known category labels and preserve unknown values', () => {
    expect(component['categoryLabel']('health')).toBe('Health & Wellness');
    expect(component['categoryLabel']('custom-category')).toBe('custom-category');
  });

  it('should format end-date labels for missing, current and future dates', () => {
    expect(component['endingSoonLabel'](createSurvey('without-end', null))).toBe('No end date');
    expect(component['endingSoonLabel'](createSurvey('today', new Date().toISOString()))).toBe(
      'Ends today',
    );
    expect(component['endingSoonLabel'](createSurvey('tomorrow', daysFromNow(1)))).toBe(
      'Ends tomorrow',
    );
    expect(component['endingSoonLabel'](createSurvey('later', daysFromNow(4)))).toBe(
      'Ends in 4 days',
    );
  });

  it('should update the selected filter signals', () => {
    component['selectStatus']('past');
    component['selectCategory']('technology-innovation');

    expect(component['selectedStatus']()).toBe('past');
    expect(component['selectedCategory']()).toBe('technology-innovation');
  });

  function createSurvey(id: string, endsAt: string | null, category = 'team-activities'): Survey {
    return {
      id,
      title: `Survey ${id}`,
      category,
      status: 'active',
      questions: [],
      createdAt: '2026-09-13T10:00:00.000Z',
      endsAt,
    };
  }

  function daysFromNow(days: number): string {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }
});
