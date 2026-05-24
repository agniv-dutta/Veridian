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

    def __str__(self) -> str:
        return f"{self.client} - {self.source_type} - {self.status}"


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
    parse_status = models.CharField(max_length=20, choices=ParseStatus.choices)
    parse_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.source_type} row {self.row_index}"