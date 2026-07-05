import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root shell component of the Angular app.
 *
 * It only renders the RouterOutlet because page content is controlled by the
 * configured routes.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
