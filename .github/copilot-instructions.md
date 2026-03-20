# Backend Copilot Instructions

This folder contains the NestJS + Prisma backend for the hackathon project.

## Stack and Structure
- Runtime: Node.js + TypeScript
- Framework: NestJS
- ORM: Prisma with PostgreSQL
- Source code: `src/`
- Prisma schema/models/migrations/seed: `prisma/`

## Core Principles
- Keep changes small, focused, and consistent with existing code style.
- Prefer updating service-layer logic over controller-heavy business logic.
- Preserve existing API contracts unless a request explicitly requires a breaking change.
- Use translation keys (`name_key`, `description_key`) and translation tables instead of hardcoded localized text in entities.

## Backend Conventions
- Use path alias imports from `@/*` in `src`.
- Throw Nest exceptions (`NotFoundException`, `ConflictException`, `UnauthorizedException`) instead of generic errors.
- Handle Prisma known errors via helper utility (`getPrismaErrorCode`) where applicable.
- Keep DTO validation strict with `class-validator` and transformations via `class-transformer`.
- Avoid adding inline comments unless needed for non-obvious logic.

## Prisma and Database Best Practices
- Update Prisma models in `prisma/models/*.prisma`.
- Run migrations through Prisma migrate workflow (do not manually patch DB schema in ad-hoc ways).
- After schema changes, regenerate Prisma client (`npm run generate`).
- Keep seed logic centralized in `prisma/seed.ts`.
- Ensure seed operations are idempotent using `upsert`.
- For translation support:
  - Seed `Language` entries first.
  - Upsert translation rows with unique `(entityId, languageId)` pairs.

## Seeding Rules
- `prisma/dataset.json` is the source for place data seeding.
- Normalize external labels before mapping to keys.
- When external cities are missing, create them with inferred region mapping if available.
- Prefer deterministic key formats:
  - `region.*`
  - `city.*`
  - `category.*.name` / `category.*.description`
  - `place.<external_id>.name` / `place.<external_id>.description`

## API and Service Design
- Controllers should orchestrate request/response only.
- Services should contain business rules, data mapping, and Prisma operations.
- Keep response shapes predictable and frontend-friendly.
- For recommendation/routing features:
  - Keep external calls resilient (fallback behavior on failure).
  - Avoid crashing user flows when embeddings or route providers fail.

## Validation and Quality Gate
Before finishing any backend change:
1. Run `npm run build`.
2. If Prisma schema changed, run `npm run generate` and seed/migrate commands as needed.
3. If seeding changed, run `npm run seed` and ensure it completes successfully.

## Safety and Scope
- Do not modify unrelated modules while fixing a targeted issue.
- Do not commit secrets or API keys.
- Keep environment-dependent behavior behind env variables.
- Prefer additive migrations and explicit data transformations over destructive edits.
