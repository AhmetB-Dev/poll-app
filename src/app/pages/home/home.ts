import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SurveyService } from '../../features/surveys/services/survey.service';
import { CategorySelect } from '../../shared/components/category-select/category-select';
import { SURVEY_CATEGORIES } from '../../shared/constants/survey-categories';
import { Survey } from '../../shared/models/survey.model';

/** Filter state for the survey list on the home page. */
type SurveyStatusFilter = 'active' | 'past';

/**
 * Home page component for browsing existing surveys.
 *
 * Responsibilities:
 * - reads surveys from SurveyService
 * - filters surveys by status and category
 * - displays ending-soon surveys
 * - reacts to category selections from the shared dropdown
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, CategorySelect],
  templateUrl: './home.html',
  styleUrls: ['./home.scss', './home-responsive.scss'],
})
export class Home {
  private readonly surveyService = inject(SurveyService);

  /** Currently selected survey status filter. */
  protected readonly selectedStatus = signal<SurveyStatusFilter>('active');

  /** Currently selected category value; an empty string means all categories. */
  protected readonly selectedCategory = signal('');

  /** Central list of available survey categories. */
  protected readonly categoryOptions = SURVEY_CATEGORIES;

  /** Reactive list of all loaded surveys from the service. */
  protected readonly surveys = computed(() => this.surveyService.allSurveys());

  /** Shows all active surveys with an end date, sorted from earliest to latest. */
  protected readonly endingSoonSurveys = computed(() =>
    this.surveys()
      .filter((survey) => this.isActiveSurvey(survey) && survey.endsAt)
      .sort((firstSurvey, secondSurvey) => this.sortByEndDate(firstSurvey, secondSurvey)),
  );

  /** Survey list after applying the selected status and category filters. */
  protected readonly filteredSurveys = computed(() =>
    this.filterSurveys(this.selectedStatus(), this.selectedCategory()),
  );

  /** Updates the active/past filter shown on the home page. */
  protected selectStatus(status: SurveyStatusFilter): void {
    this.selectedStatus.set(status);
  }

  /** Applies the category selected in the shared dropdown. */
  protected selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  /** Returns a readable category label for a stored category value. */
  protected categoryLabel(categoryValue: string): string {
    return (
      this.categoryOptions.find((category) => category.value === categoryValue)?.label ??
      categoryValue
    );
  }

  /** Returns the visible end-date label for an ending-soon survey card. */
  protected endingSoonLabel(survey: Survey): string {
    if (!survey.endsAt) {
      return 'No end date';
    }

    return this.formatDaysLeft(this.getDaysLeft(survey.endsAt));
  }

  /** Filters surveys by selected status and selected category. */
  private filterSurveys(status: SurveyStatusFilter, category: string): Survey[] {
    return this.surveys().filter((survey) => {
      return this.matchesStatus(survey, status) && this.matchesCategory(survey, category);
    });
  }

  /** Checks whether a survey belongs to the selected active/past status. */
  private matchesStatus(survey: Survey, status: SurveyStatusFilter): boolean {
    return status === 'active' ? this.isActiveSurvey(survey) : this.isPastSurvey(survey);
  }

  /** Checks whether a survey matches the selected category filter. */
  private matchesCategory(survey: Survey, category: string): boolean {
    return category === '' || survey.category === category;
  }

  /** Sorts two surveys by their end date from earliest to latest. */
  private sortByEndDate(firstSurvey: Survey, secondSurvey: Survey): number {
    return new Date(firstSurvey.endsAt!).getTime() - new Date(secondSurvey.endsAt!).getTime();
  }

  /** Calculates how many full/partial days are left until the survey end date. */
  private getDaysLeft(endDate: string): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.ceil((new Date(endDate).getTime() - Date.now()) / oneDay);
  }

  /** Converts a numeric day difference into user-facing text. */
  private formatDaysLeft(daysLeft: number): string {
    if (daysLeft <= 0) {
      return 'Ends today';
    }

    return daysLeft === 1 ? 'Ends tomorrow' : `Ends in ${daysLeft} days`;
  }

  /** Returns true when a survey has no end date or its end date is still in the future. */
  private isActiveSurvey(survey: Survey): boolean {
    if (!survey.endsAt) {
      return true;
    }

    return new Date(survey.endsAt).getTime() >= Date.now();
  }

  /** Returns true when a survey has an end date that is already in the past. */
  private isPastSurvey(survey: Survey): boolean {
    if (!survey.endsAt) {
      return false;
    }

    return new Date(survey.endsAt).getTime() < Date.now();
  }
}
