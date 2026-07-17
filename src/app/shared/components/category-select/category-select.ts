import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

import { SURVEY_CATEGORIES } from '../../constants/survey-categories';

export type CategorySelectVariant = 'home' | 'create';

/**
 * Shared category dropdown used for filtering and creating surveys.
 *
 * The parent owns the selected value. This component owns only the reusable UI
 * behaviour: menu state, hover icon, outside click and keyboard closing.
 */
@Component({
  selector: 'app-category-select',
  templateUrl: './category-select.html',
  styleUrl: './category-select.scss',
})
export class CategorySelect {
  private static nextListboxId = 0;

  /** Current category value controlled by the parent page. */
  @Input() value = '';

  /** Text shown in the dropdown trigger. */
  @Input() placeholder = 'Choose category';

  /** Accessible name for the category list. */
  @Input() ariaLabel = 'Survey categories';

  /** Keeps the existing page-specific spacing while sharing all behaviour. */
  @Input() variant: CategorySelectVariant = 'home';

  /** Emits the internal category value selected by the user. */
  @Output() readonly categoryChange = new EventEmitter<string>();

  /** Notifies form pages when the menu closes so the field can be marked touched. */
  @Output() readonly closed = new EventEmitter<void>();

  protected readonly categoryOptions = SURVEY_CATEGORIES;
  protected readonly listboxId = `category-select-list-${CategorySelect.nextListboxId++}`;
  protected menuOpen = false;
  protected triggerHovered = false;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  protected get selectedCategoryLabel(): string {
    return this.categoryOptions.find((category) => category.value === this.value)?.label ?? '';
  }

  protected get hasSelectedCategory(): boolean {
    return this.value !== '';
  }

  /** Uses the same hover/open icon behaviour on every page. */
  protected get categoryIconSrc(): string {
    if (this.menuOpen && this.triggerHovered) {
      return 'assets/icons/arrow_drop_up_white.svg';
    }

    if (this.menuOpen) {
      return 'assets/icons/arrow_drop_up_orange.svg';
    }

    if (this.triggerHovered) {
      return 'assets/icons/arrow_drop_down_orange.svg';
    }

    return 'assets/icons/arrow_drop_down.svg';
  }

  protected toggleMenu(): void {
    if (this.menuOpen) {
      this.closeMenu();
      return;
    }

    this.menuOpen = true;
  }

  protected closeMenu(): void {
    if (!this.menuOpen) {
      return;
    }

    this.menuOpen = false;
    this.closed.emit();
  }

  protected selectCategory(value: string): void {
    this.categoryChange.emit(value);
    this.menuOpen = false;
    this.closed.emit();
  }

  /** Closes only this component when a click happens outside of it. */
  @HostListener('document:click', ['$event.target'])
  protected closeOnOutsideClick(target: EventTarget | null): void {
    if (target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }
}
