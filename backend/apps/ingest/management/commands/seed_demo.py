from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.auth_users.models import User
from apps.emissions.models import EmissionFactor
from apps.ingest.models import ImportJob, RawRecord
from apps.records.models import AuditEvent, NormalizedRecord, RecordFlag
from apps.tenants.models import Client, UserProfile


class Command(BaseCommand):
    help = "Seed a complete demo dataset for Veridian"

    def handle(self, *args, **options):
        with transaction.atomic():
            client, analyst, admin = self._create_client_and_users()
            self._create_factors()
            sap_job = self._create_import_job(client, analyst, ImportJob.SourceType.SAP, "sap_demo.txt", "SAP demo file\n")
            utility_job = self._create_import_job(client, analyst, ImportJob.SourceType.UTILITY, "utility_demo.csv", "meter_id,site_address,period_start,period_end,quantity,unit,tariff_code\n")
            travel_job = self._create_import_job(client, analyst, ImportJob.SourceType.TRAVEL, "travel_demo.json", '{"trips": []}\n')

            status_queue = (
                [NormalizedRecord.Status.APPROVED] * 8
                + [NormalizedRecord.Status.PENDING] * 12
                + [NormalizedRecord.Status.FLAGGED] * 10
                + [NormalizedRecord.Status.REJECTED] * 3
                + [NormalizedRecord.Status.PENDING] * 27
            )

            self._seed_sap(client, analyst, sap_job, status_queue)
            self._seed_utility(client, analyst, utility_job, status_queue)
            self._seed_travel(client, analyst, travel_job, status_queue)
            self.stdout.write(self.style.SUCCESS("Seed data created successfully."))

    def _create_client_and_users(self):
        client, _ = Client.objects.get_or_create(name="Aether Industries", slug="aether")
        analyst, _ = User.objects.get_or_create(username="analyst@aether.com", defaults={"email": "analyst@aether.com", "first_name": "Aether", "last_name": "Analyst"})
        analyst.email = "analyst@aether.com"
        analyst.set_password("Demo1234!")
        analyst.save()
        admin, _ = User.objects.get_or_create(username="admin@aether.com", defaults={"email": "admin@aether.com", "first_name": "Aether", "last_name": "Admin", "is_staff": True, "is_superuser": True})
        admin.email = "admin@aether.com"
        admin.is_staff = True
        admin.is_superuser = True
        admin.set_password("Demo1234!")
        admin.save()
        UserProfile.objects.update_or_create(user=analyst, defaults={"client": client, "role": UserProfile.Role.ANALYST})
        UserProfile.objects.update_or_create(user=admin, defaults={"client": client, "role": UserProfile.Role.ADMIN})
        return client, analyst, admin

    def _create_factors(self):
        factors = [
            ("Fuel combustion – Diesel", 1, "L", Decimal("2.68"), "IPCC AR6", date(2023, 1, 1), None, "GLOBAL"),
            ("Fuel combustion – Petrol", 1, "L", Decimal("2.31"), "IPCC AR6", date(2023, 1, 1), None, "GLOBAL"),
            ("Grid electricity India", 2, "kWh", Decimal("0.82"), "IEA 2023 Grid Factor India", date(2023, 1, 1), None, "IN"),
            ("Air travel – Economy", 3, "km", Decimal("0.255"), "Demo air factor", date(2023, 1, 1), None, "GLOBAL"),
            ("Air travel – Business", 3, "km", Decimal("0.739"), "Demo air factor", date(2023, 1, 1), None, "GLOBAL"),
            ("Hotel stay", 3, "night", Decimal("31.5"), "Hotel factor demo", date(2023, 1, 1), None, "GLOBAL"),
            ("Ground transport – Car", 3, "km", Decimal("0.192"), "Ground transport demo", date(2023, 1, 1), None, "GLOBAL"),
            ("Ground transport – Rail", 3, "km", Decimal("0.041"), "Rail factor demo", date(2023, 1, 1), None, "GLOBAL"),
        ]
        for activity_category, scope, unit, factor, source, valid_from, valid_to, region in factors:
            EmissionFactor.objects.get_or_create(
                activity_category=activity_category,
                scope=scope,
                unit=unit,
                factor_kgco2e_per_unit=factor,
                source=source,
                valid_from=valid_from,
                valid_to=valid_to,
                region=region,
            )

    def _create_import_job(self, client, user, source_type, filename, preview_line):
        content = ContentFile(preview_line.encode("utf-8"), name=filename)
        return ImportJob.objects.create(client=client, source_type=source_type, uploaded_by=user, raw_file=content, raw_file_preview=[preview_line.strip()], status=ImportJob.Status.PROCESSING)

    def _create_record(self, **kwargs):
        record = NormalizedRecord.objects.create(**kwargs, calculated_kgco2e=Decimal("0"))
        return record

    def _next_status(self, status_queue):
        return status_queue.pop(0) if status_queue else NormalizedRecord.Status.PENDING

    def _seed_sap(self, client, user, job, status_queue):
        raw_rows = []
        records_meta = []
        base_date = date(2023, 10, 1)
        plants = ["P001", "P002", "P003", "P004"]
        for index in range(20):
            plant = plants[index % len(plants)]
            posting_date = base_date + timedelta(days=index * 3)
            quantity = Decimal("1200") + Decimal(index * 25)
            raw = {"document_number": f"DOC-{index+1}", "posting_date": posting_date.isoformat(), "plant_code": plant, "material_number": f"DIESEL{index:03d}", "quantity": str(quantity), "unit": "L", "cost_center": "COST01"}
            raw_rows.append(RawRecord(import_job=job, client=client, source_type=ImportJob.SourceType.SAP, row_index=index + 1, raw_data=raw, parse_status=RawRecord.ParseStatus.OK))
            records_meta.append({"raw": raw, "scope": 1, "unit": "L", "factor": Decimal("2.68"), "category": "Fuel combustion – Diesel", "status": None, "flags": []})
        for index in range(5):
            plant = plants[index % len(plants)]
            posting_date = base_date + timedelta(days=60 + index * 5)
            raw = {"document_number": f"PET-{index+1}", "posting_date": posting_date.isoformat(), "plant_code": plant, "material_number": f"PETROL{index:03d}", "quantity": str(500 + index * 10), "unit": "L", "cost_center": "COST02"}
            raw_rows.append(RawRecord(import_job=job, client=client, source_type=ImportJob.SourceType.SAP, row_index=21 + index, raw_data=raw, parse_status=RawRecord.ParseStatus.OK))
            records_meta.append({"raw": raw, "scope": 1, "unit": "L", "factor": Decimal("2.31"), "category": "Fuel combustion – Petrol", "status": None, "flags": []})
        for index in range(3):
            plant = plants[index % len(plants)]
            posting_date = base_date + timedelta(days=90 + index * 4)
            raw = {"document_number": f"ELEC-{index+1}", "posting_date": posting_date.isoformat(), "plant_code": plant, "material_number": f"ELEC{index:03d}", "quantity": str(2000 + index * 500), "unit": "KWH", "cost_center": "COST03"}
            raw_rows.append(RawRecord(import_job=job, client=client, source_type=ImportJob.SourceType.SAP, row_index=26 + index, raw_data=raw, parse_status=RawRecord.ParseStatus.OK))
            records_meta.append({"raw": raw, "scope": 2, "unit": "kWh", "factor": Decimal("0.82"), "category": "Grid electricity India", "status": None, "flags": [{"flag_type": RecordFlag.FlagType.UNIT_MISMATCH, "message": "SAP electricity row uses internal unit mapping"}]})
        for index in range(2):
            posting_date = base_date + timedelta(days=120 + index)
            raw = {"document_number": f"BAD-{index+1}", "posting_date": posting_date.isoformat(), "plant_code": f"BAD{index+1}", "material_number": f"DIESELX{index}", "quantity": "100", "unit": "L", "cost_center": "COST99"}
            raw_rows.append(RawRecord(import_job=job, client=client, source_type=ImportJob.SourceType.SAP, row_index=29 + index, raw_data=raw, parse_status=RawRecord.ParseStatus.OK, parse_error="Plant code unresolved"))
            records_meta.append({"raw": raw, "scope": 1, "unit": "L", "factor": Decimal("2.68"), "category": "Fuel combustion – Diesel", "status": None, "flags": [{"flag_type": RecordFlag.FlagType.UNRESOLVED_CODE, "message": f"Plant code {raw['plant_code']} not resolved"}]})
        RawRecord.objects.bulk_create(raw_rows)
        for index, (raw_record, meta) in enumerate(zip(RawRecord.objects.filter(import_job=job).order_by("row_index"), records_meta)):
            status = self._next_status(status_queue)
            record = self._create_record(
                raw_record=raw_record,
                client=client,
                source_type=ImportJob.SourceType.SAP,
                import_job=job,
                description=f"SAP material {raw_record.raw_data['material_number']}",
                activity_category=meta["category"],
                period_start=date.fromisoformat(raw_record.raw_data["posting_date"]),
                period_end=date.fromisoformat(raw_record.raw_data["posting_date"]),
                quantity=Decimal(raw_record.raw_data["quantity"]),
                unit=meta["unit"],
                emission_factor=meta["factor"],
                emission_factor_source="Demo factor",
                scope=meta["scope"],
                status=status,
                locked=status == NormalizedRecord.Status.APPROVED,
                approved_by=user if status == NormalizedRecord.Status.APPROVED else None,
                approved_at=timezone.now() if status == NormalizedRecord.Status.APPROVED else None,
            )
            AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.IMPORTED, detail={"source_type": "sap"})
            AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.NORMALIZED, detail={"source_type": "sap"})
            if status == NormalizedRecord.Status.FLAGGED:
                for flag in meta["flags"]:
                    RecordFlag.objects.create(record=record, flag_type=flag["flag_type"], message=flag["message"])
            if status == NormalizedRecord.Status.APPROVED:
                AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.APPROVED, actor=user, detail={})
                AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.LOCKED, actor=user, detail={})
        job.total_records = 30
        job.successful_records = 30
        job.failed_records = 0
        job.status = ImportJob.Status.COMPLETED
        job.save(update_fields=["total_records", "successful_records", "failed_records", "status"])
        job.compute_quality_score()
        job.save(update_fields=["quality_score"])

    def _seed_utility(self, client, user, job, status_queue):
        rows = []
        metas = []
        meters = ["MTR-BOM-01", "MTR-BOM-02", "MTR-PUN-01"]
        start = date(2023, 10, 20)
        for index in range(12):
            meter = meters[index % len(meters)]
            period_start = start + timedelta(days=index * 15)
            period_end = period_start + timedelta(days=27)
            quantity = Decimal("3200") + Decimal(index * 100)
            unit = "kWh"
            flags = []
            if index == 4:
                unit = "kVAh"
                quantity = Decimal("1800")
                flags.append({"flag_type": RecordFlag.FlagType.UNIT_MISMATCH, "message": "kVAh cannot be converted to kWh without power factor"})
            if index == 6:
                quantity = Decimal("0")
                flags.append({"flag_type": RecordFlag.FlagType.ZERO_VALUE, "message": "Quantity is zero — verify source data"})
            if index == 9:
                quantity = Decimal("25600")
                flags.append({"flag_type": RecordFlag.FlagType.STATISTICAL_OUTLIER, "message": "Demo statistical outlier"})
            raw = {"meter_id": meter, "site_address": "Aether Site", "period_start": period_start.isoformat(), "period_end": period_end.isoformat(), "quantity": str(quantity), "unit": unit, "tariff_code": f"T{index:02d}"}
            rows.append(RawRecord(import_job=job, client=client, source_type=ImportJob.SourceType.UTILITY, row_index=index + 1, raw_data=raw, parse_status=RawRecord.ParseStatus.OK))
            metas.append({"raw": raw, "scope": 2, "unit": "kVAh (unconverted)" if unit == "kVAh" else "kWh", "factor": Decimal("0.82"), "category": f"Grid electricity – {meter}", "flags": flags})
        RawRecord.objects.bulk_create(rows)
        for index, (raw_record, meta) in enumerate(zip(RawRecord.objects.filter(import_job=job).order_by("row_index"), metas)):
            status = self._next_status(status_queue)
            record = self._create_record(
                raw_record=raw_record,
                client=client,
                source_type=ImportJob.SourceType.UTILITY,
                import_job=job,
                description=f"Utility meter {raw_record.raw_data['meter_id']}",
                activity_category=meta["category"],
                period_start=date.fromisoformat(raw_record.raw_data["period_start"]),
                period_end=date.fromisoformat(raw_record.raw_data["period_end"]),
                quantity=Decimal(raw_record.raw_data["quantity"]),
                unit=meta["unit"],
                emission_factor=meta["factor"],
                emission_factor_source="IEA 2023 Grid Factor India",
                scope=meta["scope"],
                status=status,
                locked=status == NormalizedRecord.Status.APPROVED,
                approved_by=user if status == NormalizedRecord.Status.APPROVED else None,
                approved_at=timezone.now() if status == NormalizedRecord.Status.APPROVED else None,
            )
            AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.IMPORTED, detail={"source_type": "utility"})
            AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.NORMALIZED, detail={"source_type": "utility"})
            for flag in meta["flags"]:
                RecordFlag.objects.create(record=record, flag_type=flag["flag_type"], message=flag["message"])
            if index == 9:
                AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.FLAG_RAISED, detail={"flag_type": RecordFlag.FlagType.STATISTICAL_OUTLIER})
            if status == NormalizedRecord.Status.APPROVED:
                AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.APPROVED, actor=user, detail={})
                AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.LOCKED, actor=user, detail={})
        job.total_records = 12
        job.successful_records = 12
        job.failed_records = 0
        job.status = ImportJob.Status.COMPLETED
        job.save(update_fields=["total_records", "successful_records", "failed_records", "status"])
        job.compute_quality_score()
        job.save(update_fields=["quality_score"])

    def _seed_travel(self, client, user, job, status_queue):
        rows = []
        metas = []
        segments = [
            {"segmentType": "Air", "departureAirport": "BOM", "arrivalAirport": "DEL", "departureDate": "2023-10-15", "arrivalDate": "2023-10-15", "cabinClass": "Economy", "distanceKm": None, "carrier": "AI", "flightNumber": "AI101"},
            {"segmentType": "Air", "departureAirport": "BOM", "arrivalAirport": "LHR", "departureDate": "2023-10-16", "arrivalDate": "2023-10-16", "cabinClass": "Business", "distanceKm": None, "carrier": "BA", "flightNumber": "BA200"},
            {"segmentType": "Air", "departureAirport": "BOM", "arrivalAirport": "DXB", "departureDate": "2023-10-17", "arrivalDate": "2023-10-17", "cabinClass": "Economy", "distanceKm": None, "carrier": "EK", "flightNumber": "EK501"},
            {"segmentType": "Air", "departureAirport": "XYZ", "arrivalAirport": "DEL", "departureDate": "2023-10-18", "arrivalDate": "2023-10-18", "cabinClass": "Economy", "distanceKm": None, "carrier": "ZZ", "flightNumber": "ZZ01"},
            {"segmentType": "Air", "departureAirport": "DEL", "arrivalAirport": "BOM", "departureDate": "2023-10-19", "arrivalDate": "2023-10-19", "cabinClass": "Business", "distanceKm": None, "carrier": "AI", "flightNumber": "AI102"},
            {"segmentType": "Air", "departureAirport": "LHR", "arrivalAirport": "BOM", "departureDate": "2023-10-20", "arrivalDate": "2023-10-21", "cabinClass": "Economy", "distanceKm": None, "carrier": "BA", "flightNumber": "BA201"},
            {"segmentType": "Air", "departureAirport": "DXB", "arrivalAirport": "BOM", "departureDate": "2023-10-22", "arrivalDate": "2023-10-22", "cabinClass": "Business", "distanceKm": None, "carrier": "EK", "flightNumber": "EK502"},
            {"segmentType": "Air", "departureAirport": "BOM", "arrivalAirport": "DEL", "departureDate": "2023-10-23", "arrivalDate": "2023-10-23", "cabinClass": "Economy", "distanceKm": None, "carrier": "AI", "flightNumber": "AI103"},
            {"segmentType": "Hotel", "city": "Delhi", "checkIn": "2023-10-15", "checkOut": "2023-10-17", "nights": 2, "hotelName": "Demo Delhi Hotel"},
            {"segmentType": "Hotel", "city": "London", "checkIn": "2023-10-18", "checkOut": "2023-10-20", "nights": 2, "hotelName": "Demo London Hotel"},
            {"segmentType": "Hotel", "city": "Delhi", "checkIn": "2023-10-21", "checkOut": "2023-10-23", "nights": 2, "hotelName": "Demo Delhi Hotel 2"},
            {"segmentType": "Hotel", "city": "London", "checkIn": "2023-10-24", "checkOut": "2023-10-26", "nights": 2, "hotelName": "Demo London Hotel 2"},
            {"segmentType": "Car", "pickupCity": "Delhi", "dropoffCity": "Delhi", "distanceKm": 45, "carType": "Sedan"},
            {"segmentType": "Car", "pickupCity": "London", "dropoffCity": "London", "distanceKm": 22, "carType": "Sedan"},
            {"segmentType": "Car", "pickupCity": "Delhi", "dropoffCity": "Noida", "distanceKm": None, "carType": "SUV"},
            {"segmentType": "Rail", "departureStation": "NDLS", "arrivalStation": "BCT", "distanceKm": 1400},
            {"segmentType": "Rail", "departureStation": "SBC", "arrivalStation": "MAS", "distanceKm": 350},
            {"segmentType": "Rail", "departureStation": "NDLS", "arrivalStation": "LKO", "distanceKm": 500},
        ]
        for index, segment in enumerate(segments, start=1):
            raw = {**segment, "tripId": "TRP-DEMO", "traveler": {"employeeId": "E001", "name": "Demo Traveler", "costCenter": "CC01"}}
            rows.append(RawRecord(import_job=job, client=client, source_type=ImportJob.SourceType.TRAVEL, row_index=index, raw_data=raw, parse_status=RawRecord.ParseStatus.OK))
            if segment["segmentType"].lower() == "air":
                cat = f"Air travel – {segment['cabinClass']}"
                unit = "km"
                quantity = Decimal("0") if segment.get("departureAirport") == "XYZ" else Decimal("4000") if segment.get("arrivalAirport") == "LHR" else Decimal("1200")
                flags = []
                if segment.get("departureAirport") == "XYZ":
                    flags.append({"flag_type": RecordFlag.FlagType.UNRESOLVED_CODE, "message": "IATA code XYZ not in lookup"})
                factor = Decimal("0.255") if segment["cabinClass"] == "Economy" else Decimal("0.739")
                category = cat
                scope = 3
                unit_out = "km"
                start = date.fromisoformat(segment["departureDate"])
                end = date.fromisoformat(segment["arrivalDate"])
                desc = f"Air travel {segment['departureAirport']}-{segment['arrivalAirport']}"
            elif segment["segmentType"].lower() == "hotel":
                category = "Hotel stay"
                scope = 3
                unit_out = "night"
                quantity = Decimal(str(segment["nights"]))
                factor = Decimal("31.5")
                flags = []
                start = date.fromisoformat(segment["checkIn"])
                end = date.fromisoformat(segment["checkOut"])
                desc = segment["hotelName"]
            elif segment["segmentType"].lower() == "car":
                category = "Ground transport – Car"
                scope = 3
                unit_out = "km"
                quantity = Decimal(str(segment.get("distanceKm") or 0))
                factor = Decimal("0.192")
                flags = []
                if segment.get("distanceKm") is None:
                    flags.append({"flag_type": RecordFlag.FlagType.MISSING_EMISSION_FACTOR, "message": "Distance not provided for car segment — kgCO₂e cannot be computed"})
                start = date.fromisoformat(segment.get("departureDate") or "2023-10-23")
                end = date.fromisoformat(segment.get("arrivalDate") or "2023-10-23")
                desc = f"Car travel {segment.get('pickupCity', '')}-{segment.get('dropoffCity', '')}"
            else:
                category = "Ground transport – Rail"
                scope = 3
                unit_out = "km"
                quantity = Decimal(str(segment.get("distanceKm") or 0))
                factor = Decimal("0.041")
                flags = []
                start = date(2023, 10, 1)
                end = date(2023, 10, 1)
                desc = f"Rail travel {segment.get('departureStation', '')}-{segment.get('arrivalStation', '')}"
            metas.append({"category": category, "scope": scope, "unit": unit_out, "factor": factor, "flags": flags, "start": start, "end": end, "description": desc})
        RawRecord.objects.bulk_create(rows)
        for index, (raw_record, meta) in enumerate(zip(RawRecord.objects.filter(import_job=job).order_by("row_index"), metas)):
            status = self._next_status(status_queue)
            record = self._create_record(
                raw_record=raw_record,
                client=client,
                source_type=ImportJob.SourceType.TRAVEL,
                import_job=job,
                description=meta["description"],
                activity_category=meta["category"],
                period_start=meta["start"],
                period_end=meta["end"],
                quantity=Decimal(raw_record.raw_data.get("distanceKm") or raw_record.raw_data.get("nights") or 0),
                unit=meta["unit"],
                emission_factor=meta["factor"],
                emission_factor_source="Demo factor",
                scope=meta["scope"],
                status=status,
                locked=status == NormalizedRecord.Status.APPROVED,
                approved_by=user if status == NormalizedRecord.Status.APPROVED else None,
                approved_at=timezone.now() if status == NormalizedRecord.Status.APPROVED else None,
            )
            AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.IMPORTED, detail={"source_type": "travel"})
            AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.NORMALIZED, detail={"source_type": "travel"})
            for flag in meta["flags"]:
                RecordFlag.objects.create(record=record, flag_type=flag["flag_type"], message=flag["message"])
            if index == 4:
                RecordFlag.objects.create(record=record, flag_type=RecordFlag.FlagType.UNRESOLVED_CODE, message="IATA code XYZ not in lookup")
            if index == 15:
                RecordFlag.objects.create(record=record, flag_type=RecordFlag.FlagType.MISSING_EMISSION_FACTOR, message="Distance not provided for car segment — kgCO₂e cannot be computed")
            if status == NormalizedRecord.Status.APPROVED:
                AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.APPROVED, actor=user, detail={})
                AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.LOCKED, actor=user, detail={})
            if status == NormalizedRecord.Status.REJECTED:
                AuditEvent.objects.create(record=record, event_type=AuditEvent.EventType.REJECTED, actor=user, detail={})
        job.total_records = 18
        job.successful_records = 18
        job.failed_records = 0
        job.status = ImportJob.Status.COMPLETED
        job.save(update_fields=["total_records", "successful_records", "failed_records", "status"])
        job.compute_quality_score()
        job.save(update_fields=["quality_score"])