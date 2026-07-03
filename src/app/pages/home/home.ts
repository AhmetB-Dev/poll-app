import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SurveyService } from '../../features/surveys/services/survey.service';
import { Survey } from '../../shared/models/survey.model';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly surveyService = inject(SurveyService);

  protected readonly searchTerm = signal('');
  protected readonly selectedCategory = signal('All');

  protected categoryMenuOpen = false;
  protected categoryTriggerHovered = false;

  protected readonly categoryOptions = [
    { label: 'Team activities', value: 'team-activities' },
    { label: 'Health & wellness', value: 'health' },
    { label: 'Gaming & entertainment', value: 'gaming' },
    { label: 'Workplace & workflow', value: 'workplace' },
  ];

  protected readonly surveys = computed(() => this.surveyService.allSurveys());

  protected readonly filteredSurveys = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    const category = this.selectedCategory();

    return this.surveys().filter((survey) => {
      const matchesSearch =
        survey.title.toLowerCase().includes(search) ||
        survey.description?.toLowerCase().includes(search) ||
        survey.category.toLowerCase().includes(search);

      const matchesCategory = category === 'All' || survey.category === category;

      return matchesSearch && matchesCategory;
    });
  });

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

  protected get selectedCategoryLabel(): string {
    return (
      this.categoryOptions.find((category) => category.value === this.selectedCategory())?.label ??
      'All categories'
    );
  }

  protected get hasSelectedCategory(): boolean {
    return this.selectedCategory() !== 'All';
  }

  protected updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  protected totalVotes(survey: Survey): number {
    return survey.questions.reduce((surveyTotal, question) => {
      const questionVotes = question.answers.reduce(
        (answerTotal, answer) => answerTotal + answer.votesCount,
        0,
      );

      return surveyTotal + questionVotes;
    }, 0);
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
}
