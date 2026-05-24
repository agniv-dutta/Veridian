from __future__ import annotations

from datetime import date

from django.db.models import Q

from apps.emissions.models import EmissionFactor


def _category_aliases(activity_category: str) -> list[str]:
    aliases = [activity_category]
    normalized = activity_category.replace("–", "-").strip()
    aliases.append(normalized)
    if normalized.startswith("Fuel combustion - "):
        fuel = normalized.split("Fuel combustion - ", 1)[1]
        aliases.append(f"{fuel} combustion")
    if normalized.startswith("Grid electricity"):
        aliases.append("Grid electricity India")
        aliases.append("Grid electricity")
    if normalized.startswith("Air travel"):
        cabin = normalized.split("-")[-1].strip()
        aliases.append(f"Air travel {cabin}")
    if normalized.startswith("Ground transport - "):
        aliases.append(normalized.replace("Ground transport - ", "Ground transport "))
    return list(dict.fromkeys(aliases))


def resolve_emission_factor(activity_category: str, unit: str, scope: int, region: str = "", as_of: date | None = None):
    as_of = as_of or date.today()
    aliases = _category_aliases(activity_category)
    queryset = EmissionFactor.objects.filter(unit=unit, scope=scope).filter(Q(region=region) | Q(region="") | Q(region="GLOBAL"))
    for factor in queryset:
        if factor.activity_category in aliases and factor.valid_from <= as_of and (factor.valid_to is None or factor.valid_to >= as_of):
            return factor
    for alias in aliases:
        factor = queryset.filter(activity_category=alias, valid_from__lte=as_of).filter(Q(valid_to__gte=as_of) | Q(valid_to__isnull=True)).first()
        if factor:
            return factor
    return None