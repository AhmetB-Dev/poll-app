import { routes } from './app.routes';
import { CreateSurvey } from './pages/create-survey/create-survey';
import { Home } from './pages/home/home';
import { NotFound } from './pages/not-found/not-found';
import { SurveyDetail } from './pages/survey-detail/survey-detail';

describe('application routes', () => {
  it('should map every public route to the expected page', () => {
    expect(routes).toEqual([
      expect.objectContaining({ path: '', component: Home, title: 'PollApp' }),
      expect.objectContaining({ path: 'create', component: CreateSurvey, title: 'Create Poll' }),
      expect.objectContaining({
        path: 'survey/:id',
        component: SurveyDetail,
        title: 'Poll Details',
      }),
      expect.objectContaining({ path: '**', component: NotFound, title: 'page not found' }),
    ]);
  });

  it('should keep the wildcard route last', () => {
    expect(routes.at(-1)?.path).toBe('**');
  });
});
