import { Question } from './question.model';

export type SurveyStatus = 'draft' | 'active' | 'closed';

export interface Survey {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: SurveyStatus;
  questions: Question[];

  createdAt: string;
  updatedAt?: string;
  endsAt: string | null;
}
