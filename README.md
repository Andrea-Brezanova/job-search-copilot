# AI Job Copilot

AI Job Copilot is a Next.js application that helps users generate a tailored cover letter and application email for a job posting, review the drafts, and save the application in a tracker.

## Current Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase for persistence
- OpenAI Responses API for generation
- Vitest for automated tests
- ESLint and `npm run build` for quality checks

## What the App Does Today

- Accepts an uploaded resume / CV
- Accepts one pasted job description
- Parses the resume and job description deterministically
- Computes a fit summary
- Makes one OpenAI call to generate:
  - a cover letter
  - an application email
  - an application summary
- Shows editable drafts in the UI
- Lets users save applications and track status and notes
- Lets users export the cover letter after generation

## Main Flow

1. Upload a resume / CV
2. Paste a job description
3. Click `Generate application package`
4. Review and edit:
   - `Cover letter`
   - `Application email`
5. Save the application to the tracker

## Project Structure

```text
ai-job-copilot/
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  ├─ applications/
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ components/
│  │  ├─ ApplicationDocs.tsx
│  │  ├─ ApplicationSavePanel.tsx
│  │  ├─ FitResult.tsx
│  │  ├─ JobForm.tsx
│  │  ├─ ResumeForm.tsx
│  │  └─ Workspace.tsx
│  └─ lib/
│     ├─ db/
│     ├─ engines/
│     ├─ llm/
│     └─ types/
├─ supabase/
├─ package.json
├─ tsconfig.json
└─ README.md
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Run checks:

```bash
npm test
npm run lint
npm run build
```

## Quality Checks

- `npm test` runs the Vitest suite
- `npm run lint` runs ESLint
- `npm run build` verifies the production build

## Current Architecture Notes

- Resume and job parsing are deterministic
- Fit scoring is deterministic
- Generation uses one OpenAI call only
- Drafts remain editable after generation
- Save/load behavior uses Supabase persistence

## Phase 2

Planned next steps:

- Supabase Auth
- saved resume / profile support
- stronger multi-user profile handling
