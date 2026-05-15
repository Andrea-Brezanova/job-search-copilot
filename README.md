# AI Job Copilot

AI Job Copilot is a Next.js SaaS app for generating, editing, saving, and tracking job application materials.

It is built around a document-first workflow:
- generate a tailored cover letter and application email from a resume and job description
- review and edit the drafts
- save the application
- track status, follow-ups, and notes over time

The product direction is a professional document/workflow tool rather than a generic dashboard.

## What the App Does

Current end-user capabilities:
- logged-out landing page with auth
- email/password sign in and sign up via Supabase Auth
- saved default resume support
- resume upload and text parsing
- pasted job description analysis
- deterministic job/profile parsing
- fit summary generation
- cover letter generation
- application email generation
- editable document drafts
- export cover letter as PDF or DOCX
- copy email and open Gmail compose links
- save applications per user
- applications dashboard
- application detail / control center
- status tracking
- follow-up email generation
- onboarding for first-time users

## Core Product Flow

1. Sign in or continue in guest mode
2. Upload or paste a resume
3. Paste a job description
4. Generate an application package
5. Review and edit:
   - cover letter
   - application email
   - fit summary
6. Save the application
7. Track status, follow-up dates, and notes from the applications area

## Tech Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- Supabase
  - Auth
  - Postgres persistence
- OpenAI Responses API
- Vitest
- ESLint

## Architecture Overview

The app is intentionally split into a few clear layers.

### 1. App / routes

`src/app/`

Owns:
- page routing
- API route handlers
- applications dashboard and detail route entrypoints
- global layout and CSS

Important routes:
- `/`
  landing page for logged-out users, workspace for signed-in users
- `/applications`
  saved applications dashboard
- `/applications/[id]`
  application detail / control center

Important API routes:
- `/api/generate-application-package`
- `/api/applications`
- `/api/applications/[id]`
- `/api/applications/[id]/follow-up`
- `/api/resume-default`

### 2. Components

`src/components/`

Owns:
- reusable UI for forms, documents, onboarding, save flow, auth, and workspace composition

`src/components/ui/`

Owns:
- shared visual system primitives
- app shell
- document and metadata surfaces
- status pills
- metric strips
- application rows
- shared button styling helpers

### 3. Hooks

`src/hooks/`

Owns client-side orchestration for:
- resume upload
- generation state
- default resume behavior
- first-time onboarding state

### 4. Domain / business logic

`src/lib/`

Key areas:
- `applications/`
  status action logic and helpers
- `db/`
  Supabase access helpers and query layer
- `engines/`
  profile parsing, job parsing, fit analysis, positioning, and application generation orchestration
- `engines/applicationEngine/`
  split modules for evidence, stories, payload building, and finalization
- `llm/`
  OpenAI client wrapper
- `types/`
  shared app/domain types

## Directory Structure

```text
src/
├─ app/
│  ├─ api/
│  │  ├─ __tests__/
│  │  ├─ applications/
│  │  ├─ debug/
│  │  ├─ generate-application-package/
│  │  ├─ parse-profile/
│  │  ├─ parse-resume/
│  │  └─ resume-default/
│  ├─ applications/
│  │  ├─ [id]/
│  │  └─ page.tsx
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ components/
│  ├─ ui/
│  ├─ ApplicationDocs.tsx
│  ├─ ApplicationSavePanel.tsx
│  ├─ AppHeader.tsx
│  ├─ AuthPanel.tsx
│  ├─ FitResult.tsx
│  ├─ FirstSaveSuccess.tsx
│  ├─ JobForm.tsx
│  ├─ OnboardingPrompt.tsx
│  ├─ ResumeForm.tsx
│  └─ Workspace.tsx
├─ hooks/
├─ lib/
│  ├─ applications/
│  ├─ db/
│  ├─ engines/
│  ├─ llm/
│  ├─ parsers/
│  └─ types/
└─ types/
```

## Generation Pipeline

The generation flow is intentionally deterministic up until the final OpenAI call.

High-level flow:

1. Resume text is parsed into a structured profile
2. Job description text is parsed into a structured job snapshot
3. Fit analysis is calculated deterministically
4. Application payload is built from parsed profile, parsed job, and selected evidence
5. OpenAI generates:
   - cover letter
   - application email
   - summary content
6. Finalization logic cleans and normalizes the output
7. The user edits and saves the result

Important note:
- parsing and fit evaluation are deterministic
- the LLM is used for content generation, not as the source of truth for title/company/status tracking

## UI Direction

The current UI direction is:
- professional document/workflow tool
- calm parchment/canvas feel
- stronger slate/navy chrome
- serif typography for documents and selected display moments
- sans-serif typography for controls, metadata, and navigation

Design principles:
- documents are the hero surfaces
- one primary action per surface
- clear hierarchy
- consistent status pills
- dashboard density only where it improves scanning

## Data Model Notes

Persistence is handled through Supabase.

At a high level, the app stores:
- resumes
- saved applications
- generated drafts
- notes
- statuses
- applied / follow-up timestamps
- follow-up drafts

Current save model:
- applications remain user-scoped
- saved applications reference a resume snapshot
- ownership checks are enforced in route logic

## Environment Variables

See `.env.example` for the current shape.

Expected variables include:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SITE_URL`

Optional:
- `OPENAI_MODEL`
- `OPENAI_TIMEOUT_MS`

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Quality Checks

Run all main checks before shipping:

```bash
npm test
npm run lint
npm run build
```

What they do:
- `npm test`
  runs Vitest unit and route-integration tests
- `npm run lint`
  runs ESLint across the repo
- `npm run build`
  verifies the production Next.js build

## Testing Strategy

The test suite currently focuses on:
- engine behavior
- parser behavior
- DB query behavior
- API route behavior
- protected application workflows

Important covered areas:
- generation engine logic
- match/title parsing
- save flow
- status actions
- follow-up generation
- user scoping

## Deployment

The app is deployed on Vercel.

Typical deployment workflow:
- push a branch to GitHub
- Vercel creates a preview deployment
- merge or deploy the production branch to update the live domain

Current production domain:
- `job-deck.app`

If auth email redirects are enabled, make sure these stay aligned:
- `NEXT_PUBLIC_SITE_URL`
- Supabase Auth `Site URL`
- Supabase redirect URL configuration

## Project Status

This is a real product-shaped codebase, not a throwaway demo.

What is already in good shape:
- deterministic parsing and fit evaluation
- saved application workflow
- status and follow-up tracking
- applications dashboard and detail surface
- route-level auth and ownership checks
- automated tests for core workflows

Current areas that benefit from continued iteration:
- UI polish and layout consistency
- account/library surfaces
- dashboard density and scanning
- parser robustness for noisy job-post sources

## Development Guardrails

When changing the app, try to preserve these rules:
- do not move business logic into UI components
- keep deterministic parsing deterministic
- avoid using the LLM as a fallback for structured app state
- preserve user ownership filtering
- keep changes small and reviewable
- run test, lint, and build before shipping

## License / Internal Use

No license is declared in this repository yet.

If this becomes public or shared beyond the current team, add:
- a proper license
- contribution guidelines
- production environment setup notes
