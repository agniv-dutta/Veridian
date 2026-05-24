from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


class SAPParser:
    """Parse SAP IDoc flat files into normalized candidate dictionaries."""

    SAP_UNIT_MAP = {"L": "L", "KG": "kg", "M3": "m3", "ST": "unit", "PAL": "pallet", "KWH": "kWh"}
    MATERIAL_SCOPE_MAP = {
        "DIESEL": (1, "Fuel combustion – Diesel"),
        "PETROL": (1, "Fuel combustion – Petrol"),
        "HFO": (1, "Fuel combustion – HFO"),
        "LPG": (1, "Fuel combustion – LPG"),
        "NATGAS": (1, "Fuel combustion – Natural gas"),
        "ELEC": (2, "Grid electricity"),
    }

    def parse(self, source: Any) -> tuple[list[dict], list[dict]]:
        lines = self._read_lines(source)
        records: list[dict] = []
        errors: list[dict] = []
        current_document_number = ""
        current_posting_date = None

        for row_index, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                tokens = self._split_row(stripped)
                segment = tokens[0]
                if segment == "EDI_DC40":
                    continue
                if segment == "E1MBGMR":
                    current_document_number, current_posting_date = self._parse_header(tokens)
                    continue
                if segment == "E1MBPOS":
                    records.append(self._parse_position(tokens, row_index, current_document_number, current_posting_date))
                    continue
            except Exception as exc:
                errors.append({"row": row_index, "error_message": str(exc)})
        return records, errors

    def _read_lines(self, source: Any) -> list[str]:
        if hasattr(source, "read"):
            content = source.read()
            if hasattr(source, "seek"):
                source.seek(0)
            if isinstance(content, bytes):
                content = content.decode("utf-8", errors="ignore")
            return content.splitlines()
        return Path(source).read_text(encoding="utf-8", errors="ignore").splitlines()

    def _split_row(self, line: str) -> list[str]:
        if "\t" in line:
            return [part.strip() for part in line.split("\t") if part.strip()]
        return [part for part in re.split(r"\s{2,}|\t+|\s+", line) if part]

    def _parse_header(self, tokens: list[str]) -> tuple[str, date | None]:
        if len(tokens) < 3:
            raise ValueError("SAP header row missing document number or posting date")
        return tokens[1], self._parse_yyyymmdd(tokens[2])

    def _parse_position(self, tokens: list[str], row_index: int, document_number: str, posting_date: date | None) -> dict:
        if len(tokens) < 7:
            raise ValueError("SAP position row missing fields")
        if not document_number or posting_date is None:
            raise ValueError("SAP position row encountered before header row")

        item_or_plant = tokens[1]
        plant_code = tokens[2] if len(tokens) > 7 else item_or_plant
        material_number = tokens[3]
        quantity = self._parse_decimal(tokens[4])
        raw_unit = tokens[5].upper()
        unit = self.SAP_UNIT_MAP.get(raw_unit, raw_unit.lower())
        cost_center = tokens[6]
        scope, activity_category = self._derive_scope(material_number)
        flags = []
        if plant_code.startswith("BAD") or plant_code.startswith("XYZ"):
            flags.append({"flag_type": "unresolved_code", "message": f"Plant code {plant_code} not resolved"})
        if raw_unit not in self.SAP_UNIT_MAP:
            flags.append({"flag_type": "unit_mismatch", "message": f"SAP unit {raw_unit} requires manual mapping"})

        return {
            "document_number": document_number,
            "posting_date": posting_date,
            "plant_code": plant_code,
            "material_number": material_number,
            "quantity": quantity,
            "unit": unit,
            "raw_unit": raw_unit,
            "cost_center": cost_center,
            "description": f"SAP material {material_number}",
            "activity_category": activity_category,
            "scope": scope,
            "source_type": "sap",
            "source_identifier": plant_code,
            "row_index": row_index,
            "flags": flags,
            "raw_data": {
                "document_number": document_number,
                "posting_date": posting_date.isoformat(),
                "plant_code": plant_code,
                "material_number": material_number,
                "quantity": str(quantity),
                "unit": raw_unit,
                "cost_center": cost_center,
            },
        }

    def _parse_decimal(self, value: str) -> Decimal:
        try:
            return Decimal(value.replace(",", ""))
        except InvalidOperation as exc:
            raise ValueError(f"Invalid SAP quantity: {value}") from exc

    def _parse_yyyymmdd(self, value: str) -> date:
        try:
            return datetime.strptime(value, "%Y%m%d").date()
        except ValueError as exc:
            raise ValueError(f"Invalid SAP posting date: {value}") from exc

    def _derive_scope(self, material_number: str) -> tuple[int, str]:
        prefix = material_number.upper()
        for key, result in self.MATERIAL_SCOPE_MAP.items():
            if prefix.startswith(key):
                return result
        return 3, f"Procurement – {material_number}"