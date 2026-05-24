from django.contrib import admin

from apps.emissions.models import EmissionFactor


@admin.register(EmissionFactor)
class EmissionFactorAdmin(admin.ModelAdmin):
    list_display = ("activity_category", "scope", "unit", "factor_kgco2e_per_unit", "source", "valid_from", "valid_to", "region")
    list_filter = ("scope", "region", "source")
    search_fields = ("activity_category", "source")
    readonly_fields = ("id",)
    ordering = ("activity_category", "valid_from")

    @admin.action(description="Expire selected factors")
    def expire_selected_factors(self, request, queryset):
        from django.utils import timezone

        queryset.update(valid_to=timezone.localdate())

    actions = ("expire_selected_factors",)
