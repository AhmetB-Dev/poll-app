import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CreateSurvey } from './create-survey';

describe('CreateSurvey', () => {
  let component: CreateSurvey;
  let fixture: ComponentFixture<CreateSurvey>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateSurvey],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateSurvey);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
