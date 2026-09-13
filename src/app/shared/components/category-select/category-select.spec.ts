import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategorySelect } from './category-select';

describe('CategorySelect', () => {
  let component: CategorySelect;
  let fixture: ComponentFixture<CategorySelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategorySelect],
    }).compileComponents();

    fixture = TestBed.createComponent(CategorySelect);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should render a closed, accessible category trigger', () => {
    const trigger = fixture.nativeElement.querySelector(
      '.category-select__trigger',
    ) as HTMLButtonElement;

    expect(trigger.textContent).toContain('Choose category');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(component['listboxId']);
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('should open and close the menu through the trigger', () => {
    const closed = vi.spyOn(component.closed, 'emit');
    const trigger = fixture.nativeElement.querySelector(
      '.category-select__trigger',
    ) as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();

    expect(component['menuOpen']).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('[role="option"]')).toHaveLength(6);

    trigger.click();
    fixture.detectChanges();

    expect(component['menuOpen']).toBe(false);
    expect(closed).toHaveBeenCalledOnce();
  });

  it('should emit the selected value and close the menu', () => {
    const categoryChange = vi.spyOn(component.categoryChange, 'emit');
    const closed = vi.spyOn(component.closed, 'emit');
    const trigger = fixture.nativeElement.querySelector(
      '.category-select__trigger',
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll(
      '.category-select__option',
    ) as NodeListOf<HTMLButtonElement>;
    options[2].click();

    expect(categoryChange).toHaveBeenCalledWith('gaming');
    expect(closed).toHaveBeenCalledOnce();
    expect(component['menuOpen']).toBe(false);
  });

  it('should display the label for the selected category', () => {
    fixture.componentRef.setInput('value', 'health');
    fixture.detectChanges();

    const selectedLabel = fixture.nativeElement.querySelector(
      '.category-select__selected-category',
    ) as HTMLElement;

    expect(component['hasSelectedCategory']).toBe(true);
    expect(component['selectedCategoryLabel']).toBe('Health & Wellness');
    expect(selectedLabel.textContent).toContain('Health & Wellness');
  });

  it('should keep an unknown selected value without inventing a label', () => {
    fixture.componentRef.setInput('value', 'unknown-category');
    fixture.detectChanges();

    expect(component['hasSelectedCategory']).toBe(true);
    expect(component['selectedCategoryLabel']).toBe('');
  });

  it('should use the correct icon for open and hover states', () => {
    expect(component['categoryIconSrc']).toBe('assets/icons/arrow_drop_down.svg');

    component['triggerHovered'] = true;
    expect(component['categoryIconSrc']).toBe('assets/icons/arrow_drop_down_orange.svg');

    component['menuOpen'] = true;
    component['triggerHovered'] = false;
    expect(component['categoryIconSrc']).toBe('assets/icons/arrow_drop_up_orange.svg');

    component['triggerHovered'] = true;
    expect(component['categoryIconSrc']).toBe('assets/icons/arrow_drop_up_white.svg');
  });

  it('should emit closed only when an open menu is actually closed', () => {
    const closed = vi.spyOn(component.closed, 'emit');

    component['closeMenu']();
    expect(closed).not.toHaveBeenCalled();

    component['menuOpen'] = true;
    component['closeMenu']();
    expect(closed).toHaveBeenCalledOnce();
  });

  it('should close for outside clicks but ignore clicks inside the component', () => {
    const closed = vi.spyOn(component.closed, 'emit');
    component['menuOpen'] = true;

    component['closeOnOutsideClick'](fixture.nativeElement.querySelector('button'));
    expect(component['menuOpen']).toBe(true);

    const outsideElement = document.createElement('div');
    component['closeOnOutsideClick'](outsideElement);

    expect(component['menuOpen']).toBe(false);
    expect(closed).toHaveBeenCalledOnce();
  });

  it('should assign a unique listbox id to every instance', () => {
    const secondFixture = TestBed.createComponent(CategorySelect);
    secondFixture.detectChanges();

    expect(secondFixture.componentInstance['listboxId']).not.toBe(component['listboxId']);

    secondFixture.destroy();
  });
});
