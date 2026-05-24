import uuid

from django.conf import settings
from django.db import models

from apps.tenants.models import Client


class ImportJob(models.Model):
    class SourceType(models.TextChoices):
        SAP = "sap", "SAP"
        UTILITY = "utility", "Utility"
        TRAVEL = "travel", "Travel"

    class Status(models.TextChoices):
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="import_jobs")
    source_type = models.CharField(max_length=20, choices=SourceType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PROCESSING)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="uploaded_imports")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    raw_file = models.FileField(upload_to="imports/%Y/%m/")
    raw_file_preview = models.JSONField(default=list)
    total_records = models.IntegerField(default=0)
    successful_records = models.IntegerField(default=0)
    failed_records = models.IntegerField(default=0)
    error_log = models.JSONField(default=list)
    file_hash = models.CharField(max_length=64, blank=True, default="")
    force_reason = models.CharField(max_length=200, blank=True, default="")
    quality_score = models.FloatField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.client} - {self.source_type} - {self.status}"

    def compute_quality_score(self) -> float:
        from apps.records.models import RecordFlag

        total_records = self.total_records or self.raw_records.count()
        if total_records <= 0:
            self.quality_score = 1.0
            return self.quality_score

        failed_records = self.raw_records.filter(parse_status=RawRecord.ParseStatus.FAILED).count()
        statistical_outliers = self.normalized_records.filter(flags__flag_type=RecordFlag.FlagType.STATISTICAL_OUTLIER).distinct().count()
        unit_mismatches = self.normalized_records.filter(flags__flag_type=RecordFlag.FlagType.UNIT_MISMATCH).distinct().count()
        unresolved_codes = self.normalized_records.filter(flags__flag_type=RecordFlag.FlagType.UNRESOLVED_CODE).distinct().count()
        zero_values = self.normalized_records.filter(flags__flag_type=RecordFlag.FlagType.ZERO_VALUE).distinct().count()

        score = 1.0
        score -= 0.15 * (failed_records / total_records)
        score -= 0.10 * (statistical_outliers / total_records)
        score -= 0.08 * (unit_mismatches / total_records)
        score -= 0.05 * (unresolved_codes / total_records)
        score -= 0.03 * (zero_values / total_records)
        self.quality_score = max(score, 0.0)
        return self.quality_score

    @property
    def quality_grade(self) -> str | None:
        score = self.quality_score
        if score is None:
            return None
        if score >= 0.9:
            return "A"
        if score >= 0.75:
            return "B"
        if score >= 0.6:
            return "C"
        return "D"


class RawRecord(models.Model):
    class ParseStatus(models.TextChoices):
        OK = "ok", "OK"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    import_job = models.ForeignKey(ImportJob, on_delete=models.CASCADE, related_name="raw_records")
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="raw_records")
    source_type = models.CharField(max_length=20, choices=ImportJob.SourceType.choices)
    row_index = models.IntegerField()
    raw_data = models.JSONField()
    conversion_log = models.JSONField(default=list)
    parse_status = models.CharField(max_length=20, choices=ParseStatus.choices)
    parse_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.source_type} row {self.row_index}"