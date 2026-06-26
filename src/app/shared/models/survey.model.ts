import { Question } from './question.model';

export type SurveyStatus = 'draft' | 'active' | 'closed';

export interface Survey {
  id: string;
  title: string;
  description?: string;
  questions: Question[];

  status: SurveyStatus;

  createdAt: string;
  updatedAt?: string;
  endsAt: string | null;
}
