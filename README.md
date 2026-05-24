# Veridian
[![Django](https://img.shields.io/badge/Django-5.1-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/) [![DRF](https://img.shields.io/badge/DRF-3.15-ff1709?logo=django&logoColor=white)](https://www.django-rest-framework.org/) [![JWT](https://img.shields.io/badge/JWT-SimpleJWT-000000)](https://github.com/jazzband/djangorestframework-simplejwt) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-ready-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/) [![Celery](https://img.shields.io/badge/Celery-5.4-37814A?logo=celery&logoColor=white)](https://docs.celeryq.dev/) [![Redis](https://img.shields.io/badge/Redis-5.2-DC382D?logo=redis&logoColor=white)](https://redis.io/) [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/) [![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/) [![Recharts](https://img.shields.io/badge/Recharts-3-ff6b6b)](https://recharts.org/) [![date--fns](https://img.shields.io/badge/date--fns-4-3178c6)](https://date-fns.org/)

Veridian is a full-stack carbon emissions ingestion and analyst review platform.

The repository contains both the Django REST backend and the React/Vite frontend. Backend code lives under [backend/](backend); the analyst UI, API client, and page/component layer live under [frontend/](frontend).

## What has been implemented

The platform already includes:

- Django 5.1 project configuration with development and production settings.
- DRF with JWT authentication using `djangorestframework-simplejwt`.
- Multi-tenant data isolation through ORM filtering by `Client`.
- Custom user model and user profile with tenant role assignment.
- Ingestion models for import jobs and raw rows.
- Normalized records, flags, and audit trail models.
- Emission factor lookup model and resolution service.
- Standalone parsers for SAP IDoc-style files, utility CSV exports, and travel JSON exports.
- Flag evaluation engine for outliers, overlaps, zero values, negative values, unresolved codes, unit mismatches, and missing emission factors.
- DRF viewsets and endpoints for auth, clients, imports, summary, ingestion, and record review workflows.
- A `seed_demo` management command that builds a realistic demo tenant and data set.
- Repo-level design docs explaining the model layer, decisions, tradeoffs, and source assumptions.

The frontend already includes:

- A dashboard with summary cards, a 6-month scope breakdown chart, and recent imports.
- Quality badges and import quality visibility in the dashboard, ingest page, and import detail page.
- A review queue with keyboard navigation, row highlighting, and bulk history sparklines.
- Record detail drawers with similar records, conversion-log transparency, and analyst comments.
- Export flows for locked-record auditor exports.

## Recent Additions

The platform now also includes audit-oriented controls that make it suitable for traceable review and export:

- Emission factor snapshots captured at approval time.
- Duplicate-upload detection with SHA-256 file hashing and force override support.
- Conversion logs on raw records for unit normalization transparency.
- Dual-approval workflow for high-value records.
- Import quality scoring with grade buckets.
- Analyst comments on records with edit/delete ownership rules.
- Auditor export endpoints for CSV and JSON output.
- Hardened admin access for internal operations use.
- Frontend analyst workflows for scope charting, keyboard navigation, contextual review, and export handling.

## System Design

The implementation is organized around a simple ingestion pipeline:

1. A client uploads source data or the seed command creates a demo dataset.
2. A source-specific parser converts raw input into normalized candidate dictionaries.
3. `ImportJob` records the batch metadata and `RawRecord` persists the exact source rows.
4. `NormalizedRecord` stores reviewable carbon activity records.
5. `FlagEngine` evaluates the record against data-quality and emissions rules.
6. `AuditEvent` captures system and human actions as an immutable timeline.
7. Analysts review, edit, approve, reject, and dismiss flags through the API.

The design is intentionally explicit rather than magical. There is no hidden event bus, no implicit background mutation of records, and no row-level security in PostgreSQL. Tenant isolation is enforced in application code by filtering every query through the authenticated user's client context.

## Repository Layout

The codebase is split across backend and frontend workspaces:

```text
frontend/
├── src/
├── package.json
├── vite.config.js
└── tailwind.config.js

backend/
├── apps/
│   ├── auth_users/
│   ├── emissions/
│   ├── ingest/
│   ├── records/
│   └── tenants/
├── config/
├── manage.py
├── requirements.txt
├── .env.example
├── MODEL.md
├── DECISIONS.md
├── TRADEOFFS.md
├── SOURCES.md
└── Procfile
```

## Tech Stack

- Backend: Django 5.1, Django REST Framework, SimpleJWT, Celery, Redis, PostgreSQL-ready models.
- Frontend: React 19, Vite, React Router, TanStack Query, Axios, Recharts, date-fns, Tailwind CSS.
- Tooling: npm scripts, ESLint, PostCSS, and Vite build tooling.

## Frontend Workspace

The frontend workspace is a React + Vite application with HMR and ESLint support.

- `@vitejs/plugin-react` is the primary React integration.
- `@vitejs/plugin-react-swc` is also available as an alternative React compiler pipeline.
- The React Compiler is not enabled in the template because of its impact on development and build performance.
- If you want stricter static checks, the recommended next step is a TypeScript migration with type-aware ESLint rules.

## Core Architecture

### Multi-tenancy

Tenancy is implemented by storing a `Client` foreign key on every tenant-owned model.

This is simple and portable, but it means correctness depends on every queryset being scoped properly. The shared `TenantQuerysetMixin` enforces the `?client=<slug>` filter pattern on endpoints that operate on tenant data.

There is no PostgreSQL RLS policy in this version. That is a deliberate tradeoff documented in [TRADEOFFS.md](backend/TRADEOFFS.md).

### Authentication

Authentication uses JWT access and refresh tokens.

The login endpoint is exposed at `POST /api/auth/login/`. The token includes custom claims for:

- `role`
- `client_slug`

These claims are derived from the authenticated user's `UserProfile`.

### Data Model

The main persistence model is split into four layers:

- `ImportJob` for file-level ingestion metadata.
- `RawRecord` for immutable source rows.
- `NormalizedRecord` for reviewable, derived carbon activity rows.
- `RecordFlag` and `AuditEvent` for quality control and traceability.

`NormalizedRecord.save()` always recomputes `calculated_kgco2e` as `quantity * emission_factor`. That value is derived, not trusted from source systems.

Locking is handled through `locked=True` on approved records. The serializer rejects edits to locked records, and approval sets both approval metadata and the lock flag.

### Parsers

The parsers are standalone classes so they can be tested and evolved independently of the API layer:

- `SAPParser` handles SAP IDoc-style flat files.
- `UtilityParser` handles utility CSV exports with fuzzy header matching and date parsing.
- `TravelParser` handles JSON trip exports and computes distances when needed.

Each parser returns structured dictionaries plus row-level errors instead of aborting the entire file on first failure.

### Flagging

`FlagEngine` runs after normalization.

It currently checks:

- statistical outliers over the last 12 months of approved data,
- zero values,
- negative values,
- period overlaps,
- unresolved codes,
- unit mismatches,
- missing emission factors.

Flags are stored separately from records so analysts can dismiss them without losing the underlying record history.

### Audit Trail

`AuditEvent` captures both system events and human actions.

Examples include:

- `imported`
- `normalized`
- `flag_raised`
- `flag_dismissed`
- `edited`
- `approved`
- `rejected`
- `locked`

The timeline is ordered chronologically and is returned on the record detail endpoint.

## API Surface

All API endpoints require JWT authentication.

Tenant-aware endpoints require `?client=<slug>` unless the action is explicitly tenant-resolved from the request body.

### Authentication

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/login/` | JWT login |

### Clients

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/clients/` | List visible clients |

### Summary

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/summary/?client=<slug>` | Client summary plus import quality by source |

### Imports

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/imports/?client=<slug>` | List import jobs |
| POST | `/api/imports/?client=<slug>` | Upload and ingest a file |
| GET | `/api/imports/:id/` | Import detail |
| GET | `/api/imports/:id/preview/` | Raw file preview |
| POST | `/api/imports/:id/reingest/` | Reprocess an existing import |
| GET | `/api/imports/:id/records/?status=` | Records for one import job |

### Ingestion

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/ingest/sap/` | SAP file ingest |
| POST | `/api/ingest/utility/` | Utility file ingest |
| POST | `/api/ingest/travel/` | Travel file ingest |
| Query param | `?force=true` | Bypass duplicate-upload conflict |

### Records

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/records/?client=<slug>&source=&scope=&status=&date_from=&date_to=&page=&page_size=` | List records |
| GET | `/api/records/:id/` | Record detail, including raw data, conversion log, flags, audit trail, and comments |
| PATCH | `/api/records/:id/` | Edit a record before it is locked |
| POST | `/api/records/:id/approve/` | Primary approval |
| POST | `/api/records/:id/secondary-approve/` | Second approval for high-value records |
| POST | `/api/records/:id/reject/` | Reject a record |
| POST | `/api/records/bulk-approve/` | Bulk approval |
| POST | `/api/records/bulk-reject/` | Bulk rejection |
| DELETE | `/api/records/:id/flags/:flagId/` | Dismiss a flag |
| GET | `/api/records/:id/factor-history/` | Compare snapshotted and current emission factor values |
| GET | `/api/records/:id/comments/` | List comments for a record |
| POST | `/api/records/:id/comments/` | Add a comment |
| PATCH | `/api/records/:id/comments/:commentId/` | Edit your own comment |
| DELETE | `/api/records/:id/comments/:commentId/` | Delete your own comment |

### Auditor Export

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/export/?client=<slug>&from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv` | CSV export of locked records |
| GET | `/api/export/?client=<slug>&from=YYYY-MM-DD&to=YYYY-MM-DD&format=json` | JSON export of locked records |

## Seed Data

The command `python manage.py seed_demo` creates a complete demo tenant:

- client: `Aether Industries` / `aether`
- users: analyst and admin logins
- emission factors for the seeded source categories
- SAP, utility, and travel import jobs
- records covering approved, pending, flagged, and rejected states
- sample flags for all major flag types

The demo data is intended to exercise the UI and API, not to represent a complete enterprise emissions dataset.

## Local Setup

The repository root is now just a wrapper. Work inside [backend/](backend).

1. Create and activate a Python environment.
2. Install dependencies from [backend/requirements.txt](backend/requirements.txt).
3. Copy [backend/.env.example](backend/.env.example) to `.env` and adjust values.
4. Run migrations from the backend directory.
5. Seed demo data if you want the sample tenant.

Example:

```powershell
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

## Deployment

The production entry point is [backend/Procfile](backend/Procfile):

```text
web: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

Settings are split into development and production modules under [backend/config/settings/](backend/config/settings/).

Static file serving is configured for WhiteNoise, and Celery/Redis are included for future async ingestion expansion.

## Current Limitations

The current implementation is production-shaped, but there are deliberate gaps:

- No PostgreSQL row-level security.
- No fully wired async ingestion queue path.

Those tradeoffs are explained in [TRADEOFFS.md](backend/TRADEOFFS.md).

## Documentation

- [MODEL.md](backend/MODEL.md)
- [DECISIONS.md](backend/DECISIONS.md)
- [TRADEOFFS.md](backend/TRADEOFFS.md)
- [SOURCES.md](backend/SOURCES.md)

## Status

Implemented so far:

- Django project scaffold and settings.
- Core tenant, ingestion, records, emissions, and auth apps.
- Parsers for SAP, utility, and travel sources.
- Review APIs for records and imports.
- Demo seed command.
- Audit-grade approval, export, comment, and data-quality features.
- React frontend with dashboard, ingest, review queue, landing, login, and import detail pages.
- Repo documentation.

The next practical step is to install dependencies, run migrations, and verify the API against a real database.