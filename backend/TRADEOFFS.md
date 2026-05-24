# Tradeoffs

1. No PostgreSQL row-level security.
The code enforces tenant boundaries in ORM queries, which is straightforward but fragile. A missed filter can leak another tenant's data. In production, I would add RLS policies keyed by tenant ownership, plus tests that assert cross-tenant access fails even if application filters are bypassed.

2. No async ingestion queue wired into the API path.
Celery and Redis are present, but the ingestion endpoints still process synchronously. Large uploads will eventually time out a request and tie up a worker. A production async path would store the file, create a job row, enqueue a Celery task, stream parser progress into job status fields, and let the UI poll or subscribe for completion.

3. No emission factor version snapshot on approval.
The factor table has validity dates, but approved records do not copy the exact factor version into an immutable snapshot table. If an emissions factor changes in a later year, historical audits can no longer prove that the approved record used the factor that was current at approval time.