# PollApp

Responsive Angular application for creating surveys, collecting votes and viewing results.

[Live Demo](https://ahmet-balci.de/projects/poll-app/)

## Overview

PollApp is a frontend-focused portfolio project built with Angular, TypeScript, SCSS and Supabase.

The project focuses on dynamic Reactive Forms, reusable components, Angular Signals, responsive layouts and persistent data.

## Features

- Browse active and past surveys
- Filter surveys by category
- Highlight surveys ending soon
- Create surveys with dynamic questions and answer options
- Single-choice and multiple-choice questions
- Form validation before publishing
- Submit votes
- Display current result percentages
- Responsive desktop and mobile layouts
- Accessible custom form controls

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Angular |
| Language | TypeScript |
| Forms | Angular Reactive Forms |
| State | Angular Signals |
| Routing | Angular Router |
| Styling | SCSS |
| Backend service | Supabase |
| Database | PostgreSQL |
| Testing | Vitest |

## Main Routes

| Route | Description |
| --- | --- |
| `/` | Browse surveys |
| `/create` | Create a survey |
| `/survey/:id` | Vote and view results |
| `**` | Not-found page |

## Local Setup

### Requirements

- Node.js
- npm
- Supabase project

```bash
git clone https://github.com/AhmetB-Dev/poll-app.git
cd poll-app
npm install
```

Configure the Supabase URL and publishable key in the environment configuration.

```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-publishable-key',
};
```

Never expose a Supabase `service_role` key in frontend code.

Start the application:

```bash
npm start
```

Build:

```bash
npm run build
```

## Tests

```bash
npm test
```

The test suite focuses on application logic such as:

- survey form validation
- dynamic questions and answers
- survey creation
- single-choice and multiple-choice behavior
- voting
- filtering
- service behavior and error handling

The goal is to test meaningful behavior rather than inflate coverage with trivial UI tests.

## Data Model

PollApp uses Supabase/PostgreSQL for surveys, questions, answers and votes.

Database access must be protected with appropriate Row Level Security policies.

## Current Limitations

PollApp is a portfolio project, not a production voting platform.

Current limitations include:

- no user authentication
- browser-local voter identification is not strong duplicate-vote protection
- survey creation is not wrapped in one database transaction
- results refresh after voting instead of using realtime subscriptions

## Possible Future Improvements

- authentication and survey ownership
- transactional survey creation
- stronger duplicate-vote protection
- realtime result updates
- versioned database migrations

---

Built as part of my Fullstack Developer portfolio.
