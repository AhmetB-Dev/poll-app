import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SurveyService } from '../../features/surveys/services/survey.service';
import { Survey } from '../../shared/models/survey.model';
interface SurveyPreview {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'draft' | 'closed';
  endsAt: string;
  votesCount: number;
}

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

  protected readonly categories = ['All', 'team-activities', 'health', 'gaming', 'workplace'];

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

  protected updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  protected selectCategory(category: string): void {
    this.selectedCategory.set(category);
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
}
