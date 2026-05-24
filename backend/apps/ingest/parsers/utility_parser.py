from __future__ import annotations

import csv
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


class UtilityParser:
    DATE_FORMATS = ["%d/%m/%Y", "%Y-%m-%d", "%d-%b-%Y", "%m/%d/%Y"]
    ALIASES = {
        "meter_id": ["meter id", "meter_id", "meter number", "serialnumber", "serial number"],
        "site_address": ["service address", "site_address", "location", "address"],
        "period_start": ["billing period start", "start_date", "from date", "period start", "start"],
        "period_end": ["billing period end", "end_date", "to date", "period end", "end"],
        "quantity": ["usage", "consumption", "kwh used", "units_consumed", "units", "quantity"],
        "unit": ["unit", "uom", "measure unit", "measure", "uom (kwh)"],
        "tariff_code": ["tariff code", "tariff", "rate code"],
    }

    def parse(self, source: Any) -> tuple[list[dict], list[dict]]:
        handle = self._open(source)
        try:
            reader = csv.DictReader(handle)
            mapped_fields = self._map_fields(reader.fieldnames or [])
            records: list[dict] = []
            errors: list[dict] = []
            for row_index, row in enumerate(reader, start=2):
                try:
                    records.append(self._parse_row(row, mapped_fields, row_index))
                except Exception as exc:
                    errors.append({"row": row_index, "error_message": str(exc)})
            return records, errors
        finally:
            if handle is not source:
                handle.close()

    def _open(self, source: Any):
        if hasattr(source, "read"):
            content = source.read()
            if hasattr(source, "seek"):
                source.seek(0)
            if isinstance(content, bytes):
                content = content.decode("utf-8", errors="ignore")
            from io import StringIO

            return StringIO(content)
        return open(Path(source), "r", encoding="utf-8", errors="ignore", newline="")

    def _map_fields(self, fieldnames: list[str]) -> dict[str, str]:
        normalized = {self._normalize(name): name for name in fieldnames}
        mapped: dict[str, str] = {}
        for target, aliases in self.ALIASES.items():
            for alias in aliases:
                alias_key = self._normalize(alias)
                if alias_key in normalized:
                    mapped[target] = normalized[alias_key]
                    break
                match = next((name for key, name in normalized.items() if alias_key in key or key in alias_key), None)
                if match:
                    mapped[target] = match
                    break
            if target not in mapped:
                raise ValueError(f"Missing required utility column for {target}")
        return mapped

    def _normalize(self, value: str) -> str:
        return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()

    def _parse_row(self, row: dict[str, str], mapped_fields: dict[str, str], row_index: int) -> dict:
        meter_id = self._get(row, mapped_fields, "meter_id")
        site_address = self._get(row, mapped_fields, "site_address")
        period_start = self._parse_date(self._get(row, mapped_fields, "period_start"))
        period_end = self._parse_date(self._get(row, mapped_fields, "period_end"))
        raw_quantity = self._parse_decimal(self._get(row, mapped_fields, "quantity"))
        raw_unit = self._get(row, mapped_fields, "unit")
        tariff_code = self._get(row, mapped_fields, "tariff_code")

        quantity_kwh = raw_quantity
        unit = raw_unit
        needs_unit_flag = False
        flags = []

        if raw_unit.lower() in {"mwh", "megawatt hour", "megawatt hours"}:
            quantity_kwh = raw_quantity * Decimal("1000")
            unit = "kWh"
        elif raw_unit.lower() == "kvah":
            needs_unit_flag = True
            flags.append({"flag_type": "unit_mismatch", "message": "kVAh cannot be converted to kWh without power factor"})
            unit = "kVAh (unconverted)"
        elif raw_unit.lower() != "kwh":
            needs_unit_flag = True
            flags.append({"flag_type": "unit_mismatch", "message": f"Utility unit {raw_unit} requires manual review"})
        if quantity_kwh == 0:
            flags.append({"flag_type": "zero_value", "message": "Quantity is zero — verify source data"})

        return {
            "meter_id": meter_id,
            "site_address": site_address,
            "period_start": period_start,
            "period_end": period_end,
            "quantity_kwh": quantity_kwh,
            "raw_quantity": raw_quantity,
            "raw_unit": raw_unit,
            "tariff_code": tariff_code,
            "needs_unit_flag": needs_unit_flag,
            "description": f"Utility meter {meter_id}",
            "activity_category": f"Grid electricity – {meter_id}",
            "scope": 2,
            "unit": unit,
            "source_type": "utility",
            "source_identifier": meter_id,
            "row_index": row_index,
            "flags": flags,
            "raw_data": {
                "meter_id": meter_id,
                "site_address": site_address,
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "quantity": str(raw_quantity),
                "unit": raw_unit,
                "tariff_code": tariff_code,
            },
        }

    def _get(self, row: dict[str, str], mapped_fields: dict[str, str], key: str) -> str:
        value = row.get(mapped_fields[key], "")
        if value is None or str(value).strip() == "":
            raise ValueError(f"Missing utility value for {key}")
        return str(value).strip()

    def _parse_date(self, value: str) -> date:
        for fmt in self.DATE_FORMATS:
            try:
                return datetime.strptime(value, fmt).date()
            except ValueError:
                continue
        raise ValueError(f"Unsupported utility date format: {value}")

    def _parse_decimal(self, value: str) -> Decimal:
        try:
            return Decimal(value.replace(",", ""))
        except InvalidOperation as exc:
            raise ValueError(f"Invalid utility quantity: {value}") from exc