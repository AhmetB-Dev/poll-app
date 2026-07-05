import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { CreateSurvey } from './pages/create-survey/create-survey';
import { SurveyDetail } from './pages/survey-detail/survey-detail';
import { NotFound } from './pages/not-found/not-found';

/**
 * Application routes for PollApp.
 *
 * The survey detail route expects a survey id as URL parameter. The wildcard route
 * catches every unknown URL and displays the not-found page.
 */
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
    title: 'Poll Details',
  },
  {
    path: '**',
    component: NotFound,
    title: 'page not found',
  },
];
