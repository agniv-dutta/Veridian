from __future__ import annotations

import json
import math
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any


class TravelParser:
    IATA_COORDS = {
        "BOM": (19.0896, 72.8656), "DEL": (28.5562, 77.1000), "BLR": (13.1989, 77.7063), "MAA": (12.9941, 80.1709),
        "CCU": (22.6547, 88.4467), "HYD": (17.2403, 78.4294), "GOI": (15.3808, 73.8314), "AMD": (23.0717, 72.6347),
        "PNQ": (18.5822, 73.9197), "JAI": (26.8242, 75.8122), "LHR": (51.4700, -0.4543), "CDG": (49.0097, 2.5479),
        "FRA": (50.0379, 8.5622), "AMS": (52.3105, 4.7683), "DXB": (25.2532, 55.3657), "SIN": (1.3644, 103.9915),
        "HKG": (22.3080, 113.9185), "NRT": (35.7719, 140.3929), "JFK": (40.6413, -73.7781), "LAX": (33.9416, -118.4085),
        "ORD": (41.9742, -87.9073), "DFW": (32.8998, -97.0403), "SFO": (37.6213, -122.3790), "MIA": (25.7959, -80.2870),
        "SEA": (47.4502, -122.3088), "YYZ": (43.6777, -79.6248), "SYD": (33.9399, 151.1753), "MEL": (37.6690, 144.8410),
        "DOH": (25.2731, 51.6081), "AUH": (24.4330, 54.6511), "KUL": (2.7456, 101.7072), "BKK": (13.6900, 100.7501),
        "ICN": (37.4602, 126.4407), "PEK": (40.0799, 116.6031), "PVG": (31.1443, 121.8083), "GRU": (-23.4356, -46.4731),
        "GIG": (-22.8090, -43.2506), "MEX": (19.4361, -99.0719), "BOG": (4.7016, -74.1469), "LIM": (-12.0219, -77.1143),
        "CPT": (-33.9700, 18.6017), "NBO": (-1.3192, 36.9278), "ADD": (8.9779, 38.7993), "JNB": (-26.1337, 28.2420),
        "CAI": (30.1120, 31.4000), "IST": (41.2753, 28.7519), "ATH": (37.9364, 23.9445), "FCO": (41.8003, 12.2389),
        "MAD": (40.4983, -3.5676), "BCN": (41.2971, 2.0785),
    }

    CABIN_MULTIPLIERS = {"economy": Decimal("1.0"), "premium economy": Decimal("1.6"), "business": Decimal("2.9"), "first": Decimal("4.0")}

    def parse(self, source: Any) -> tuple[list[dict], list[dict]]:
        payload = self._read_payload(source)
        records: list[dict] = []
        errors: list[dict] = []
        trips = payload.get("trips", []) if isinstance(payload, dict) else []
        for trip_index, trip in enumerate(trips, start=1):
            try:
                records.extend(self._parse_trip(trip, trip_index))
            except Exception as exc:
                errors.append({"row": trip_index, "error_message": str(exc)})
        return records, errors

    def _read_payload(self, source: Any) -> dict:
        if isinstance(source, dict):
            return source
        if hasattr(source, "read"):
            content = source.read()
            if hasattr(source, "seek"):
                source.seek(0)
            if isinstance(content, bytes):
                content = content.decode("utf-8", errors="ignore")
            return json.loads(content)
        return json.loads(Path(source).read_text(encoding="utf-8"))

    def _parse_trip(self, trip: dict, trip_index: int) -> list[dict]:
        segments = trip.get("segments", [])
        trip_id = trip.get("tripId", f"TRIP-{trip_index}")
        traveler = trip.get("traveler", {})
        cost_center = traveler.get("costCenter", "")
        records: list[dict] = []
        for segment_index, segment in enumerate(segments, start=1):
            segment_type = (segment.get("segmentType") or "").strip().lower()
            if segment_type == "air":
                records.append(self._parse_air_segment(segment, trip_id, cost_center, segment_index))
            elif segment_type == "hotel":
                records.append(self._parse_hotel_segment(segment, trip_id, cost_center, segment_index))
            elif segment_type == "car":
                records.append(self._parse_car_segment(segment, trip_id, cost_center, segment_index))
            elif segment_type == "rail":
                records.append(self._parse_rail_segment(segment, trip_id, cost_center, segment_index))
            else:
                raise ValueError(f"Unsupported travel segment type: {segment_type or 'unknown'}")
        return records

    def _parse_air_segment(self, segment: dict, trip_id: str, cost_center: str, segment_index: int) -> dict:
        departure = (segment.get("departureAirport") or "").upper()
        arrival = (segment.get("arrivalAirport") or "").upper()
        cabin = (segment.get("cabinClass") or "Economy").strip()
        period_start = self._parse_date(segment.get("departureDate"))
        period_end = self._parse_date(segment.get("arrivalDate"))
        distance = segment.get("distanceKm")
        flags = []
        if distance is None:
            distance = self._haversine_from_iata(departure, arrival)
            if distance is None:
                flags.append({"flag_type": "unresolved_code", "message": f"IATA code {departure or arrival} not in lookup"})
                distance = Decimal("0")
        quantity = Decimal(str(distance)).quantize(Decimal("0.0001")) if distance is not None else Decimal("0")
        return self._base_record(
            trip_id=trip_id,
            cost_center=cost_center,
            segment_index=segment_index,
            period_start=period_start,
            period_end=period_end,
            description=f"Air travel {departure}-{arrival}",
            activity_category=f"Air travel – {cabin}",
            scope=3,
            unit="km",
            quantity=quantity,
            source_identifier=trip_id,
            flags=flags,
            raw_data={**segment, "tripId": trip_id},
        )

    def _parse_hotel_segment(self, segment: dict, trip_id: str, cost_center: str, segment_index: int) -> dict:
        check_in = self._parse_date(segment.get("checkIn"))
        check_out = self._parse_date(segment.get("checkOut"))
        nights = segment.get("nights")
        if nights is None:
            nights = (check_out - check_in).days
        return self._base_record(
            trip_id=trip_id,
            cost_center=cost_center,
            segment_index=segment_index,
            period_start=check_in,
            period_end=check_out,
            description=segment.get("hotelName") or f"Hotel stay in {segment.get('city', '')}".strip(),
            activity_category="Hotel stay",
            scope=3,
            unit="night",
            quantity=Decimal(str(nights)),
            source_identifier=trip_id,
            flags=[],
            raw_data={**segment, "tripId": trip_id},
        )

    def _parse_car_segment(self, segment: dict, trip_id: str, cost_center: str, segment_index: int) -> dict:
        period_start = self._parse_date(segment.get("departureDate") or segment.get("pickupDate") or segment.get("date") or "2023-01-01")
        period_end = self._parse_date(segment.get("arrivalDate") or segment.get("dropoffDate") or segment.get("date") or "2023-01-01")
        distance = segment.get("distanceKm")
        flags = []
        if distance is None:
            flags.append({"flag_type": "missing_emission_factor", "message": "Distance not provided for car segment — kgCO₂e cannot be computed"})
            distance = 0
        return self._base_record(
            trip_id=trip_id,
            cost_center=cost_center,
            segment_index=segment_index,
            period_start=period_start,
            period_end=period_end,
            description=f"Car travel {segment.get('pickupCity', '')}-{segment.get('dropoffCity', '')}".strip(),
            activity_category="Ground transport – Car",
            scope=3,
            unit="km",
            quantity=Decimal(str(distance)),
            source_identifier=trip_id,
            flags=flags,
            raw_data={**segment, "tripId": trip_id},
        )

    def _parse_rail_segment(self, segment: dict, trip_id: str, cost_center: str, segment_index: int) -> dict:
        period_start = self._parse_date(segment.get("departureDate") or segment.get("date") or "2023-01-01")
        period_end = self._parse_date(segment.get("arrivalDate") or segment.get("date") or "2023-01-01")
        distance = segment.get("distanceKm")
        flags = []
        if distance is None:
            flags.append({"flag_type": "missing_emission_factor", "message": "Distance not provided for rail segment — kgCO₂e cannot be computed"})
            distance = 0
        return self._base_record(
            trip_id=trip_id,
            cost_center=cost_center,
            segment_index=segment_index,
            period_start=period_start,
            period_end=period_end,
            description=f"Rail travel {segment.get('departureStation', '')}-{segment.get('arrivalStation', '')}".strip(),
            activity_category="Ground transport – Rail",
            scope=3,
            unit="km",
            quantity=Decimal(str(distance)),
            source_identifier=trip_id,
            flags=flags,
            raw_data={**segment, "tripId": trip_id},
        )

    def _base_record(self, trip_id: str, cost_center: str, segment_index: int, period_start: date, period_end: date, description: str, activity_category: str, scope: int, unit: str, quantity: Decimal, source_identifier: str, flags: list[dict], raw_data: dict) -> dict:
        return {
            "trip_id": trip_id,
            "cost_center": cost_center,
            "description": description,
            "activity_category": activity_category,
            "scope": scope,
            "unit": unit,
            "quantity": quantity,
            "period_start": period_start,
            "period_end": period_end,
            "source_type": "travel",
            "source_identifier": source_identifier,
            "segment_index": segment_index,
            "flags": flags,
            "raw_data": raw_data,
        }

    def _parse_date(self, value: str | None) -> date:
        if not value:
            raise ValueError("Missing travel date")
        return datetime.strptime(value, "%Y-%m-%d").date()

    def _haversine_from_iata(self, departure: str, arrival: str) -> Decimal | None:
        if departure not in self.IATA_COORDS or arrival not in self.IATA_COORDS:
            return None
        lat1, lon1 = self.IATA_COORDS[departure]
        lat2, lon2 = self.IATA_COORDS[arrival]
        radius_km = 6371.0
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return Decimal(str(radius_km * c)).quantize(Decimal("0.0001"))