# Veridian Backend

Veridian is a Django REST Framework backend for a multi-tenant carbon emissions ingestion and analyst review platform.

This repository currently contains the backend codebase only. The Django project, apps, API layer, parsers, seed command, and supporting documentation live under [backend/](backend). The root folder is intentionally thin so the backend can be treated as a self-contained deployable unit.

## What has been implemented

The backend already includes:

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

The backend code now lives here:

```text
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

- `POST /api/auth/login/`

### Clients

- `GET /api/clients/`

### Summary

- `GET /api/summary/?client=<slug>`

### Imports

- `GET /api/imports/?client=<slug>`
- `POST /api/imports/?client=<slug>`
- `GET /api/imports/:id/`
- `GET /api/imports/:id/preview/`
- `POST /api/imports/:id/reingest/`

### Ingestion

- `POST /api/ingest/sap/`
- `POST /api/ingest/utility/`
- `POST /api/ingest/travel/`

### Records

- `GET /api/records/?client=<slug>&source=&scope=&status=&date_from=&date_to=&page=&page_size=`
- `GET /api/records/:id/`
- `PATCH /api/records/:id/`
- `POST /api/records/:id/approve/`
- `POST /api/records/:id/reject/`
- `POST /api/records/bulk-approve/`
- `POST /api/records/bulk-reject/`
- `DELETE /api/records/:id/flags/:flagId/`

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
- No immutable snapshot of emission factor versions at approval time.

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
- Repo documentation.

The next practical step is to install dependencies, run migrations, and verify the API against a real database.