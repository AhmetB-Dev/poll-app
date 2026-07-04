import { Answer } from './answer.model';
export interface Question {
  id: string;
  surveyId: string;
  title: string;
  allowMultipleChoice: boolean;
  answers: Answer[];
}
