from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.emissions.services import resolve_emission_factor
from apps.ingest.models import ImportJob, RawRecord
from apps.ingest.parsers import SAPParser, TravelParser, UtilityParser
from apps.records.flags import FlagEngine
from apps.records.models import AuditEvent, NormalizedRecord, RecordFlag


def preview_lines(file_obj, limit: int = 10) -> list[str]:
    text = _read_text(file_obj)
    return text.splitlines()[:limit]


def _read_text(source: Any) -> str:
    if isinstance(source, dict):
        return json.dumps(source, default=str)
    if hasattr(source, "read"):
        content = source.read()
        if hasattr(source, "seek"):
            source.seek(0)
        if isinstance(content, bytes):
            return content.decode("utf-8", errors="ignore")
        return str(content)
    return Path(source).read_text(encoding="utf-8", errors="ignore")


def get_parser(source_type: str):
    if source_type == ImportJob.SourceType.SAP:
        return SAPParser()
    if source_type == ImportJob.SourceType.UTILITY:
        return UtilityParser()
    if source_type == ImportJob.SourceType.TRAVEL:
        return TravelParser()
    raise ValueError(f"Unsupported source type: {source_type}")


@transaction.atomic
def ingest_source(*, client, source_type: str, uploaded_by, file_obj, existing_job: ImportJob | None = None, file_hash: str = "", force_reason: str = "") -> tuple[ImportJob, int, int, int]:
    parser = get_parser(source_type)
    preview = preview_lines(file_obj)
    parsed_records, errors = parser.parse(file_obj)
    job = existing_job or ImportJob.objects.create(client=client, source_type=source_type, uploaded_by=uploaded_by, status=ImportJob.Status.PROCESSING, file_hash=file_hash, force_reason=force_reason)
    if existing_job:
        job.source_type = source_type
        job.uploaded_by = uploaded_by
        job.status = ImportJob.Status.PROCESSING
        if file_hash:
            job.file_hash = file_hash
        if force_reason:
            job.force_reason = force_reason
        job.raw_file_preview = preview
        job.error_log = errors
        job.save(update_fields=["source_type", "uploaded_by", "status", "file_hash", "force_reason", "raw_file_preview", "error_log"])
        job.raw_records.all().delete()
        job.normalized_records.all().delete()
    else:
        job.raw_file_preview = preview
        job.error_log = errors
        job.save(update_fields=["file_hash", "force_reason", "raw_file_preview", "error_log"])

    raw_records = []
    for parsed in parsed_records:
        raw_records.append(
            RawRecord(
                import_job=job,
                client=client,
                source_type=source_type,
                row_index=parsed.get("row_index", len(raw_records) + 1),
                raw_data=parsed.get("raw_data", parsed),
                conversion_log=parsed.get("conversion_log", []),
                parse_status=RawRecord.ParseStatus.OK,
                parse_error="",
            )
        )
    RawRecord.objects.bulk_create(raw_records)

    failed_rows = []
    for error in errors:
        failed_rows.append(
            RawRecord(
                import_job=job,
                client=client,
                source_type=source_type,
                row_index=error.get("row", 0),
                raw_data={"row": error.get("row", 0), "source_type": source_type},
                conversion_log=[],
                parse_status=RawRecord.ParseStatus.FAILED,
                parse_error=error.get("error_message", "Parsing failed"),
            )
        )
    if failed_rows:
        RawRecord.objects.bulk_create(failed_rows)

    raw_lookup = list(RawRecord.objects.filter(import_job=job).order_by("row_index"))
    normalized = []
    for parsed, raw in zip(parsed_records, raw_lookup):
        factor = resolve_emission_factor(parsed["activity_category"], parsed["unit"], parsed["scope"], region=parsed.get("region", "GLOBAL"), as_of=parsed.get("period_end") or parsed.get("posting_date") or timezone.now().date())
        emission_factor = factor.factor_kgco2e_per_unit if factor else Decimal("0")
        factor_source = factor.source if factor else ""
        if source_type == ImportJob.SourceType.UTILITY:
            period_start = parsed["period_start"]
            period_end = parsed["period_end"]
            quantity = parsed["quantity_kwh"]
            unit = parsed["unit"]
        elif source_type == ImportJob.SourceType.SAP:
            period_start = parsed["posting_date"]
            period_end = parsed["posting_date"]
            quantity = parsed["quantity"]
            unit = parsed["unit"]
        else:
            period_start = parsed["period_start"]
            period_end = parsed["period_end"]
            quantity = parsed["quantity"]
            unit = parsed["unit"]
        normalized.append(
            NormalizedRecord(
                raw_record=raw,
                client=client,
                source_type=source_type,
                import_job=job,
                description=parsed["description"],
                activity_category=parsed["activity_category"],
                period_start=period_start,
                period_end=period_end,
                quantity=quantity,
                unit=unit,
                emission_factor=emission_factor,
                emission_factor_source=factor_source,
                calculated_kgco2e=quantity * emission_factor,
                scope=parsed["scope"],
                status=NormalizedRecord.Status.PENDING,
                requires_dual_approval=(quantity * emission_factor) > Decimal(str(settings.DUAL_APPROVAL_THRESHOLD)),
            )
        )
    NormalizedRecord.objects.bulk_create(normalized)
    records = list(NormalizedRecord.objects.filter(import_job=job).select_related("raw_record"))
    engine = FlagEngine()
    all_flags: list[RecordFlag] = []
    all_events: list[AuditEvent] = []
    for record, parsed in zip(records, parsed_records):
        flags = engine.evaluate(record, parser_flags=parsed.get("flags", []))
        if flags:
            record.status = NormalizedRecord.Status.FLAGGED
            record.save(update_fields=["status", "calculated_kgco2e", "updated_at"])
            all_flags.extend(flags)
        all_events.append(AuditEvent(record=record, event_type=AuditEvent.EventType.IMPORTED, actor=None, detail={"source_type": source_type}))
        all_events.append(AuditEvent(record=record, event_type=AuditEvent.EventType.NORMALIZED, actor=None, detail={"source_type": source_type}))
    if all_flags:
        RecordFlag.objects.bulk_create(all_flags)
    AuditEvent.objects.bulk_create(all_events)

    job.total_records = len(parsed_records) + len(errors)
    job.successful_records = len(parsed_records)
    job.failed_records = len(errors)
    job.status = ImportJob.Status.COMPLETED if parsed_records else ImportJob.Status.FAILED
    job.save(update_fields=["total_records", "successful_records", "failed_records", "status"])
    job.compute_quality_score()
    job.save(update_fields=["quality_score"])
    return job, job.total_records, job.successful_records, job.failed_records