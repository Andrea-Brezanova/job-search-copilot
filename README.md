# AI Job Copilot

Phase 1 MVP for a simple job-search copilot built with Next.js, TypeScript, Tailwind, and Supabase-ready structure.

## What this MVP does

- Accepts pasted resume or profile text
- Accepts one pasted job description
- Analyzes fit with a mock-first engine
- Generates a tailored cover letter and application email
- Keeps the architecture modular so real LLM calls can be added later

## Project Structure

```text
ai-job-copilot/
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ analyze-job/route.ts
│  │  │  ├─ generate-application/route.ts
│  │  │  └─ parse-profile/route.ts
│  │  ├─ jobs/page.tsx
│  │  ├─ profile/page.tsx
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ components/
│  │  ├─ ApplicationDocs.tsx
│  │  ├─ FitResult.tsx
│  │  ├─ JobForm.tsx
│  │  ├─ ResumeForm.tsx
│  │  └─ Workspace.tsx
│  └─ lib/
│     ├─ db/
│     │  ├─ queries.ts
│     │  └─ supabase.ts
│     ├─ engines/
│     │  ├─ applicationEngine.ts
│     │  ├─ matchEngine.ts
│     │  └─ profileEngine.ts
│     ├─ llm/
│     │  ├─ client.ts
│     │  ├─ prompts.ts
│     │  └─ schemas.ts
│     └─ types/
│        └─ index.ts
├─ supabase/
│  └─ migrations/
├─ .env.local
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

3. Open `http://localhost:3000`

## Notes

- The current LLM layer is intentionally a placeholder.
- The API routes return mock-backed structured results so the UI is usable now.
- Supabase utilities are present for future persistence, but Phase 1 does not save user data yet.

## Phase 2 Ideas

1. Replace mock LLM helpers with real structured model calls.
2. Store resumes, job descriptions, and analysis history in Supabase.
3. Add resume parsing to extract skills, seniority, and target roles more accurately.
4. Support editing generated cover letters before export.
5. Add multi-job comparison so users can prioritize applications.
