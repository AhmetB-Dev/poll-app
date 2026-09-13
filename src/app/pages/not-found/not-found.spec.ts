import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotFound } from './not-found';

describe('NotFound', () => {
  let component: NotFound;
  let fixture: ComponentFixture<NotFound>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFound],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFound);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the fallback message', () => {
    const message = fixture.nativeElement.querySelector('p') as HTMLParagraphElement;

    expect(message.textContent).toContain('not-found works!');
  });
});
