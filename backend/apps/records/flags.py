from __future__ import annotations

import json
from datetime import timedelta
from decimal import Decimal
from statistics import mean, pstdev

from django.utils import timezone

from apps.emissions.services import resolve_emission_factor
from apps.records.models import NormalizedRecord, RecordFlag


class FlagEngine:
    def evaluate(self, record: NormalizedRecord, parser_flags: list[dict] | None = None) -> list[RecordFlag]:
        flags: list[RecordFlag] = []
        parser_flags = parser_flags or []
        for parser_flag in parser_flags:
            flags.append(self._build_flag(record, parser_flag["flag_type"], parser_flag["message"]))

        if record.calculated_kgco2e == 0 and record.quantity == 0:
            flags.append(self._build_flag(record, RecordFlag.FlagType.ZERO_VALUE, "Quantity and emission value are both zero — verify source data"))
        if record.quantity < 0:
            flags.append(self._build_flag(record, RecordFlag.FlagType.NEGATIVE_VALUE, f"Negative quantity ({record.quantity} {record.unit}) — may indicate a credit note or data entry error"))

        flags.extend(self._statistical_outlier_flags(record))
        flags.extend(self._period_overlap_flags(record))
        flags.extend(self._missing_factor_flag(record))
        return flags

    def _build_flag(self, record: NormalizedRecord, flag_type: str, message: str) -> RecordFlag:
        if flag_type == RecordFlag.FlagType.UNIT_MISMATCH:
            conversion_log = getattr(getattr(record, "raw_record", None), "conversion_log", None) or []
            if conversion_log:
                message = f"{message} | conversion_log={json.dumps(conversion_log, default=str)}"
        return RecordFlag(record=record, flag_type=flag_type, message=message)

    def _statistical_outlier_flags(self, record: NormalizedRecord) -> list[RecordFlag]:
        cutoff = timezone.now().date() - timedelta(days=365)
        approved = list(
            NormalizedRecord.objects.filter(
                client=record.client,
                source_type=record.source_type,
                activity_category=record.activity_category,
                status=NormalizedRecord.Status.APPROVED,
                period_end__gte=cutoff,
            ).values_list("calculated_kgco2e", flat=True)
        )
        if len(approved) < 5:
            return []
        avg = mean(approved)
        deviation = pstdev(approved)
        if deviation == 0:
            return []
        current = float(record.calculated_kgco2e)
        sigma = abs(current - avg) / deviation
        if sigma <= 3:
            return []
        direction = "above" if current > avg else "below"
        message = (
            f"Value {record.calculated_kgco2e} kgCO₂e is {sigma:.1f}σ {direction} the group mean of {avg:.2f} kgCO₂e "
            f"({len(approved)} approved records in comparison set)"
        )
        return [self._build_flag(record, RecordFlag.FlagType.STATISTICAL_OUTLIER, message)]

    def _period_overlap_flags(self, record: NormalizedRecord) -> list[RecordFlag]:
        identifier = self._source_identifier(record)
        if not identifier:
            return []
        overlaps = NormalizedRecord.objects.filter(client=record.client, scope=record.scope, status=NormalizedRecord.Status.APPROVED).exclude(id=record.id)
        matched = []
        for candidate in overlaps.select_related("raw_record"):
            if self._source_identifier(candidate) != identifier:
                continue
            if candidate.period_start <= record.period_end and record.period_start <= candidate.period_end:
                matched.append(candidate)
        if not matched:
            return []
        candidate = matched[0]
        message = f"Period {record.period_start}–{record.period_end} overlaps with existing approved record {candidate.id}"
        return [self._build_flag(record, RecordFlag.FlagType.PERIOD_OVERLAP, message)]

    def _missing_factor_flag(self, record: NormalizedRecord) -> list[RecordFlag]:
        region = self._record_region(record)
        factor = resolve_emission_factor(record.activity_category, record.unit, record.scope, region=region, as_of=record.period_end)
        if factor:
            if record.emission_factor != factor.factor_kgco2e_per_unit:
                record.emission_factor = factor.factor_kgco2e_per_unit
                record.emission_factor_source = factor.source
                record.save(update_fields=["emission_factor", "emission_factor_source", "calculated_kgco2e", "updated_at"])
            return []
        record.emission_factor = Decimal("0")
        record.save(update_fields=["emission_factor", "calculated_kgco2e", "updated_at"])
        message = f"No emission factor found for {record.activity_category} in {record.unit} — assign manually before approval"
        return [self._build_flag(record, RecordFlag.FlagType.MISSING_EMISSION_FACTOR, message)]

    def _source_identifier(self, record: NormalizedRecord) -> str:
        raw_data = getattr(getattr(record, "raw_record", None), "raw_data", {}) or {}
        return str(raw_data.get("meter_id") or raw_data.get("plant_code") or raw_data.get("tripId") or raw_data.get("document_number") or "")

    def _record_region(self, record: NormalizedRecord) -> str:
        raw_data = getattr(getattr(record, "raw_record", None), "raw_data", {}) or {}
        return str(raw_data.get("region") or raw_data.get("country") or "GLOBAL")