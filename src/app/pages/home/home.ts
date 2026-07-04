import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SurveyService } from '../../features/surveys/services/survey.service';
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

  protected readonly categoryOptions = [
    { label: 'Team activities', value: 'team-activities' },
    { label: 'Health & wellness', value: 'health' },
    { label: 'Gaming & entertainment', value: 'gaming' },
    { label: 'Workplace & workflow', value: 'workplace' },
  ];

  protected readonly surveys = computed(() => this.surveyService.allSurveys());

  protected readonly endingSoonSurveys = computed(() =>
    this.surveys()
      .filter((survey) => this.isActiveSurvey(survey) && survey.endsAt)
      .sort((firstSurvey, secondSurvey) => {
        return new Date(firstSurvey.endsAt!).getTime() - new Date(secondSurvey.endsAt!).getTime();
      })
      .slice(0, 3),
  );

  protected readonly filteredSurveys = computed(() => {
    const selectedStatus = this.selectedStatus();
    const selectedCategory = this.selectedCategory();

    return this.surveys().filter((survey) => {
      const matchesStatus =
        selectedStatus === 'active' ? this.isActiveSurvey(survey) : this.isPastSurvey(survey);

      const matchesCategory = selectedCategory === '' || survey.category === selectedCategory;

      return matchesStatus && matchesCategory;
    });
  });

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

    const oneDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((new Date(survey.endsAt).getTime() - Date.now()) / oneDay);

    if (daysLeft <= 0) {
      return 'Ends today';
    }

    if (daysLeft === 1) {
      return 'Ends tomorrow';
    }

    return `Ends in ${daysLeft} days`;
  }

  @HostListener('document:click', ['$event'])
  protected closeCategoryMenuOnOutsideClick(event: MouseEvent): void {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (!target.closest('.home-surveys__category-select')) {
      this.categoryMenuOpen = false;
    }
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
