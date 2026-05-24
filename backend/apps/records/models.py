import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.ingest.models import ImportJob, RawRecord
from apps.tenants.models import Client


class NormalizedRecord(models.Model):
    class SourceType(models.TextChoices):
        SAP = "sap", "SAP"
        UTILITY = "utility", "Utility"
        TRAVEL = "travel", "Travel"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        FLAGGED = "flagged", "Flagged"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    raw_record = models.OneToOneField(RawRecord, on_delete=models.SET_NULL, null=True, blank=True, related_name="normalized_record")
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="normalized_records")
    source_type = models.CharField(max_length=20, choices=SourceType.choices)
    import_job = models.ForeignKey(ImportJob, on_delete=models.CASCADE, related_name="normalized_records")
    description = models.CharField(max_length=500)
    activity_category = models.CharField(max_length=200)
    period_start = models.DateField()
    period_end = models.DateField()
    quantity = models.DecimalField(max_digits=20, decimal_places=6)
    unit = models.CharField(max_length=50)
    emission_factor = models.DecimalField(max_digits=20, decimal_places=8)
    emission_factor_source = models.CharField(max_length=200)
    calculated_kgco2e = models.DecimalField(max_digits=20, decimal_places=4)
    scope = models.IntegerField(choices=[(1, 1), (2, 2), (3, 3)])
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_records")
    approved_at = models.DateTimeField(null=True, blank=True)
    locked = models.BooleanField(default=False)
    is_edited = models.BooleanField(default=False)
    edited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="edited_records")
    edited_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.quantity is None:
            self.quantity = Decimal("0")
        if self.emission_factor is None:
            self.emission_factor = Decimal("0")
        self.calculated_kgco2e = self.quantity * self.emission_factor
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.activity_category} - {self.calculated_kgco2e}"


class RecordFlag(models.Model):
    class FlagType(models.TextChoices):
        UNIT_MISMATCH = "unit_mismatch", "Unit mismatch"
        STATISTICAL_OUTLIER = "statistical_outlier", "Statistical outlier"
        UNRESOLVED_CODE = "unresolved_code", "Unresolved code"
        MISSING_EMISSION_FACTOR = "missing_emission_factor", "Missing emission factor"
        PERIOD_OVERLAP = "period_overlap", "Period overlap"
        ZERO_VALUE = "zero_value", "Zero value"
        NEGATIVE_VALUE = "negative_value", "Negative value"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    record = models.ForeignKey(NormalizedRecord, on_delete=models.CASCADE, related_name="flags")
    flag_type = models.CharField(max_length=40, choices=FlagType.choices)
    message = models.TextField()
    auto_dismissed = models.BooleanField(default=False)
    dismissed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="dismissed_flags")
    dismissed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.flag_type} on {self.record_id}"


class AuditEvent(models.Model):
    class EventType(models.TextChoices):
        IMPORTED = "imported", "Imported"
        NORMALIZED = "normalized", "Normalized"
        FLAG_RAISED = "flag_raised", "Flag raised"
        FLAG_DISMISSED = "flag_dismissed", "Flag dismissed"
        EDITED = "edited", "Edited"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        LOCKED = "locked", "Locked"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    record = models.ForeignKey(NormalizedRecord, on_delete=models.CASCADE, related_name="audit_trail")
    event_type = models.CharField(max_length=40, choices=EventType.choices)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_events")
    detail = models.JSONField(default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self) -> str:
        return f"{self.event_type} @ {self.timestamp}"