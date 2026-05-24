# Model Overview

Veridian is tenant-scoped at the ORM layer. Every client-owned object carries a `ForeignKey` to `Client`, and every tenant-aware query is expected to filter on `client__slug` through the shared queryset mixin. There is no PostgreSQL row-level security in this repository, so tenant isolation depends on the correctness of view/query code.

`Client` is the tenant root. `UserProfile` connects a Django user to one client and stores a role of either `analyst` or `admin`. The profile is what the JWT login flow uses to attach `role` and `client_slug` claims.

`ImportJob` is the file-level ingestion unit. It stores the original upload, a preview of the first ten lines, and summary counters. `RawRecord` belongs to an import job and is intentionally treated as immutable source evidence: it preserves the exact row payload that arrived from the parser, plus a parse status and parse error. The normalized layer never overwrites raw rows in place.

`NormalizedRecord` is the review and approval object. It points back to `RawRecord` when a record came from ingestion, but the relationship is nullable so records can be created manually later if needed. The `save()` method always recomputes `calculated_kgco2e` from `quantity * emission_factor`; downstream code should never trust imported or user-entered kgCO2e values.

Locking is simple and explicit. Once a record is approved, `locked=True` is set, and PATCH requests are blocked by serializer validation. That keeps the write rule close to the API boundary instead of spreading it across callers.

`RecordFlag` stores both parser-discovered issues and review-time anomalies. Flags can be dismissed by a human reviewer, but the dismissal stays in the audit trail.

`AuditEvent` is the immutable event log. It captures system-generated events such as `imported` and `normalized`, plus human actions such as `edited`, `approved`, `rejected`, and `flag_dismissed`. Ordering is chronological so the trail reads naturally in the UI.

`EmissionFactor` is the lookup table used to derive kgCO2e. It includes a validity window and an optional region, but the current implementation does not snapshot the factor onto approved records. That means an external factor update can change the meaning of old records unless the database is managed carefully.