import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SurveyService } from '../../features/surveys/services/survey.service';
import { SURVEY_CATEGORIES } from '../../shared/constants/survey-categories';
import { Survey } from '../../shared/models/survey.model';

type SurveyStatusFilter = 'active' | 'past';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly surveyService = inject(SurveyService);

  protected readonly selectedStatus = signal<SurveyStatusFilter>('active');
  protected readonly selectedCategory = signal('');

  protected categoryMenuOpen = false;
  protected categoryTriggerHovered = false;

  protected readonly categoryOptions = SURVEY_CATEGORIES;

  protected readonly surveys = computed(() => this.surveyService.allSurveys());

  protected readonly endingSoonSurveys = computed(() =>
    this.surveys()
      .filter((survey) => this.isActiveSurvey(survey) && survey.endsAt)
      .sort((firstSurvey, secondSurvey) => this.sortByEndDate(firstSurvey, secondSurvey))
      .slice(0, 3),
  );

  protected readonly filteredSurveys = computed(() =>
    this.filterSurveys(this.selectedStatus(), this.selectedCategory()),
  );

  protected get selectedCategoryLabel(): string {
    return (
      this.categoryOptions.find((category) => category.value === this.selectedCategory())?.label ??
      ''
    );
  }

  protected get hasSelectedCategory(): boolean {
    return this.selectedCategory() !== '';
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

  protected selectStatus(status: SurveyStatusFilter): void {
    this.selectedStatus.set(status);
  }

  protected toggleCategoryMenu(): void {
    this.categoryMenuOpen = !this.categoryMenuOpen;
  }

  protected closeCategoryMenu(): void {
    this.categoryMenuOpen = false;
  }

  protected selectCategory(category: string): void {
    this.selectedCategory.set(category);
    this.categoryMenuOpen = false;
  }

  protected categoryLabel(categoryValue: string): string {
    return (
      this.categoryOptions.find((category) => category.value === categoryValue)?.label ??
      categoryValue
    );
  }

  protected endingSoonLabel(survey: Survey): string {
    if (!survey.endsAt) {
      return 'No end date';
    }

    return this.formatDaysLeft(this.getDaysLeft(survey.endsAt));
  }

  @HostListener('document:click', ['$event'])
  protected closeCategoryMenuOnOutsideClick(event: MouseEvent): void {
    const target = event.target;

    if (target instanceof HTMLElement && !target.closest('.home-surveys__category-select')) {
      this.categoryMenuOpen = false;
    }
  }

  private filterSurveys(status: SurveyStatusFilter, category: string): Survey[] {
    return this.surveys().filter((survey) => {
      return this.matchesStatus(survey, status) && this.matchesCategory(survey, category);
    });
  }

  private matchesStatus(survey: Survey, status: SurveyStatusFilter): boolean {
    return status === 'active' ? this.isActiveSurvey(survey) : this.isPastSurvey(survey);
  }

  private matchesCategory(survey: Survey, category: string): boolean {
    return category === '' || survey.category === category;
  }

  private sortByEndDate(firstSurvey: Survey, secondSurvey: Survey): number {
    return new Date(firstSurvey.endsAt!).getTime() - new Date(secondSurvey.endsAt!).getTime();
  }

  private getDaysLeft(endDate: string): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.ceil((new Date(endDate).getTime() - Date.now()) / oneDay);
  }

  private formatDaysLeft(daysLeft: number): string {
    if (daysLeft <= 0) {
      return 'Ends today';
    }

    return daysLeft === 1 ? 'Ends tomorrow' : `Ends in ${daysLeft} days`;
  }

  private isActiveSurvey(survey: Survey): boolean {
    if (!survey.endsAt) {
      return true;
    }

    return new Date(survey.endsAt).getTime() >= Date.now();
  }

  private isPastSurvey(survey: Survey): boolean {
    if (!survey.endsAt) {
      return false;
    }

    return new Date(survey.endsAt).getTime() < Date.now();
  }
}
