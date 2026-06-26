import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { CreateSurvey } from './pages/create-survey/create-survey';
import { SurveyDetail } from './pages/survey-detail/survey-detail';
import { NotFound } from './pages/not-found/not-found';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'PollApp',
  },
  {
    path: 'create',
    component: CreateSurvey,
    title: 'Create Poll',
  },
  {
    path: 'survey/:id',
    component: SurveyDetail,
    title: 'Poll Deatails',
  },
  {
    path: '**',
    component: NotFound,
    title: 'page not found',
  },
];
