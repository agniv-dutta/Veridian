from __future__ import annotations

import hashlib
import json

from django.db.models import Avg
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.mixins import TenantQuerysetMixin
from apps.ingest.models import ImportJob
from apps.ingest.serializers import ImportJobDetailSerializer, ImportJobSerializer
from apps.ingest.services import ingest_source
from apps.records.models import NormalizedRecord
from apps.tenants.models import Client


class ImportJobViewSet(TenantQuerysetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = ImportJob.objects.all().select_related("client", "uploaded_by")

    def get_queryset(self):
        return super().scope_queryset_to_client(ImportJob.objects.select_related("client", "uploaded_by"))

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ImportJobDetailSerializer
        return ImportJobSerializer

    def create(self, request, *args, **kwargs):
        client = self.get_client()
        source_type = request.data.get("source_type")
        file_obj = request.FILES.get("raw_file") or request.data.get("raw_file")
        if not source_type or not file_obj:
            raise ValidationError({"source_type": "Required", "raw_file": "Required"})
        force = _force_requested(request)
        file_hash = _hash_uploaded_payload(file_obj)
        duplicate = ImportJob.objects.filter(client=client, file_hash=file_hash).first()
        if duplicate and not force:
            return Response(
                {
                    "error": "duplicate_upload",
                    "message": "This file has already been ingested.",
                    "existing_import_id": str(duplicate.id),
                    "existing_import_date": duplicate.uploaded_at.isoformat(),
                },
                status=status.HTTP_409_CONFLICT,
            )
        job, total, successful, failed = ingest_source(
            client=client,
            source_type=source_type,
            uploaded_by=request.user,
            file_obj=file_obj,
            file_hash=file_hash,
            force_reason="operator override" if force else "",
        )
        return Response({"import_job_id": str(job.id), "total": total, "successful": successful, "failed": failed}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        job = self.get_object()
        return Response({"lines": job.raw_file_preview})

    @action(detail=True, methods=["post"])
    def reingest(self, request, pk=None):
        job = self.get_object()
        if not job.raw_file:
            raise ValidationError("Import job has no raw file to reingest")
        job, total, successful, failed = ingest_source(client=job.client, source_type=job.source_type, uploaded_by=request.user, file_obj=job.raw_file, existing_job=job)
        return Response({"import_job_id": str(job.id), "total": total, "successful": successful, "failed": failed})

    @action(detail=True, methods=["get"])
    def records(self, request, pk=None):
        job = self.get_object()
        status_value = request.query_params.get("status")
        queryset = job.normalized_records.all()
        if status_value:
            if status_value == "flagged":
                queryset = queryset.filter(status=NormalizedRecord.Status.FLAGGED)
            elif status_value == "failed":
                queryset = queryset.filter(status=NormalizedRecord.Status.REJECTED)
            else:
                queryset = queryset.filter(status=status_value)
        
        from apps.records.serializers import NormalizedRecordListSerializer
        serializer = NormalizedRecordListSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)


class SummaryView(TenantQuerysetMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        client = self.get_client()
        total_imports = ImportJob.objects.filter(client=client).count()
        pending_review = NormalizedRecord.objects.filter(client=client, status__in=[NormalizedRecord.Status.PENDING, NormalizedRecord.Status.FLAGGED]).count()
        flagged_records = NormalizedRecord.objects.filter(client=client, status=NormalizedRecord.Status.FLAGGED).count()
        approved_locked = NormalizedRecord.objects.filter(client=client, status=NormalizedRecord.Status.APPROVED, locked=True).count()
        quality = {}
        for source_type in (ImportJob.SourceType.SAP, ImportJob.SourceType.UTILITY, ImportJob.SourceType.TRAVEL):
            average_quality = ImportJob.objects.filter(client=client, source_type=source_type, quality_score__isnull=False).aggregate(value=Avg("quality_score"))["value"]
            quality[source_type] = {"avg_quality": round(float(average_quality), 2) if average_quality is not None else None, "grade": _quality_grade(average_quality)}
        return Response({"total_imports": total_imports, "pending_review": pending_review, "flagged_records": flagged_records, "approved_locked": approved_locked, "quality_score": quality})


class IngestSAPView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return self._ingest(request, ImportJob.SourceType.SAP)

    def _ingest(self, request, source_type):
        client = _client_from_request(request)
        file_obj = request.FILES.get("file") or request.data.get("file")
        if source_type == ImportJob.SourceType.TRAVEL and file_obj is None:
            file_obj = request.data
        if not client or not file_obj:
            raise ValidationError({"client": "Required", "file": "Required"})
        force = _force_requested(request)
        file_hash = _hash_uploaded_payload(file_obj)
        duplicate = ImportJob.objects.filter(client=client, file_hash=file_hash).first()
        if duplicate and not force:
            return Response(
                {
                    "error": "duplicate_upload",
                    "message": "This file has already been ingested.",
                    "existing_import_id": str(duplicate.id),
                    "existing_import_date": duplicate.uploaded_at.isoformat(),
                },
                status=status.HTTP_409_CONFLICT,
            )
        job, total, successful, failed = ingest_source(
            client=client,
            source_type=source_type,
            uploaded_by=request.user,
            file_obj=file_obj,
            file_hash=file_hash,
            force_reason="operator override" if force else "",
        )
        return Response({"import_job_id": str(job.id), "total": total, "successful": successful, "failed": failed}, status=status.HTTP_201_CREATED)


class IngestUtilityView(IngestSAPView):
    def post(self, request):
        return self._ingest(request, ImportJob.SourceType.UTILITY)


class IngestTravelView(IngestSAPView):
    def post(self, request):
        return self._ingest(request, ImportJob.SourceType.TRAVEL)


def _client_from_request(request):
    slug = request.data.get("client") or request.query_params.get("client")
    if not slug:
        raise ValidationError({"client": "Required"})
    client = Client.objects.filter(slug=slug).first()
    if not client:
        raise ValidationError({"client": "Unknown client"})
    profile = getattr(request.user, "profile", None)
    if not (request.user.is_superuser or getattr(request.user, "is_staff", False) or (profile and profile.client_id == client.id)):
        raise ValidationError({"client": "You do not have access to this client"})
    return client


def _force_requested(request) -> bool:
    return str(request.query_params.get("force", "")).strip().lower() in {"1", "true", "yes"}


def _hash_uploaded_payload(file_obj) -> str:
    if isinstance(file_obj, dict):
        payload = dict(file_obj)
        payload.pop("client", None)
        content = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(content).hexdigest()
    if hasattr(file_obj, "read"):
        content = file_obj.read()
        if hasattr(file_obj, "seek"):
            file_obj.seek(0)
        if isinstance(content, str):
            content = content.encode("utf-8")
        return hashlib.sha256(content).hexdigest()
    if isinstance(file_obj, bytes):
        return hashlib.sha256(file_obj).hexdigest()
    return hashlib.sha256(str(file_obj).encode("utf-8")).hexdigest()


def _quality_grade(score) -> str | None:
    if score is None:
        return None
    value = float(score)
    if value >= 0.9:
        return "A"
    if value >= 0.75:
        return "B"
    if value >= 0.6:
        return "C"
    return "D"