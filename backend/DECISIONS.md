# Design Decisions

SAP input is handled as a flat file parser over IDoc-style segments because that matches the file format most teams actually receive first. OData and other integration paths were excluded deliberately because they change the problem from file normalization to API integration and auth lifecycle management.

Utility imports are handled as CSV because the practical starting point for most utility portals is a download/export, not a stable API. PDF billing statements were excluded because robust extraction from PDFs usually becomes a separate OCR and document-layout project.

Travel is handled as JSON because modern travel platforms tend to expose structured trip payloads before they expose a clean export format. The implementation accepts either a parsed dictionary or a JSON stream, but it does not include a live Concur OAuth flow; that would require credential storage, token refresh, and platform-specific scopes that are outside the ingestion core.

Billing periods are preserved exactly as delivered. Utility data often straddles month boundaries, and forcing a calendar-month split would create synthetic records that were never present in the supplier data.

Great-circle distance is used for air travel when an itinerary omits a distance. It is not the same as route distance or actual flight-path distance, but it is deterministic, auditable, and cheap to compute without external routing services.

Before deploying this to a real client, I would ask for clarification on factor governance, approval SLAs, audit retention requirements, and the system of record for master data such as plant codes, meter IDs, and airport mappings.