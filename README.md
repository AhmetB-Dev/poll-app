# PollApp

**Responsive Angular application for creating surveys, collecting votes and exploring live results.**

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![SCSS](https://img.shields.io/badge/SCSS-Responsive_UI-CC6699?logo=sass&logoColor=white)](https://sass-lang.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Tests-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

[**Live Demo**](https://ahmet-balci.de/projects/poll-app/)


PollApp is a frontend-focused portfolio project built around dynamic forms and interactive survey workflows. Users can create surveys with flexible question structures, vote and immediately inspect the current result distribution.

## What I focused on

- **Dynamic Reactive Forms** for adding and removing questions and answer options
- **Angular Signals** for predictable local state
- **Reusable components** instead of page-specific duplication
- **Accessible custom controls** with clear validation and interaction states
- **Responsive layouts** designed for desktop and mobile
- **Persistent survey data** through Supabase and PostgreSQL

## Core features

- Browse active and completed surveys
- Filter surveys by category
- Highlight surveys that end soon
- Create surveys with multiple questions
- Add single-choice and multiple-choice questions
- Add or remove answer options dynamically
- Validate the complete survey before publishing
- Submit votes and display result percentages
- Handle empty, loading and error states
- Use the application across desktop and mobile layouts

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Angular 21 |
| Language | TypeScript 5.9 |
| Forms | Angular Reactive Forms |
| State | Angular Signals |
| Routing | Angular Router |
| Styling | SCSS |
| Data service | Supabase |
| Database | PostgreSQL |
| Testing | Vitest |

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Browse and filter surveys |
| `/create` | Build and publish a survey |
| `/survey/:id` | Vote and view results |
| `**` | Display the not-found page |

## Run locally

### Requirements

- Node.js
- npm
- A Supabase project

```bash
git clone https://github.com/AhmetB-Dev/poll-app.git
cd poll-app
npm install
```

Configure your Supabase URL and publishable key in the Angular environment:

```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-publishable-key',
};
```

Never place a Supabase `service_role` key in frontend code.

```bash
npm start
```

Create a production build with:

```bash
npm run build
```

## Tests

```bash
npm test
```

The tests focus on meaningful application behavior:

- dynamic questions and answers
- survey-form validation
- survey creation
- single- and multiple-choice voting
- filtering
- service behavior and error handling

## Current scope

PollApp demonstrates frontend architecture and interaction design rather than production-grade election security.

- No user accounts or survey ownership
- Browser-local voter identification instead of strong duplicate-vote protection
- Survey creation is not wrapped in a single database transaction
- Results refresh after voting instead of using realtime subscriptions

These limitations are documented deliberately so the project's scope remains transparent.

---

Built as part of my Fullstack Developer portfolio.
