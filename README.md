# PollApp

Create surveys, collect votes, and follow the results.

![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)
![SCSS](https://img.shields.io/badge/Styles-SCSS-CC6699?logo=sass&logoColor=white)

## Overview

PollApp is a responsive survey application built with Angular 21 and Supabase. It allows users to browse and filter surveys, create surveys with dynamic questions, submit votes, and view the current results.

The project focuses on a clear feature-based Angular architecture, reusable UI components, reactive state with signals, validated reactive forms, and persistent data stored in Supabase.

## Features

- Browse active and past surveys
- Display up to three surveys that are ending soon
- Filter surveys by category
- Create surveys with an optional description and end date
- Add or remove questions and answer options dynamically
- Configure single-choice or multiple-choice questions
- Validate survey data before publishing
- Submit answers for every question in a survey
- Reload and display vote percentages after a submission
- Expand or collapse the results panel
- Responsive layouts for desktop and mobile devices
- Custom controls with semantic labels and ARIA attributes

## Tech Stack

| Area     | Technology                      |
| -------- | ------------------------------- |
| Frontend | Angular 21                      |
| Language | TypeScript                      |
| Forms    | Angular Reactive Forms          |
| State    | Angular Signals                 |
| Routing  | Angular Router                  |
| Styling  | SCSS with BEM-style class names |
| Backend  | Supabase                        |
| Database | PostgreSQL                      |

## Project Structure

```text
src/app/
├── core/
│   └── supabase/             # Supabase client configuration
├── features/
│   ├── surveys/services/     # Survey loading and publishing
│   └── votes/services/       # Vote persistence
├── pages/
│   ├── home/                 # Survey overview and filters
│   ├── create-survey/        # Dynamic survey form
│   ├── survey-detail/        # Voting and result display
│   └── not-found/            # Fallback route
└── shared/
    ├── components/           # Reusable UI components
    ├── constants/            # Survey categories
    └── models/               # Survey, question, answer, and vote models
```

## Getting Started

### Prerequisites

- Node.js and npm
- An Angular 21-compatible development environment
- A Supabase project

### Installation

```bash
git clone <your-repository-url>
cd poll-app
npm install
```

### Environment Configuration

Configure the Supabase URL and publishable key in `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-publishable-key',
};
```

Only use a Supabase publishable/anonymous key in frontend code. Never expose a `service_role` key. Database access must be protected with appropriate Row Level Security policies.

### Supabase Requirements

The application expects the following database resources:

| Resource         | Purpose                                         |
| ---------------- | ----------------------------------------------- |
| `surveys`        | Survey metadata, status, category, and end date |
| `questions`      | Questions assigned to a survey                  |
| `answers`        | Answer options assigned to a question           |
| `votes`          | Submitted answer selections                     |
| `answer_results` | Read-only vote totals used by the result view   |

The category constraint in Supabase must accept the same values used by the frontend:

```text
team-activities
health
gaming
education-learning
lifestyle-preferences
technology-innovation
```

Apply the required database schema, relationships, constraints, result view, and Row Level Security policies before starting the application.

### Development Server

```bash
npm start
```

Open the local URL shown by the Angular development server.

### Build

```bash
npm run build
```

### Tests

```bash
npm test
```

## Routes

| Route         | Description                          |
| ------------- | ------------------------------------ |
| `/`           | Browse and filter surveys            |
| `/create`     | Create and publish a survey          |
| `/survey/:id` | Answer a survey and view its results |
| `**`          | Not-found page                       |

## Current Limitations

- The application does not currently include user authentication.
- A browser-local voter key identifies a browser, but it is not a secure user identity or complete protection against duplicate votes.
- Survey, question, and answer records are currently created through sequential frontend requests. A production version should use a Supabase RPC/PostgreSQL function so the operation runs as one transaction.
- Results are refreshed after a local vote submission; Supabase Realtime subscriptions are not implemented yet.
- The Supabase schema and security policies must be configured separately.

## Planned Improvements

- Add authentication and survey ownership
- Create surveys through one transactional database function
- Strengthen duplicate-vote protection
- Add real-time result updates
- Add versioned Supabase migrations and seed data
- Expand automated unit and integration tests
- Add deployment and live-demo links

## Project Status

PollApp is under active development. It is currently a portfolio and learning project and is not yet intended for production use.
